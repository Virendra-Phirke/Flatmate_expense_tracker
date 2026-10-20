import React, { useState } from 'react';
import { AnalyticsCategory } from '@/types';
import { formatPaise } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartPie, X } from '@/components/ui/icons';
import { NumberTicker } from '@/components/magicui/number-ticker';

interface CategoryDonutChartProps {
  categories: AnalyticsCategory[];
  totalSpendingPaise: number;
}

const PALETTE_COLORS = [
  'hsl(var(--primary))',
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#ec4899', // pink
  '#3b82f6', // blue
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
  '#84cc16', // lime
];

export function CategoryDonutChart({ categories, totalSpendingPaise }: CategoryDonutChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!categories || categories.length === 0 || totalSpendingPaise === 0) {
    return (
      <Card className="p-6 sm:p-8 text-center border-border bg-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-secondary-foreground mb-3">
          <ChartPie className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-foreground">No category spending data</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Add expenses or widen the date filter to see your category breakdown.
        </p>
      </Card>
    );
  }

  // SVG Donut geometry
  const size = 230;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let currentOffset = 0;
  const slices = categories.map((cat, idx) => {
    const fraction = totalSpendingPaise > 0 ? cat.totalPaise / totalSpendingPaise : 0;
    const strokeDash = fraction * circumference;
    const strokeGap = circumference - strokeDash;
    const offset = currentOffset;
    currentOffset += strokeDash;

    const color = PALETTE_COLORS[idx % PALETTE_COLORS.length];
    return {
      ...cat,
      color,
      strokeDash,
      strokeGap,
      offset,
      fraction,
    };
  });

  const activeCategory = hoveredIdx !== null ? slices[hoveredIdx] : null;

  return (
    <div
      role="region"
      aria-label="Category spending breakdown chart"
      className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-center"
    >
      {/* SVG Donut */}
      <div className="lg:col-span-5 flex flex-col items-center justify-center relative p-1 sm:p-2">
        <div className="relative w-[190px] h-[190px] xs:w-[210px] xs:h-[210px] sm:w-[230px] sm:h-[230px] flex items-center justify-center">
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90 drop-shadow-sm select-none"
            role="img"
            aria-label="Category distribution donut chart"
          >
            {/* Background ring */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth={strokeWidth - 6}
              className="text-muted/20"
            />
            {/* Slices */}
            {slices.map((slice, idx) => {
              const isHovered = hoveredIdx === idx;
              return (
                <circle
                  key={slice.categoryName}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isHovered ? strokeWidth + 5 : strokeWidth}
                  strokeDasharray={`${slice.strokeDash} ${slice.strokeGap}`}
                  strokeDashoffset={-slice.offset}
                  strokeLinecap="round"
                  role="button"
                  tabIndex={0}
                  aria-pressed={isHovered}
                  aria-label={`${slice.categoryName}: ${formatPaise(slice.totalPaise)}, ${slice.percentage.toFixed(1)}%`}
                  className="transition-all duration-300 cursor-pointer origin-center outline-none focus:stroke-white"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => setHoveredIdx(hoveredIdx === idx ? null : idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setHoveredIdx(hoveredIdx === idx ? null : idx);
                    }
                  }}
                  style={{
                    opacity: hoveredIdx === null || isHovered ? 1 : 0.45,
                  }}
                />
              );
            })}
          </svg>

          {/* Center Callout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            <span className="text-[10px] sm:text-[11px] uppercase font-semibold tracking-wider text-muted-foreground truncate max-w-[130px] sm:max-w-[150px]">
              {activeCategory ? activeCategory.categoryName : 'Total Spent'}
            </span>
            <span className="text-base xs:text-lg sm:text-2xl font-bold tracking-tight text-foreground font-mono mt-0.5">
              <NumberTicker value={activeCategory ? activeCategory.totalPaise : totalSpendingPaise} />
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono text-primary font-medium mt-0.5">
              {activeCategory
                ? `${activeCategory.percentage.toFixed(1)}% of total`
                : `${categories.length} categories`}
            </span>
          </div>
        </div>

        {/* Mobile touch hint or clear selection pill */}
        <div className="mt-2.5 flex items-center justify-center">
          {activeCategory ? (
            <button
              type="button"
              onClick={() => setHoveredIdx(null)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-foreground bg-primary/10 border border-primary/30 px-2.5 py-1 rounded-full transition-colors active:scale-95 touch-manipulation"
            >
              <span>{activeCategory.categoryName}</span>
              <X className="h-3 w-3" />
            </button>
          ) : (
            <p className="text-[10px] xs:text-[11px] text-muted-foreground text-center">
              Tap or hover any slice to inspect
            </p>
          )}
        </div>
      </div>

      {/* Ranked Category List */}
      <div className="lg:col-span-7 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1 pb-1 border-b border-border/80">
          <span>Ranked Categories</span>
          <div className="flex items-center gap-4 sm:gap-6">
            <span>Share</span>
            <span className="w-16 sm:w-20 text-right">Amount</span>
          </div>
        </div>

        <div className="space-y-1.5 max-h-[280px] sm:max-h-[300px] overflow-y-auto pr-1">
          {slices.map((slice, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <div
                key={slice.categoryName}
                role="button"
                tabIndex={0}
                aria-pressed={isHovered}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => setHoveredIdx(hoveredIdx === idx ? null : idx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setHoveredIdx(hoveredIdx === idx ? null : idx);
                  }
                }}
                className={`p-2.5 sm:p-2.5 rounded-xl border transition-all cursor-pointer active:scale-[0.99] outline-none focus:ring-1 focus:ring-primary touch-manipulation min-h-[46px] flex flex-col justify-center ${
                  isHovered
                    ? 'border-primary/50 bg-primary/10 shadow-xs'
                    : 'border-border/60 bg-card/40 hover:bg-card/80'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-md shrink-0 transition-transform"
                      style={{
                        backgroundColor: slice.color,
                        transform: isHovered ? 'scale(1.2)' : 'none',
                      }}
                    />
                    <span className="font-semibold text-foreground truncate max-w-[120px] xs:max-w-[160px] sm:max-w-[200px]">
                      {slice.categoryName}
                    </span>
                    <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 h-4 border-border text-muted-foreground">
                      {slice.count}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                    <span className="font-mono text-xs font-semibold text-foreground/90">
                      {slice.percentage.toFixed(1)}%
                    </span>
                    <span className="font-bold text-xs font-mono text-foreground w-16 sm:w-20 text-right">
                      {formatPaise(slice.totalPaise)}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(2, slice.percentage)}%`,
                      backgroundColor: slice.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
