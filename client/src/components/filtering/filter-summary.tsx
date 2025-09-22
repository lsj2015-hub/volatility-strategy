'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  Filter,
  Users,
  Target,
  Clock,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { FilteredStock } from '@/types/trading';

interface FilterSummaryProps {
  totalStocks: number;
  filteredStocks: FilteredStock[];
  selectedStocks: string[];
  filteringTime?: number;
  onProceedToPortfolio?: () => void;
}

export function FilterSummary({
  totalStocks,
  filteredStocks,
  selectedStocks,
  filteringTime,
  onProceedToPortfolio
}: FilterSummaryProps) {
  const filteringRate = totalStocks > 0 ? (filteredStocks.length / totalStocks) * 100 : 0;
  const avgScore = filteredStocks.length > 0
    ? filteredStocks.reduce((sum, stock) => sum + stock.score, 0) / filteredStocks.length
    : 0;

  // Quality distribution
  const highQuality = filteredStocks.filter(stock => stock.score >= 80).length;
  const mediumQuality = filteredStocks.filter(stock => stock.score >= 60 && stock.score < 80).length;
  const lowQuality = filteredStocks.filter(stock => stock.score < 60).length;

  // Sector distribution (top 3)
  const sectorCounts = filteredStocks.reduce((acc, stock) => {
    acc[stock.sector] = (acc[stock.sector] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topSectors = Object.entries(sectorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Filtering Results Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Filtering Results</CardTitle>
          <Filter className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold">{filteredStocks.length}</div>
            <p className="text-xs text-muted-foreground">
              from {totalStocks.toLocaleString()} total stocks
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Filter Rate</span>
                <span>{filteringRate.toFixed(1)}%</span>
              </div>
              <Progress value={filteringRate} className="h-2" />
            </div>
            {filteringTime && (
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{filteringTime}ms</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quality Distribution */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quality Distribution</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold">{avgScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Average Score</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-green-600">High (80+)</span>
                <span>{highQuality}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-yellow-600">Medium (60-79)</span>
                <span>{mediumQuality}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-red-600">Low (&lt;60)</span>
                <span>{lowQuality}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sector Distribution */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Sectors</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold">{Object.keys(sectorCounts).length}</div>
            <p className="text-xs text-muted-foreground">Sectors represented</p>
            <div className="space-y-1">
              {topSectors.map(([sector, count]) => (
                <div key={sector} className="flex justify-between text-xs">
                  <span className="truncate flex-1">{sector}</span>
                  <Badge variant="outline" className="text-xs">
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selection Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Portfolio Selection</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="text-2xl font-bold">{selectedStocks.length}</div>
              <p className="text-xs text-muted-foreground">
                stocks selected for portfolio
              </p>
            </div>

            {selectedStocks.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Selection Rate</span>
                  <span>{((selectedStocks.length / filteredStocks.length) * 100).toFixed(1)}%</span>
                </div>
                <Progress
                  value={(selectedStocks.length / filteredStocks.length) * 100}
                  className="h-2"
                />
              </div>
            )}

            {onProceedToPortfolio && selectedStocks.length > 0 && (
              <Button
                size="sm"
                className="w-full"
                onClick={onProceedToPortfolio}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Build Portfolio
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}