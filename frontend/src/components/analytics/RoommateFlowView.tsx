import React from 'react';
import { AnalyticsRoommate } from '@/types';
import { formatPaise } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, Users } from '@/components/ui/icons';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { MagicCard } from '@/components/magicui/magic-card';

interface RoommateFlowViewProps {
  roommates: AnalyticsRoommate[];
  onBehalfTotalPaise: number;
}

export function RoommateFlowView({ roommates, onBehalfTotalPaise }: RoommateFlowViewProps) {
  if (!roommates || roommates.length === 0 || onBehalfTotalPaise === 0) {
    return (
      <Card className="p-6 sm:p-8 text-center border-border bg-card/60">
        <Gift className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
        <p className="text-sm font-semibold">No flatmate purchases in this period</p>
        <p className="text-xs text-muted-foreground mt-1">
          When you buy items for your flatmates (on-behalf purchases), their individual breakdown will appear here.
        </p>
      </Card>
    );
  }

  return (
    <div
      role="region"
      aria-label="Flatmate on-behalf spending breakdown"
      className="space-y-3.5 sm:space-y-4"
    >
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1.5">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Beneficiary Flatmates Breakdown
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Spending advanced on behalf of specific flatmates ({roommates.length} flatmates)
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs font-bold text-primary border-primary/40 bg-primary/10 self-start xs:self-auto">
          Total: <NumberTicker value={onBehalfTotalPaise} />
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {roommates.map((rm) => {
          const percentage = onBehalfTotalPaise > 0 ? (rm.totalPaise / onBehalfTotalPaise) * 100 : 0;
          const initial = rm.roommateName ? rm.roommateName.charAt(0).toUpperCase() : 'F';

          return (
            <MagicCard
              key={rm.roommateId}
              gradientColor="rgba(139, 92, 246, 0.18)"
              gradientSize={180}
              className="p-3.5 sm:p-4 border-border/80 bg-card/70 hover:border-primary/40 hover:shadow-md transition-all shadow-xs active:scale-[0.98]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary font-bold text-xs sm:text-sm border border-primary/20">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-xs sm:text-sm text-foreground truncate">
                      {rm.roommateName}
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground font-mono">
                      {rm.count} {rm.count === 1 ? 'purchase' : 'purchases'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-bold text-xs sm:text-sm font-mono text-foreground">
                    <NumberTicker value={rm.totalPaise} />
                  </p>
                  <p className="text-[10px] sm:text-[11px] font-mono text-primary font-medium">
                    {percentage.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden mt-3">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(3, percentage)}%` }}
                />
              </div>
            </MagicCard>
          );
        })}
      </div>
    </div>
  );
}
