// API request/response types

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Authentication types
export interface AuthStatus {
  isAuthenticated: boolean;
  accessToken?: string;
  tokenExpiry?: string;
  scope?: string;
}

export interface KisApiCredentials {
  appKey: string;
  appSecret: string;
  environment: 'sandbox' | 'production';
}