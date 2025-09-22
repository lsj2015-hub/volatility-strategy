'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { tradingApi } from '@/lib/api';
import { BuyOrder, BuyOrderRequest } from '@/types';

export default function OrderManagement() {
  const [orders, setOrders] = useState<{ pending: BuyOrder[], completed: BuyOrder[] }>({
    pending: [],
    completed: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOrderLoading, setCreateOrderLoading] = useState(false);

  // New order form state
  const [newOrder, setNewOrder] = useState<BuyOrderRequest>({
    symbol: '',
    stock_name: '',
    target_price: 0,
    investment_amount: 100000 // Default 100,000 KRW
  });

  // Fetch orders data
  const fetchOrders = async () => {
    try {
      const response = await tradingApi.getAllOrders();
      setOrders(response);
      setError(null);
    } catch (err) {
      setError(`Failed to fetch orders: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Refresh every 10 seconds
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.symbol || !newOrder.stock_name || newOrder.target_price <= 0 || newOrder.investment_amount <= 0) {
      setError('Please fill in all required fields with valid values');
      return;
    }

    setCreateOrderLoading(true);
    try {
      await tradingApi.createBuyOrder(newOrder);
      setNewOrder({
        symbol: '',
        stock_name: '',
        target_price: 0,
        investment_amount: 100000
      });
      await fetchOrders(); // Refresh orders list
      setError(null);
    } catch (err) {
      setError(`Failed to create order: ${err}`);
    } finally {
      setCreateOrderLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
      await tradingApi.cancelOrder(orderId);
      await fetchOrders(); // Refresh orders list
      setError(null);
    } catch (err) {
      setError(`Failed to cancel order: ${err}`);
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': case 'cancelled': return 'bg-red-500';
      case 'executing': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const calculateQuantity = (price: number, amount: number) => {
    if (price <= 0) return 0;
    return Math.floor(amount / price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Create New Order */}
      <Card>
        <CardHeader>
          <CardTitle>Create Buy Order</CardTitle>
          <CardDescription>
            Create a new automated buy order for selected stock
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateOrder} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="symbol">Stock Symbol</Label>
                <Input
                  id="symbol"
                  placeholder="e.g., 005930"
                  value={newOrder.symbol}
                  onChange={(e) => setNewOrder({ ...newOrder, symbol: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock_name">Stock Name</Label>
                <Input
                  id="stock_name"
                  placeholder="e.g., 삼성전자"
                  value={newOrder.stock_name}
                  onChange={(e) => setNewOrder({ ...newOrder, stock_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target_price">Target Price (KRW)</Label>
                <Input
                  id="target_price"
                  type="number"
                  placeholder="75000"
                  value={newOrder.target_price || ''}
                  onChange={(e) => setNewOrder({ ...newOrder, target_price: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="investment_amount">Investment Amount (KRW)</Label>
                <Input
                  id="investment_amount"
                  type="number"
                  placeholder="100000"
                  value={newOrder.investment_amount || ''}
                  onChange={(e) => setNewOrder({ ...newOrder, investment_amount: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Calculated Quantity</Label>
                <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 flex items-center">
                  {calculateQuantity(newOrder.target_price, newOrder.investment_amount)} shares
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={createOrderLoading}
              className="w-full md:w-auto"
            >
              {createOrderLoading ? 'Creating Order...' : 'Create Buy Order'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Pending Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Orders ({orders.pending.length})</CardTitle>
          <CardDescription>Orders waiting to be executed</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.pending.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Stock Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.pending.map((order) => (
                  <TableRow key={order.order_id}>
                    <TableCell className="font-medium">{order.symbol}</TableCell>
                    <TableCell>{order.stock_name}</TableCell>
                    <TableCell>₩{order.target_price.toLocaleString()}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>
                      <Badge className={`${getOrderStatusColor(order.status)} text-white`}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelOrder(order.order_id)}
                        disabled={order.status !== 'pending'}
                      >
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No pending orders
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order History */}
      <Card>
        <CardHeader>
          <CardTitle>Order History ({orders.completed.length})</CardTitle>
          <CardDescription>Completed, failed, and cancelled orders</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.completed.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Stock Name</TableHead>
                  <TableHead>Target Price</TableHead>
                  <TableHead>Actual Price</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Executed</TableHead>
                  <TableHead>KIS Order ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.completed.slice(0, 20).map((order) => (
                  <TableRow key={order.order_id}>
                    <TableCell className="font-medium">{order.symbol}</TableCell>
                    <TableCell>{order.stock_name}</TableCell>
                    <TableCell>₩{order.target_price.toLocaleString()}</TableCell>
                    <TableCell>
                      {order.actual_price ? `₩${order.actual_price.toLocaleString()}` : 'N/A'}
                    </TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>
                      <Badge className={`${getOrderStatusColor(order.status)} text-white`}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {order.executed_at ? new Date(order.executed_at).toLocaleString() : 'N/A'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {order.kis_order_id || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No order history
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}