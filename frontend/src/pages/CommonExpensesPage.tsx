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
  CheckCircle2,
  Sparkles,
  Flame,
  Zap,
  Droplet,
  Utensils,
  Wifi,
  Home,
  Receipt,
  User,
  ArrowDownLeft,
  ArrowUpRight,
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
import { ResponsivePagination } from '@/components/ui/pagination';

interface CommonExpensesPageProps {
  openAddModal?: number;
  onAddModalClose?: () => void;
}

function getCommonExpenseVisual(description: string = '') {
  const d = description.toLowerCase();
  if (d.includes('gas') || d.includes('cylinder') || d.includes('indane') || d.includes('hp') || d.includes('bharat')) {
    return {
      icon: Flame,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/25',
      name: 'Cooking Gas',
    };
  }
  if (d.includes('power') || d.includes('electric') || d.includes('bill') || d.includes('torrent') || d.includes('bescom') || d.includes('current') || d.includes('light')) {
    return {
      icon: Zap,
      color: 'text-amber-400 bg-amber-400/10 border-amber-400/25',
      name: 'Electricity',
    };
  }
  if (d.includes('water') || d.includes('bisleri') || d.includes('can') || d.includes('aquafina') || d.includes('tanker')) {
    return {
      icon: Droplet,
      color: 'text-teal-400 bg-teal-400/10 border-teal-400/25',
      name: 'Drinking Water',
    };
  }
  if (d.includes('clean') || d.includes('urban') || d.includes('pest') || d.includes('maid') || d.includes('sweeping') || d.includes('dusting')) {
    return {
      icon: Sparkles,
      color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
      name: 'Cleaning & Housekeeping',
    };
  }
  if (d.includes('cook') || d.includes('ration') || d.includes('grocery') || d.includes('kitchen') || d.includes('food')) {
    return {
      icon: Utensils,
      color: 'text-orange-400 bg-orange-400/10 border-orange-400/25',
      name: 'Food & Cook',
    };
  }
  if (d.includes('wifi') || d.includes('broadband') || d.includes('internet') || d.includes('fiber') || d.includes('airtel') || d.includes('jio')) {
    return {
      icon: Wifi,
      color: 'text-primary bg-primary/10 border-primary/25',
      name: 'Wi-Fi & Broadband',
    };
  }
  if (d.includes('rent') || d.includes('society') || d.includes('maintenance')) {
    return {
      icon: Home,
      color: 'text-primary bg-primary/10 border-primary/25',
      name: 'Rent & Society',
    };
  }
  return {
    icon: Receipt,
    color: 'text-muted-foreground bg-muted/40 border-border',
    name: 'Shared Flat Cost',
  };
}

