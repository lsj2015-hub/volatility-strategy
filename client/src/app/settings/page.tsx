/**
 * Settings 페이지 - 시스템 설정 및 기본 프리셋 관리
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    resetToDefaults
  } = useHydratedSettingsStore();

  const [tempAPIKey, setTempAPIKey] = useState('');
  const [tempAPISecret, setTempAPISecret] = useState('');

  const handleSaveAPISettings = () => {
    updateAPISettings({
      appKey: tempAPIKey,
      appSecret: tempAPISecret
    });
    setTempAPIKey('');
    setTempAPISecret('');
  };

  const handleTestConnection = async () => {
    // TODO: Implement API connection test
    console.log('Testing KIS API connection...');
    updateAPISettings({ isConnected: true });
  };

  const handleLoadPreset = (presetId: string) => {
    loadPreset(presetId);
  };

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
          <Button variant="outline" size="sm" onClick={resetToDefaults}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset All
          </Button>
          <Button size="sm">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

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
                <SelectContent>
                  {presets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      <div className="flex items-center space-x-2">
                        <span>{preset.name}</span>
                        <Badge
                          variant={
                            preset.riskLevel === 'low' ? 'secondary' :
                            preset.riskLevel === 'medium' ? 'default' : 'destructive'
                          }
                          className="text-xs"
                        >
                          {preset.riskLevel}
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
              <SelectContent>
                <SelectItem value="sandbox">
                  <div className="flex items-center space-x-2">
                    <Cpu className="h-4 w-4" />
                    <span>Sandbox (Test)</span>
                  </div>
                </SelectItem>
                <SelectItem value="production">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>Production (Live)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${apiSettings.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-muted-foreground">
              API Connection Status: {apiSettings.isConnected ? 'Connected' : 'Disconnected'}
            </span>
            <Wifi className={`h-4 w-4 ${apiSettings.isConnected ? 'text-green-500' : 'text-red-500'}`} />
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleSaveAPISettings}>
              <Save className="h-4 w-4 mr-2" />
              Save API Keys
            </Button>
            <Button variant="outline" onClick={handleTestConnection}>
              <Database className="h-4 w-4 mr-2" />
              Test Connection
            </Button>
            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Token
            </Button>
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
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Settings
            </Button>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import Settings
            </Button>
            <Button variant="outline" onClick={resetToDefaults}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset to Factory Defaults
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Export your settings to share configurations or restore from backup
          </p>
        </CardContent>
      </Card>
    </div>
  );
}