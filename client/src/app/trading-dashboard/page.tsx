'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { tradingApi } from '@/lib/api';
import {
  TradingSystemStatus,
  TradingPosition,
  BuyOrder,
  TradingStats,
  ExitStrategy
} from '@/types';

export default function TradingDashboardPage() {
  const [systemStatus, setSystemStatus] = useState<TradingSystemStatus | null>(null);
  const [positions, setPositions] = useState<TradingPosition[]>([]);
  const [orders, setOrders] = useState<BuyOrder[]>([]);
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [exitStrategy, setExitStrategy] = useState<ExitStrategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-refresh data every 5 seconds
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusRes, positionsRes, ordersRes, statsRes, exitRes] = await Promise.all([
          tradingApi.getSystemStatus(),
          tradingApi.getAllPositions(),
          tradingApi.getAllOrders(),
          tradingApi.getTradingStats(),
          tradingApi.getExitStrategy()
        ]);

        setSystemStatus(statusRes);
        setPositions(positionsRes.positions || []);
        setOrders(ordersRes.pending?.slice(0, 5) || []); // Show recent 5 orders
        setStats(statsRes);
        setExitStrategy(exitRes);
        setError(null);
      } catch (err) {
        setError(`Failed to fetch trading data: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStartSystem = async () => {
    try {
      await tradingApi.startTradingSystem();
      setError(null);
    } catch (err) {
      setError(`Failed to start trading system: ${err}`);
    }
  };

  const handleStopSystem = async () => {
    try {
      await tradingApi.stopTradingSystem();
      setError(null);
    } catch (err) {
      setError(`Failed to stop trading system: ${err}`);
    }
  };

  const handleForceExitAll = async () => {
    if (!confirm('Are you sure you want to force exit all positions?')) return;

    try {
      await tradingApi.forceExitAll('Manual force exit from dashboard');
      setError(null);
    } catch (err) {
      setError(`Failed to force exit positions: ${err}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'stopped': return 'bg-red-500';
      case 'starting': case 'stopping': return 'bg-yellow-500';
      case 'error': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  const getPositionPnLColor = (pnl: number | undefined) => {
    if (!pnl) return 'text-gray-500';
    return pnl >= 0 ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading trading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trading Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time automated trading system control and monitoring
          </p>
        </div>

        <div className="flex items-center gap-4">
          {systemStatus && (
            <Badge className={`${getStatusColor(systemStatus.status)} text-white`}>
              {systemStatus.status.toUpperCase()}
            </Badge>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* System Control */}
      <Card>
        <CardHeader>
          <CardTitle>System Control</CardTitle>
          <CardDescription>Start, stop, and monitor the automated trading system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleStartSystem}
              disabled={systemStatus?.status === 'running'}
              className="bg-green-600 hover:bg-green-700"
            >
              Start Trading
            </Button>
            <Button
              onClick={handleStopSystem}
              disabled={systemStatus?.status === 'stopped'}
              variant="outline"
            >
              Stop Trading
            </Button>
            <Button
              onClick={handleForceExitAll}
              disabled={!positions.length}
              variant="destructive"
            >
              Force Exit All
            </Button>
          </div>

          {systemStatus && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Uptime</p>
                <p className="text-lg font-semibold">
                  {Math.floor(systemStatus.uptime_seconds / 3600)}h {Math.floor((systemStatus.uptime_seconds % 3600) / 60)}m
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Active Orders</p>
                <p className="text-lg font-semibold">{systemStatus.active_orders_count}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Active Positions</p>
                <p className="text-lg font-semibold">{systemStatus.active_positions_count}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Components</p>
                <p className="text-lg font-semibold">
                  {Object.values(systemStatus.components).filter(Boolean).length}/
                  {Object.keys(systemStatus.components).length}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Overview */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Statistics</CardTitle>
            <CardDescription>Overall trading performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total P&L</p>
                <p className={`text-lg font-semibold ${getPositionPnLColor(stats.total_pnl)}`}>
                  ₩{stats.total_pnl?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-lg font-semibold">{(stats.win_rate * 100).toFixed(1)}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Avg Return</p>
                <p className={`text-lg font-semibold ${getPositionPnLColor(stats.average_return)}`}>
                  {(stats.average_return * 100).toFixed(2)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Trades</p>
                <p className="text-lg font-semibold">{stats.total_orders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Positions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Positions</CardTitle>
          <CardDescription>Current open trading positions</CardDescription>
        </CardHeader>
        <CardContent>
          {positions.length > 0 ? (
            <div className="space-y-4">
              {positions.map((position) => (
                <div key={position.position_id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{position.symbol}</h3>
                      <Badge variant="outline">{position.stock_name}</Badge>
                      <Badge variant={position.day_type === 'day2' ? 'destructive' : 'default'}>
                        {position.day_type.toUpperCase()}
                      </Badge>
                    </div>
                    <Badge className={position.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                      {position.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Entry Price</p>
                      <p className="font-semibold">₩{position.entry_price.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Quantity</p>
                      <p className="font-semibold">{position.quantity}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Current Price</p>
                      <p className="font-semibold">₩{position.current_price?.toLocaleString() || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Unrealized P&L</p>
                      <p className={`font-semibold ${getPositionPnLColor(position.unrealized_pnl)}`}>
                        ₩{position.unrealized_pnl?.toLocaleString() || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">P&L %</p>
                      <p className={`font-semibold ${getPositionPnLColor(position.unrealized_pnl_percent)}`}>
                        {position.unrealized_pnl_percent ? `${(position.unrealized_pnl_percent).toFixed(2)}%` : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <div className="text-xs text-muted-foreground">
                      Target: {position.target_profit_percent}% |
                      Stop: {position.stop_loss_percent}% |
                      Max Hold: {position.max_hold_hours}h
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No active positions
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Latest buy orders and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length > 0 ? (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.order_id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-semibold">{order.symbol}</p>
                      <p className="text-sm text-muted-foreground">{order.stock_name}</p>
                    </div>
                    <div className="text-sm">
                      <p>₩{order.target_price.toLocaleString()} × {order.quantity}</p>
                      <p className="text-muted-foreground">{new Date(order.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <Badge className={order.status === 'completed' ? 'bg-green-500' :
                                  order.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}>
                    {order.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No recent orders
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}