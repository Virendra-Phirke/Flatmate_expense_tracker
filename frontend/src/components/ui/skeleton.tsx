import React from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse motion-reduce:animate-none rounded-md bg-muted/60',
        className
      )}
      {...props}
    />
  );
}

/**
 * Responsive Stats Skeleton
 */
export function StatsSkeletonGrid() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-card p-4 sm:p-5 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-20 sm:w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-7 sm:h-8 w-28 sm:w-36 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * Responsive Table/Card Skeleton:
 * Accurately models the transaction row pattern (Section 9.3) on mobile and desktop
 */
export function ResponsiveTableSkeleton({
  rows = 5,
  mobileCards = 4,
}: {
  rows?: number;
  mobileCards?: number;
}) {
  return (
    <div className="w-full space-y-3" aria-busy="true" aria-label="Loading list items">
      {/* Mobile view (< md): Transaction rows/cards */}
      <div className="md:hidden space-y-2.5">
        {Array.from({ length: mobileCards }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-4 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                <div className="space-y-1.5 min-w-0 flex-1">
                  <Skeleton className="h-4 w-3/4 max-w-[180px]" />
                  <Skeleton className="h-3 w-1/2 max-w-[120px]" />
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Skeleton className="h-5 w-18" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop view (>= md): Card with table */}
      <div className="hidden md:block rounded-lg border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-3.5 flex items-center justify-between bg-surface-subtle">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-2/5 min-w-0">
                <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                <div className="space-y-1 min-w-0 flex-1">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-20 font-mono" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Dashboard Skeleton (Section 10.2):
 * Preserves the exact layout of Home / Dashboard with no layout jumps
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8" aria-busy="true" aria-label="Loading household dashboard">
      {/* Header Greeting Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5 min-w-0">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-3.5 w-48" />
        </div>
        <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto">
          <Skeleton className="h-12 w-full sm:w-32 rounded-lg" />
          <Skeleton className="h-12 w-full sm:w-28 rounded-lg" />
        </div>
      </div>

      {/* Net Position Hero Card Skeleton */}
      <div className="rounded-lg border border-border bg-card p-3.5 min-[360px]:p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 min-w-0">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-10 w-44" />
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-7 w-7 min-[360px]:h-8 min-[360px]:w-8 rounded-full" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2 sm:w-64 sm:grid-cols-1">
            <div className="rounded-lg border border-border bg-surface-subtle p-2.5 min-[360px]:p-3 space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="rounded-lg border border-border bg-surface-subtle p-2.5 min-[360px]:p-3 space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* Spending Overview Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-5 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Debts & Credits 2-Column Skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="divide-y divide-border p-0">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-7 w-16 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="divide-y divide-border p-0">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-7 w-16 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Skeleton Card */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border space-y-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 flex items-start gap-3">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <Skeleton className="h-4 w-3/4 max-w-sm" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Balances Skeleton (Section 10.8):
 * Preserves the exact layout of BalancesPage
 */
export function BalancesSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8" aria-busy="true" aria-label="Loading balances">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-7 w-44" />
          </div>
          <Skeleton className="h-3.5 w-60" />
        </div>
        <Skeleton className="h-11 w-28 rounded-lg" />
      </div>

      {/* Hero Summary Card */}
      <div className="rounded-lg border border-border bg-card p-3.5 min-[360px]:p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 min-w-0">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-10 w-44" />
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-7 w-7 min-[360px]:h-8 min-[360px]:w-8 rounded-full" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2 sm:w-64 sm:grid-cols-1">
            <div className="rounded-lg border border-border bg-surface-subtle p-2.5 min-[360px]:p-3 space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="rounded-lg border border-border bg-surface-subtle p-2.5 min-[360px]:p-3 space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* Debts & Credits List Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="divide-y divide-border">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-7 w-16 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="divide-y divide-border">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-7 w-16 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Profile Skeleton (Section 10.10):
 * Preserves the exact layout of Profile & UPI Settings
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl" aria-busy="true" aria-label="Loading profile details">
      {/* Header */}
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-3.5 w-72" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Account Details */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex justify-between py-1 border-b border-border">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>
              <Skeleton className="h-9 w-full rounded-lg mt-2" />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 space-y-2.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-4/6" />
          </div>
        </div>

        {/* Right Column: UPI Settings */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border border-border bg-card p-5 space-y-5">
            <div className="space-y-1 pb-3 border-b border-border">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-3 w-64" />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-2.5 w-48" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
              <div className="flex justify-end pt-1">
                <Skeleton className="h-9 w-32 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