export function CommonExpensesPage({
  openAddModal,
  onAddModalClose,
}: CommonExpensesPageProps = {}) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  React.useEffect(() => {
    if (openAddModal) {
      if (isAdmin) {
        setModalOpen(true);
      } else {
        alert('Only household admins can log shared communal bills. Please ask an admin to add this expense.');
        if (onAddModalClose) onAddModalClose();
      }
    }
  }, [openAddModal, isAdmin]);

  const handleModalChange = (open: boolean) => {
    setModalOpen(open);
    if (!open && onAddModalClose) {
      onAddModalClose();
    }
  };
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'all' });

  // Pagination state (10 items per page optimal for mobile Android viewport)
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter]);

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

  const totalPages = Math.ceil(filteredExpenses.length / PAGE_SIZE) || 1;
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredExpenses.slice(start, start + PAGE_SIZE);
  }, [filteredExpenses, currentPage, PAGE_SIZE]);

  const totalCommon = filteredExpenses.reduce((sum, e) => sum + Number(e.amount_paise || 0), 0);
  const myTotalShare = filteredExpenses.reduce((sum, e) => {
    const s = e.shares?.find((sh: any) => sh.user_id === user?.id);
    return sum + Number(s?.amount_paise || 0);
  }, 0);
  const myTotalPaid = filteredExpenses.reduce((sum, e) => {
    return sum + (e.paid_by === user?.id ? Number(e.amount_paise || 0) : 0);
  }, 0);
  const netCommonDiff = myTotalPaid - myTotalShare;
  const isFilterActive = dateFilter.mode !== 'all';

  return (
    <main className="space-y-3 sm:space-y-4">
      {/* Page Header */}
      <header className="flex items-center justify-between gap-2 border-b border-border/70 pb-1.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight truncate">Common Expenses</h1>
            <Badge variant="outline" className="border-border text-muted-foreground font-mono text-[10px] py-0 px-1.5">
              {isFilterActive ? `${filteredExpenses.length} of ${expenses.length}` : `${expenses.length}`}
            </Badge>
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
            Shared flat costs split among flatmates (Wi-Fi, maid, cook, utilities)
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono font-semibold text-muted-foreground block">
              Total
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono text-foreground block">
              {formatPaise(totalCommon)}
            </span>
          </div>
        </div>
      </header>

      {/* ── 3-Box Compact Metric Summary Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Box 1: Total Common Bill */}
        <div className="rounded-lg border border-border bg-card p-3 shadow-xs flex items-center justify-between">
          <div className="min-w-0 flex-1 mr-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-muted-foreground block truncate">
              Total Flat Spend
            </span>
            <span className="text-base sm:text-lg font-mono font-bold text-foreground block mt-0.5 truncate">
              {formatPaise(totalCommon)}
            </span>
            <span className="text-[11px] text-muted-foreground block mt-0.5 truncate">
              {filteredExpenses.length} shared bill{filteredExpenses.length === 1 ? '' : 's'} recorded
            </span>
          </div>
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
            <Users className="h-4 w-4" />
          </div>
        </div>

        {/* Box 2: Your Share */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 shadow-xs flex items-center justify-between">
          <div className="min-w-0 flex-1 mr-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-primary block truncate">
              Your Share
            </span>
            <span className="text-base sm:text-lg font-mono font-bold text-primary block mt-0.5 truncate">
              {formatPaise(myTotalShare)}
            </span>
            <span className="text-[11px] text-muted-foreground block mt-0.5 truncate">
              Your portion across shared costs
            </span>
          </div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <User className="h-4 w-4" />
          </div>
        </div>

        {/* Box 3: You Paid Out of Pocket */}
        <div className="rounded-lg border border-border bg-card p-3 shadow-xs flex items-center justify-between">
          <div className="min-w-0 flex-1 mr-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-muted-foreground block truncate">
              You Paid Directly
            </span>
            <span className="text-base sm:text-lg font-mono font-bold text-foreground block mt-0.5 truncate">
              {formatPaise(myTotalPaid)}
            </span>
            <span
              className={`text-[11px] font-semibold block mt-0.5 truncate ${
                netCommonDiff > 0
                  ? 'text-positive'
                  : netCommonDiff < 0
                  ? 'text-negative'
                  : 'text-muted-foreground'
              }`}
            >
              {netCommonDiff > 0
                ? `+${formatPaise(netCommonDiff)} owed back to you`
                : netCommonDiff < 0
                ? `${formatPaise(Math.abs(netCommonDiff))} to settle up`
                : 'All square on common bills'}
            </span>
          </div>
          <div
            className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
              netCommonDiff >= 0
                ? 'bg-positive-soft text-positive'
                : 'bg-negative-soft text-negative'
            }`}
          >
            {netCommonDiff >= 0 ? (
              <ArrowDownLeft className="h-4 w-4" />
            ) : (
              <ArrowUpRight className="h-4 w-4" />
            )}
          </div>
        </div>
      </div>

      {/* Date Filter & Actions Bar: Button in the SAME row as filter */}
      <section aria-label="Date filter and actions" className="rounded-lg border border-border bg-card p-2.5 sm:p-3 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between gap-2.5">
          <DateFilter
            value={dateFilter}
            onChange={setDateFilter}
            totalRecords={expenses.length}
            filteredCount={filteredExpenses.length}
          />
          {isAdmin && (
            <Button
              onClick={() => setModalOpen(true)}
              size="sm"
              className="h-8 px-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shrink-0 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Common
            </Button>
          )}
        </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs sm:hidden">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isFilterActive ? 'Filtered:' : 'Total common:'}{' '}
              <strong className="font-mono text-xs text-foreground font-bold">{formatPaise(totalCommon)}</strong>
            </span>
            <Badge variant="outline" className="text-xs font-mono py-0.5">
              {isFilterActive ? `${filteredExpenses.length} of ${expenses.length} records` : `${expenses.length} records`}
            </Badge>
          </div>
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
        <div className="space-y-2.5">
          {paginatedExpenses.map((exp) => {
            const isPaidByMe = exp.paid_by === user?.id;
            const myShare = exp.shares?.find((s: any) => s.user_id === user?.id)?.amount_paise;
            const visual = getCommonExpenseVisual(exp.description);
            const VisualIcon = visual.icon;
            const recoveringAmount = exp.amount_paise - (myShare || 0);

            return (
              <Card
                key={exp.id}
                className="border-border bg-card overflow-hidden shadow-2xs hover:border-border/90 transition-colors"
              >
                <div className="p-2.5 sm:p-3.5 flex items-start sm:items-center justify-between gap-3 border-b border-border/60">
                  <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    {/* Category icon pill */}
                    <div
                      className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center shrink-0 border ${visual.color}`}
                      title={visual.name}
                    >
                      <VisualIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <h3 className="font-bold text-foreground text-xs sm:text-sm tracking-tight truncate">
                          {exp.description}
                        </h3>
                        <Badge
                          variant="outline"
                          className="border-border text-muted-foreground text-[10px] font-mono py-0 px-1.5 shrink-0"
                        >
                          {exp.split_method === 'equal'
                            ? `Equal (${exp.shares?.length || 0})`
                            : 'Custom Split'}
                        </Badge>
                      </div>

                      <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5 truncate">
                        {isPaidByMe ? (
                          <span className="font-semibold text-positive flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> You paid this bill
                          </span>
                        ) : (
                          <span>
                            Paid by <strong className="text-foreground">{exp.paid_by_name}</strong>
                          </span>
                        )}
                        <span>&bull;</span>
                        <span className="font-mono text-muted-foreground">{exp.expense_date}</span>
                        {exp.notes && (
                          <>
                            <span className="hidden xs:inline">&bull;</span>
                            <span className="hidden xs:inline truncate italic max-w-[220px]">
                              {exp.notes}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-bold font-mono text-foreground">
                        {formatPaise(exp.amount_paise)}
                      </div>
                      {isPaidByMe ? (
                        <div className="text-[10px] font-semibold text-positive font-mono flex items-center justify-end gap-1">
                          Receiving {formatPaise(recoveringAmount)}
                        </div>
                      ) : myShare !== undefined ? (
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Your share: <span className="font-bold text-foreground">{formatPaise(myShare)}</span>
                        </div>
                      ) : null}
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
                        className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-negative transition-colors rounded active:scale-95"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Shares breakdown */}
                {exp.shares && exp.shares.length > 0 && (
                  <div className="p-2 sm:p-2.5 bg-muted/20">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                      {exp.shares.map((share: any) => {
                        const name = share.full_name || share.user_name || share.username || 'Flatmate';
                        const isMe = share.user_id === user?.id;
                        const isPayer = share.user_id === exp.paid_by;
                        const initial = name.charAt(0).toUpperCase();

                        return (
                          <div
                            key={share.id || share.user_id}
                            className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-md border text-xs transition-all ${
                              isMe
                                ? 'border-primary/50 bg-primary/10 shadow-2xs ring-1 ring-primary/20'
                                : isPayer
                                ? 'border-border/80 bg-card/90'
                                : 'border-border/60 bg-card'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                                  isMe
                                    ? 'bg-primary text-primary-foreground'
                                    : isPayer
                                    ? 'bg-positive-soft text-positive border border-positive/30'
                                    : 'bg-muted text-muted-foreground font-mono'
                                }`}
                              >
                                {initial}
                              </span>
                              <div className="min-w-0 flex-1 flex items-center gap-1">
                                <span
                                  className={`truncate text-[11px] ${
                                    isMe ? 'font-bold text-foreground' : 'font-medium text-foreground'
                                  }`}
                                >
                                  {isMe ? 'You' : name}
                                </span>
                                {isPayer && (
                                  <span className="text-[8px] font-mono uppercase px-1 py-0 rounded bg-muted text-muted-foreground font-semibold shrink-0">
                                    Payer
                                  </span>
                                )}
                              </div>
                            </div>
                            <span
                              className={`font-mono text-xs shrink-0 ${
                                isMe ? 'font-bold text-primary' : 'font-semibold text-foreground'
                              }`}
                            >
                              {formatPaise(share.amount_paise)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}

          {/* Responsive Mobile-First Pagination */}
          <ResponsivePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredExpenses.length}
            pageSize={PAGE_SIZE}
          />
        </div>
      )}

      {/* Add Common Expense Modal (Admin Only) */}
      {isAdmin && (
        <Dialog open={modalOpen} onOpenChange={handleModalChange}>
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
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" />
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
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
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
                  <div className="pt-1.5 border-t border-border flex items-center justify-between text-xs font-mono">
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
