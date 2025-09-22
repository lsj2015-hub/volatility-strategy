'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OrderManagement from '@/components/trading/OrderManagement';
import ExitStrategyControls from '@/components/trading/ExitStrategyControls';

export default function TradingControlPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trading Control Center</h1>
          <p className="text-muted-foreground">
            Manage orders, positions, and exit strategies for automated trading
          </p>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders">Order Management</TabsTrigger>
            <TabsTrigger value="exit-strategy">Exit Strategy</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            <OrderManagement />
          </TabsContent>

          <TabsContent value="exit-strategy" className="space-y-6">
            <ExitStrategyControls />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}