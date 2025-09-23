"""
Performance Analytics Service
거래 성과 분석 서비스 - 일일/주간/월간 성과 분석 및 통계
"""

import asyncio
import logging
import json
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
from pathlib import Path
import statistics
from dataclasses import dataclass, asdict

from app.utils.config import get_config

logger = logging.getLogger(__name__)

class AnalyticsPeriod(str, Enum):
    """분석 기간"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"

@dataclass
class TradeRecord:
    """거래 기록"""
    trade_id: str
    symbol: str
    stock_name: str
    entry_time: datetime
    exit_time: datetime
    entry_price: float
    exit_price: float
    quantity: int
    investment_amount: float
    realized_pnl: float
    pnl_percent: float
    hold_duration_hours: float
    exit_reason: str
    trading_date: date

@dataclass
class DailyPerformance:
    """일일 성과"""
    date: date
    total_trades: int
    profit_trades: int
    loss_trades: int
    total_pnl: float
    total_pnl_percent: float
    win_rate: float
    avg_profit: float
    avg_loss: float
    max_profit: float
    max_loss: float
    portfolio_value: float
    cumulative_return: float
    daily_return: float
    sharpe_ratio: float
    max_drawdown: float

@dataclass
class PerformanceMetrics:
    """성과 지표"""
    period: str
    start_date: date
    end_date: date

    # 기본 통계
    total_trades: int
    profit_trades: int
    loss_trades: int
    win_rate: float

    # 수익성
    total_pnl: float
    total_pnl_percent: float
    avg_pnl_per_trade: float
    avg_profit: float
    avg_loss: float
    profit_factor: float  # 총 수익 / 총 손실

    # 리스크
    max_profit: float
    max_loss: float
    max_drawdown: float
    sharpe_ratio: float
    volatility: float

    # 거래 패턴
    avg_hold_duration: float
    most_profitable_symbol: str
    least_profitable_symbol: str

    # 시간별 분석
    best_trading_hour: int
    worst_trading_hour: int

class PerformanceAnalytics:
    """성과 분석 서비스"""

    def __init__(self):
        self.config = get_config()
        self.data_dir = Path("data/analytics")
        self.data_dir.mkdir(parents=True, exist_ok=True)

        # 거래 기록 저장소
        self.trade_records: List[TradeRecord] = []
        self.daily_performances: List[DailyPerformance] = []

        # 성과 메트릭스 캐시
        self._metrics_cache: Dict[str, PerformanceMetrics] = {}
        self._cache_timestamp: Optional[datetime] = None
        self._cache_duration = timedelta(minutes=5)

    async def record_trade(
        self,
        trade_id: str,
        symbol: str,
        stock_name: str,
        entry_time: datetime,
        exit_time: datetime,
        entry_price: float,
        exit_price: float,
        quantity: int,
        exit_reason: str
    ):
        """거래 기록 추가"""

        investment_amount = entry_price * quantity
        realized_pnl = (exit_price - entry_price) * quantity
        pnl_percent = (realized_pnl / investment_amount) * 100
        hold_duration = (exit_time - entry_time).total_seconds() / 3600  # 시간 단위

        trade_record = TradeRecord(
            trade_id=trade_id,
            symbol=symbol,
            stock_name=stock_name,
            entry_time=entry_time,
            exit_time=exit_time,
            entry_price=entry_price,
            exit_price=exit_price,
            quantity=quantity,
            investment_amount=investment_amount,
            realized_pnl=realized_pnl,
            pnl_percent=pnl_percent,
            hold_duration_hours=hold_duration,
            exit_reason=exit_reason,
            trading_date=entry_time.date()
        )

        self.trade_records.append(trade_record)

        # 데이터 저장
        await self._save_trade_records()

        # 일일 성과 업데이트
        await self._update_daily_performance(trade_record.trading_date)

        # 캐시 무효화
        self._invalidate_cache()

        logger.info(f"Trade recorded: {symbol} - P&L: ₩{realized_pnl:,.0f} ({pnl_percent:.2f}%)")

    async def get_performance_metrics(
        self,
        period: AnalyticsPeriod = AnalyticsPeriod.MONTHLY,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> PerformanceMetrics:
        """성과 지표 조회"""

        # 캐시 확인
        cache_key = f"{period.value}_{start_date}_{end_date}"
        if self._is_cache_valid() and cache_key in self._metrics_cache:
            return self._metrics_cache[cache_key]

        # 기간 설정
        if not end_date:
            end_date = date.today()

        if not start_date:
            if period == AnalyticsPeriod.DAILY:
                start_date = end_date
            elif period == AnalyticsPeriod.WEEKLY:
                start_date = end_date - timedelta(days=7)
            else:  # MONTHLY
                start_date = end_date - timedelta(days=30)

        # 기간 내 거래 필터링
        filtered_trades = [
            trade for trade in self.trade_records
            if start_date <= trade.trading_date <= end_date
        ]

        if not filtered_trades:
            # 빈 메트릭스 반환
            metrics = PerformanceMetrics(
                period=period.value,
                start_date=start_date,
                end_date=end_date,
                total_trades=0,
                profit_trades=0,
                loss_trades=0,
                win_rate=0.0,
                total_pnl=0.0,
                total_pnl_percent=0.0,
                avg_pnl_per_trade=0.0,
                avg_profit=0.0,
                avg_loss=0.0,
                profit_factor=0.0,
                max_profit=0.0,
                max_loss=0.0,
                max_drawdown=0.0,
                sharpe_ratio=0.0,
                volatility=0.0,
                avg_hold_duration=0.0,
                most_profitable_symbol="",
                least_profitable_symbol="",
                best_trading_hour=9,
                worst_trading_hour=15
            )
        else:
            metrics = await self._calculate_metrics(filtered_trades, period.value, start_date, end_date)

        # 캐시 저장
        self._metrics_cache[cache_key] = metrics
        self._cache_timestamp = datetime.now()

        return metrics

    async def get_daily_performance_history(
        self,
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """일일 성과 이력 조회"""

        end_date = date.today()
        start_date = end_date - timedelta(days=days)

        # 기간 내 일일 성과 필터링
        filtered_performances = [
            perf for perf in self.daily_performances
            if start_date <= perf.date <= end_date
        ]

        # 데이터 포맷팅
        result = []
        for perf in sorted(filtered_performances, key=lambda x: x.date):
            result.append({
                "date": perf.date.isoformat(),
                "total_trades": perf.total_trades,
                "profit_trades": perf.profit_trades,
                "loss_trades": perf.loss_trades,
                "total_pnl": perf.total_pnl,
                "total_pnl_percent": perf.total_pnl_percent,
                "win_rate": perf.win_rate,
                "avg_profit": perf.avg_profit,
                "avg_loss": perf.avg_loss,
                "max_profit": perf.max_profit,
                "max_loss": perf.max_loss,
                "portfolio_value": perf.portfolio_value,
                "cumulative_return": perf.cumulative_return,
                "daily_return": perf.daily_return,
                "sharpe_ratio": perf.sharpe_ratio,
                "max_drawdown": perf.max_drawdown
            })

        return result

    async def get_symbol_performance(self) -> List[Dict[str, Any]]:
        """종목별 성과 분석"""

        symbol_stats = {}

        for trade in self.trade_records:
            symbol = trade.symbol

            if symbol not in symbol_stats:
                symbol_stats[symbol] = {
                    "symbol": symbol,
                    "stock_name": trade.stock_name,
                    "trades": [],
                    "total_trades": 0,
                    "profit_trades": 0,
                    "loss_trades": 0,
                    "total_pnl": 0.0,
                    "total_investment": 0.0
                }

            stats = symbol_stats[symbol]
            stats["trades"].append(trade)
            stats["total_trades"] += 1
            stats["total_pnl"] += trade.realized_pnl
            stats["total_investment"] += trade.investment_amount

            if trade.realized_pnl > 0:
                stats["profit_trades"] += 1
            else:
                stats["loss_trades"] += 1

        # 통계 계산
        result = []
        for symbol, stats in symbol_stats.items():
            trades = stats["trades"]

            win_rate = (stats["profit_trades"] / stats["total_trades"]) * 100 if stats["total_trades"] > 0 else 0
            avg_pnl = stats["total_pnl"] / stats["total_trades"] if stats["total_trades"] > 0 else 0
            total_pnl_percent = (stats["total_pnl"] / stats["total_investment"]) * 100 if stats["total_investment"] > 0 else 0

            avg_hold_duration = statistics.mean([t.hold_duration_hours for t in trades]) if trades else 0
            max_profit = max([t.realized_pnl for t in trades]) if trades else 0
            max_loss = min([t.realized_pnl for t in trades]) if trades else 0

            result.append({
                "symbol": symbol,
                "stock_name": stats["stock_name"],
                "total_trades": stats["total_trades"],
                "profit_trades": stats["profit_trades"],
                "loss_trades": stats["loss_trades"],
                "win_rate": win_rate,
                "total_pnl": stats["total_pnl"],
                "total_pnl_percent": total_pnl_percent,
                "avg_pnl": avg_pnl,
                "avg_hold_duration": avg_hold_duration,
                "max_profit": max_profit,
                "max_loss": max_loss,
                "total_investment": stats["total_investment"]
            })

        # 총 수익순 정렬
        result.sort(key=lambda x: x["total_pnl"], reverse=True)

        return result

    async def get_trading_pattern_analysis(self) -> Dict[str, Any]:
        """거래 패턴 분석"""

        if not self.trade_records:
            return {}

        # 시간대별 분석
        hourly_stats = {}
        for hour in range(9, 16):  # 장 시간
            hourly_stats[hour] = {
                "hour": hour,
                "trades": 0,
                "total_pnl": 0.0,
                "avg_pnl": 0.0,
                "win_rate": 0.0
            }

        for trade in self.trade_records:
            hour = trade.entry_time.hour
            if hour in hourly_stats:
                stats = hourly_stats[hour]
                stats["trades"] += 1
                stats["total_pnl"] += trade.realized_pnl

        # 시간대별 통계 계산
        for hour, stats in hourly_stats.items():
            if stats["trades"] > 0:
                hour_trades = [t for t in self.trade_records if t.entry_time.hour == hour]
                stats["avg_pnl"] = stats["total_pnl"] / stats["trades"]
                profit_trades = len([t for t in hour_trades if t.realized_pnl > 0])
                stats["win_rate"] = (profit_trades / stats["trades"]) * 100

        # 요일별 분석
        weekday_stats = {}
        for day in range(7):  # 0=월요일, 6=일요일
            weekday_stats[day] = {
                "weekday": day,
                "weekday_name": ["월", "화", "수", "목", "금", "토", "일"][day],
                "trades": 0,
                "total_pnl": 0.0,
                "avg_pnl": 0.0,
                "win_rate": 0.0
            }

        for trade in self.trade_records:
            weekday = trade.entry_time.weekday()
            stats = weekday_stats[weekday]
            stats["trades"] += 1
            stats["total_pnl"] += trade.realized_pnl

        # 요일별 통계 계산
        for day, stats in weekday_stats.items():
            if stats["trades"] > 0:
                day_trades = [t for t in self.trade_records if t.entry_time.weekday() == day]
                stats["avg_pnl"] = stats["total_pnl"] / stats["trades"]
                profit_trades = len([t for t in day_trades if t.realized_pnl > 0])
                stats["win_rate"] = (profit_trades / stats["trades"]) * 100

        # 보유 기간별 분석
        duration_ranges = [
            (0, 1, "1시간 이내"),
            (1, 4, "1-4시간"),
            (4, 8, "4-8시간"),
            (8, 24, "8-24시간"),
            (24, float('inf'), "24시간 이상")
        ]

        duration_stats = []
        for min_duration, max_duration, label in duration_ranges:
            range_trades = [
                t for t in self.trade_records
                if min_duration <= t.hold_duration_hours < max_duration
            ]

            if range_trades:
                total_pnl = sum(t.realized_pnl for t in range_trades)
                avg_pnl = total_pnl / len(range_trades)
                profit_trades = len([t for t in range_trades if t.realized_pnl > 0])
                win_rate = (profit_trades / len(range_trades)) * 100

                duration_stats.append({
                    "duration_range": label,
                    "trades": len(range_trades),
                    "total_pnl": total_pnl,
                    "avg_pnl": avg_pnl,
                    "win_rate": win_rate
                })

        return {
            "hourly_analysis": list(hourly_stats.values()),
            "weekday_analysis": list(weekday_stats.values()),
            "duration_analysis": duration_stats
        }

    async def _calculate_metrics(
        self,
        trades: List[TradeRecord],
        period: str,
        start_date: date,
        end_date: date
    ) -> PerformanceMetrics:
        """성과 지표 계산"""

        if not trades:
            return PerformanceMetrics(
                period=period, start_date=start_date, end_date=end_date,
                total_trades=0, profit_trades=0, loss_trades=0, win_rate=0.0,
                total_pnl=0.0, total_pnl_percent=0.0, avg_pnl_per_trade=0.0,
                avg_profit=0.0, avg_loss=0.0, profit_factor=0.0,
                max_profit=0.0, max_loss=0.0, max_drawdown=0.0,
                sharpe_ratio=0.0, volatility=0.0, avg_hold_duration=0.0,
                most_profitable_symbol="", least_profitable_symbol="",
                best_trading_hour=9, worst_trading_hour=15
            )

        # 기본 통계
        total_trades = len(trades)
        profit_trades = len([t for t in trades if t.realized_pnl > 0])
        loss_trades = total_trades - profit_trades
        win_rate = (profit_trades / total_trades) * 100 if total_trades > 0 else 0

        # 수익성
        total_pnl = sum(t.realized_pnl for t in trades)
        total_investment = sum(t.investment_amount for t in trades)
        total_pnl_percent = (total_pnl / total_investment) * 100 if total_investment > 0 else 0
        avg_pnl_per_trade = total_pnl / total_trades if total_trades > 0 else 0

        profits = [t.realized_pnl for t in trades if t.realized_pnl > 0]
        losses = [t.realized_pnl for t in trades if t.realized_pnl < 0]

        avg_profit = statistics.mean(profits) if profits else 0
        avg_loss = statistics.mean(losses) if losses else 0

        total_profit = sum(profits) if profits else 0
        total_loss = abs(sum(losses)) if losses else 0
        profit_factor = total_profit / total_loss if total_loss > 0 else 0

        # 리스크
        max_profit = max([t.realized_pnl for t in trades]) if trades else 0
        max_loss = min([t.realized_pnl for t in trades]) if trades else 0

        # 일일 수익률로 샤프 비율 및 변동성 계산
        daily_returns = self._calculate_daily_returns(trades, start_date, end_date)

        if len(daily_returns) > 1:
            avg_daily_return = statistics.mean(daily_returns)
            volatility = statistics.stdev(daily_returns)
            sharpe_ratio = avg_daily_return / volatility if volatility > 0 else 0

            # 최대 낙폭 계산
            cumulative_returns = []
            cumulative = 0
            for ret in daily_returns:
                cumulative += ret
                cumulative_returns.append(cumulative)

            max_drawdown = self._calculate_max_drawdown(cumulative_returns)
        else:
            volatility = 0
            sharpe_ratio = 0
            max_drawdown = 0

        # 거래 패턴
        avg_hold_duration = statistics.mean([t.hold_duration_hours for t in trades])

        # 종목별 분석
        symbol_pnl = {}
        for trade in trades:
            if trade.symbol not in symbol_pnl:
                symbol_pnl[trade.symbol] = 0
            symbol_pnl[trade.symbol] += trade.realized_pnl

        most_profitable_symbol = max(symbol_pnl.items(), key=lambda x: x[1])[0] if symbol_pnl else ""
        least_profitable_symbol = min(symbol_pnl.items(), key=lambda x: x[1])[0] if symbol_pnl else ""

        # 시간대별 분석
        hourly_pnl = {}
        for trade in trades:
            hour = trade.entry_time.hour
            if hour not in hourly_pnl:
                hourly_pnl[hour] = 0
            hourly_pnl[hour] += trade.realized_pnl

        best_trading_hour = max(hourly_pnl.items(), key=lambda x: x[1])[0] if hourly_pnl else 9
        worst_trading_hour = min(hourly_pnl.items(), key=lambda x: x[1])[0] if hourly_pnl else 15

        return PerformanceMetrics(
            period=period,
            start_date=start_date,
            end_date=end_date,
            total_trades=total_trades,
            profit_trades=profit_trades,
            loss_trades=loss_trades,
            win_rate=win_rate,
            total_pnl=total_pnl,
            total_pnl_percent=total_pnl_percent,
            avg_pnl_per_trade=avg_pnl_per_trade,
            avg_profit=avg_profit,
            avg_loss=avg_loss,
            profit_factor=profit_factor,
            max_profit=max_profit,
            max_loss=max_loss,
            max_drawdown=max_drawdown,
            sharpe_ratio=sharpe_ratio,
            volatility=volatility,
            avg_hold_duration=avg_hold_duration,
            most_profitable_symbol=most_profitable_symbol,
            least_profitable_symbol=least_profitable_symbol,
            best_trading_hour=best_trading_hour,
            worst_trading_hour=worst_trading_hour
        )

    def _calculate_daily_returns(self, trades: List[TradeRecord], start_date: date, end_date: date) -> List[float]:
        """일일 수익률 계산"""

        daily_pnl = {}
        current_date = start_date

        while current_date <= end_date:
            daily_pnl[current_date] = 0
            current_date += timedelta(days=1)

        for trade in trades:
            trade_date = trade.trading_date
            if trade_date in daily_pnl:
                daily_pnl[trade_date] += trade.realized_pnl

        # 수익률로 변환 (간단히 절대값 사용, 실제로는 포트폴리오 가치 기준)
        returns = []
        for pnl in daily_pnl.values():
            returns.append(pnl / 1000000)  # 백만원 단위로 정규화

        return returns

    def _calculate_max_drawdown(self, cumulative_returns: List[float]) -> float:
        """최대 낙폭 계산"""

        if not cumulative_returns:
            return 0

        peak = cumulative_returns[0]
        max_drawdown = 0

        for value in cumulative_returns:
            if value > peak:
                peak = value

            drawdown = (peak - value) / peak if peak != 0 else 0
            max_drawdown = max(max_drawdown, drawdown)

        return max_drawdown * 100  # 퍼센트 단위

    async def _update_daily_performance(self, trading_date: date):
        """일일 성과 업데이트"""

        # 해당 날짜의 거래들
        day_trades = [t for t in self.trade_records if t.trading_date == trading_date]

        if not day_trades:
            return

        # 기존 일일 성과 찾기 또는 생성
        daily_perf = None
        for perf in self.daily_performances:
            if perf.date == trading_date:
                daily_perf = perf
                break

        if not daily_perf:
            # 새로운 일일 성과 생성
            daily_perf = DailyPerformance(
                date=trading_date,
                total_trades=0,
                profit_trades=0,
                loss_trades=0,
                total_pnl=0.0,
                total_pnl_percent=0.0,
                win_rate=0.0,
                avg_profit=0.0,
                avg_loss=0.0,
                max_profit=0.0,
                max_loss=0.0,
                portfolio_value=10000000.0,  # 초기 포트폴리오 가치 (1천만원)
                cumulative_return=0.0,
                daily_return=0.0,
                sharpe_ratio=0.0,
                max_drawdown=0.0
            )
            self.daily_performances.append(daily_perf)

        # 통계 업데이트
        daily_perf.total_trades = len(day_trades)
        daily_perf.profit_trades = len([t for t in day_trades if t.realized_pnl > 0])
        daily_perf.loss_trades = daily_perf.total_trades - daily_perf.profit_trades
        daily_perf.total_pnl = sum(t.realized_pnl for t in day_trades)

        total_investment = sum(t.investment_amount for t in day_trades)
        daily_perf.total_pnl_percent = (daily_perf.total_pnl / total_investment) * 100 if total_investment > 0 else 0
        daily_perf.win_rate = (daily_perf.profit_trades / daily_perf.total_trades) * 100 if daily_perf.total_trades > 0 else 0

        profits = [t.realized_pnl for t in day_trades if t.realized_pnl > 0]
        losses = [t.realized_pnl for t in day_trades if t.realized_pnl < 0]

        daily_perf.avg_profit = statistics.mean(profits) if profits else 0
        daily_perf.avg_loss = statistics.mean(losses) if losses else 0
        daily_perf.max_profit = max([t.realized_pnl for t in day_trades]) if day_trades else 0
        daily_perf.max_loss = min([t.realized_pnl for t in day_trades]) if day_trades else 0

        # 포트폴리오 가치 업데이트
        daily_perf.portfolio_value += daily_perf.total_pnl
        daily_perf.daily_return = (daily_perf.total_pnl / (daily_perf.portfolio_value - daily_perf.total_pnl)) * 100

        # 누적 수익률 계산 (단순화)
        initial_value = 10000000.0  # 초기 포트폴리오 가치
        daily_perf.cumulative_return = ((daily_perf.portfolio_value - initial_value) / initial_value) * 100

        # 일일 성과 저장
        await self._save_daily_performances()

    async def _save_trade_records(self):
        """거래 기록 저장"""

        records_file = self.data_dir / "trade_records.json"

        try:
            records_data = []
            for record in self.trade_records:
                record_dict = asdict(record)
                # datetime 객체를 문자열로 변환
                record_dict['entry_time'] = record.entry_time.isoformat()
                record_dict['exit_time'] = record.exit_time.isoformat()
                record_dict['trading_date'] = record.trading_date.isoformat()
                records_data.append(record_dict)

            with open(records_file, 'w', encoding='utf-8') as f:
                json.dump(records_data, f, ensure_ascii=False, indent=2)

            logger.debug(f"Trade records saved: {len(records_data)} records")

        except Exception as e:
            logger.error(f"Failed to save trade records: {e}")

    async def _save_daily_performances(self):
        """일일 성과 저장"""

        performances_file = self.data_dir / "daily_performances.json"

        try:
            performances_data = []
            for perf in self.daily_performances:
                perf_dict = asdict(perf)
                # date 객체를 문자열로 변환
                perf_dict['date'] = perf.date.isoformat()
                performances_data.append(perf_dict)

            with open(performances_file, 'w', encoding='utf-8') as f:
                json.dump(performances_data, f, ensure_ascii=False, indent=2)

            logger.debug(f"Daily performances saved: {len(performances_data)} records")

        except Exception as e:
            logger.error(f"Failed to save daily performances: {e}")

    async def load_historical_data(self):
        """과거 데이터 로드"""

        # 거래 기록 로드
        records_file = self.data_dir / "trade_records.json"
        if records_file.exists():
            try:
                with open(records_file, 'r', encoding='utf-8') as f:
                    records_data = json.load(f)

                self.trade_records = []
                for record_dict in records_data:
                    # 문자열을 datetime 객체로 변환
                    record_dict['entry_time'] = datetime.fromisoformat(record_dict['entry_time'])
                    record_dict['exit_time'] = datetime.fromisoformat(record_dict['exit_time'])
                    record_dict['trading_date'] = date.fromisoformat(record_dict['trading_date'])

                    record = TradeRecord(**record_dict)
                    self.trade_records.append(record)

                logger.info(f"Loaded {len(self.trade_records)} trade records")

            except Exception as e:
                logger.error(f"Failed to load trade records: {e}")

        # 일일 성과 로드
        performances_file = self.data_dir / "daily_performances.json"
        if performances_file.exists():
            try:
                with open(performances_file, 'r', encoding='utf-8') as f:
                    performances_data = json.load(f)

                self.daily_performances = []
                for perf_dict in performances_data:
                    # 문자열을 date 객체로 변환
                    perf_dict['date'] = date.fromisoformat(perf_dict['date'])

                    perf = DailyPerformance(**perf_dict)
                    self.daily_performances.append(perf)

                logger.info(f"Loaded {len(self.daily_performances)} daily performance records")

            except Exception as e:
                logger.error(f"Failed to load daily performances: {e}")

    def _is_cache_valid(self) -> bool:
        """캐시 유효성 확인"""
        if not self._cache_timestamp:
            return False

        return datetime.now() - self._cache_timestamp < self._cache_duration

    def _invalidate_cache(self):
        """캐시 무효화"""
        self._metrics_cache.clear()
        self._cache_timestamp = None

# 글로벌 분석 서비스 인스턴스
analytics_service = PerformanceAnalytics()