import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Expense, Category } from '@/types';
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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Plus,
  Trash2,
  Receipt,
  Calendar,
  Tag,
  Loader2,
  AlertCircle,
  Sparkles,
} from '@/components/ui/icons';
import { CategoryCombobox, ItemCombobox } from '@/components/ui/CategoryItemCombobox';
import { DEFAULT_CATEGORIES } from '@/data/categorySuggestions';
import {
  DateFilter,
  DateFilterValue,
  matchesDateFilter,
  formatFilterLabel,
  getDateFilterRange,
} from '@/components/ui/DateFilter';

import { ResponsivePagination } from '@/components/ui/pagination';

interface PersonalExpensesPageProps {
  hideTitle?: boolean;
  dateFilter?: DateFilterValue;
  onDateFilterChange?: (filter: DateFilterValue) => void;
}

export function PersonalExpensesPage({
  hideTitle = false,
  dateFilter,
  onDateFilterChange,
}: PersonalExpensesPageProps = {}) {
  const queryClient = useQueryClient();
  const [internalDateFilter, setInternalDateFilter] = useState<DateFilterValue>({ mode: 'all' });
  const activeDateFilter = dateFilter || internalDateFilter;
  const handleDateFilterChange = onDateFilterChange || setInternalDateFilter;

  const [modalOpen, setModalOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [categoryName, setCategoryName] = useState('Food & Dining');
  const [expenseDate, setExpenseDate] = useState(getLocalDateString());
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Pagination state (10 items per page optimal for mobile Android viewport)
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeDateFilter]);

  // Queries
  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['personal_expenses'],
    queryFn: () => api<Expense[]>('GET', '/expenses?type=personal'),
    initialData: () => getSyncCachedData<Expense[]>('/expenses?type=personal') || [],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('GET', '/categories'),
    initialData: () => getSyncCachedData<Category[]>('/categories') || [],
    staleTime: 10 * 60 * 1000,
  });

  // Add Mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      const paise = rupeesToPaise(amountRupees);
      if (paise <= 0) throw new Error('Please enter a valid amount.');
      if (!description.trim()) throw new Error('Description is required.');

      return api('POST', '/expenses/personal', {
        description: description.trim(),
        amount_paise: paise,
        category_id: categoryName,
        expense_date: expenseDate,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal_expenses'] });
      queryClient.invalidateQueries({ queryKey: ['balances_summary'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setModalOpen(false);
      setDescription('');
      setAmountRupees('');
      setNotes('');
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to add expense.');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api('DELETE', `/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal_expenses'] });
      queryClient.invalidateQueries({ queryKey: ['balances_summary'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => matchesDateFilter(e.expense_date, activeDateFilter));
  }, [expenses, activeDateFilter]);

  const totalPages = Math.ceil(filteredExpenses.length / PAGE_SIZE) || 1;
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredExpenses.slice(start, start + PAGE_SIZE);
  }, [filteredExpenses, currentPage, PAGE_SIZE]);

  const totalSpent = filteredExpenses.reduce((sum, e) => sum + Number(e.amount_paise || 0), 0);
  const isFilterActive = activeDateFilter.mode !== 'all';

  return (
    <main className="space-y-6">
      {/* Page Header */}
      {!hideTitle && (
        <div className="space-y-4">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-3 sm:pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">Personal Expenses</h1>
                <Badge variant="outline" className="border-border text-muted-foreground font-mono text-xs">
                  {isFilterActive ? `${filteredExpenses.length} of ${expenses.length} records` : `${expenses.length} records`}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Expenses only for yourself that are not shared with flatmates
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                  {isFilterActive ? 'Filtered total' : 'Total spent'}
                </div>
                <div className="text-lg font-bold font-mono text-foreground">{formatPaise(totalSpent)}</div>
              </div>
            </div>
          </header>

          {/* Unified Filter and Action Bar: Button in the SAME row as filter */}
          <section aria-label="Date filter and actions" className="rounded-lg border border-border bg-card p-2.5 sm:p-3 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2.5">
              <DateFilter
                value={activeDateFilter}
                onChange={handleDateFilterChange}
                totalRecords={expenses.length}
                filteredCount={filteredExpenses.length}
              />
              <Button
                onClick={() => setModalOpen(true)}
                size="sm"
                className="min-h-10 text-xs sm:text-sm font-semibold shrink-0"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                Add Expense
              </Button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs sm:hidden">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {isFilterActive ? 'Filtered:' : 'Total spent:'}{' '}
                <strong className="font-mono text-xs text-foreground font-bold">{formatPaise(totalSpent)}</strong>
              </span>
              <Badge variant="outline" className="text-xs font-mono py-0.5">
                {isFilterActive ? `${filteredExpenses.length} of ${expenses.length} records` : `${expenses.length} records`}
              </Badge>
            </div>
          </section>
        </div>
      )}

      {hideTitle && (
        <section aria-label="Date filter and actions" className="rounded-lg border border-border bg-card p-2.5 sm:p-3 shadow-xs space-y-2.5">
          {/* Row 1: Filter on left, Button on right in the EXACT same row */}
          <div className="flex items-center justify-between gap-2.5">
            <DateFilter
              value={activeDateFilter}
              onChange={handleDateFilterChange}
              totalRecords={expenses.length}
              filteredCount={filteredExpenses.length}
            />
            <Button
              onClick={() => setModalOpen(true)}
              size="sm"
              className="min-h-10 text-xs sm:text-sm font-semibold shrink-0"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              Add Expense
            </Button>
          </div>

          {/* Row 2: Metric strip */}
          <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {isFilterActive ? 'Filtered:' : 'Total personal:'}
              </span>
              <strong className="font-mono text-xs sm:text-sm text-foreground">{formatPaise(totalSpent)}</strong>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  'text-xs font-mono py-0.5',
                  isFilterActive && 'border-primary/40 bg-primary/5 text-primary'
                )}
              >
                {isFilterActive ? `${filteredExpenses.length} of ${expenses.length} records` : `${expenses.length} records`}
              </Badge>
              {isFilterActive && (
                <button
                  type="button"
                  onClick={() => handleDateFilterChange({ mode: 'all' })}
                  className="text-xs text-muted-foreground hover:text-foreground underline decoration-dotted transition-colors"
                >
                  Show all
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      {isLoading ? (
        <ResponsiveTableSkeleton rows={6} mobileCards={3} />
      ) : expenses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center flex flex-col items-center">
            <Receipt className="h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold text-foreground">No personal expenses yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-5">
              Keep track of individual spending like snacks, subscriptions, or personal items.
            </p>
            <Button
              onClick={() => setModalOpen(true)}
              variant="outline"
              className="min-h-11"
            >
              Add First Expense
            </Button>
          </CardContent>
        </Card>
      ) : filteredExpenses.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="p-8 sm:p-12 text-center flex flex-col items-center">
            <Calendar className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-base font-semibold text-foreground">No expenses match this date filter</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mt-1 mb-5">
              No personal expenses were recorded for {formatFilterLabel(activeDateFilter)}. Try selecting a different date or clear the filter.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <Button
                onClick={() => handleDateFilterChange({ mode: 'all' })}
                variant="outline"
                className="min-h-10 text-xs sm:text-sm"
              >
                Clear Date Filter
              </Button>
              <Button
                onClick={() => setModalOpen(true)}
                size="sm"
                className="min-h-10 text-xs sm:text-sm"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Expense for this date
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card List */}
          <div className="md:hidden space-y-2.5">
            {paginatedExpenses.map((exp) => (
              <div
                key={exp.id}
                className="rounded-lg border border-border bg-card p-3 min-[360px]:p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground truncate">{exp.description}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="font-mono">{exp.expense_date}</span>
                      {exp.category_name && (
                        <>
                          <span>&bull;</span>
                          <span className="text-primary truncate">{exp.category_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm min-[360px]:text-base font-bold font-mono text-foreground tabular-nums">
                      {formatPaise(exp.amount_paise)}
                    </div>
                  </div>
                </div>

                {exp.notes && (
                  <div className="text-xs text-muted-foreground italic bg-muted/40 p-2 rounded border border-border">
                    {exp.notes}
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Delete this expense?')) {
                        deleteMutation.mutate(exp.id);
                      }
                    }}
                    className="min-h-10 px-2 text-xs font-semibold text-negative hover:underline flex items-center gap-1 active:scale-95 transition-transform"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-20 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedExpenses.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {exp.expense_date}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{exp.description}</div>
                      {exp.notes && (
                        <div className="text-xs text-muted-foreground mt-0.5">{exp.notes}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                        {exp.category_name || 'General'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">
                      {formatPaise(exp.amount_paise)}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this expense?')) {
                            deleteMutation.mutate(exp.id);
                          }
                        }}
                        title="Delete expense"
                        className="min-h-10 min-w-10 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-negative transition-colors active:scale-95"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Responsive Mobile-First Pagination */}
          <ResponsivePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredExpenses.length}
            pageSize={PAGE_SIZE}
          />
        </>
      )}


      {/* Add Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Add Personal Expense
            </DialogTitle>
          </DialogHeader>

          {formError && (
            <div role="alert" className="rounded-lg border border-negative/30 bg-negative-soft p-3 text-sm text-negative flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              addMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            {/* Quick Category Suggestion Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary" />
                Category:
              </span>
              {DEFAULT_CATEGORIES.slice(0, 6).map((cat) => (
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
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5 space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Category
                </label>
                <CategoryCombobox
                  value={categoryName}
                  onChange={setCategoryName}
                  placeholder="Select category..."
                />
              </div>
              <div className="sm:col-span-7 space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Amount (₹)
                </label>
                <Input
                  id="exp-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amountRupees}
                  onChange={(e) => setAmountRupees(e.target.value)}
                  className="bg-background border-border font-mono text-base min-h-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">
                Description & Suggestions
              </label>
              <ItemCombobox
                value={description}
                onChange={setDescription}
                category={categoryName}
                onCategoryChange={setCategoryName}
                placeholder="e.g. Swiggy dinner, Milk & bread, Medicine..."
                showChips={true}
                chipsLimit={5}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="exp-date" className="block text-xs font-semibold text-foreground">
                Date
              </label>
              <Input
                id="exp-date"
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="bg-background border-border min-h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="exp-notes" className="block text-xs font-semibold text-foreground">
                Notes (Optional)
              </label>
              <Input
                id="exp-notes"
                type="text"
                placeholder="Additional details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-background border-border min-h-11"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="w-full sm:w-auto min-h-11"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addMutation.isPending}
                className="w-full sm:w-auto min-h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {addMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Saving...
                  </>
                ) : (
                  'Save expense'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
