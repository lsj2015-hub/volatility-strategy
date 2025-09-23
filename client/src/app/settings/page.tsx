'use client';

/**
 * Settings 페이지 - 시스템 설정 및 기본 프리셋 관리
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Settings,
  Save,
  RefreshCw,
  AlertTriangle,
  Bell,
  Shield,
  Clock,
  Cpu,
  Database,
  Wifi,
  Download,
  Upload
} from 'lucide-react';
import { useHydratedSettingsStore } from '@/hooks/useHydratedStore';
import { SystemService } from '@/lib/api/system';

export default function SettingsPage() {
  const {
    riskManagement,
    notifications,
    apiSettings,
    schedule,
    presets,
    activePreset,
    updateRiskManagement,
    updateNotifications,
    updateAPISettings,
    updateSchedule,
    loadPreset,
    resetToDefaults,
    isLoading
  } = useHydratedSettingsStore();

  const [tempAPIKey, setTempAPIKey] = useState('');
  const [tempAPISecret, setTempAPISecret] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveResult, setSaveResult] = useState<string | null>(null);

  const handleSaveAPISettings = async (): Promise<void> => {
    if (!tempAPIKey.trim() || !tempAPISecret.trim()) {
      setConnectionTestResult('❌ App Key와 App Secret을 모두 입력해주세요');
      return;
    }

    setIsTestingConnection(true);
    setConnectionTestResult(null);

    try {
      console.log('Saving KIS API keys...');
      const result = await SystemService.saveKISAPIKeys(tempAPIKey, tempAPISecret);

      if (result.success) {
        // 백엔드에 저장 성공 시 프론트엔드 상태도 업데이트
        updateAPISettings({
          appKey: tempAPIKey,
          appSecret: tempAPISecret
        });
        setConnectionTestResult(`✅ ${result.message}`);
        console.log('✅ KIS API keys saved successfully:', result);

        // 입력 필드 초기화
        setTempAPIKey('');
        setTempAPISecret('');
      } else {
        setConnectionTestResult(`❌ ${result.message}`);
        console.error('❌ KIS API keys save failed:', result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'KIS API 키 저장 중 오류 발생';
      setConnectionTestResult(`❌ ${errorMessage}`);
      console.error('❌ KIS API keys save error:', error);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleTestConnection = async (): Promise<void> => {
    setIsTestingConnection(true);
    setConnectionTestResult(null);

    try {
      console.log('Testing KIS API connection...');
      const result = await SystemService.testKISConnection();

      if (result.success) {
        updateAPISettings({ isConnected: true });
        setConnectionTestResult(`✅ ${result.message}`);
        console.log('✅ KIS API connection test successful:', result);
      } else {
        updateAPISettings({ isConnected: false });
        setConnectionTestResult(`❌ ${result.message}`);
        console.error('❌ KIS API connection test failed:', result);
      }
    } catch (error) {
      updateAPISettings({ isConnected: false });
      const errorMessage = error instanceof Error ? error.message : 'KIS API 연결 테스트 중 오류 발생';
      setConnectionTestResult(`❌ ${errorMessage}`);
      console.error('❌ KIS API connection test error:', error);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleRefreshToken = async (): Promise<void> => {
    setIsRefreshingToken(true);
    setConnectionTestResult(null);

    try {
      console.log('Refreshing KIS API token...');
      const result = await SystemService.refreshKISToken();

      if (result.success) {
        updateAPISettings({ isConnected: true });
        setConnectionTestResult(`🔄 ${result.message}`);
        console.log('✅ KIS API token refresh successful:', result);
      } else {
        setConnectionTestResult(`❌ ${result.message}`);
        console.error('❌ KIS API token refresh failed:', result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'KIS API 토큰 갱신 중 오류 발생';
      setConnectionTestResult(`❌ ${errorMessage}`);
      console.error('❌ KIS API token refresh error:', error);
    } finally {
      setIsRefreshingToken(false);
    }
  };

  const handleLoadPreset = (presetId: string): void => {
    loadPreset(presetId);
  };

  const handleSaveSettings = async (): Promise<void> => {
    setIsSavingSettings(true);
    setSaveResult(null);

    try {
      // 실제로는 백엔드 API를 호출해서 설정을 저장해야 하지만,
      // 현재는 로컬 스토리지에만 저장되므로 간단한 성공 메시지 표시

      // 잠시 대기 (실제 API 호출을 시뮬레이션)
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSaveResult('✅ 설정이 성공적으로 저장되었습니다');
      console.log('✅ Settings saved successfully:', {
        riskManagement,
        notifications,
        apiSettings,
        schedule
      });

      // 3초 후 메시지 자동 제거
      setTimeout(() => setSaveResult(null), 3000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '설정 저장 중 오류 발생';
      setSaveResult(`❌ ${errorMessage}`);
      console.error('❌ Settings save error:', error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Show loading state during hydration
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
            <p className="text-muted-foreground">Loading configuration...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">
            Configure system defaults, API connections, and global preferences
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={resetToDefaults} className="inline-flex items-center px-3 py-1 text-sm border rounded-md bg-white text-gray-700 hover:bg-gray-50">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset All
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={isSavingSettings}
            className="inline-flex items-center px-3 py-1 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSavingSettings ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Save Result Display */}
      {saveResult && (
        <div className={`p-3 rounded-md border ${
          saveResult.startsWith('✅')
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {saveResult}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 기본 프리셋 관리 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Default Strategy Preset
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Active Preset</Label>
              <Select value={activePreset || ''} onValueChange={handleLoadPreset}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a preset" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-950">
                  {presets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      <div className="flex items-center justify-between w-full pr-6">
                        <span>{preset.name}</span>
                        <Badge
                          variant={
                            preset.riskLevel === 'low' ? 'secondary' :
                            preset.riskLevel === 'medium' ? 'default' : 'destructive'
                          }
                          className={`text-xs ml-2 shrink-0 ${
                            preset.riskLevel === 'low'
                              ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                              : preset.riskLevel === 'medium'
                              ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                              : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                          }`}
                        >
                          {preset.riskLevel === 'low' ? 'LOW' :
                           preset.riskLevel === 'medium' ? 'MEDIUM' : 'HIGH'}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This preset will be used as the default for new filtering sessions
              </p>
            </div>

            {activePreset && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="space-y-2">
                  <div className="font-medium">
                    {presets.find(p => p.id === activePreset)?.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {presets.find(p => p.id === activePreset)?.description}
                  </div>
                  <div className="flex items-center space-x-4 text-xs">
                    <span>Volume: {(presets.find(p => p.id === activePreset)?.conditions.minVolume || 0) / 1000000}M+</span>
                    <span>Momentum: {presets.find(p => p.id === activePreset)?.conditions.minMomentum}+</span>
                    <span>Max Positions: {riskManagement.maxPositions}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 리스크 관리 기본값 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Risk Management Defaults
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Early Take Profit (%)</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={riskManagement.earlyTakeProfit}
                  onChange={(e) => updateRiskManagement({ earlyTakeProfit: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  Profit target for morning session (09:00-12:00)
                </p>
              </div>
              <div className="space-y-2">
                <Label>Early Stop Loss (%)</Label>
                <Input
                  type="number"
                  min="-20"
                  max="-1"
                  value={riskManagement.earlyStopLoss}
                  onChange={(e) => updateRiskManagement({ earlyStopLoss: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  Loss limit for morning session (automatic sell)
                </p>
              </div>
              <div className="space-y-2">
                <Label>Late Take Profit (%)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={riskManagement.lateTakeProfit}
                  onChange={(e) => updateRiskManagement({ lateTakeProfit: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  Conservative profit target for afternoon session
                </p>
              </div>
              <div className="space-y-2">
                <Label>Max Positions</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={riskManagement.maxPositions}
                  onChange={(e) => updateRiskManagement({ maxPositions: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of stocks to hold simultaneously
                </p>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium mb-2">Risk Management Strategy</div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div>• Early session (09:00-12:00): Higher profit targets, wider stop loss</div>
                <div>• Late session (12:00-15:20): Conservative targets, force liquidation at 15:20</div>
                <div>• Portfolio limit prevents over-concentration risk</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 스케줄 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Trading Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Filtering Time</Label>
                <Input
                  type="time"
                  value={schedule.filteringTime}
                  onChange={(e) => updateSchedule({ filteringTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Monitoring Start</Label>
                <Input
                  type="time"
                  value={schedule.monitoringStart}
                  onChange={(e) => updateSchedule({ monitoringStart: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Trading Start</Label>
                <Input
                  type="time"
                  value={schedule.tradingStart}
                  onChange={(e) => updateSchedule({ tradingStart: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Trading End</Label>
                <Input
                  type="time"
                  value={schedule.tradingEnd}
                  onChange={(e) => updateSchedule({ tradingEnd: e.target.value })}
                />
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium mb-2">Daily Schedule</div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div>• {schedule.filteringTime}: Stock filtering and selection</div>
                <div>• {schedule.monitoringStart}-{schedule.monitoringEnd}: After-hours monitoring</div>
                <div>• {schedule.tradingStart}-{schedule.tradingEnd}: Active trading</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 알림 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Email Notifications</Label>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) => updateNotifications({ email: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Buy Signals</Label>
                <Switch
                  checked={notifications.buySignals}
                  onCheckedChange={(checked) => updateNotifications({ buySignals: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Sell Signals</Label>
                <Switch
                  checked={notifications.sellSignals}
                  onCheckedChange={(checked) => updateNotifications({ sellSignals: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Portfolio Updates</Label>
                <Switch
                  checked={notifications.portfolioUpdates}
                  onCheckedChange={(checked) => updateNotifications({ portfolioUpdates: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>System Status</Label>
                <Switch
                  checked={notifications.systemStatus}
                  onCheckedChange={(checked) => updateNotifications({ systemStatus: checked })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>P&L Alert Threshold (%)</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={notifications.pnlThreshold}
                onChange={(e) => updateNotifications({ pnlThreshold: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Alert when position P&L exceeds this threshold
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KIS API 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="mr-2 h-5 w-5" />
            KIS Open API Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>App Key</Label>
              <Input
                type="password"
                placeholder="Enter your KIS App Key"
                value={tempAPIKey}
                onChange={(e) => setTempAPIKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>App Secret</Label>
              <Input
                type="password"
                placeholder="Enter your KIS App Secret"
                value={tempAPISecret}
                onChange={(e) => setTempAPISecret(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Environment</Label>
            <Select
              value={apiSettings.environment}
              onValueChange={(value: 'sandbox' | 'production') =>
                updateAPISettings({ environment: value })
              }
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="sandbox" className="bg-white hover:bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <Cpu className="h-4 w-4" />
                    <span>Sandbox (Test)</span>
                  </div>
                </SelectItem>
                <SelectItem value="production" className="bg-white hover:bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>Production (Live)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className={`h-2 w-2 rounded-full ${apiSettings.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                API Connection Status: {apiSettings.isConnected ? 'Connected' : 'Disconnected'}
              </span>
              <Wifi className={`h-4 w-4 ${apiSettings.isConnected ? 'text-green-500' : 'text-red-500'}`} />
            </div>

            {connectionTestResult && (
              <div className={`text-xs p-2 rounded-md border ${
                connectionTestResult.startsWith('✅') || connectionTestResult.startsWith('🔄')
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {connectionTestResult}
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleSaveAPISettings}
              disabled={isTestingConnection || !tempAPIKey.trim() || !tempAPISecret.trim()}
              className="inline-flex items-center px-4 py-2 border-2 border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Save className="h-4 w-4 mr-2" />
              {isTestingConnection ? 'Saving...' : 'Save API Keys'}
            </button>
            <button
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="inline-flex items-center px-4 py-2 border-2 border-blue-700 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 disabled:bg-blue-300 disabled:border-blue-300"
            >
              <Database className="h-4 w-4 mr-2" />
              {isTestingConnection ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onClick={handleRefreshToken}
              disabled={isRefreshingToken}
              className="inline-flex items-center px-4 py-2 border-2 border-purple-700 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 disabled:bg-purple-300 disabled:border-purple-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingToken ? 'animate-spin' : ''}`} />
              {isRefreshingToken ? 'Refreshing...' : 'Refresh Token'}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 설정 백업/복원 */}
      <Card>
        <CardHeader>
          <CardTitle>Settings Backup & Restore</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <button className="inline-flex items-center px-4 py-2 border rounded-md bg-white text-gray-700 hover:bg-gray-50">
              <Download className="h-4 w-4 mr-2" />
              Export Settings
            </button>
            <button className="inline-flex items-center px-4 py-2 border rounded-md bg-white text-gray-700 hover:bg-gray-50">
              <Upload className="h-4 w-4 mr-2" />
              Import Settings
            </button>
            <button onClick={resetToDefaults} className="inline-flex items-center px-4 py-2 border rounded-md bg-white text-gray-700 hover:bg-gray-50">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset to Factory Defaults
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Export your settings to share configurations or restore from backup
          </p>
        </CardContent>
      </Card>
    </div>
  );
}