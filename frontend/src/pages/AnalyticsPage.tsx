import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AnalyticsData, AnalyticsVisualMode, Category } from '@/types';
import { getSyncCachedData } from '@/lib/idb';
import {
  DateFilter,
  DateFilterValue,
  getDateFilterRange,
} from '@/components/ui/DateFilter';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartPie,
  ChartLine,
  Layers,
  Users,
  Grid,
  Filter,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  X,
  ChevronDown,
  Check,
  Calendar,
} from '@/components/ui/icons';

import { AnalyticsKpiCards } from '@/components/analytics/AnalyticsKpiCards';
import { AnalyticsActionsMenu } from '@/components/analytics/AnalyticsActionsMenu';
import { CategoryDonutChart } from '@/components/analytics/CategoryDonutChart';
import { SpendingTrendChart } from '@/components/analytics/SpendingTrendChart';
import { TypeDistributionView } from '@/components/analytics/TypeDistributionView';
import { RoommateFlowView } from '@/components/analytics/RoommateFlowView';
import { AnalyticsTable } from '@/components/analytics/AnalyticsTable';
import { DashboardSkeleton } from '@/components/ui/skeleton';

export function AnalyticsPage() {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'all' });
  const [typeFilter, setTypeFilter] = useState<'all' | 'personal' | 'common' | 'on_behalf'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all_categories');
  const [visualMode, setVisualMode] = useState<AnalyticsVisualMode>('donut');

  // Compute from/to dates from active date filter
  const { from, to } = useMemo(() => {
    return getDateFilterRange(dateFilter);
  }, [dateFilter]);

  // Query categories for category filter
  const { data: categoriesList = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('GET', '/categories'),
    initialData: () => getSyncCachedData<Category[]>('/categories') || [],
    staleTime: 10 * 60 * 1000,
  });

  const queryParams = new URLSearchParams();
  if (from) queryParams.set('from', from);
  if (to) queryParams.set('to', to);
  if (typeFilter !== 'all') queryParams.set('type', typeFilter);
  if (selectedCategory && selectedCategory !== 'all_categories') {
    queryParams.set('category', selectedCategory);
  }

  const queryString = queryParams.toString();
  const apiPath = `/analytics${queryString ? `?${queryString}` : ''}`;

  const {
    data: analytics,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<AnalyticsData>({
    queryKey: ['analytics', from, to, typeFilter, selectedCategory],
    queryFn: () => api<AnalyticsData>('GET', apiPath),
    initialData: () => getSyncCachedData<AnalyticsData>(apiPath),
    staleTime: 30 * 1000,
  });

  const visualOptions: Array<{
    id: AnalyticsVisualMode;
    label: string;
    description: string;
    icon: React.ComponentType<any>;
  }> = [
    { id: 'donut', label: 'Category Donut', description: 'Breakdown by expense category', icon: ChartPie },
    { id: 'trend', label: 'Timeline & Trend', description: 'Daily spending velocity & trajectory', icon: ChartLine },
    { id: 'distribution', label: 'Type Mix', description: 'Household, personal & flatmates mix', icon: Layers },
    { id: 'roommates', label: 'Flatmate Shares', description: 'Who you advanced money for', icon: Users },
    { id: 'table', label: 'Transactions', description: 'Searchable transaction registry', icon: Grid },
  ];

  const activeOption = visualOptions.find((o) => o.id === visualMode) || visualOptions[0];
  const ActiveIcon = activeOption.icon;

  if (isLoading && !analytics) {
    return <DashboardSkeleton />;
  }

  if ((error && !analytics) || !analytics) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-negative shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Analytics could not load</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              We encountered an issue computing your expense intelligence. Please try again.
            </p>
            <Button size="sm" className="mt-3 text-xs" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const hasActiveFilters =
    dateFilter.mode !== 'all' ||
    typeFilter !== 'all' ||
    selectedCategory !== 'all_categories';

  return (
    <main className="space-y-5 sm:space-y-6">
      {/* ── Semantic Editorial Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-border/80 pb-3 sm:pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground">
            Expense Analytics
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Household shared bills, personal costs, and flatmate advances in one ledger.
          </p>
        </div>

        {/* Actions Dropdown & Live Indicator */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          {isFetching && (
            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
              <RefreshCw className="h-3 w-3 animate-spin text-primary" />
              Updating
            </span>
          )}
          <AnalyticsActionsMenu
            analytics={analytics}
            onRefresh={() => void refetch()}
            isFetching={isFetching}
          />
        </div>
      </header>

      {/* ── Executive Financial Ledger Breakdown ───────────────── */}
      <AnalyticsKpiCards kpi={analytics.kpi} typeDistribution={analytics.typeDistribution} />

      {/* ── Multi-Dimensional Filter Controls ───────────────── */}
      <section
        aria-label="Expense filter controls"
        className="space-y-3 rounded-lg border border-border bg-card p-3 sm:p-4 shadow-xs"
      >
        {/* Date Filter Bar */}
        <div>
          <DateFilter value={dateFilter} onChange={setDateFilter} />
        </div>

        {/* Type & Category Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pt-2.5 border-t border-border/60">
          {/* Expense Type Filter Buttons (Horizontally scrollable on mobile) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 w-full sm:w-auto">
            <span className="text-[11px] font-semibold text-muted-foreground shrink-0 mr-0.5 flex items-center gap-1">
              <Filter className="h-3 w-3" />
              Type:
            </span>
            {[
              { id: 'all', label: 'All' },
              { id: 'personal', label: 'Personal' },
              { id: 'common', label: 'Household' },
              { id: 'on_behalf', label: 'Flatmates' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeFilter(t.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all touch-manipulation min-h-[36px] flex items-center justify-center ${
                  typeFilter === t.id
                    ? 'bg-primary/20 text-primary font-semibold border border-primary/40 shadow-xs'
                    : 'bg-secondary/60 text-muted-foreground hover:text-foreground border border-transparent'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Category Dropdown (Shadcn Select) & Reset */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[11px] font-semibold text-muted-foreground shrink-0 hidden xs:inline">
              Category:
            </span>
            <div className="w-full sm:w-[180px]">
              <Select
                value={selectedCategory}
                onValueChange={(val) => setSelectedCategory(val)}
              >
                <SelectTrigger className="h-9 text-xs bg-card/70 border-border">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="max-h-[260px]">
                  <SelectItem value="all_categories">All Categories</SelectItem>
                  {categoriesList.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setDateFilter({ mode: 'all' });
                  setTypeFilter('all');
                  setSelectedCategory('all_categories');
                }}
                className="flex items-center gap-1 h-9 px-2.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all shrink-0 border border-border/60"
                title="Reset all active filters"
                aria-label="Reset all active filters"
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Reset</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Visual Perspective Views ── */}
      <section
        aria-label="Spending charts and transaction views"
        className="rounded-lg border border-border bg-card p-3.5 sm:p-5 shadow-xs"
      >
        <Tabs
          value={visualMode}
          onValueChange={(val) => setVisualMode(val as AnalyticsVisualMode)}
          className="w-full space-y-4 sm:space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
            <div>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                Visual Perspective
              </h2>
              <p className="text-[10px] xs:text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                Select visual mode to inspect your spending patterns
              </p>
            </div>

            {/* ── Mobile Perspective Dropdown Menu (< 640px) ── */}
            <div className="block sm:hidden w-full">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border bg-card text-foreground text-xs font-semibold shadow-xs active:scale-[0.99] touch-manipulation min-h-[42px]"
                  >
                    <div className="flex items-center gap-2">
                      <ActiveIcon className="h-4 w-4 text-primary shrink-0" />
                      <span>{activeOption.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                      <span>Switch view</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[calc(100vw-2.5rem)] max-w-sm p-1.5">
                  <DropdownMenuLabel>Visual Perspectives</DropdownMenuLabel>
                  {visualOptions.map((opt) => (
                    <DropdownMenuItem
                      key={opt.id}
                      onClick={() => setVisualMode(opt.id)}
                      className={`flex items-center gap-2.5 py-2.5 ${visualMode === opt.id ? 'bg-primary/10 text-primary font-bold' : ''}`}
                    >
                      <opt.icon className="h-4 w-4 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs">{opt.label}</p>
                        <p className="text-[10px] text-muted-foreground">{opt.description}</p>
                      </div>
                      {visualMode === opt.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* ── Desktop TabsList (>= 640px) ── */}
            <TabsList
              aria-label="Analytics Visual Perspectives"
              className="hidden sm:flex bg-secondary/80 border border-border p-1 rounded-lg overflow-x-auto no-scrollbar items-center justify-center gap-1"
            >
              {visualOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <TabsTrigger
                    key={opt.id}
                    value={opt.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md data-[state=active]:shadow-xs whitespace-nowrap min-h-[36px] touch-manipulation transition-[color,background-color,box-shadow] duration-100 ease-out"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{opt.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* ── Accessible TabsContent Views ── */}
          <TabsContent value="donut" className="mt-0 focus-visible:outline-none">
            <CategoryDonutChart
              categories={analytics.categories}
              totalSpendingPaise={analytics.kpi.totalSpendingPaise}
            />
          </TabsContent>

          <TabsContent value="trend" className="mt-0 focus-visible:outline-none">
            <SpendingTrendChart dailyTrend={analytics.dailyTrend} />
          </TabsContent>

          <TabsContent value="distribution" className="mt-0 focus-visible:outline-none">
            <TypeDistributionView
              distribution={analytics.typeDistribution}
              kpi={analytics.kpi}
            />
          </TabsContent>

          <TabsContent value="roommates" className="mt-0 focus-visible:outline-none">
            <RoommateFlowView
              roommates={analytics.roommates}
              onBehalfTotalPaise={analytics.kpi.onBehalfPaidPaise}
            />
          </TabsContent>

          <TabsContent value="table" className="mt-0 focus-visible:outline-none">
            <AnalyticsTable transactions={analytics.topTransactions} />
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}
