'use client';

import {
  WebSocketMessage,
  WebSocketConnectionStatus
} from '@/types/websocket';

type WebSocketEventHandler = (message: WebSocketMessage) => void;
type ConnectionStatusHandler = (status: WebSocketConnectionStatus) => void;

interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private eventHandlers: Map<string, Set<WebSocketEventHandler>> = new Map();
  private statusHandlers: Set<ConnectionStatusHandler> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isManualClose = false;

  private status: WebSocketConnectionStatus = {
    connected: false,
    reconnecting: false,
    errorCount: 0
  };

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.isManualClose = false;

      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.status = {
            connected: true,
            reconnecting: false,
            errorCount: 0,
            lastHeartbeat: new Date().toISOString()
          };
          this.reconnectAttempts = 0;
          this.notifyStatusHandlers();
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.status.connected = false;
          this.stopHeartbeat();

          if (!this.isManualClose && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.attemptReconnect();
          } else {
            this.status.reconnecting = false;
          }

          this.notifyStatusHandlers();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.status.errorCount++;
          this.notifyStatusHandlers();

          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket connection failed'));
          }
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.isManualClose = true;
    this.stopReconnect();
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }

    this.status = {
      connected: false,
      reconnecting: false,
      errorCount: 0
    };
    this.notifyStatusHandlers();
  }

  private attemptReconnect(): void {
    if (this.reconnectTimer || this.isManualClose) return;

    this.status.reconnecting = true;
    this.reconnectAttempts++;
    this.notifyStatusHandlers();

    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
          this.status.reconnecting = false;
          this.notifyStatusHandlers();
        }
      });
    }, this.config.reconnectInterval);
  }

  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() }));
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    // Update heartbeat timestamp for heartbeat messages
    if (message.type === 'heartbeat') {
      this.status.lastHeartbeat = message.timestamp;
      this.notifyStatusHandlers();
      return;
    }

    // Notify type-specific handlers
    const typeHandlers = this.eventHandlers.get(message.type);
    if (typeHandlers) {
      typeHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('Error in WebSocket event handler:', error);
        }
      });
    }

    // Notify global handlers
    const globalHandlers = this.eventHandlers.get('*');
    if (globalHandlers) {
      globalHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('Error in WebSocket global handler:', error);
        }
      });
    }
  }

  private notifyStatusHandlers(): void {
    this.statusHandlers.forEach(handler => {
      try {
        handler({ ...this.status });
      } catch (error) {
        console.error('Error in WebSocket status handler:', error);
      }
    });
  }

  // Event subscription methods
  on<T extends WebSocketMessage>(
    event: T['type'] | '*' | string,
    handler: (message: T) => void
  ): () => void {
    const eventHandler = handler as WebSocketEventHandler;
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    const handlers = this.eventHandlers.get(event)!;
    handlers.add(eventHandler);

    // Return unsubscribe function
    return () => {
      handlers.delete(eventHandler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    };
  }

  onStatusChange(handler: ConnectionStatusHandler): () => void {
    this.statusHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  // Send methods
  send(message: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }

  // Status getters
  getStatus(): WebSocketConnectionStatus {
    return { ...this.status };
  }

  isConnected(): boolean {
    return this.status.connected;
  }

  isReconnecting(): boolean {
    return this.status.reconnecting;
  }
}

// Singleton instance for global use
let globalWebSocketClient: WebSocketClient | null = null;

export function getWebSocketClient(): WebSocketClient {
  if (!globalWebSocketClient) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8001/ws';
    globalWebSocketClient = new WebSocketClient({ url: wsUrl });
  }
  return globalWebSocketClient;
}

export function initializeWebSocket(): Promise<void> {
  const client = getWebSocketClient();
  return client.connect();
}

export function disconnectWebSocket(): void {
  if (globalWebSocketClient) {
    globalWebSocketClient.disconnect();
    globalWebSocketClient = null;
  }
}