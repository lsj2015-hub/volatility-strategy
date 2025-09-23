"""
Market Data Collector for KIS API integration
KIS API를 통한 시장 데이터 수집기
"""

import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pathlib import Path

import structlog
from pydantic import BaseModel

from ...services.kis_api import KISAPIClient
from ...utils.data_persistence import save_json_data, load_json_data

logger = structlog.get_logger(__name__)


class MarketIndexData(BaseModel):
    """시장 지수 데이터 모델"""
    index_code: str
    index_name: str
    current_price: float
    price_change: float
    change_rate: float
    trading_volume: int
    timestamp: datetime


class MarketDataCollector:
    """시장 데이터 수집기"""

    def __init__(self, kis_client: Optional[KISAPIClient] = None):
        self.kis_client = kis_client or KISAPIClient()
        self.data_dir = Path("data/market_indicators")
        self.data_dir.mkdir(parents=True, exist_ok=True)

    async def collect_market_indices(self) -> Dict[str, MarketIndexData]:
        """주요 시장 지수 데이터 수집 (KOSPI, KOSDAQ)"""
        indices = {}

        try:
            # KOSPI 데이터 수집
            kospi_data = await self._get_index_data("0001", "KOSPI")
            if kospi_data:
                indices["KOSPI"] = kospi_data

            # KOSDAQ 데이터 수집
            kosdaq_data = await self._get_index_data("1001", "KOSDAQ")
            if kosdaq_data:
                indices["KOSDAQ"] = kosdaq_data

        except Exception as e:
            logger.error(f"Market indices collection failed: {e}")
            # 실패 시 캐시된 데이터 반환
            indices = self._load_cached_indices()

        # 수집된 데이터 저장
        if indices:
            await self._save_indices_data(indices)

        return indices

    async def _get_index_data(self, index_code: str, index_name: str) -> Optional[MarketIndexData]:
        """개별 지수 데이터 조회"""
        try:
            # KIS API를 통한 지수 조회
            endpoint = "/uapi/domestic-stock/v1/quotations/inquire-index-price"

            headers = {
                "tr_id": "FHPST01010000"
            }

            params = {
                "FID_COND_MRKT_DIV_CODE": "U",
                "FID_INPUT_ISCD": index_code
            }

            response = await self.kis_client._make_request("GET", endpoint, headers=headers, params=params)

            if response and "output" in response:
                data = response["output"]

                return MarketIndexData(
                    index_code=index_code,
                    index_name=index_name,
                    current_price=float(data.get("bstp_nmix_prpr", 0)),
                    price_change=float(data.get("bstp_nmix_prdy_vrss", 0)),
                    change_rate=float(data.get("prdy_ctrt", 0)),
                    trading_volume=int(data.get("acml_vol", 0)),
                    timestamp=datetime.now()
                )

        except Exception as e:
            logger.warning(f"Failed to get {index_name} data: {e}")

            # 모의투자 모드에서는 가짜 데이터 반환
            if self.kis_client.is_mock_trading:
                return self._generate_mock_index_data(index_code, index_name)

        return None

    def _generate_mock_index_data(self, index_code: str, index_name: str) -> MarketIndexData:
        """모의투자용 가짜 지수 데이터 생성"""
        import random

        base_prices = {
            "0001": 3200,  # KOSPI
            "1001": 1000   # KOSDAQ
        }

        base_price = base_prices.get(index_code, 2500)
        current_price = base_price + random.uniform(-50, 50)
        price_change = random.uniform(-30, 30)
        change_rate = (price_change / base_price) * 100

        return MarketIndexData(
            index_code=index_code,
            index_name=f"{index_name} (Mock)",
            current_price=round(current_price, 2),
            price_change=round(price_change, 2),
            change_rate=round(change_rate, 2),
            trading_volume=random.randint(100000000, 500000000),
            timestamp=datetime.now()
        )

    async def collect_market_breadth(self) -> Dict[str, Any]:
        """시장 폭 데이터 수집 (상승/하락 종목 수)"""
        try:
            # 거래량 순위를 통해 시장 동향 파악
            volume_data = await self.kis_client.get_stock_volume_ranking()

            total_stocks = len(volume_data)
            up_stocks = sum(1 for stock in volume_data if float(stock.get("prdy_ctrt", 0)) > 0)
            down_stocks = sum(1 for stock in volume_data if float(stock.get("prdy_ctrt", 0)) < 0)
            unchanged_stocks = total_stocks - up_stocks - down_stocks

            breadth_data = {
                "total_stocks": total_stocks,
                "up_stocks": up_stocks,
                "down_stocks": down_stocks,
                "unchanged_stocks": unchanged_stocks,
                "advance_decline_ratio": up_stocks / max(down_stocks, 1),
                "timestamp": datetime.now().isoformat()
            }

            # 데이터 저장
            await self._save_breadth_data(breadth_data)

            return breadth_data

        except Exception as e:
            logger.error(f"Market breadth collection failed: {e}")
            # 실패 시 기본값 반환
            return {
                "total_stocks": 0,
                "up_stocks": 0,
                "down_stocks": 0,
                "unchanged_stocks": 0,
                "advance_decline_ratio": 1.0,
                "timestamp": datetime.now().isoformat()
            }

    async def collect_volatility_data(self) -> Dict[str, Any]:
        """변동성 지표 데이터 수집"""
        try:
            # 과거 데이터와 현재 데이터를 비교하여 변동성 계산
            historical_data = self._load_historical_indices()
            current_data = await self.collect_market_indices()

            volatility_metrics = {}

            for index_name, current_index in current_data.items():
                if index_name in historical_data:
                    historical_prices = [
                        data["current_price"] for data in historical_data[index_name][-20:]  # 최근 20일
                    ]

                    if len(historical_prices) >= 2:
                        import statistics
                        volatility = statistics.stdev(historical_prices)
                        avg_price = statistics.mean(historical_prices)
                        volatility_rate = (volatility / avg_price) * 100

                        volatility_metrics[index_name] = {
                            "volatility": volatility,
                            "volatility_rate": volatility_rate,
                            "is_high_volatility": volatility_rate > 2.0
                        }

            volatility_data = {
                "metrics": volatility_metrics,
                "market_condition": self._assess_market_condition(volatility_metrics),
                "timestamp": datetime.now().isoformat()
            }

            # 데이터 저장
            await self._save_volatility_data(volatility_data)

            return volatility_data

        except Exception as e:
            logger.error(f"Volatility data collection failed: {e}")
            return {"metrics": {}, "market_condition": "unknown", "timestamp": datetime.now().isoformat()}

    def _assess_market_condition(self, volatility_metrics: Dict[str, Any]) -> str:
        """변동성 지표를 바탕으로 시장 상황 평가"""
        if not volatility_metrics:
            return "unknown"

        high_vol_count = sum(1 for metrics in volatility_metrics.values()
                           if metrics.get("is_high_volatility", False))

        if high_vol_count >= len(volatility_metrics) * 0.7:
            return "high_volatility"
        elif high_vol_count <= len(volatility_metrics) * 0.3:
            return "low_volatility"
        else:
            return "normal_volatility"

    async def _save_indices_data(self, indices_data: Dict[str, MarketIndexData]):
        """지수 데이터 저장"""
        data_to_save = {
            name: {
                "index_code": index.index_code,
                "index_name": index.index_name,
                "current_price": index.current_price,
                "price_change": index.price_change,
                "change_rate": index.change_rate,
                "trading_volume": index.trading_volume,
                "timestamp": index.timestamp.isoformat()
            }
            for name, index in indices_data.items()
        }

        # 현재 데이터 저장
        current_file = self.data_dir / "current_indices.json"
        await save_json_data(str(current_file), data_to_save)

        # 히스토리 데이터에 추가
        await self._append_to_historical_data("indices", data_to_save)

    async def _save_breadth_data(self, breadth_data: Dict[str, Any]):
        """시장 폭 데이터 저장"""
        breadth_file = self.data_dir / "market_breadth.json"
        await save_json_data(str(breadth_file), breadth_data)
        await self._append_to_historical_data("breadth", breadth_data)

    async def _save_volatility_data(self, volatility_data: Dict[str, Any]):
        """변동성 데이터 저장"""
        volatility_file = self.data_dir / "volatility.json"
        await save_json_data(str(volatility_file), volatility_data)
        await self._append_to_historical_data("volatility", volatility_data)

    async def _append_to_historical_data(self, data_type: str, new_data: Dict[str, Any]):
        """히스토리 데이터에 새 데이터 추가"""
        try:
            today = datetime.now().strftime("%Y-%m-%d")
            history_file = self.data_dir / f"history_{data_type}_{today}.json"

            # 기존 히스토리 로드
            if history_file.exists():
                historical_data = await load_json_data(str(history_file))
            else:
                historical_data = []

            # 새 데이터 추가
            historical_data.append({
                **new_data,
                "collected_at": datetime.now().isoformat()
            })

            # 최대 1000개 항목만 유지 (메모리 관리)
            if len(historical_data) > 1000:
                historical_data = historical_data[-1000:]

            # 저장
            await save_json_data(str(history_file), historical_data)

        except Exception as e:
            logger.warning(f"Failed to append historical data: {e}")

    def _load_cached_indices(self) -> Dict[str, MarketIndexData]:
        """캐시된 지수 데이터 로드"""
        try:
            current_file = self.data_dir / "current_indices.json"
            if current_file.exists():
                data = load_json_data(str(current_file))
                if data:
                    return {
                        name: MarketIndexData(**index_data)
                        for name, index_data in data.items()
                    }
        except Exception as e:
            logger.warning(f"Failed to load cached indices: {e}")

        return {}

    def _load_historical_indices(self) -> Dict[str, List[Dict[str, Any]]]:
        """히스토리 지수 데이터 로드"""
        try:
            today = datetime.now().strftime("%Y-%m-%d")
            history_file = self.data_dir / f"history_indices_{today}.json"

            if history_file.exists():
                return load_json_data(str(history_file)) or {}

        except Exception as e:
            logger.warning(f"Failed to load historical indices: {e}")

        return {}