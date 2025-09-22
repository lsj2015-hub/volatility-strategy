'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Shield, Zap, Save, Star } from 'lucide-react';
import { FilterConditions } from '@/types/trading';
import { useSettingsStore } from '@/stores/settings';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface PresetButtonsEnhancedProps {
  onPresetApply: (conditions: FilterConditions) => void;
  activePreset?: string;
  currentConditions: FilterConditions;
}

export function PresetButtonsEnhanced({
  onPresetApply,
  activePreset,
  currentConditions
}: PresetButtonsEnhancedProps) {
  const { presets, addPreset, setActivePreset } = useSettingsStore();
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  const [currentActivePreset, setCurrentActivePreset] = useState<string | undefined>(activePreset);

  const handlePresetClick = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setCurrentActivePreset(presetId);
      setActivePreset(presetId); // 전역 상태 업데이트
      onPresetApply(preset.conditions);
    }
  };

  const handleSaveCurrentAsPreset = () => {
    if (newPresetName.trim()) {
      addPreset({
        name: newPresetName,
        description: newPresetDescription || `Custom preset created on ${new Date().toLocaleDateString()}`,
        riskLevel: 'medium',
        conditions: currentConditions,
        riskManagement: {
          earlyTakeProfit: 5,
          earlyStopLoss: -3,
          lateTakeProfit: 3,
          finalExitRange: 1.5
        }
      });
      setNewPresetName('');
      setNewPresetDescription('');
      setShowSaveForm(false);
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return <Shield className="h-4 w-4" />;
      case 'high': return <Zap className="h-4 w-4" />;
      default: return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 border-green-200 bg-green-50';
      case 'high': return 'text-red-600 border-red-200 bg-red-50';
      default: return 'text-blue-600 border-blue-200 bg-blue-50';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Strategy Presets</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSaveForm(!showSaveForm)}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Current
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Save Current Form */}
        {showSaveForm && (
          <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
            <div className="space-y-2">
              <Label>Preset Name</Label>
              <Input
                placeholder="Enter preset name"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input
                placeholder="Enter description"
                value={newPresetDescription}
                onChange={(e) => setNewPresetDescription(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <Button size="sm" onClick={handleSaveCurrentAsPreset}>
                Save Preset
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowSaveForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Preset Buttons */}
        <div className="space-y-3">
          {presets.map((preset) => (
            <Button
              key={preset.id}
              variant="outline"
              className={`h-auto p-4 justify-start text-left w-full relative overflow-hidden ${
                currentActivePreset === preset.id
                  ? 'bg-blue-100 border-blue-300 hover:bg-blue-200'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handlePresetClick(preset.id)}
            >
              <div className="flex items-start space-x-3 w-full min-w-0">
                <div className="mt-1 flex-shrink-0">
                  {getRiskIcon(preset.riskLevel)}
                </div>
                <div className="flex-1 space-y-1 min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between w-full min-w-0">
                    <div className="flex items-center space-x-2 flex-1 min-w-0 overflow-hidden">
                      <p className="font-medium truncate">{preset.name}</p>
                      {preset.id.startsWith('custom-') && (
                        <Star className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                    <Badge className={`${getRiskColor(preset.riskLevel)} flex-shrink-0 ml-2`} variant="outline">
                      {preset.riskLevel} risk
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate w-full">{preset.description}</p>
                  <div className="flex items-center space-x-3 text-xs overflow-hidden">
                    <span className="flex-shrink-0">Vol: {(preset.conditions.minVolume / 1000000).toFixed(0)}M+</span>
                    <span className="flex-shrink-0">Mom: {preset.conditions.minMomentum}+</span>
                    <span className="flex-shrink-0">Str: {preset.conditions.minStrength}+</span>
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>

        {/* Load from Settings */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">
            💡 Tip: Set your default preset in Settings to automatically load when filtering
          </p>
        </div>
      </CardContent>
    </Card>
  );
}