"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw, Search, Filter, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { PositionCard } from './PositionCard'
import { Position } from '@/types'
import { portfolioApi } from '@/lib/api'

interface PositionListProps {
  onManualExit?: (positionId: string) => void
  onPartialExit?: (positionId: string, percentage: number) => void
}

export function PositionList({ onManualExit, onPartialExit }: PositionListProps) {
  const [positions, setPositions] = useState<{
    active: Position[]
    closed: Position[]
  }>({ active: [], closed: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<string>('pnl_desc')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // 포지션 데이터 로드
  const loadPositions = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await portfolioApi.getPositions()

      if (response.status === 'success') {
        setPositions({
          active: response.data.active || [],
          closed: response.data.closed || []
        })
      } else {
        setError(response.message || '포지션 데이터를 불러올 수 없습니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPositions()

    // 30초마다 자동 새로고침
    const interval = setInterval(loadPositions, 30000)
    return () => clearInterval(interval)
  }, [])

  // 포지션 필터링 및 정렬
  const filterAndSortPositions = (positionList: Position[]) => {
    let filtered = positionList

    // 검색 필터
    if (searchTerm) {
      filtered = filtered.filter(
        position =>
          position.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          position.stock_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 상태 필터
    if (filterStatus !== 'all') {
      filtered = filtered.filter(position => position.status === filterStatus)
    }

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'pnl_desc':
          return b.current_pnl - a.current_pnl
        case 'pnl_asc':
          return a.current_pnl - b.current_pnl
        case 'pnl_percent_desc':
          return b.current_pnl_percent - a.current_pnl_percent
        case 'pnl_percent_asc':
          return a.current_pnl_percent - b.current_pnl_percent
        case 'symbol_asc':
          return a.symbol.localeCompare(b.symbol)
        case 'symbol_desc':
          return b.symbol.localeCompare(a.symbol)
        case 'entry_time_desc':
          return new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime()
        case 'entry_time_asc':
          return new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime()
        default:
          return 0
      }
    })

    return filtered
  }

  // 포지션 요약 통계
  const getPositionSummary = (positionList: Position[]) => {
    const total = positionList.length
    const profitable = positionList.filter(p => p.current_pnl > 0).length
    const totalPnL = positionList.reduce((sum, p) => sum + p.current_pnl, 0)
    const totalInvestment = positionList.reduce((sum, p) => sum + (p.entry_price * p.quantity), 0)
    const avgPnLPercent = total > 0 ? positionList.reduce((sum, p) => sum + p.current_pnl_percent, 0) / total : 0

    return {
      total,
      profitable,
      totalPnL,
      totalInvestment,
      avgPnLPercent,
      winRate: total > 0 ? (profitable / total) * 100 : 0
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>포지션 데이터를 불러오는 중...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="text-red-600 text-center">
            <div className="font-semibold">오류가 발생했습니다</div>
            <div className="text-sm">{error}</div>
          </div>
          <Button onClick={loadPositions} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            다시 시도
          </Button>
        </CardContent>
      </Card>
    )
  }

  const activePositions = filterAndSortPositions(positions.active)
  const closedPositions = filterAndSortPositions(positions.closed)
  const activeSummary = getPositionSummary(positions.active)
  const closedSummary = getPositionSummary(positions.closed)

  return (
    <div className="space-y-6">
      {/* 헤더 및 컨트롤 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold">포지션 관리</h2>
          <Button onClick={loadPositions} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* 포지션 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-sm text-gray-500">활성 포지션</div>
                <div className="text-xl font-bold">{activeSummary.total}개</div>
                <div className={`text-sm ${activeSummary.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(activeSummary.totalPnL)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-sm text-gray-500">수익률</div>
                <div className={`text-xl font-bold ${activeSummary.avgPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercent(activeSummary.avgPnLPercent)}
                </div>
                <div className="text-sm text-gray-500">
                  승률: {activeSummary.winRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingDown className="w-5 h-5 text-gray-600" />
              <div>
                <div className="text-sm text-gray-500">총 투자금</div>
                <div className="text-xl font-bold">
                  {formatCurrency(activeSummary.totalInvestment)}
                </div>
                <div className="text-sm text-gray-500">
                  종료: {closedSummary.total}개
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 및 검색 컨트롤 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="종목명 또는 심볼 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="정렬 기준" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pnl_desc">손익 높은순</SelectItem>
                <SelectItem value="pnl_asc">손익 낮은순</SelectItem>
                <SelectItem value="pnl_percent_desc">수익률 높은순</SelectItem>
                <SelectItem value="pnl_percent_asc">수익률 낮은순</SelectItem>
                <SelectItem value="symbol_asc">종목명 오름차순</SelectItem>
                <SelectItem value="symbol_desc">종목명 내림차순</SelectItem>
                <SelectItem value="entry_time_desc">최근 진입순</SelectItem>
                <SelectItem value="entry_time_asc">오래된 진입순</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="monitoring">모니터링</SelectItem>
                <SelectItem value="exit_pending">매도 대기</SelectItem>
                <SelectItem value="closed">종료</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 포지션 탭 */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="flex items-center space-x-2">
            <span>활성 포지션</span>
            <Badge variant="secondary">{activePositions.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex items-center space-x-2">
            <span>종료된 포지션</span>
            <Badge variant="outline">{closedPositions.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-6">
          {activePositions.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center text-gray-500">
                  <div className="font-medium">활성 포지션이 없습니다</div>
                  <div className="text-sm">거래를 시작하면 여기에 포지션이 표시됩니다</div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activePositions.map((position) => (
                <PositionCard
                  key={position.position_id}
                  position={position}
                  onManualExit={onManualExit}
                  onPartialExit={onPartialExit}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="closed" className="space-y-4 mt-6">
          {closedPositions.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center text-gray-500">
                  <div className="font-medium">종료된 포지션이 없습니다</div>
                  <div className="text-sm">거래 완료 시 여기에 기록이 표시됩니다</div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {closedPositions.map((position) => (
                <PositionCard
                  key={position.position_id}
                  position={position}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}