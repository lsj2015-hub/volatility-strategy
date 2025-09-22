"""
WebSocket endpoint for real-time data streaming
"""

import json
import asyncio
import logging
from datetime import datetime
from typing import Dict, Set, Any
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.routing import APIRouter

logger = logging.getLogger(__name__)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.subscriptions: Dict[str, Set[str]] = {}  # client_id -> set of symbols

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.subscriptions[client_id] = set()
        logger.info(f"WebSocket client {client_id} connected")

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.subscriptions:
            del self.subscriptions[client_id]
        logger.info(f"WebSocket client {client_id} disconnected")

    async def send_personal_message(self, message: dict, client_id: str):
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message to {client_id}: {e}")
                self.disconnect(client_id)

    async def broadcast(self, message: dict):
        disconnected = []
        for client_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error broadcasting to {client_id}: {e}")
                disconnected.append(client_id)

        # Clean up disconnected clients
        for client_id in disconnected:
            self.disconnect(client_id)

    async def broadcast_to_subscribers(self, message: dict, symbol: str):
        disconnected = []
        for client_id, websocket in self.active_connections.items():
            if symbol in self.subscriptions.get(client_id, set()):
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Error sending to subscriber {client_id}: {e}")
                    disconnected.append(client_id)

        # Clean up disconnected clients
        for client_id in disconnected:
            self.disconnect(client_id)

    def subscribe(self, client_id: str, symbols: list):
        if client_id in self.subscriptions:
            self.subscriptions[client_id].update(symbols)
            logger.info(f"Client {client_id} subscribed to {symbols}")

    def unsubscribe(self, client_id: str, symbols: list):
        if client_id in self.subscriptions:
            self.subscriptions[client_id].difference_update(symbols)
            logger.info(f"Client {client_id} unsubscribed from {symbols}")

# Global connection manager instance
manager = ConnectionManager()

# WebSocket router
ws_router = APIRouter()

@ws_router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Generate unique client ID
    client_id = f"client_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"

    await manager.connect(websocket, client_id)

    # Send initial heartbeat
    await manager.send_personal_message({
        "type": "heartbeat",
        "timestamp": datetime.now().isoformat(),
        "data": {"client_id": client_id}
    }, client_id)

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)

            await handle_client_message(message, client_id)

    except WebSocketDisconnect:
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error for client {client_id}: {e}")
    finally:
        manager.disconnect(client_id)

async def handle_client_message(message: dict, client_id: str):
    """Handle incoming messages from WebSocket clients"""
    try:
        message_type = message.get("type")
        data = message.get("data", {})

        if message_type == "subscribe":
            symbols = data.get("symbols", [])
            manager.subscribe(client_id, symbols)

            # Send subscription confirmation
            await manager.send_personal_message({
                "type": "subscription_confirmed",
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "symbols": symbols,
                    "status": "subscribed"
                }
            }, client_id)

        elif message_type == "unsubscribe":
            symbols = data.get("symbols", [])
            manager.unsubscribe(client_id, symbols)

            # Send unsubscription confirmation
            await manager.send_personal_message({
                "type": "subscription_confirmed",
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "symbols": symbols,
                    "status": "unsubscribed"
                }
            }, client_id)

        elif message_type == "heartbeat":
            # Respond to heartbeat
            await manager.send_personal_message({
                "type": "heartbeat",
                "timestamp": datetime.now().isoformat(),
                "data": {"status": "alive"}
            }, client_id)

        else:
            logger.warning(f"Unknown message type: {message_type} from client {client_id}")

    except Exception as e:
        logger.error(f"Error handling client message: {e}")
        await manager.send_personal_message({
            "type": "error",
            "timestamp": datetime.now().isoformat(),
            "data": {"message": "Invalid message format"}
        }, client_id)

# Functions for sending data to clients
async def send_price_update(symbol: str, price: float, change: float, change_percent: float, volume: int):
    """Send price update to all subscribers of the symbol"""
    message = {
        "type": "price_update",
        "timestamp": datetime.now().isoformat(),
        "data": {
            "symbol": symbol,
            "price": price,
            "change": change,
            "changePercent": change_percent,
            "volume": volume
        }
    }
    await manager.broadcast_to_subscribers(message, symbol)

async def send_buy_signal(symbol: str, price: float, quantity: int, reason: str, order_id: str = None):
    """Send buy signal to all connected clients"""
    message = {
        "type": "buy_signal",
        "timestamp": datetime.now().isoformat(),
        "data": {
            "symbol": symbol,
            "price": price,
            "quantity": quantity,
            "reason": reason,
            "orderId": order_id
        }
    }
    await manager.broadcast(message)

