'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FilteredStock } from '@/types/trading';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface StockScoringProps {
  stocks: FilteredStock[];
}

export function StockScoring({ stocks }: StockScoringProps) {
  if (stocks.length === 0) {
    return null;
  }

  // Score distribution data
  const scoreRanges = [
    { range: '90-100', min: 90, max: 100, color: '#22c55e' },
    { range: '80-89', min: 80, max: 89, color: '#84cc16' },
    { range: '70-79', min: 70, max: 79, color: '#eab308' },
    { range: '60-69', min: 60, max: 69, color: '#f97316' },
    { range: '50-59', min: 50, max: 59, color: '#ef4444' },
    { range: '<50', min: 0, max: 49, color: '#dc2626' }
  ];

  const scoreDistribution = scoreRanges.map(range => ({
    ...range,
    count: stocks.filter(stock => stock.score >= range.min && stock.score <= range.max).length
  }));

  // Sector distribution
  const sectorCounts = stocks.reduce((acc, stock) => {
    const sector = stock.sector || 'Unknown';
    acc[sector] = (acc[sector] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sectorData = Object.entries(sectorCounts)
    .map(([sector, count]) => ({ sector, count }))
    .sort((a, b) => b.count - a.count);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Top scoring stocks
  const topStocks = [...stocks]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Performance metrics
  const avgScore = stocks.reduce((sum, stock) => sum + stock.score, 0) / stocks.length;
  const avgMomentum = stocks.reduce((sum, stock) => sum + stock.momentum, 0) / stocks.length;
  const avgStrength = stocks.reduce((sum, stock) => sum + stock.strength, 0) / stocks.length;

  const highQualityCount = stocks.filter(stock => stock.score >= 80).length;
  const mediumQualityCount = stocks.filter(stock => stock.score >= 60 && stock.score < 80).length;
  const lowQualityCount = stocks.filter(stock => stock.score < 60).length;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stocks.length}</div>
            <p className="text-xs text-muted-foreground">Total Stocks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{highQualityCount}</div>
            <p className="text-xs text-muted-foreground">High Quality (80+)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{avgScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Average Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{sectorData.length}</div>
            <p className="text-xs text-muted-foreground">Sectors</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sector Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Sector Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sectorData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: Record<string, unknown>) => {
                    const sector = (props as { sector?: string }).sector || 'Unknown';
                    const percent = (props as { percent?: number }).percent || 0;
                    return `${sector} (${(percent * 100).toFixed(0)}%)`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {sectorData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Stocks */}
        <Card>
          <CardHeader>
            <CardTitle>Top Scoring Stocks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topStocks.map((stock, index) => (
                <div key={stock.symbol} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <div>
                      <div className="font-medium">{stock.symbol}</div>
                      <div className="text-sm text-muted-foreground">{stock.name}</div>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="font-semibold text-green-600">{stock.score.toFixed(1)}</div>
                    <Progress value={stock.score} className="h-2 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Average Score</span>
                  <span className="text-sm">{avgScore.toFixed(1)}</span>
                </div>
                <Progress value={avgScore} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Average Momentum</span>
                  <span className="text-sm">{avgMomentum.toFixed(1)}</span>
                </div>
                <Progress value={avgMomentum} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Average Strength</span>
                  <span className="text-sm">{avgStrength.toFixed(1)}</span>
                </div>
                <Progress value={avgStrength} className="h-2" />
              </div>

              <div className="pt-4 border-t">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{highQualityCount}</div>
                    <div className="text-xs text-muted-foreground">High (80+)</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{mediumQualityCount}</div>
                    <div className="text-xs text-muted-foreground">Medium (60-79)</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{lowQualityCount}</div>
                    <div className="text-xs text-muted-foreground">Low (&lt;60)</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}