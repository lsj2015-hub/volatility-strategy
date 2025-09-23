"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Brush
} from 'recharts'
import { Play, Pause, RotateCcw, TrendingUp, TrendingDown, Activity } from 'lucide-react'

interface PriceData {
  timestamp: string
  price: number
  volume: number
  change: number
  change_percent: number
}

interface RealTimePriceChartProps {
  symbol: string
  data: PriceData[]
  height?: number
  isRealTime?: boolean
  onToggleRealTime?: (enabled: boolean) => void
}

export function RealTimePriceChart({
  symbol,
  data,
  height = 400,
  isRealTime = false,
  onToggleRealTime
}: RealTimePriceChartProps) {
  const [timeRange, setTimeRange] = useState<'1h' | '4h' | '1d' | 'all'>('4h')
  const [showVolume, setShowVolume] = useState(false)
  const [autoScale, setAutoScale] = useState(true)
  const chartRef = useRef<any>(null)

  // 시간 범위에 따른 데이터 필터링
  const getFilteredData = () => {
    if (!data || data.length === 0) return []

    const now = new Date()
    let cutoffTime: Date

    switch (timeRange) {
      case '1h':
        cutoffTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '4h':
        cutoffTime = new Date(now.getTime() - 4 * 60 * 60 * 1000)
        break
      case '1d':
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      default:
        return data
    }

    return data.filter(item => new Date(item.timestamp) >= cutoffTime)
  }

  const filteredData = getFilteredData()

  // 데이터 처리
  const processedData = filteredData.map(item => ({
    ...item,
    time: new Date(item.timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    displayTime: new Date(item.timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }))

  // 가격 범위 계산
  const priceRange = processedData.length > 0 ? {
    min: Math.min(...processedData.map(d => d.price)),
    max: Math.max(...processedData.map(d => d.price))
  } : { min: 0, max: 0 }

  const latestData = processedData[processedData.length - 1]
  const isPositive = latestData?.change >= 0

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.time}</p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-600">
              <span className="font-medium">가격: </span>
              ₩{data.price.toLocaleString()}
            </p>
            <p className={data.change >= 0 ? 'text-green-600' : 'text-red-600'}>
              <span className="font-medium">변동: </span>
              {data.change >= 0 ? '+' : ''}₩{data.change.toLocaleString()} ({data.change_percent >= 0 ? '+' : ''}{data.change_percent.toFixed(2)}%)
            </p>
            {showVolume && (
              <p className="text-gray-600">
                <span className="font-medium">거래량: </span>
                {data.volume.toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  // 차트 자동 스크롤
  useEffect(() => {
    if (isRealTime && chartRef.current) {
      // 실시간 모드에서 최신 데이터로 스크롤
      const timer = setTimeout(() => {
        const chartElement = chartRef.current?.container
        if (chartElement) {
          chartElement.scrollLeft = chartElement.scrollWidth
        }
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [processedData, isRealTime])

  if (!processedData || processedData.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <Activity className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <div>실시간 가격 데이터가 없습니다</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>{symbol} 실시간 차트</span>
            </CardTitle>
            {latestData && (
              <div className="flex items-center space-x-2">
                <Badge variant={isPositive ? "default" : "destructive"}>
                  ₩{latestData.price.toLocaleString()}
                </Badge>
                <Badge variant={isPositive ? "default" : "destructive"} className="text-xs">
                  {isPositive ? '+' : ''}{latestData.change_percent.toFixed(2)}%
                </Badge>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1시간</SelectItem>
                <SelectItem value="4h">4시간</SelectItem>
                <SelectItem value="1d">1일</SelectItem>
                <SelectItem value="all">전체</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={showVolume ? "default" : "outline"}
              size="sm"
              onClick={() => setShowVolume(!showVolume)}
            >
              거래량
            </Button>

            <Button
              variant={isRealTime ? "default" : "outline"}
              size="sm"
              onClick={() => onToggleRealTime?.(!isRealTime)}
            >
              {isRealTime ? (
                <>
                  <Pause className="w-4 h-4 mr-1" />
                  일시정지
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  실시간
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 현재 가격 표시 */}
        {latestData && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500">현재가</div>
                <div className="text-lg font-bold">₩{latestData.price.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-gray-500">변동액</div>
                <div className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? '+' : ''}₩{latestData.change.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-gray-500">변동률</div>
                <div className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? '+' : ''}{latestData.change_percent.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-gray-500">거래량</div>
                <div className="font-semibold">{latestData.volume.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* 가격 차트 */}
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%" ref={chartRef}>
            <LineChart
              data={processedData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="displayTime"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={autoScale ? ['dataMin - 100', 'dataMax + 100'] : [priceRange.min - 1000, priceRange.max + 1000]}
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `₩${value.toLocaleString()}`}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* 시작 가격 기준선 */}
              {processedData.length > 0 && (
                <ReferenceLine
                  y={processedData[0].price}
                  stroke="#6b7280"
                  strokeDasharray="2 2"
                  strokeWidth={1}
                />
              )}

              {/* 가격 라인 */}
              <Line
                type="monotone"
                dataKey="price"
                stroke={isPositive ? "#22c55e" : "#ef4444"}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  stroke: isPositive ? "#22c55e" : "#ef4444",
                  strokeWidth: 2,
                  fill: "#fff"
                }}
                connectNulls={false}
              />

              {/* 브러시 (확대/축소) */}
              {processedData.length > 50 && (
                <Brush
                  dataKey="displayTime"
                  height={30}
                  stroke="#3b82f6"
                  fill="#3b82f610"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 거래량 차트 */}
        {showVolume && (
          <div className="mt-4" style={{ height: 100 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="displayTime" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                <Tooltip
                  formatter={(value: number) => [`${value.toLocaleString()}`, '거래량']}
                  labelFormatter={(label) => `시간: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="#8b5cf6"
                  strokeWidth={1}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 실시간 상태 표시 */}
        {isRealTime && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-600 font-medium">실시간 업데이트 중</span>
            </div>
            <div className="text-gray-500">
              마지막 업데이트: {latestData ? new Date(latestData.timestamp).toLocaleTimeString('ko-KR') : 'N/A'}
            </div>
          </div>
        )}

        {/* 차트 컨트롤 */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoScale(!autoScale)}
            >
              {autoScale ? '고정 스케일' : '자동 스케일'}
            </Button>
          </div>

          <div className="text-xs text-gray-500">
            데이터 포인트: {processedData.length}개 | 범위: {timeRange}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface MultiSymbolPriceChartProps {
  symbols: string[]
  data: Record<string, PriceData[]>
  height?: number
}

export function MultiSymbolPriceChart({ symbols, data, height = 400 }: MultiSymbolPriceChartProps) {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(symbols.slice(0, 3))

  // 색상 배열
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']

  // 데이터 정규화 (첫 번째 가격 기준으로 변동률 계산)
  const normalizedData = symbols.reduce((acc, symbol) => {
    const symbolData = data[symbol] || []
    if (symbolData.length === 0) return acc

    const basePrice = symbolData[0].price

    symbolData.forEach((item, index) => {
      const time = new Date(item.timestamp).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
      })

      if (!acc[index]) {
        acc[index] = { time }
      }

      acc[index][symbol] = ((item.price - basePrice) / basePrice) * 100
    })

    return acc
  }, [] as any[])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <div className="space-y-1 text-sm">
            {payload.map((entry: any, index: number) => (
              <p key={index} style={{ color: entry.color }}>
                <span className="font-medium">{entry.dataKey}: </span>
                {entry.value >= 0 ? '+' : ''}{entry.value.toFixed(2)}%
              </p>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>다중 종목 비교</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {symbols.map(symbol => (
              <Button
                key={symbol}
                variant={selectedSymbols.includes(symbol) ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (selectedSymbols.includes(symbol)) {
                    setSelectedSymbols(selectedSymbols.filter(s => s !== symbol))
                  } else {
                    setSelectedSymbols([...selectedSymbols, symbol])
                  }
                }}
              >
                {symbol}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={normalizedData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `${value.toFixed(1)}%`} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="2 2" />

              {selectedSymbols.map((symbol, index) => (
                <Line
                  key={symbol}
                  type="monotone"
                  dataKey={symbol}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 범례 */}
        <div className="mt-4 flex flex-wrap gap-2">
          {selectedSymbols.map((symbol, index) => (
            <div key={symbol} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="text-sm font-medium">{symbol}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}