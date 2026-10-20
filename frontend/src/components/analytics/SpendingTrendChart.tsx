import React, { useState, useMemo, useRef } from 'react';
import { AnalyticsDailyTrend } from '@/types';
import { formatPaise } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartLine, TrendingUp, Calendar } from '@/components/ui/icons';

interface SpendingTrendChartProps {
  dailyTrend: AnalyticsDailyTrend[];
}

/**
 * Computes a smooth Catmull-Rom spline SVG path string for a sequence of points.
 * Produces organic, continuous curves without sharp polygonal corners.
 */
function getCurvedPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export function SpendingTrendChart({ dailyTrend }: SpendingTrendChartProps) {
  const [viewMode, setViewMode] = useState<'daily' | 'cumulative'>('daily');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const data = useMemo(() => {
    if (!dailyTrend || dailyTrend.length === 0) return [];
    return dailyTrend.map((d) => ({
      ...d,
      value: viewMode === 'daily' ? d.totalPaise : d.cumulativePaise,
    }));
  }, [dailyTrend, viewMode]);

  if (data.length === 0) {
    return (
      <Card className="p-6 sm:p-8 text-center border-border bg-card">
        <ChartLine className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
        <p className="text-sm font-semibold">No timeline data available</p>
        <p className="text-xs text-muted-foreground mt-1">Add expenses to track your spending trajectory over time.</p>
      </Card>
    );
  }

  // Responsive SVG coordinate system
  const width = 800;
  const height = 290;
  const padding = { top: 25, right: 20, bottom: 45, left: 55 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map((d) => d.value), 1000);
  const yTicksCount = 4;
  const yMax = Math.ceil(maxValue / 1000) * 1000;

  const points = data.map((d, i) => {
    const x =
      padding.left +
      (data.length > 1 ? (i / (data.length - 1)) * innerWidth : innerWidth / 2);
    const y = padding.top + innerHeight - (d.value / yMax) * innerHeight;
    return { x, y, data: d };
  });

  const pathD = getCurvedPath(points);

  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${padding.top + innerHeight} L ${points[0].x.toFixed(1)} ${
          padding.top + innerHeight
        } Z`
      : '';

  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;

  // Touch scrubber handler for mobile devices
  const handleTouch = (clientX: number) => {
    if (!containerRef.current || points.length <= 1) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touchX = clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, touchX / rect.width));
    const index = Math.round(fraction * (points.length - 1));
    setHoveredIndex(index);
  };

  return (
    <div
      role="region"
      aria-label="Spending trend and timeline graph"
      className="space-y-3.5"
    >
      {/* Controls row */}
      <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-2.5">
        <header className="flex items-baseline gap-2">
          <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-muted-foreground">
            {viewMode === 'daily' ? 'Daily Spend' : 'Cumulative Spend'}
          </h3>
          <span className="font-mono text-xs text-muted-foreground">
            ({data.length} {data.length === 1 ? 'entry' : 'entries'})
          </span>
        </header>

        {/* View mode toggle with ARIA tab roles */}
        <div
          role="tablist"
          aria-label="Spending Trend Mode"
          className="inline-flex rounded-xl bg-secondary/80 p-1 border border-border text-xs w-full xs:w-auto justify-center"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'daily'}
            onClick={() => setViewMode('daily')}
            className={`flex-1 xs:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all touch-manipulation min-h-[36px] ${
              viewMode === 'daily'
                ? 'bg-card text-foreground shadow-xs border border-border font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Daily Spend
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'cumulative'}
            onClick={() => setViewMode('cumulative')}
            className={`flex-1 xs:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all touch-manipulation min-h-[36px] ${
              viewMode === 'cumulative'
                ? 'bg-card text-foreground shadow-xs border border-border font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Cumulative
          </button>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl border border-border bg-card p-3 sm:p-4 shadow-xs select-none touch-pan-y"
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
          role="img"
          aria-label="Spending graph"
          onTouchMove={(e) => {
            if (e.touches.length > 0) handleTouch(e.touches[0].clientX);
          }}
          onTouchStart={(e) => {
            if (e.touches.length > 0) handleTouch(e.touches[0].clientX);
          }}
          onTouchEnd={() => {
            setTimeout(() => setHoveredIndex(null), 3500);
          }}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y-axis labels */}
          {Array.from({ length: yTicksCount + 1 }).map((_, i) => {
            const val = (yMax / yTicksCount) * (yTicksCount - i);
            const y = padding.top + (innerHeight / yTicksCount) * i;
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + innerWidth}
                  y2={y}
                  stroke="hsl(var(--border) / 0.5)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="hsl(var(--muted-foreground))"
                  className="font-mono text-[9px] sm:text-[10px]"
                >
                  {formatPaise(val)}
                </text>
              </g>
            );
          })}

          {/* Smooth Area fill */}
          {areaD && <path d={areaD} fill="url(#trendGradient)" />}

          {/* Smooth Line stroke */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Hover / Touch Crosshair */}
          {activePoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={padding.top}
                x2={activePoint.x}
                y2={padding.top + innerHeight}
                stroke="hsl(var(--primary))"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="6"
                fill="hsl(var(--background))"
                stroke="hsl(var(--primary))"
                strokeWidth="3"
                className="drop-shadow-md"
              />
            </g>
          )}

          {/* Invisible interactive hover targets */}
          {points.map((pt, i) => (
            <rect
              key={i}
              x={pt.x - innerWidth / points.length / 2}
              y={padding.top}
              width={innerWidth / points.length}
              height={innerHeight}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
            />
          ))}

          {/* X Axis dates */}
          {points
            .filter((_, i) => i === 0 || i === points.length - 1 || i % Math.max(1, Math.floor(points.length / 5)) === 0)
            .map((pt, i) => {
              const dateStr = pt.data.date;
              const formattedDate = dateStr.slice(5); // MM-DD
              return (
                <text
                  key={i}
                  x={pt.x}
                  y={padding.top + innerHeight + 18}
                  textAnchor="middle"
                  fill="hsl(var(--muted-foreground))"
                  className="font-mono text-[9px] sm:text-[10px]"
                >
                  {formattedDate}
                </text>
              );
            })}
        </svg>

        {/* Floating Tooltip Box (smart positioning on mobile vs desktop) */}
        {activePoint && (
          <div
            className={`absolute top-2 z-10 p-2 sm:p-2.5 rounded-xl border border-border bg-card shadow-lg text-xs space-y-1 animate-in fade-in zoom-in-95 pointer-events-none min-w-[140px] sm:min-w-[170px] ${
              activePoint.x > innerWidth / 2 ? 'left-3 sm:left-4' : 'right-3 sm:right-4'
            }`}
          >
            <div className="flex items-center justify-between border-b border-border/80 pb-1">
              <span className="font-mono text-[10px] sm:text-[11px] text-muted-foreground flex items-center gap-1">
                <Calendar className="h-2.5 w-2.5" />
                {activePoint.data.date}
              </span>
              <span className="font-semibold text-primary font-mono text-[11px] sm:text-xs">
                {formatPaise(activePoint.data.value)}
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] space-y-0.5 pt-0.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Personal:</span>
                <span className="font-mono font-medium">{formatPaise(activePoint.data.personalPaise)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Household:</span>
                <span className="font-mono font-medium">{formatPaise(activePoint.data.commonPaise)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Flatmates:</span>
                <span className="font-mono font-medium">{formatPaise(activePoint.data.onBehalfPaise)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] xs:text-[11px] text-muted-foreground text-center">
        Drag or hover along the curve to inspect spending on specific dates
      </p>
    </div>
  );
}
