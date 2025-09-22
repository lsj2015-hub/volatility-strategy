/**
 * 시스템 상태 및 인증 관련 API 서비스
 */

import { apiClient } from './client';
import { ApiResponse } from '@/types';

export interface AuthStatus {
  authenticated: boolean;
  token_expires_at: string | null;
  api_configured: boolean;
  base_url: string;
  timestamp: string;
}

export interface SystemStatus {
  api_connection: boolean;
  kis_api: boolean;
  data_stream: 'active' | 'standby' | 'error';
  last_update: string;
  server_time: string;
}

export class SystemService {
  /**
   * 인증 상태 조회
   */
  static async getAuthStatus(): Promise<AuthStatus> {
    const response = await apiClient.get<AuthStatus>('/api/auth/status');

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get auth status');
    }

    return response.data;
  }

  /**
   * 시스템 상태 조회
   */
  static async getSystemStatus(): Promise<SystemStatus> {
    try {
      // 인증 상태부터 확인
      const authStatus = await this.getAuthStatus();

      return {
        api_connection: true,
        kis_api: authStatus.api_configured && authStatus.authenticated,
        data_stream: (authStatus.api_configured && authStatus.authenticated) ? 'active' : 'standby',
        last_update: new Date().toISOString(),
        server_time: new Date().toISOString()
      };
    } catch (error) {
      return {
        api_connection: false,
        kis_api: false,
        data_stream: 'error',
        last_update: new Date().toISOString(),
        server_time: new Date().toISOString()
      };
    }
  }

  /**
   * 서버 헬스체크
   */
  static async healthCheck(): Promise<boolean> {
    try {
      return await apiClient.healthCheck();
    } catch {
      return false;
    }
  }
}