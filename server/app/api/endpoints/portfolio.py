"""
Portfolio management API endpoints
포트폴리오 관리 API 엔드포인트
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

import structlog

from ...schemas.api import ApiResponse
from ...schemas.portfolio import (
    Portfolio, Position, PortfolioAllocation, PortfolioPerformance,
    CreatePortfolioRequest, CreateAllocationRequest, UpdateAllocationRequest, ExecuteTradeRequest
)
from ...services.kis_api import get_kis_client

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


# 임시 저장소 (실제 구현에서는 파일 기반 저장소 사용)
_current_portfolio: Optional[Portfolio] = None
_portfolio_allocations: List[PortfolioAllocation] = []


@router.post("/create", response_model=ApiResponse[Portfolio])
async def create_portfolio(request: CreatePortfolioRequest):
    """
    포트폴리오 생성 (Day 1: 15:35-16:00)
    필터링된 주식들로 포트폴리오 구성
    """
    try:
        logger.info("Portfolio creation requested",
                   total_investment=request.total_investment,
                   allocations_count=len(request.allocations))

        global _current_portfolio, _portfolio_allocations

        # 총 할당 비율 검증
        total_percent = sum(alloc.target_percent for alloc in request.allocations)
        if abs(total_percent - 100.0) > 0.01:
            raise HTTPException(
                status_code=400,
                detail=f"Total allocation percentage must be 100%, got {total_percent}%"
            )

        # 총 할당 금액 검증
        total_amount = sum(alloc.target_amount for alloc in request.allocations)
        if abs(total_amount - request.total_investment) > 1.0:
            raise HTTPException(
                status_code=400,
                detail=f"Total allocation amount must equal investment amount"
            )

        # KIS API로 현재 가격 확인
        kis_client = await get_kis_client()
        validated_allocations = []

        for allocation in request.allocations:
            try:
                stock_data = await kis_client.get_stock_detail(allocation.symbol)
                if not stock_data:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Stock {allocation.symbol} not found"
                    )

                current_price = float(stock_data.get('stck_prpr', 0))
                if current_price <= 0:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid price for {allocation.symbol}"
                    )

                # 실제 구매 가능한 수량 계산 (1주 단위)
                actual_quantity = int(allocation.target_amount / current_price)
                actual_amount = actual_quantity * current_price

                validated_allocation = PortfolioAllocation(
                    symbol=allocation.symbol,
                    name=stock_data.get('hts_kor_isnm', allocation.name),
                    target_amount=actual_amount,
                    target_percent=allocation.target_percent,
                    quantity=actual_quantity,
                    estimated_price=current_price
                )

                validated_allocations.append(validated_allocation)

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error validating allocation for {allocation.symbol}: {str(e)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Error validating {allocation.symbol}: {str(e)}"
                )

        # 포트폴리오 생성
        portfolio_id = f"portfolio_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        actual_investment = sum(alloc.target_amount for alloc in validated_allocations)

        portfolio = Portfolio(
            id=portfolio_id,
            total_value=actual_investment,
            total_invested=actual_investment,
            available_cash=request.total_investment - actual_investment,
            unrealized_pnl=0.0,
            unrealized_pnl_percent=0.0,
            realized_pnl=0.0,
            positions=[],  # 아직 매수 전
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        # 전역 변수에 저장
        _current_portfolio = portfolio
        _portfolio_allocations = validated_allocations

        logger.info("Portfolio created successfully",
                   portfolio_id=portfolio_id,
                   actual_investment=actual_investment)

        return ApiResponse(
            success=True,
            data=portfolio,
            message=f"Portfolio created with {len(validated_allocations)} allocations"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Portfolio creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Portfolio creation failed: {str(e)}")


@router.get("/current", response_model=ApiResponse[Portfolio])
async def get_current_portfolio():
    """
    현재 포트폴리오 조회
    """
    try:
        global _current_portfolio

        if not _current_portfolio:
            # 기본 빈 포트폴리오 반환
            default_portfolio = Portfolio(
                id="default",
                total_value=0.0,
                total_invested=0.0,
                available_cash=0.0,
                unrealized_pnl=0.0,
                unrealized_pnl_percent=0.0,
                realized_pnl=0.0,
                positions=[],
                created_at=datetime.now(),
                updated_at=datetime.now()
            )

            logger.info("No active portfolio found, returning default empty portfolio")

            return ApiResponse(
                success=True,
                data=default_portfolio,
                message="No active portfolio - showing empty state"
            )

        # 실시간 가격으로 포트폴리오 업데이트
        updated_portfolio = await _update_portfolio_values(_current_portfolio)

        logger.info("Current portfolio retrieved", portfolio_id=updated_portfolio.id)

        return ApiResponse(
            success=True,
            data=updated_portfolio,
            message="Current portfolio retrieved"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get current portfolio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get portfolio: {str(e)}")


@router.get("/allocations", response_model=ApiResponse[List[PortfolioAllocation]])
async def get_portfolio_allocations():
    """
    포트폴리오 할당 계획 조회
    """
    try:
        global _portfolio_allocations

        if not _portfolio_allocations:
            raise HTTPException(status_code=404, detail="No portfolio allocations found")

        logger.info("Portfolio allocations retrieved", count=len(_portfolio_allocations))

        return ApiResponse(
            success=True,
            data=_portfolio_allocations,
            message=f"Retrieved {len(_portfolio_allocations)} allocations"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get portfolio allocations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get allocations: {str(e)}")


@router.post("/execute-buys", response_model=ApiResponse[List[Position]])
async def execute_buy_orders():
    """
    매수 주문 일괄 실행 (Day 1: 16:00-17:40 시간외 매수)
    """
    try:
        global _current_portfolio, _portfolio_allocations

        if not _current_portfolio or not _portfolio_allocations:
            raise HTTPException(status_code=404, detail="No portfolio or allocations found")

        logger.info("Executing buy orders", allocations_count=len(_portfolio_allocations))

        kis_client = await get_kis_client()
        executed_positions = []

        for allocation in _portfolio_allocations:
            try:
                if allocation.quantity <= 0:
                    continue

                # KIS API로 매수 주문 실행
                order_result = await kis_client.place_buy_order(
                    stock_code=allocation.symbol,
                    quantity=allocation.quantity,
                    price=int(allocation.estimated_price),
                    order_type="00"  # 지정가 주문
                )

                # 주문 성공 시 포지션 생성
                if order_result.get('rt_cd') == '0':  # 성공 코드
                    position = Position(
                        id=f"pos_{allocation.symbol}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                        symbol=allocation.symbol,
                        name=allocation.name,
                        quantity=allocation.quantity,
                        average_price=allocation.estimated_price,
                        current_price=allocation.estimated_price,
                        market_value=allocation.quantity * allocation.estimated_price,
                        unrealized_pnl=0.0,
                        unrealized_pnl_percent=0.0,
                        entry_time=datetime.now()
                    )

                    executed_positions.append(position)
                    logger.info(f"Buy order executed for {allocation.symbol}",
                               quantity=allocation.quantity,
                               price=allocation.estimated_price)

                else:
                    logger.error(f"Buy order failed for {allocation.symbol}",
                                error=order_result.get('msg1', 'Unknown error'))

            except Exception as e:
                logger.error(f"Failed to execute buy order for {allocation.symbol}: {str(e)}")
                continue

        # 포트폴리오 업데이트
        if executed_positions:
            _current_portfolio.positions.extend(executed_positions)
            _current_portfolio.updated_at = datetime.now()

        logger.info(f"Buy orders execution completed: {len(executed_positions)} positions created")

        return ApiResponse(
            success=True,
            data=executed_positions,
            message=f"Executed {len(executed_positions)} buy orders"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to execute buy orders: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to execute buy orders: {str(e)}")


@router.post("/trade", response_model=ApiResponse[dict])
async def execute_trade(request: ExecuteTradeRequest):
    """
    개별 거래 실행 (매수/매도)
    """
    try:
        logger.info("Trade execution requested",
                   symbol=request.symbol,
                   action=request.action,
                   quantity=request.quantity)

        kis_client = await get_kis_client()

        if request.action == "buy":
            result = await kis_client.place_buy_order(
                stock_code=request.symbol,
                quantity=request.quantity,
                price=int(request.price) if request.price else 0,
                order_type="00" if request.order_type == "limit" else "01"
            )
        else:  # sell
            result = await kis_client.place_sell_order(
                stock_code=request.symbol,
                quantity=request.quantity,
                price=int(request.price) if request.price else 0,
                order_type="00" if request.order_type == "limit" else "01"
            )

        success = result.get('rt_cd') == '0'
        message = result.get('msg1', 'Unknown result')

        if success:
            logger.info(f"Trade executed successfully for {request.symbol}")
        else:
            logger.error(f"Trade failed for {request.symbol}: {message}")

        return ApiResponse(
            success=success,
            data=result,
            message=message
        )

    except Exception as e:
        logger.error(f"Trade execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Trade execution failed: {str(e)}")


@router.get("/performance", response_model=ApiResponse[PortfolioPerformance])
async def get_portfolio_performance():
    """
    포트폴리오 성과 분석
    """
    try:
        global _current_portfolio

        if not _current_portfolio:
            # 기본 빈 성과 데이터 반환
            default_performance = PortfolioPerformance(
                total_return=0.0,
                total_return_percent=0.0,
                daily_return=0.0,
                daily_return_percent=0.0,
                win_rate=0.0,
                average_win=0.0,
                average_loss=0.0,
                max_drawdown=0.0
            )

            logger.info("No active portfolio found, returning default empty performance")

            return ApiResponse(
                success=True,
                data=default_performance,
                message="No active portfolio - showing empty performance"
            )

        # 현재 포트폴리오 값 업데이트
        updated_portfolio = await _update_portfolio_values(_current_portfolio)

        # 성과 지표 계산
        total_return = updated_portfolio.unrealized_pnl + updated_portfolio.realized_pnl
        total_return_percent = (total_return / updated_portfolio.total_invested * 100) if updated_portfolio.total_invested > 0 else 0

        # 일일 수익률 (단순화)
        daily_return = updated_portfolio.unrealized_pnl
        daily_return_percent = updated_portfolio.unrealized_pnl_percent

        # 승률 계산 (수익 포지션 비율)
        profitable_positions = sum(1 for pos in updated_portfolio.positions if pos.unrealized_pnl > 0)
        total_positions = len(updated_portfolio.positions)
        win_rate = (profitable_positions / total_positions * 100) if total_positions > 0 else 0

        # 평균 수익/손실
        profits = [pos.unrealized_pnl for pos in updated_portfolio.positions if pos.unrealized_pnl > 0]
        losses = [pos.unrealized_pnl for pos in updated_portfolio.positions if pos.unrealized_pnl < 0]

        avg_win = sum(profits) / len(profits) if profits else 0
        avg_loss = sum(losses) / len(losses) if losses else 0

        # 최대 낙폭 (단순화 - 현재 미실현 손실 중 최대값)
        max_drawdown = min([pos.unrealized_pnl for pos in updated_portfolio.positions], default=0)

        performance = PortfolioPerformance(
            total_return=total_return,
            total_return_percent=total_return_percent,
            daily_return=daily_return,
            daily_return_percent=daily_return_percent,
            win_rate=win_rate,
            average_win=avg_win,
            average_loss=avg_loss,
            max_drawdown=max_drawdown
        )

        logger.info("Portfolio performance calculated",
                   total_return=total_return,
                   win_rate=win_rate)

        return ApiResponse(
            success=True,
            data=performance,
            message="Portfolio performance calculated"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to calculate portfolio performance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate performance: {str(e)}")


async def _update_portfolio_values(portfolio: Portfolio) -> Portfolio:
    """포트폴리오 실시간 가치 업데이트"""
    try:
        if not portfolio.positions:
            return portfolio

        kis_client = await get_kis_client()
        updated_positions = []
        total_market_value = 0
        total_unrealized_pnl = 0

        for position in portfolio.positions:
            try:
                # 현재 가격 조회
                stock_data = await kis_client.get_stock_detail(position.symbol)
                current_price = float(stock_data.get('stck_prpr', position.current_price))

                # 포지션 값 업데이트
                market_value = position.quantity * current_price
                unrealized_pnl = market_value - (position.quantity * position.average_price)
                unrealized_pnl_percent = (unrealized_pnl / (position.quantity * position.average_price) * 100) if position.average_price > 0 else 0

                updated_position = position.copy()
                updated_position.current_price = current_price
                updated_position.market_value = market_value
                updated_position.unrealized_pnl = unrealized_pnl
                updated_position.unrealized_pnl_percent = unrealized_pnl_percent

                updated_positions.append(updated_position)

                total_market_value += market_value
                total_unrealized_pnl += unrealized_pnl

            except Exception as e:
                logger.warning(f"Failed to update position {position.symbol}: {str(e)}")
                updated_positions.append(position)
                total_market_value += position.market_value
                total_unrealized_pnl += position.unrealized_pnl

        # 포트폴리오 총 값 업데이트
        updated_portfolio = portfolio.copy()
        updated_portfolio.positions = updated_positions
        updated_portfolio.total_value = total_market_value + portfolio.available_cash
        updated_portfolio.unrealized_pnl = total_unrealized_pnl
        updated_portfolio.unrealized_pnl_percent = (total_unrealized_pnl / portfolio.total_invested * 100) if portfolio.total_invested > 0 else 0
        updated_portfolio.updated_at = datetime.now()

        return updated_portfolio

    except Exception as e:
        logger.error(f"Failed to update portfolio values: {str(e)}")
        return portfolio