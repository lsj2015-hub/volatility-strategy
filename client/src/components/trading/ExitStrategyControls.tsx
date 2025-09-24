'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { tradingApi } from '@/lib/api';
import { ExitStrategy, ExitPhaseConfig, UpdateExitStrategyRequest } from '@/types';

export default function ExitStrategyControls() {
  const [strategy, setStrategy] = useState<ExitStrategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable strategy config
  const [editableStrategy, setEditableStrategy] = useState<UpdateExitStrategyRequest>({});

  const fetchStrategy = async () => {
    try {
      const response = await tradingApi.getExitStrategy() as ExitStrategy;
      setStrategy(response);

      // Initialize editable config
      setEditableStrategy({
        force_exit_time: response.force_exit_time,
        max_hold_hours: response.max_hold_hours,
        phase_config: response.config
      });

      setError(null);
    } catch (err) {
      setError(`Failed to fetch exit strategy: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategy();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStrategy, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveStrategy = async () => {
    setSaving(true);
    try {
      await tradingApi.updateExitStrategy(editableStrategy);
      await fetchStrategy(); // Refresh data
      setError(null);
    } catch (err) {
      setError(`Failed to update exit strategy: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteStrategy = async () => {
    if (!confirm('Are you sure you want to execute the exit strategy? This will check and potentially close positions.')) {
      return;
    }

    setExecuting(true);
    try {
      await tradingApi.executeExitStrategy();
      setError(null);
    } catch (err) {
      setError(`Failed to execute exit strategy: ${err}`);
    } finally {
      setExecuting(false);
    }
  };

  const handleForceExitAll = async () => {
    if (!confirm('⚠️ WARNING: This will immediately close ALL active positions. Are you sure?')) {
      return;
    }

    setExecuting(true);
    try {
      await tradingApi.forceExitAll('Emergency force exit from control panel');
      setError(null);
    } catch (err) {
      setError(`Failed to force exit all positions: ${err}`);
    } finally {
      setExecuting(false);
    }
  };

  const updatePhaseConfig = (phase: string, field: string, value: number) => {
    setEditableStrategy(prev => {
      const currentPhaseConfig = prev.phase_config?.[phase] || {} as ExitPhaseConfig;

      return {
        ...prev,
        phase_config: {
          ...prev.phase_config,
          [phase]: {
            ...currentPhaseConfig,
            [field]: value
          } as ExitPhaseConfig
        }
      };
    });
  };

  const getCurrentPhaseProgress = () => {
    if (!strategy?.current_phase) return 0;

    // Calculate progress based on current trading day phase
    const phases = ['early_morning', 'mid_morning', 'afternoon', 'force_exit'];
    const currentIndex = phases.indexOf(strategy.current_phase);
    const totalPhases = phases.length;

    return ((currentIndex + 1) / totalPhases) * 100;
  };

  const getPhaseDisplayName = (phase: string) => {
    const names: Record<string, string> = {
      early_morning: 'Early Morning (09:00-11:00)',
      mid_morning: 'Mid Morning (11:00-13:00)',
      afternoon: 'Afternoon (13:00-15:00)',
      force_exit: 'Force Exit (15:00-15:30)'
    };
    return names[phase] || phase;
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'early_morning': return 'bg-green-500';
      case 'mid_morning': return 'bg-blue-500';
      case 'afternoon': return 'bg-yellow-500';
      case 'force_exit': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading exit strategy...</p>
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

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>Exit Strategy Status</CardTitle>
          <CardDescription>Current phase and automatic exit monitoring</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {strategy && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Phase</p>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getPhaseColor(strategy.current_phase || 'unknown')} text-white`}>
                      {getPhaseDisplayName(strategy.current_phase || 'Unknown')}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Next Phase</p>
                  <p className="font-semibold">
                    {strategy.next_phase_time ? new Date(strategy.next_phase_time).toLocaleTimeString() : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Trading Day Progress</span>
                  <span>{getCurrentPhaseProgress().toFixed(0)}%</span>
                </div>
                <Progress value={getCurrentPhaseProgress()} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Force Exit Time</p>
                  <p className="font-semibold">{strategy.force_exit_time}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Max Hold Hours</p>
                  <p className="font-semibold">{strategy.max_hold_hours}h</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Manual Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Controls</CardTitle>
          <CardDescription>Execute exit strategy or force close all positions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={handleExecuteStrategy}
              disabled={executing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {executing ? 'Executing...' : 'Execute Exit Strategy'}
            </Button>
            <Button
              onClick={handleForceExitAll}
              disabled={executing}
              variant="destructive"
            >
              {executing ? 'Force Exiting...' : 'Emergency Force Exit All'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Execute exit strategy will check all positions against current phase rules.
            Force exit will immediately close all positions regardless of rules.
          </p>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Exit Strategy Configuration</CardTitle>
          <CardDescription>Adjust exit rules for each trading phase</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Global Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="force_exit_time">Force Exit Time</Label>
              <Input
                id="force_exit_time"
                type="time"
                value={editableStrategy.force_exit_time || '15:20'}
                onChange={(e) => setEditableStrategy(prev => ({ ...prev, force_exit_time: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_hold_hours">Max Hold Hours</Label>
              <Input
                id="max_hold_hours"
                type="number"
                min="1"
                max="24"
                value={editableStrategy.max_hold_hours || 6}
                onChange={(e) => setEditableStrategy(prev => ({ ...prev, max_hold_hours: Number(e.target.value) }))}
              />
            </div>
          </div>

          <Separator />

          {/* Phase-specific Settings */}
          {strategy?.config && Object.entries(strategy.config).map(([phase, config]) => (
            <div key={phase} className="space-y-4">
              <h4 className="font-semibold text-lg">{getPhaseDisplayName(phase)}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={config.start_time}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={config.end_time}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Profit Threshold (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editableStrategy.phase_config?.[phase]?.profit_threshold ?? config.profit_threshold}
                    onChange={(e) => updatePhaseConfig(phase, 'profit_threshold', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Loss Threshold (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editableStrategy.phase_config?.[phase]?.loss_threshold ?? config.loss_threshold}
                    onChange={(e) => updatePhaseConfig(phase, 'loss_threshold', Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Priority: {config.priority}</span>
                <span>Time-based exit: {config.time_based_exit ? 'Yes' : 'No'}</span>
              </div>
              {phase !== 'force_exit' && <Separator />}
            </div>
          ))}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSaveStrategy}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}