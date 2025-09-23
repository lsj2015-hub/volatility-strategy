'use client'

import { useState, useEffect } from 'react'
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertTriangle, DollarSign, TestTube } from 'lucide-react'
import { useTradingModeStore } from '@/stores/trading-mode'

export function TradingModeToggle() {
  const { mode, isLoading, error, fetchMode, switchMode, clearError } = useTradingModeStore()
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize the store when component mounts
  useEffect(() => {
    if (!isInitialized) {
      fetchMode()
      setIsInitialized(true)
    }
  }, [fetchMode, isInitialized])

  const handleModeSwitch = async (isMock: boolean) => {
    await switchMode(isMock)
  }

  const getModeIcon = () => {
    if (!mode) return null
    return mode.is_mock_trading ? (
      <TestTube className="h-4 w-4" />
    ) : (
      <DollarSign className="h-4 w-4" />
    )
  }

  const getModeColor = () => {
    if (!mode) return 'secondary'
    return mode.is_mock_trading ? 'default' : 'destructive'
  }

  const getModeText = () => {
    if (!mode) return '연결 확인 중...'
    return mode.is_mock_trading ? '모의투자' : '실거래'
  }

  if (error) {
    return (
      <Alert className="w-64">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-sm">모드 로드 실패</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearError()
              fetchMode()
            }}
          >
            재시도
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex items-center space-x-4">
      {/* Current Mode Display */}
      <div className="flex items-center space-x-2">
        <Badge
          variant={getModeColor()}
          className={`flex items-center space-x-1 ${
            mode?.is_mock_trading
              ? 'bg-blue-100 text-blue-800 border-blue-200'
              : 'bg-red-100 text-red-800 border-red-200'
          }`}
        >
          {getModeIcon()}
          <span className="font-medium">{getModeText()}</span>
        </Badge>

        {mode?.api_status && (
          <div className={`w-2 h-2 rounded-full ${
            mode.api_status === 'connected' ? 'bg-green-500' :
            mode.api_status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
          }`} />
        )}
      </div>

      {/* Mode Switch */}
      <div className="flex items-center space-x-2">
        <span className={`text-sm ${mode?.is_mock_trading ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
          모의투자
        </span>
        <Switch
          checked={mode ? !mode.is_mock_trading : false}
          onCheckedChange={(checked) => handleModeSwitch(!checked)}
          disabled={isLoading || !mode}
        />
        <span className={`text-sm ${mode?.is_mock_trading ? 'text-gray-500' : 'text-red-600 font-medium'}`}>
          실거래
        </span>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      )}

      {/* Account Info (if available) */}
      {mode?.account_info && (
        <span className="text-xs text-muted-foreground">
          계좌: {mode.account_info.account_number}
        </span>
      )}
    </div>
  )
}