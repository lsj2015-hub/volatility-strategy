'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Shield, Zap } from 'lucide-react';
import { FilterConditions } from '@/types/trading';

interface PresetButtonProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  risk: 'Low' | 'Medium' | 'High';
  isActive?: boolean;
  onClick: () => void;
}

function PresetButton({ title, description, icon, risk, isActive, onClick }: PresetButtonProps) {
  const riskColors = {
    Low: 'bg-green-500/10 text-green-700 border-green-200',
    Medium: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
    High: 'bg-red-500/10 text-red-700 border-red-200'
  };

  return (
    <Button
      variant={isActive ? "default" : "outline"}
      className={`h-auto p-4 justify-start text-left ${isActive ? '' : 'hover:bg-muted/50'}`}
      onClick={onClick}
    >
      <div className="flex items-start space-x-3 w-full">
        <div className="mt-1">
          {icon}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <p className="font-medium">{title}</p>
            <Badge className={riskColors[risk]} variant="outline">
              {risk} Risk
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </Button>
  );
}

interface PresetConditionsProps {
  onPresetApply: (conditions: FilterConditions & { booleanFilters: Record<string, boolean> }) => void;
  activePreset?: 'conservative' | 'balanced' | 'aggressive';
}

export function PresetConditions({ onPresetApply, activePreset }: PresetConditionsProps) {
  const presets = {
    conservative: {
      title: 'Conservative',
      description: 'Safe picks with stable growth potential and low volatility',
      icon: <Shield className="h-5 w-5" />,
      risk: 'Low' as const,
      conditions: {
        minVolume: 500000000, // 500M KRW
        maxVolume: 10000000000, // 10B KRW
        minPrice: 5000, // 5,000 KRW
        maxPrice: 100000, // 100,000 KRW
        minMomentum: 60,
        maxMomentum: 80,
        minStrength: 70,
        maxStrength: 90,
        sectors: [],
        excludedSymbols: []
      },
      booleanFilters: {
        enableVolumeSpike: false,
        excludePennyStocks: true,
        enableMomentumFilter: true,
        enableTechnicalAnalysis: true,
        excludeVolatileStocks: true,
        enableSectorDiversification: true
      }
    },
    balanced: {
      title: 'Balanced',
      description: 'Moderate risk with good growth opportunities and balanced approach',
      icon: <TrendingUp className="h-5 w-5" />,
      risk: 'Medium' as const,
      conditions: {
        minVolume: 300000000, // 300M KRW
        maxVolume: 15000000000, // 15B KRW
        minPrice: 1000, // 1,000 KRW
        maxPrice: 150000, // 150,000 KRW
        minMomentum: 50,
        maxMomentum: 90,
        minStrength: 60,
        maxStrength: 95,
        sectors: [],
        excludedSymbols: []
      },
      booleanFilters: {
        enableVolumeSpike: true,
        excludePennyStocks: true,
        enableMomentumFilter: true,
        enableTechnicalAnalysis: true,
        excludeVolatileStocks: false,
        enableSectorDiversification: true
      }
    },
    aggressive: {
      title: 'Aggressive',
      description: 'High-risk, high-reward picks with strong momentum and growth potential',
      icon: <Zap className="h-5 w-5" />,
      risk: 'High' as const,
      conditions: {
        minVolume: 100000000, // 100M KRW
        maxVolume: 50000000000, // 50B KRW
        minPrice: 500, // 500 KRW
        maxPrice: 300000, // 300,000 KRW
        minMomentum: 70,
        maxMomentum: 100,
        minStrength: 50,
        maxStrength: 100,
        sectors: [],
        excludedSymbols: []
      },
      booleanFilters: {
        enableVolumeSpike: true,
        excludePennyStocks: false,
        enableMomentumFilter: true,
        enableTechnicalAnalysis: true,
        excludeVolatileStocks: false,
        enableSectorDiversification: false
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Presets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(presets).map(([key, preset]) => (
          <PresetButton
            key={key}
            title={preset.title}
            description={preset.description}
            icon={preset.icon}
            risk={preset.risk}
            isActive={activePreset === key}
            onClick={() => onPresetApply({
              ...preset.conditions,
              booleanFilters: preset.booleanFilters
            })}
          />
        ))}
      </CardContent>
    </Card>
  );
}