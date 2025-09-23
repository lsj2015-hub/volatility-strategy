"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { Position } from '@/types'

interface ProfitLossChartProps {
  position: Position
  height?: number
}

export function ProfitLossChart({ position, height = 200 }: ProfitLossChartProps) {
  // 가격 업데이트 데이터를 차트 형식으로 변환
  const chartData = position.price_updates?.map((update, index) => ({
    time: new Date(update.timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    price: update.price,
    pnl: update.pnl,
    pnl_percent: update.pnl_percent,
    entry_price: position.entry_price,
    target_price: position.entry_price * (1 + position.target_profit_percent / 100),
    stop_loss_price: position.entry_price * (1 + position.stop_loss_percent / 100)
  })) || []

  // 현재 가격 포인트 추가
  if (chartData.length === 0 || chartData[chartData.length - 1].price !== position.current_price) {
    chartData.push({
      time: new Date().toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      price: position.current_price,
      pnl: position.current_pnl,
      pnl_percent: position.current_pnl_percent,
      entry_price: position.entry_price,
      target_price: position.entry_price * (1 + position.target_profit_percent / 100),
      stop_loss_price: position.entry_price * (1 + position.stop_loss_percent / 100)
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-600">
              <span className="font-medium">현재가: </span>
              {formatCurrency(data.price)}
            </p>
            <p className={data.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
              <span className="font-medium">손익: </span>
              {formatCurrency(data.pnl)} ({formatPercent(data.pnl_percent)})
            </p>
            <p className="text-gray-500">
              <span className="font-medium">진입가: </span>
              {formatCurrency(data.entry_price)}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">손익 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-gray-500">
            가격 데이터가 충분하지 않습니다
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">손익 추이</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* 목표가 라인 */}
              <Line
                type="monotone"
                dataKey="target_price"
                stroke="#22c55e"
                strokeDasharray="5 5"
                strokeWidth={1}
                dot={false}
                name="목표가"
              />

              {/* 손절가 라인 */}
              <Line
                type="monotone"
                dataKey="stop_loss_price"
                stroke="#ef4444"
                strokeDasharray="5 5"
                strokeWidth={1}
                dot={false}
                name="손절가"
              />

              {/* 진입가 라인 */}
              <Line
                type="monotone"
                dataKey="entry_price"
                stroke="#6b7280"
                strokeDasharray="3 3"
                strokeWidth={1}
                dot={false}
                name="진입가"
              />

              {/* 현재가 라인 */}
              <Line
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: '#3b82f6', strokeWidth: 2 }}
                name="현재가"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 범례 */}
        <div className="flex justify-center mt-4 space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 bg-blue-600"></div>
            <span>현재가</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 bg-gray-600 border-dashed"></div>
            <span>진입가</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 bg-green-600 border-dashed"></div>
            <span>목표가</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 bg-red-600 border-dashed"></div>
            <span>손절가</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface PnLAreaChartProps {
  position: Position
  height?: number
}

export function PnLAreaChart({ position, height = 200 }: PnLAreaChartProps) {
  // P&L 데이터 차트 형식으로 변환
  const chartData = position.price_updates?.map((update) => ({
    time: new Date(update.timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    pnl: update.pnl,
    pnl_percent: update.pnl_percent
  })) || []

  // 현재 P&L 포인트 추가
  if (chartData.length === 0 || chartData[chartData.length - 1].pnl !== position.current_pnl) {
    chartData.push({
      time: new Date().toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      pnl: position.current_pnl,
      pnl_percent: position.current_pnl_percent
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className={data.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
            <span className="font-medium">손익: </span>
            {formatCurrency(data.pnl)} ({data.pnl_percent >= 0 ? '+' : ''}{data.pnl_percent.toFixed(2)}%)
          </p>
        </div>
      )
    }
    return null
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">손익 변화</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-gray-500">
            손익 데이터가 충분하지 않습니다
          </div>
        </CardContent>
      </Card>
    )
  }

  // 손익이 양수인지 음수인지에 따라 색상 결정
  const isPositive = position.current_pnl >= 0
  const areaColor = isPositive ? '#22c55e' : '#ef4444'
  const fillColor = isPositive ? '#22c55e20' : '#ef444420'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">손익 변화</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* 제로 라인 */}
              <Line
                type="monotone"
                dataKey={() => 0}
                stroke="#6b7280"
                strokeDasharray="2 2"
                strokeWidth={1}
                dot={false}
              />

              {/* P&L 영역 */}
              <Area
                type="monotone"
                dataKey="pnl"
                stroke={areaColor}
                fill={fillColor}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}