"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon, Calendar } from 'lucide-react'

interface PerformanceData {
  date: string
  cumulative_return: number
  daily_return: number
  portfolio_value: number
  total_trades: number
  win_rate: number
  profit_trades: number
  loss_trades: number
  avg_profit: number
  avg_loss: number
}

interface PerformanceChartProps {
  data: PerformanceData[]
  height?: number
  period?: 'daily' | 'weekly' | 'monthly'
}

export function PerformanceChart({ data, height = 400, period = 'daily' }: PerformanceChartProps) {
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('area')
  const [metric, setMetric] = useState<'cumulative_return' | 'daily_return' | 'portfolio_value'>('cumulative_return')

  // 데이터 처리
  const processedData = data.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    }),
    cumulative_return_percent: item.cumulative_return * 100,
    daily_return_percent: item.daily_return * 100
  }))

  // 메트릭 설정
  const metricConfig = {
    cumulative_return: {
      key: 'cumulative_return_percent',
      name: '누적 수익률',
      color: '#3b82f6',
      format: (value: number) => `${value.toFixed(2)}%`
    },
    daily_return: {
      key: 'daily_return_percent',
      name: '일별 수익률',
      color: '#10b981',
      format: (value: number) => `${value.toFixed(2)}%`
    },
    portfolio_value: {
      key: 'portfolio_value',
      name: '포트폴리오 가치',
      color: '#8b5cf6',
      format: (value: number) => `₩${(value / 1000000).toFixed(1)}M`
    }
  }

  const currentConfig = metricConfig[metric]

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-600">
              <span className="font-medium">누적 수익률: </span>
              {data.cumulative_return_percent.toFixed(2)}%
            </p>
            <p className="text-green-600">
              <span className="font-medium">일별 수익률: </span>
              {data.daily_return_percent.toFixed(2)}%
            </p>
            <p className="text-purple-600">
              <span className="font-medium">포트폴리오 가치: </span>
              ₩{(data.portfolio_value / 1000000).toFixed(2)}M
            </p>
            <p className="text-gray-600">
              <span className="font-medium">거래 수: </span>
              {data.total_trades}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">승률: </span>
              {data.win_rate.toFixed(1)}%
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  // 차트 렌더링
  const renderChart = () => {
    const commonProps = {
      data: processedData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    }

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={currentConfig.format} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey={currentConfig.key}
              stroke={currentConfig.color}
              strokeWidth={2}
              dot={{ fill: currentConfig.color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: currentConfig.color, strokeWidth: 2 }}
            />
          </LineChart>
        )

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={currentConfig.format} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={currentConfig.key}
              stroke={currentConfig.color}
              fill={`${currentConfig.color}20`}
              strokeWidth={2}
            />
          </AreaChart>
        )

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={currentConfig.format} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={currentConfig.key} fill={currentConfig.color} />
          </BarChart>
        )

      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>성과 분석</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={metric} onValueChange={(value: any) => setMetric(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cumulative_return">누적 수익률</SelectItem>
                <SelectItem value="daily_return">일별 수익률</SelectItem>
                <SelectItem value="portfolio_value">포트폴리오 가치</SelectItem>
              </SelectContent>
            </Select>

            <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="area">면적형</SelectItem>
                <SelectItem value="line">선형</SelectItem>
                <SelectItem value="bar">막대형</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

interface TradingStatsProps {
  data: PerformanceData[]
}

export function TradingStats({ data }: TradingStatsProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32 text-gray-500">
          데이터가 없습니다
        </CardContent>
      </Card>
    )
  }

  const latestData = data[data.length - 1]
  const totalTrades = data.reduce((sum, d) => sum + d.total_trades, 0)
  const totalProfitTrades = data.reduce((sum, d) => sum + d.profit_trades, 0)
  const totalLossTrades = data.reduce((sum, d) => sum + d.loss_trades, 0)
  const overallWinRate = totalTrades > 0 ? (totalProfitTrades / totalTrades) * 100 : 0

  // 수익 분포 데이터
  const profitDistribution = [
    {
      name: '수익 거래',
      value: totalProfitTrades,
      color: '#22c55e'
    },
    {
      name: '손실 거래',
      value: totalLossTrades,
      color: '#ef4444'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 총 수익률 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className={`w-5 h-5 ${latestData.cumulative_return >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            <div>
              <div className="text-sm text-gray-500">총 수익률</div>
              <div className={`text-xl font-bold ${latestData.cumulative_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(latestData.cumulative_return * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 총 거래 수 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <div>
              <div className="text-sm text-gray-500">총 거래 수</div>
              <div className="text-xl font-bold">{totalTrades}</div>
              <div className="text-xs text-gray-500">
                수익: {totalProfitTrades} | 손실: {totalLossTrades}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 승률 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <PieChartIcon className="w-5 h-5 text-purple-600" />
            <div>
              <div className="text-sm text-gray-500">전체 승률</div>
              <div className="text-xl font-bold">{overallWinRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-500">
                최근: {latestData.win_rate.toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 포트폴리오 가치 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <div>
              <div className="text-sm text-gray-500">포트폴리오 가치</div>
              <div className="text-xl font-bold">
                ₩{(latestData.portfolio_value / 1000000).toFixed(2)}M
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function ProfitDistributionChart({ data }: TradingStatsProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64 text-gray-500">
          데이터가 없습니다
        </CardContent>
      </Card>
    )
  }

  const totalProfitTrades = data.reduce((sum, d) => sum + d.profit_trades, 0)
  const totalLossTrades = data.reduce((sum, d) => sum + d.loss_trades, 0)

  const profitDistribution = [
    {
      name: '수익 거래',
      value: totalProfitTrades,
      color: '#22c55e'
    },
    {
      name: '손실 거래',
      value: totalLossTrades,
      color: '#ef4444'
    }
  ]

  const RADIAN = Math.PI / 180
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <PieChartIcon className="w-5 h-5" />
          <span>수익/손실 분포</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={profitDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {profitDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value}건`,
                  name
                ]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="text-center">
            <div className="text-green-600 font-semibold">수익 거래</div>
            <div className="text-2xl font-bold text-green-700">{totalProfitTrades}</div>
          </div>
          <div className="text-center">
            <div className="text-red-600 font-semibold">손실 거래</div>
            <div className="text-2xl font-bold text-red-700">{totalLossTrades}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}