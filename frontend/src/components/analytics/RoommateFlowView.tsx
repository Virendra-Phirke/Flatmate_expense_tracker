import React from 'react';
import { AnalyticsRoommate } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from '@/components/ui/icons';
import { NumberTicker } from '@/components/magicui/number-ticker';

interface RoommateFlowViewProps {
  roommates: AnalyticsRoommate[];
  onBehalfTotalPaise: number;
}

export function RoommateFlowView({ roommates, onBehalfTotalPaise }: RoommateFlowViewProps) {
  if (!roommates || roommates.length === 0 || onBehalfTotalPaise === 0) {
    return (
      <Card className="p-6 sm:p-8 text-center border-border bg-card">
        <Users className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
        <p className="text-sm font-semibold">No flatmate advances in this period</p>
        <p className="text-xs text-muted-foreground mt-1">
          When you buy items for specific flatmates, their individual breakdown will show here.
        </p>
      </Card>
    );
  }

  return (
    <div
      role="region"
      aria-label="Flatmate advances breakdown"
      className="space-y-3.5 sm:space-y-4"
    >
      <header className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-muted-foreground">
            Recipient Breakdown
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Purchases made on behalf of {roommates.length} flatmate{roommates.length === 1 ? '' : 's'}.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs font-semibold border-border bg-secondary text-secondary-foreground self-start xs:self-auto">
          Total: <NumberTicker value={onBehalfTotalPaise} />
        </Badge>
      </header>

      <div className={`grid gap-3 sm:gap-4 ${roommates.length === 1 ? 'grid-cols-1 max-w-xl' : 'grid-cols-1 md:grid-cols-2'}`}>
        {roommates.map((rm) => {
          const percentage = onBehalfTotalPaise > 0 ? (rm.totalPaise / onBehalfTotalPaise) * 100 : 0;
          const initial = rm.roommateName ? rm.roommateName.charAt(0).toUpperCase() : 'F';

          return (
            <article
              key={rm.roommateId}
              className="p-4 border border-border bg-card rounded-lg shadow-xs transition-[border-color] duration-100 hover:border-foreground/30"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground font-mono font-bold text-xs border border-border">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-xs sm:text-sm text-foreground truncate">
                      {rm.roommateName}
                    </h4>
                    <p className="text-xs text-muted-foreground font-mono">
                      {rm.count} {rm.count === 1 ? 'purchase' : 'purchases'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-bold text-xs sm:text-sm font-mono text-foreground">
                    <NumberTicker value={rm.totalPaise} />
                  </p>
                  <p className="text-xs font-mono text-muted-foreground font-medium">
                    {percentage.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden mt-3">
                <div
                  className="bg-primary h-full rounded-full transition-[width] duration-300 ease-out"
                  style={{ width: `${Math.max(3, percentage)}%` }}
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

