'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getWebSocketClient } from '@/lib/websocket/client';
import {
  WebSocketMessage,
  WebSocketConnectionStatus,
  PriceUpdateMessage,
  BuySignalMessage,
  SellSignalMessage,
  SessionStatusMessage,
  PortfolioUpdateMessage
} from '@/types/websocket';

// Main WebSocket hook
export function useWebSocket() {
  const [status, setStatus] = useState<WebSocketConnectionStatus>({
    connected: false,
    reconnecting: false,
    errorCount: 0
  });

  const clientRef = useRef(getWebSocketClient());

  useEffect(() => {
    const client = clientRef.current;

    // Status subscription
    const unsubscribeStatus = client.onStatusChange(setStatus);

    // Initialize connection
    client.connect().catch(error => {
      console.error('Failed to connect WebSocket:', error);
    });

    return () => {
      unsubscribeStatus();
    };
  }, []);

  const connect = useCallback(() => {
    return clientRef.current.connect();
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current.disconnect();
  }, []);

  const send = useCallback((message: object) => {
    clientRef.current.send(message);
  }, []);

  return {
    status,
    connect,
    disconnect,
    send,
    client: clientRef.current
  };
}

// Hook for subscribing to specific WebSocket events
export function useWebSocketEvent<T extends WebSocketMessage>(
  eventType: T['type'],
  handler: (message: T) => void
) {
  const clientRef = useRef(getWebSocketClient());
  const handlerRef = useRef(handler);

  // Keep handler reference up to date
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const client = clientRef.current;

    // Type-safe wrapper that matches the WebSocket client API
    const eventHandler = (message: WebSocketMessage) => {
      if (message.type === eventType) {
        handlerRef.current(message as T);
      }
    };

    const unsubscribe = client.on('*', eventHandler);
    return unsubscribe;
  }, [eventType]);
}

// Hook for price updates
export function usePriceUpdates() {
  const [prices, setPrices] = useState<Map<string, PriceUpdateMessage['data']>>(new Map());
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  useWebSocketEvent('price_update', (message: PriceUpdateMessage) => {
    setPrices(prev => {
      const updated = new Map(prev);
      updated.set(message.data.symbol, message.data);
      return updated;
    });
    setLastUpdate(message.timestamp);
  });

  const getPriceData = useCallback((symbol: string) => {
    return prices.get(symbol) || null;
  }, [prices]);

  const getAllPrices = useCallback(() => {
    return Array.from(prices.entries()).map(([symbol, data]) => ({
      ...data,
      symbol // This ensures the symbol from data is used, but adds it explicitly
    }));
  }, [prices]);

  return {
    prices: getAllPrices(),
    getPriceData,
    lastUpdate
  };
}

// Hook for buy signals
export function useBuySignals() {
  const [signals, setSignals] = useState<BuySignalMessage[]>([]);
  const [latestSignal, setLatestSignal] = useState<BuySignalMessage | null>(null);

  useWebSocketEvent('buy_signal', (message: BuySignalMessage) => {
    setSignals(prev => [message, ...prev.slice(0, 99)]); // Keep last 100 signals
    setLatestSignal(message);
  });

  const clearSignals = useCallback(() => {
    setSignals([]);
    setLatestSignal(null);
  }, []);

  return {
    signals,
    latestSignal,
    clearSignals
  };
}

// Hook for sell signals
export function useSellSignals() {
  const [signals, setSignals] = useState<SellSignalMessage[]>([]);
  const [latestSignal, setLatestSignal] = useState<SellSignalMessage | null>(null);

  useWebSocketEvent('sell_signal', (message: SellSignalMessage) => {
    setSignals(prev => [message, ...prev.slice(0, 99)]); // Keep last 100 signals
    setLatestSignal(message);
  });

  const clearSignals = useCallback(() => {
    setSignals([]);
    setLatestSignal(null);
  }, []);

  return {
    signals,
    latestSignal,
    clearSignals
  };
}

// Hook for session status
export function useSessionStatus() {
  const [status, setStatus] = useState<SessionStatusMessage['data'] | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  useWebSocketEvent('session_status', (message: SessionStatusMessage) => {
    setStatus(message.data);
    setLastUpdate(message.timestamp);
  });

  return {
    status,
    lastUpdate
  };
}

// Hook for portfolio updates
export function usePortfolioUpdates() {
  const [portfolio, setPortfolio] = useState<PortfolioUpdateMessage['data'] | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [recentChanges, setRecentChanges] = useState<PortfolioUpdateMessage['data']['changes']>([]);

  useWebSocketEvent('portfolio_update', (message: PortfolioUpdateMessage) => {
    setPortfolio(message.data);
    setLastUpdate(message.timestamp);

    // Keep track of recent changes (last 50)
    setRecentChanges(prev => [
      ...message.data.changes,
      ...prev.slice(0, 50 - message.data.changes.length)
    ]);
  });

  return {
    portfolio,
    lastUpdate,
    recentChanges
  };
}

// Hook for monitoring real-time data - combines multiple data sources
export function useMonitoringData() {
  const { status: wsStatus } = useWebSocket();
  const { prices, lastUpdate: pricesLastUpdate } = usePriceUpdates();
  const { latestSignal: buySignal } = useBuySignals();
  const { latestSignal: sellSignal } = useSellSignals();
  const { status: sessionStatus } = useSessionStatus();
  const { portfolio } = usePortfolioUpdates();

  const isLive = wsStatus.connected && !wsStatus.reconnecting;
  const lastDataUpdate = pricesLastUpdate || wsStatus.lastHeartbeat;

  return {
    // Connection status
    isConnected: wsStatus.connected,
    isReconnecting: wsStatus.reconnecting,
    isLive,
    lastDataUpdate,

    // Market data
    prices,

    // Trading signals
    latestBuySignal: buySignal,
    latestSellSignal: sellSignal,

    // Session info
    sessionStatus,

    // Portfolio
    portfolio
  };
}

// Hook for managing WebSocket subscriptions
export function useWebSocketSubscription() {
  const { client, status } = useWebSocket();

  const subscribe = useCallback((symbols: string[]) => {
    if (status.connected) {
      client.send({
        type: 'subscribe',
        data: { symbols }
      });
    }
  }, [client, status.connected]);

  const unsubscribe = useCallback((symbols: string[]) => {
    if (status.connected) {
      client.send({
        type: 'unsubscribe',
        data: { symbols }
      });
    }
  }, [client, status.connected]);

  return {
    subscribe,
    unsubscribe,
    isConnected: status.connected
  };
}

// Hook for real-time stock list monitoring
export function useStockListMonitoring(stockCodes: string[]) {
  const { subscribe, unsubscribe } = useWebSocketSubscription();
  const { prices } = usePriceUpdates();

  useEffect(() => {
    if (stockCodes.length > 0) {
      subscribe(stockCodes);

      return () => {
        unsubscribe(stockCodes);
      };
    }
  }, [stockCodes, subscribe, unsubscribe]);

  // Filter prices for only the stocks we're monitoring
  const monitoredPrices = prices.filter(price =>
    stockCodes.includes(price.symbol)
  );

  return {
    prices: monitoredPrices,
    stockCount: stockCodes.length,
    pricesReceived: monitoredPrices.length
  };
}