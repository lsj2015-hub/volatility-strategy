"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Treemap
} from 'recharts'
import { PieChart as PieChartIcon, BarChart3, TrendingUp } from 'lucide-react'

interface AllocationData {
  symbol: string
  stock_name: string
  allocation_percent: number
  investment_amount: number
  current_value: number
  pnl: number
  pnl_percent: number
  sector?: string
  market_cap?: string
  [key: string]: string | number | undefined // Index signature for recharts compatibility
}


interface PortfolioAllocationChartProps {
  data: AllocationData[]
  height?: number
}

export function PortfolioAllocationChart({ data, height = 400 }: PortfolioAllocationChartProps) {
  const [chartType, setChartType] = useState<'pie' | 'bar' | 'treemap'>('pie')
  const [sortBy, setSortBy] = useState<'allocation' | 'pnl' | 'value'>('allocation')

  // 데이터 정렬
  const sortedData = [...data].sort((a, b) => {
    switch (sortBy) {
      case 'allocation':
        return b.allocation_percent - a.allocation_percent
      case 'pnl':
        return b.pnl - a.pnl
      case 'value':
        return b.current_value - a.current_value
      default:
        return 0
    }
  })

  // 파이 차트용 색상 배열
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#6366f1'
  ]

  // 트리맵 데이터 변환
  const treemapData = data.map((item, index) => ({
    name: item.symbol,
    size: item.current_value,
    fill: colors[index % colors.length],
    pnl_percent: item.pnl_percent
  }))

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: AllocationData }[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{data.symbol}</p>
          <p className="text-sm text-gray-600">{data.stock_name}</p>
          <div className="space-y-1 text-sm mt-2">
            <p>
              <span className="text-gray-500">비중: </span>
              <span className="font-medium">{data.allocation_percent?.toFixed(1)}%</span>
            </p>
            <p>
              <span className="text-gray-500">투자금: </span>
              <span className="font-medium">₩{(data.investment_amount / 1000000).toFixed(1)}M</span>
            </p>
            <p>
              <span className="text-gray-500">현재가치: </span>
              <span className="font-medium">₩{(data.current_value / 1000000).toFixed(1)}M</span>
            </p>
            <p className={data.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
              <span className="text-gray-500">손익: </span>
              <span className="font-medium">
                ₩{(data.pnl / 1000000).toFixed(2)}M ({data.pnl_percent?.toFixed(2)}%)
              </span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  // 트리맵 커스텀 컨텐츠
  const TreemapContent = (props: Record<string, unknown>) => {
    const { x, y, width, height } = props as {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    const payload = (props as { payload?: { name: string; fill: string; pnl_percent: number } }).payload;
    if (width < 50 || height < 30 || !payload) return <g></g>

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={payload.fill}
          stroke="#fff"
          strokeWidth={2}
          opacity={0.8}
        />
        <text
          x={x + width / 2}
          y={y + height / 2 - 5}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={width > 80 ? 12 : 10}
          fontWeight="bold"
          fill="white"
        >
          {payload.name}
        </text>
        <text
          x={x + width / 2}
          y={y + height / 2 + 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={width > 80 ? 10 : 8}
          fill="white"
        >
          {payload.pnl_percent >= 0 ? '+' : ''}{payload.pnl_percent?.toFixed(1)}%
        </text>
      </g>
    )
  }

  // 파이 차트 커스텀 라벨
  const renderPieLabel = (props: Record<string, unknown>) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props as {
      cx: number;
      cy: number;
      midAngle: number;
      innerRadius: number;
      outerRadius: number;
      percent: number;
    };
    const symbol = (props as { symbol?: string }).symbol || '';
    if (percent < 0.05) return null // 5% 미만은 라벨 생략

    const RADIAN = Math.PI / 180
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
        fontSize={10}
        fontWeight="bold"
      >
        {`${symbol} ${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  const renderChart = () => {
    switch (chartType) {
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={sortedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderPieLabel}
              outerRadius={140}
              fill="#8884d8"
              dataKey="allocation_percent"
            >
              {sortedData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        )

      case 'bar':
        return (
          <BarChart
            data={sortedData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="symbol"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${value.toFixed(1)}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="allocation_percent" fill="#3b82f6" />
          </BarChart>
        )

      case 'treemap':
        return (
          <Treemap
            data={treemapData}
            dataKey="size"
            stroke="#fff"
            content={(props: unknown) => TreemapContent(props as Record<string, unknown>)}
          />
        )

      default:
        return <div>Chart type not supported</div>
    }
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64 text-gray-500">
          포트폴리오 데이터가 없습니다
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <PieChartIcon className="w-5 h-5" />
            <span>포트폴리오 구성</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={sortBy} onValueChange={(value: 'allocation' | 'pnl' | 'value') => setSortBy(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="allocation">비중순</SelectItem>
                <SelectItem value="pnl">수익순</SelectItem>
                <SelectItem value="value">가치순</SelectItem>
              </SelectContent>
            </Select>

            <Select value={chartType} onValueChange={(value: 'pie' | 'bar' | 'treemap') => setChartType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pie">원형</SelectItem>
                <SelectItem value="bar">막대형</SelectItem>
                <SelectItem value="treemap">트리맵</SelectItem>
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

        {/* 범례 및 상세 정보 */}
        <div className="mt-6 space-y-2">
          {sortedData.slice(0, 5).map((item, index) => (
            <div key={item.symbol} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <div>
                  <div className="font-medium">{item.symbol}</div>
                  <div className="text-sm text-gray-500">{item.stock_name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">{item.allocation_percent.toFixed(1)}%</div>
                <div className={`text-sm ${item.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {item.pnl >= 0 ? '+' : ''}{item.pnl_percent.toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
          {sortedData.length > 5 && (
            <div className="text-center text-sm text-gray-500 pt-2">
              그 외 {sortedData.length - 5}개 종목...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface AllocationSummaryProps {
  data: AllocationData[]
}

export function AllocationSummary({ data }: AllocationSummaryProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32 text-gray-500">
          데이터가 없습니다
        </CardContent>
      </Card>
    )
  }

  const totalInvestment = data.reduce((sum, item) => sum + item.investment_amount, 0)
  const totalCurrentValue = data.reduce((sum, item) => sum + item.current_value, 0)
  const totalPnL = data.reduce((sum, item) => sum + item.pnl, 0)
  const totalPnLPercent = totalInvestment > 0 ? (totalPnL / totalInvestment) * 100 : 0

  const profitablePositions = data.filter(item => item.pnl > 0).length
  const winRate = data.length > 0 ? (profitablePositions / data.length) * 100 : 0

  const bestPerformer = data.reduce((best, current) =>
    current.pnl_percent > best.pnl_percent ? current : best, data[0])

  const worstPerformer = data.reduce((worst, current) =>
    current.pnl_percent < worst.pnl_percent ? current : worst, data[0])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 총 투자금 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <div>
              <div className="text-sm text-gray-500">총 투자금</div>
              <div className="text-xl font-bold">
                ₩{(totalInvestment / 1000000).toFixed(1)}M
              </div>
              <div className="text-xs text-gray-500">
                {data.length}개 종목
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 현재 가치 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <div>
              <div className="text-sm text-gray-500">현재 가치</div>
              <div className="text-xl font-bold">
                ₩{(totalCurrentValue / 1000000).toFixed(1)}M
              </div>
              <div className={`text-xs ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalPnL >= 0 ? '+' : ''}₩{(totalPnL / 1000000).toFixed(2)}M
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 총 수익률 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className={`w-5 h-5 ${totalPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            <div>
              <div className="text-sm text-gray-500">총 수익률</div>
              <div className={`text-xl font-bold ${totalPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500">
                승률: {winRate.toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 최고/최저 성과 */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="text-sm text-gray-500">성과 현황</div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-green-600">최고</span>
                <div className="text-right">
                  <div className="text-sm font-medium">{bestPerformer.symbol}</div>
                  <div className="text-xs text-green-600">
                    +{bestPerformer.pnl_percent.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-red-600">최저</span>
                <div className="text-right">
                  <div className="text-sm font-medium">{worstPerformer.symbol}</div>
                  <div className="text-xs text-red-600">
                    {worstPerformer.pnl_percent.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}