import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Target, TrendingUp, AlertCircle, CheckCircle2 } from '@/components/ui/icons';
import { formatPaise, rupeesToPaise } from '@/lib/utils';
import { Expense } from '@/types';

interface PersonalBudgetCardProps {
  expenses: Expense[];
}

const STORAGE_KEY = 'flatmate_personal_budget_target_rupees';
const DEFAULT_TARGET_RUPEES = 10000;

export function PersonalBudgetCard({ expenses }: PersonalBudgetCardProps) {
  const [targetRupees, setTargetRupees] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_TARGET_RUPEES;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? Math.max(100, parseInt(saved, 10) || DEFAULT_TARGET_RUPEES) : DEFAULT_TARGET_RUPEES;
  });

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [inputVal, setInputVal] = useState(String(targetRupees));
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const currentMonthStr = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Current month's personal spending
  const currentMonthPaise = useMemo(() => {
    return expenses
      .filter((e) => e.expense_date && e.expense_date.startsWith(currentYearMonth))
      .reduce((sum, e) => sum + Number(e.amount_paise || 0), 0);
  }, [expenses, currentYearMonth]);

  const targetPaise = rupeesToPaise(String(targetRupees));
  const percentUsed = targetPaise > 0 ? (currentMonthPaise / targetPaise) * 100 : 0;
  const isOverBudget = currentMonthPaise > targetPaise;
  const isCaution = percentUsed >= 75 && !isOverBudget;

  // Days left in current month calculation
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const daysRemaining = Math.max(1, daysInMonth - currentDay + 1);
  const remainingPaise = Math.max(0, targetPaise - currentMonthPaise);
  const dailyPacingPaise = Math.floor(remainingPaise / daysRemaining);

  const handleSaveTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(inputVal.trim(), 10);
    if (!val || isNaN(val) || val <= 0) {
      setError('Please enter a valid monthly amount in ₹');
      return;
    }
    setTargetRupees(val);
    try {
      localStorage.setItem(STORAGE_KEY, String(val));
    } catch {}
    setEditModalOpen(false);
    setError(null);
  };

  return (
    <>
      <Card className="border-border bg-card overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Target className="h-4 w-4" />
                </span>
                <span className="text-xs font-mono uppercase tracking-wider font-semibold text-muted-foreground">
                  Personal Monthly Budget ({currentMonthStr})
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-2 mt-2">
                <span className="font-mono text-xl sm:text-2xl font-bold text-foreground">
                  {formatPaise(currentMonthPaise)}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  of {formatPaise(targetPaise)} cap ({percentUsed.toFixed(0)}%)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {isOverBudget ? (
                <Badge className="bg-negative-soft text-negative border-negative/30 text-xs font-mono">
                  Exceeded by {formatPaise(currentMonthPaise - targetPaise)}
                </Badge>
              ) : isCaution ? (
                <Badge className="bg-pending-soft text-pending border-pending/30 text-xs font-mono">
                  Caution: {percentUsed.toFixed(0)}% Used
                </Badge>
              ) : (
                <Badge className="bg-positive-soft text-positive border-positive/30 text-xs font-mono">
                  On Track ({formatPaise(remainingPaise)} left)
                </Badge>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setInputVal(String(targetRupees));
                  setError(null);
                  setEditModalOpen(true);
                }}
                className="h-8 px-2.5 text-xs font-medium border-border hover:bg-muted"
              >
                Set Cap
              </Button>
            </div>
          </div>

          {/* Progress track */}
          <div className="mt-3.5 space-y-1.5">
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isOverBudget
                    ? 'bg-negative'
                    : isCaution
                    ? 'bg-pending'
                    : 'bg-primary'
                }`}
                style={{ width: `${Math.min(100, percentUsed)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {isOverBudget
                  ? 'Over planned cap'
                  : `Allowance: ${formatPaise(dailyPacingPaise)}/day`}
              </span>
              <span>{daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left in month</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Budget Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-sm p-5 bg-card text-card-foreground border-border">
          <DialogHeader className="text-left pb-2">
            <DialogTitle className="text-base font-bold text-foreground">
              Set Personal Monthly Budget
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveTarget} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label htmlFor="budget-input" className="text-xs font-semibold text-foreground">
                Monthly Target Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-muted-foreground font-mono">
                  ₹
                </span>
                <Input
                  id="budget-input"
                  type="number"
                  min="100"
                  step="100"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  className="pl-8 font-mono text-sm"
                  placeholder="10000"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Helps you track your discretionary spending pace throughout {currentMonthStr}.
              </p>
              {error && <p className="text-xs text-negative font-medium">{error}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(false)}
                className="h-9 text-xs border-border"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="h-9 text-xs font-semibold">
                Save Target
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
