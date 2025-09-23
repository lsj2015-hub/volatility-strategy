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

  /**
   * KIS API 연결 테스트
   */
  static async testKISConnection(): Promise<{ success: boolean; message: string; timestamp: string }> {
    try {
      console.log('🔄 SystemService: Starting KIS API connection test...');
      console.log('🌐 Making request to: /api/auth/test');

      const response = await apiClient.get<{ success: boolean; message: string; test_result: any; timestamp: string }>('/api/auth/test');

      console.log('📨 Raw API response:', response);
      console.log('✅ Response success:', response.success);
      console.log('📦 Response data:', response.data);

      if (!response.success || !response.data) {
        console.error('❌ Response validation failed');
        console.error('  - response.success:', response.success);
        console.error('  - response.data:', response.data);
        console.error('  - response.error:', response.error);
        throw new Error(response.error || 'Failed to test KIS API connection');
      }

      const result = {
        success: response.data.success,
        message: response.data.message,
        timestamp: response.data.timestamp
      };

      console.log('🎯 Final result:', result);
      return result;

    } catch (error) {
      console.error('💥 SystemService.testKISConnection error:', error);
      console.error('  - Error type:', typeof error);
      console.error('  - Error constructor:', error?.constructor?.name);
      console.error('  - Error message:', error instanceof Error ? error.message : 'Unknown');
      console.error('  - Full error object:', error);

      return {
        success: false,
        message: error instanceof Error ? error.message : 'KIS API 연결 테스트 실패',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * KIS API 토큰 갱신
   */
  static async refreshKISToken(): Promise<{ success: boolean; message: string; timestamp: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string; token_expires_at: string; timestamp: string }>('/api/auth/refresh', {});

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to refresh KIS token');
      }

      return {
        success: response.data.success,
        message: response.data.message,
        timestamp: response.data.timestamp
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'KIS API 토큰 갱신 실패',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * KIS API 키 저장
   */
  static async saveKISAPIKeys(appKey: string, appSecret: string): Promise<{ success: boolean; message: string; timestamp: string }> {
    try {
      console.log('🔄 SystemService: Saving KIS API keys...');
      console.log('🌐 Making request to: /api/auth/save-keys');

      const response = await apiClient.post<{
        success: boolean;
        message: string;
        app_key_length: number;
        app_secret_length: number;
        timestamp: string;
      }>('/api/auth/save-keys', {
        app_key: appKey,
        app_secret: appSecret
      });

      console.log('📨 Raw API response:', response);

      if (!response.success || !response.data) {
        console.error('❌ Response validation failed');
        console.error('  - response.success:', response.success);
        console.error('  - response.data:', response.data);
        console.error('  - response.error:', response.error);
        throw new Error(response.error || 'Failed to save KIS API keys');
      }

      const result = {
        success: response.data.success,
        message: response.data.message,
        timestamp: response.data.timestamp
      };

      console.log('✅ API keys saved successfully:', result);
      return result;

    } catch (error) {
      console.error('💥 SystemService.saveKISAPIKeys error:', error);

      return {
        success: false,
        message: error instanceof Error ? error.message : 'KIS API 키 저장 실패',
        timestamp: new Date().toISOString()
      };
    }
  }
}