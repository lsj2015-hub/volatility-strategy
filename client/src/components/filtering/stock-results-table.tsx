'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2
} from 'lucide-react';
import { FilteredStock } from '@/types/trading';

interface StockResultsTableProps {
  stocks: FilteredStock[];
  selectedStocks: string[];
  onSelectionChange: (symbol: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  isLoading?: boolean;
}

type SortField = keyof FilteredStock;
type SortDirection = 'asc' | 'desc';

export function StockResultsTable({
  stocks,
  selectedStocks,
  onSelectionChange,
  onSelectAll,
  isLoading = false
}: StockResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedStocks = [...stocks].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    let comparison = 0;
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue);
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const formatPrice = (price: number) => {
    return `₩${price.toLocaleString()}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000000) {
      return `${(volume / 1000000000).toFixed(1)}B`;
    } else if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(0)}M`;
    }
    return volume.toLocaleString();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (value: number, threshold: number = 0) => {
    if (value > threshold) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < threshold) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const allSelected = stocks.length > 0 && selectedStocks.length === stocks.length;
  const someSelected = selectedStocks.length > 0 && selectedStocks.length < stocks.length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Filtering Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stocks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Filtering Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="mx-auto h-12 w-12 mb-4" />
            <p>No stocks match your filtering criteria</p>
            <p className="text-sm">Try adjusting your conditions or using a preset</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Filtering Results ({stocks.length} stocks)</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectAll(!allSelected)}
              disabled={stocks.length === 0}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {allSelected ? 'Deselect All' : 'Select All'}
            </Button>
            <Badge variant="secondary">
              {selectedStocks.length} selected
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onCheckedChange={(checked) => onSelectAll(!!checked)}
                  />
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold"
                    onClick={() => handleSort('symbol')}
                  >
                    Stock
                    {getSortIcon('symbol')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold"
                    onClick={() => handleSort('score')}
                  >
                    Score
                    {getSortIcon('score')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold"
                    onClick={() => handleSort('price')}
                  >
                    Price
                    {getSortIcon('price')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold"
                    onClick={() => handleSort('volume')}
                  >
                    Volume
                    {getSortIcon('volume')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold"
                    onClick={() => handleSort('momentum')}
                  >
                    Momentum
                    {getSortIcon('momentum')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold"
                    onClick={() => handleSort('strength')}
                  >
                    Strength
                    {getSortIcon('strength')}
                  </Button>
                </TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Reasons</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStocks.map((stock) => (
                <TableRow
                  key={stock.symbol}
                  className={selectedStocks.includes(stock.symbol) ? 'bg-muted/50' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedStocks.includes(stock.symbol)}
                      onCheckedChange={(checked) => onSelectionChange(stock.symbol, !!checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{stock.symbol}</div>
                      <div className="text-sm text-muted-foreground">{stock.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className={`font-semibold ${getScoreColor(stock.score)}`}>
                        {stock.score.toFixed(1)}
                      </div>
                      <Progress value={stock.score} className="h-2 w-16" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span>{formatPrice(stock.price)}</span>
                      {getTrendIcon(stock.momentum, 50)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatVolume(stock.volume)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`font-medium ${getScoreColor(stock.momentum)}`}>
                      {stock.momentum.toFixed(1)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`font-medium ${getScoreColor(stock.strength)}`}>
                      {stock.strength.toFixed(1)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{stock.sector}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {stock.reasons.slice(0, 2).map((reason, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {reason}
                        </Badge>
                      ))}
                      {stock.reasons.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{stock.reasons.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}