async def send_sell_signal(symbol: str, price: float, quantity: int, reason: str, order_id: str = None):
    """Send sell signal to all connected clients"""
    message = {
        "type": "sell_signal",
        "timestamp": datetime.now().isoformat(),
        "data": {
            "symbol": symbol,
            "price": price,
            "quantity": quantity,
            "reason": reason,
            "orderId": order_id
        }
    }
    await manager.broadcast(message)

async def send_order_update(order_id: str, symbol: str, status: str, data: dict = None):
    """Send order status update to all connected clients"""
    message = {
        "type": "order_update",
        "timestamp": datetime.now().isoformat(),
        "data": {
            "orderId": order_id,
            "symbol": symbol,
            "status": status,
            **(data or {})
        }
    }
    await manager.broadcast(message)

async def send_session_status(day: str, phase: str, status: str, next_action: str = None, next_action_time: str = None):
    """Send session status update to all connected clients"""
    message = {
        "type": "session_status",
        "timestamp": datetime.now().isoformat(),
        "data": {
            "day": day,
            "phase": phase,
            "status": status,
            "nextAction": next_action,
            "nextActionTime": next_action_time
        }
    }
    await manager.broadcast(message)

async def send_monitoring_status_update(status_data: dict):
    """Send monitoring session status update to all connected clients"""
    message = {
        "type": "monitoring_status_update",
        "timestamp": datetime.now().isoformat(),
        "data": status_data
    }
    await manager.broadcast(message)

async def send_portfolio_update(total_value: float, unrealized_pnl: float, unrealized_pnl_percent: float,
                               position_count: int, changes: list):
    """Send portfolio update to all connected clients"""
    message = {
        "type": "portfolio_update",
        "timestamp": datetime.now().isoformat(),
        "data": {
            "totalValue": total_value,
            "unrealizedPnL": unrealized_pnl,
            "unrealizedPnLPercent": unrealized_pnl_percent,
            "positionCount": position_count,
            "changes": changes
        }
    }
    await manager.broadcast(message)

async def send_error_message(error_message: str, client_id: str = None):
    """Send error message to specific client or broadcast to all"""
    message = {
        "type": "error",
        "timestamp": datetime.now().isoformat(),
        "data": {"message": error_message}
    }

    if client_id:
        await manager.send_personal_message(message, client_id)
    else:
        await manager.broadcast(message)

# Heartbeat task
async def send_heartbeat():
    """Send periodic heartbeat to all connected clients"""
    while True:
        if manager.active_connections:
            await manager.broadcast({
                "type": "heartbeat",
                "timestamp": datetime.now().isoformat(),
                "data": {"server_status": "alive"}
            })
        await asyncio.sleep(30)  # Send heartbeat every 30 seconds

# Get connection status
def get_connection_status():
    """Get current WebSocket connection status"""
    return {
        "active_connections": len(manager.active_connections),
        "total_subscriptions": sum(len(subs) for subs in manager.subscriptions.values()),
        "clients": list(manager.active_connections.keys())
    }

# Additional WebSocket functions for trading system
async def send_position_update(position_id: str, symbol: str, status: str, data: dict = None):
    """Send position update to all connected clients"""
    message = {
        "type": "position_update",
        "timestamp": datetime.now().isoformat(),
        "data": {
            "positionId": position_id,
            "symbol": symbol,
            "status": status,
            **(data or {})
        }
    }
    await manager.broadcast(message)

async def send_exit_signal(position_id: str, symbol: str, current_price: float, reason: str, urgency: str, pnl_percent: float):
    """Send exit signal to all connected clients"""
    message = {
        "type": "exit_signal",
        "timestamp": datetime.now().isoformat(),
        "data": {
            "positionId": position_id,
            "symbol": symbol,
            "currentPrice": current_price,
            "reason": reason,
            "urgency": urgency,
            "pnlPercent": pnl_percent
        }
    }
    await manager.broadcast(message)

async def send_strategy_update(data: dict):
    """Send strategy update to all connected clients"""
    message = {
        "type": "strategy_update",
        "timestamp": datetime.now().isoformat(),
        "data": data
    }
    await manager.broadcast(message)

async def send_trading_status(status: str, components: dict, timestamp: str):
    """Send trading system status to all connected clients"""
    message = {
        "type": "trading_status",
        "timestamp": timestamp,
        "data": {
            "status": status,
            "components": components
        }
    }
    await manager.broadcast(message)

async def send_system_alert(level: str, message: str, timestamp: str):
    """Send system alert to all connected clients"""
    alert_message = {
        "type": "system_alert",
        "timestamp": timestamp,
        "data": {
            "level": level,
            "message": message
        }
    }
    await manager.broadcast(alert_message)