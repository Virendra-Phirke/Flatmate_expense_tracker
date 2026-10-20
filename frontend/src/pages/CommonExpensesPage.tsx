import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Expense, HouseholdMember } from '@/types';
import { getSyncCachedData } from '@/lib/idb';
import { formatPaise, rupeesToPaise, getLocalDateString, cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ResponsiveTableSkeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Users,
  Plus,
  Trash2,
  Calendar,
  Loader2,
  AlertCircle,
  Tag,
  Check,
  Sparkles,
} from '@/components/ui/icons';
import { CategoryCombobox, ItemCombobox } from '@/components/ui/CategoryItemCombobox';
import { DEFAULT_CATEGORIES } from '@/data/categorySuggestions';
import { useAuth } from '@/context/AuthContext';
import {
  DateFilter,
  DateFilterValue,
  matchesDateFilter,
  formatFilterLabel,
  getDateFilterRange,
} from '@/components/ui/DateFilter';

export function CommonExpensesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'all' });

  // Form State
  const [description, setDescription] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [categoryName, setCategoryName] = useState('Utilities & Bills');
  const [expenseDate, setExpenseDate] = useState(getLocalDateString());
  const [paidBy, setPaidBy] = useState(user?.id || '');
  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom'>('equal');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: members = [] } = useQuery<HouseholdMember[]>({
    queryKey: ['members'],
    queryFn: () => api<HouseholdMember[]>('GET', '/members'),
    initialData: () => getSyncCachedData<HouseholdMember[]>('/members') || [],
    staleTime: 5 * 60 * 1000,
  });

  const [customShares, setCustomShares] = useState<Record<string, string>>({});

  // Initialize paidBy when user or members load
  React.useEffect(() => {
    if (!paidBy && user?.id) setPaidBy(user.id);
  }, [user, members]);

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['common_expenses'],
    queryFn: () => api<Expense[]>('GET', '/expenses?type=common'),
    initialData: () => getSyncCachedData<Expense[]>('/expenses?type=common') || [],
  });

  const totalPaise = rupeesToPaise(amountRupees);

  // Calculate equal split shares
  const calculateShares = () => {
    if (splitMethod === 'equal') {
      const activeCount = members.length || 1;
      const baseShare = Math.floor(totalPaise / activeCount);
      let remainder = totalPaise % activeCount;

      return members.map((m) => {
        const share = baseShare + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;
        return {
          user_id: m.id,
          amount_paise: share,
        };
      });
    } else {
      // Custom shares
      return members.map((m) => ({
        user_id: m.id,
        amount_paise: rupeesToPaise(customShares[m.id] || '0'),
      }));
    }
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!description.trim()) throw new Error('Description is required.');
      if (totalPaise <= 0) throw new Error('Please enter a valid amount.');
      if (!paidBy) throw new Error('Please select who paid for the expense.');

      const shares = calculateShares();
      const shareSum = shares.reduce((sum, s) => sum + Number(s.amount_paise || 0), 0);

      if (shareSum !== totalPaise) {
        throw new Error(
          `Total of shares (${formatPaise(shareSum)}) does not match expense amount (${formatPaise(totalPaise)})`
        );
      }

      return api('POST', '/expenses/common', {
        description: description.trim(),
        amount_paise: totalPaise,
        category_id: categoryName.trim() || 'Household Common',
        expense_date: expenseDate,
        paid_by: paidBy,
        split_method: splitMethod,
        notes: notes.trim() || undefined,
        shares,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['common_expenses'] });
      queryClient.invalidateQueries({ queryKey: ['balances_summary'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setModalOpen(false);
      setDescription('');
      setAmountRupees('');
      setCategoryName('Utilities & Bills');
      setNotes('');
      setCustomShares({});
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to record common expense.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api('DELETE', `/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['common_expenses'] });
      queryClient.invalidateQueries({ queryKey: ['balances_summary'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => matchesDateFilter(e.expense_date, dateFilter));
  }, [expenses, dateFilter]);

  const totalCommon = filteredExpenses.reduce((sum, e) => sum + Number(e.amount_paise || 0), 0);
  const isFilterActive = dateFilter.mode !== 'all';
  const isAdmin = user?.role === 'admin';

  return (
    <main className="space-y-6">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-3 sm:pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">Common Expenses</h1>
            <Badge variant="outline" className="border-border text-muted-foreground font-mono text-xs">
              {isFilterActive ? `${filteredExpenses.length} of ${expenses.length} records` : `${expenses.length} records`}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Shared flat costs split among flatmates (Wi-Fi, maid, cook, utilities)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] uppercase font-semibold text-muted-foreground">
              {isFilterActive ? 'Filtered Common' : 'Total Common'}
            </div>
            <div className="text-lg font-bold font-mono text-foreground">
              {formatPaise(totalCommon)}
            </div>
          </div>
          {isAdmin && (
            <Button
              onClick={() => setModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-semibold"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Common Expense
            </Button>
          )}
        </div>
      </header>

      {/* Date Filter Bar */}
      <section aria-label="Date filter" className="rounded-lg border border-border bg-card p-3 sm:p-3.5 shadow-xs">
        <DateFilter
          value={dateFilter}
          onChange={setDateFilter}
          totalRecords={expenses.length}
          filteredCount={filteredExpenses.length}
        />
      </section>

      {isLoading ? (
        <ResponsiveTableSkeleton rows={5} mobileCards={3} />
      ) : expenses.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="p-12 text-center flex flex-col items-center">
            <Users className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-base font-semibold text-foreground">No common expenses yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-5">
              {isAdmin
                ? 'Record shared bills like monthly Wi-Fi, electricity, or common groceries here.'
                : 'No shared household expenses have been recorded yet.'}
            </p>
            {isAdmin && (
              <Button
                onClick={() => setModalOpen(true)}
                variant="outline"
                className="border-border text-foreground"
              >
                Add First Common Expense
              </Button>
            )}
          </CardContent>
        </Card>
      ) : filteredExpenses.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="p-8 sm:p-12 text-center flex flex-col items-center">
            <Calendar className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-base font-semibold text-foreground">No common expenses match this date filter</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mt-1 mb-5">
              No common expenses were recorded for {formatFilterLabel(dateFilter)}. Try selecting a different date, month, or clear the filter.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <Button
                onClick={() => setDateFilter({ mode: 'all' })}
                variant="outline"
                className="min-h-10 text-xs sm:text-sm"
              >
                Clear Date Filter
              </Button>
              {isAdmin && (
                <Button
                  onClick={() => setModalOpen(true)}
                  size="sm"
                  className="min-h-10 text-xs sm:text-sm"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add Common Expense
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredExpenses.map((exp) => {
            const myShare = exp.shares?.find((s: any) => s.user_id === user?.id)?.amount_paise;

            return (
              <Card
                key={exp.id}
                className="border-border bg-card overflow-hidden"
              >
                <div className="p-3.5 min-[360px]:p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground text-sm min-[360px]:text-base">{exp.description}</h3>
                      <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">
                        {exp.split_method === 'equal' ? 'Equal Split' : 'Custom Split'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5">
                      <span>
                        Paid by: <strong className="text-foreground">{exp.paid_by_name}</strong>
                      </span>
                      <span>&bull;</span>
                      <span className="font-mono text-muted-foreground">{exp.expense_date}</span>
                      {exp.notes && <span>&bull; {exp.notes}</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 min-[360px]:gap-4">
                    <div className="text-left sm:text-right">
                      <div className="text-sm min-[360px]:text-base font-semibold font-mono text-foreground">
                        Total: {formatPaise(exp.amount_paise)}
                      </div>
                      {myShare !== undefined && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          My share:{' '}
                          <span className="font-mono font-bold text-foreground">
                            {formatPaise(myShare)}
                          </span>
                        </div>
                      )}
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete common expense "${exp.description}"?`)) {
                            deleteMutation.mutate(exp.id);
                          }
                        }}
                        title="Delete expense"
                        className="min-h-10 min-w-10 flex items-center justify-center text-muted-foreground hover:text-negative transition-colors rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Shares breakdown if available */}
                {exp.shares && exp.shares.length > 0 && (
                  <div className="p-4 bg-surface-subtle/50">
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                      Participant Allocations
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {exp.shares.map((sh) => (
                        <div
                          key={sh.id}
                          className={`p-2.5 rounded-lg border text-xs ${
                            sh.user_id === user?.id
                              ? 'border-primary/40 bg-brand-soft/40'
                              : 'border-border bg-card'
                          }`}
                        >
                          <div className="font-medium text-foreground truncate flex items-center justify-between">
                            <span>{sh.full_name}</span>
                            {sh.user_id === user?.id && (
                              <span className="text-[9px] text-primary uppercase font-bold">You</span>
                            )}
                          </div>
                          <div className="font-mono font-bold text-foreground mt-0.5">
                            {formatPaise(sh.amount_paise)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Common Expense Modal (Admin Only) */}
      {isAdmin && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-xl bg-card border-border text-foreground max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Add Common Shared Expense
              </DialogTitle>
            </DialogHeader>

            {formError && (
              <div className="rounded-lg border border-negative/30 bg-negative-soft p-3 text-xs text-negative flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addMutation.mutate();
              }}
              className="space-y-4 pt-1"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Total Amount (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g. 1500"
                    value={amountRupees}
                    onChange={(e) => setAmountRupees(e.target.value)}
                    className="bg-surface-subtle border-border font-mono text-base"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Paid By</label>
                  <select
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    aria-label="Select member who paid"
                    className="w-full h-10 rounded-lg border border-border bg-surface-subtle px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.username})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Category Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5 text-primary" />
                  Category:
                </span>
                {['utilities', 'household', 'groceries', 'food'].map((id) => {
                  const cat = DEFAULT_CATEGORIES.find((c) => c.id === id);
                  if (!cat) return null;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryName(cat.name)}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium shrink-0 transition-colors ${
                        categoryName.toLowerCase() === cat.name.toLowerCase()
                          ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                          : 'bg-secondary/80 hover:bg-secondary text-secondary-foreground hover:border-primary/40 border border-transparent'
                      }`}
                    >
                      <span>{cat.emoji}</span>
                      <span>{cat.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Category</label>
                  <CategoryCombobox
                    value={categoryName}
                    onChange={setCategoryName}
                    placeholder="Select category..."
                  />
                </div>

                <div className="sm:col-span-7 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Description & Suggestions</label>
                  <ItemCombobox
                    value={description}
                    onChange={setDescription}
                    category={categoryName}
                    onCategoryChange={setCategoryName}
                    placeholder="e.g. Airtel Wi-Fi, Water Cans, Maid..."
                    showChips={true}
                    chipsLimit={4}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Date</label>
                  <Input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="bg-surface-subtle border-border min-h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Split Method</label>
                  <div className="grid grid-cols-2 gap-1.5 h-11">
                    <button
                      type="button"
                      onClick={() => setSplitMethod('equal')}
                      className={`rounded-lg border text-xs font-medium transition-all ${
                        splitMethod === 'equal'
                          ? 'border-primary bg-brand-soft text-primary font-bold'
                          : 'border-border bg-surface-subtle text-muted-foreground'
                      }`}
                    >
                      Equal
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitMethod('custom')}
                      className={`rounded-lg border text-xs font-medium transition-all ${
                        splitMethod === 'custom'
                          ? 'border-primary bg-brand-soft text-primary font-bold'
                          : 'border-border bg-surface-subtle text-muted-foreground'
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                </div>
              </div>

              {/* Split breakdown preview */}
              <div className="rounded-lg border border-border bg-surface-subtle/50 p-3 min-[360px]:p-3.5 space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Split Allocations ({members.length} members)
                </div>
                <div className="space-y-1.5">
                  {members.map((m, idx) => {
                    const activeCount = members.length || 1;
                    const baseShare = Math.floor(totalPaise / activeCount);
                    const remainder = totalPaise % activeCount;
                    const equalSharePaise = baseShare + (idx < remainder ? 1 : 0);

                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-card border border-border min-h-[44px]"
                      >
                        <span className="text-foreground font-medium truncate mr-2">{m.full_name}</span>
                        {splitMethod === 'equal' ? (
                          <span className="font-mono font-medium text-foreground shrink-0">
                            {formatPaise(equalSharePaise)}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-muted-foreground">₹</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0"
                              value={customShares[m.id] || ''}
                              onChange={(e) =>
                                setCustomShares({ ...customShares, [m.id]: e.target.value })
                              }
                              className="w-24 h-8 text-xs font-mono bg-surface-subtle border-border"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {splitMethod === 'custom' && (
                  <div className="pt-1.5 border-t border-border flex items-center justify-between text-[11px] font-mono">
                    <span className="text-muted-foreground">Custom split sum:</span>
                    {(() => {
                      const customSumPaise = members.reduce(
                        (sum, m) => sum + rupeesToPaise(customShares[m.id] || '0'),
                        0
                      );
                      const diff = totalPaise - customSumPaise;
                      return (
                        <span className={diff === 0 ? 'text-positive font-semibold' : 'text-warning font-semibold'}>
                          {formatPaise(customSumPaise)} of {formatPaise(totalPaise)}
                          {diff !== 0 && ` (${diff > 0 ? 'remaining ' : 'over '} ${formatPaise(Math.abs(diff))})`}
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Notes (Optional)</label>
                <Input
                  type="text"
                  placeholder="Bill number or notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-surface-subtle border-border text-xs min-h-10"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="w-full sm:w-auto min-h-11 border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="w-full sm:w-auto min-h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                >
                  {addMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    'Record Common Expense'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}
