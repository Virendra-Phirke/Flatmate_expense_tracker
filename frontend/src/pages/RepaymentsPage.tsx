import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Settlement, BalanceSummary, HouseholdMember } from '@/types';
import { formatPaise, rupeesToPaise } from '@/lib/utils';
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
import { useAuth } from '@/context/AuthContext';
import {
  ArrowRightLeft,
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  ExternalLink,
  Plus,
} from '@/components/ui/icons';
import { ResponsivePagination } from '@/components/ui/pagination';

interface RepaymentsPageProps {
  initialRecipientId?: string;
}

export function RepaymentsPage({ initialRecipientId }: RepaymentsPageProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [recipientId, setRecipientId] = useState(initialRecipientId || '');
  const [amountRupees, setAmountRupees] = useState('');
  const [method, setMethod] = useState<'upi' | 'cash'>('upi');
  const [txRef, setTxRef] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const { data: settlements = [], isLoading: isSettlementsLoading } = useQuery<
    Settlement[]
  >({
    queryKey: ['settlements'],
    queryFn: () => api<Settlement[]>('GET', '/settlements'),
  });

  const { data: members = [] } = useQuery<HouseholdMember[]>({
    queryKey: ['members'],
    queryFn: () => api<HouseholdMember[]>('GET', '/members'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: summary } = useQuery<BalanceSummary>({
    queryKey: ['balances_summary'],
    queryFn: () => api<BalanceSummary>('GET', '/balances/summary'),
  });

  // Filter members excluding self
  const otherMembers = members.filter((m) => m.id !== user?.id);

  // Pre-select recipient if passed or default to first other member
  React.useEffect(() => {
    if (initialRecipientId) {
      setRecipientId(initialRecipientId);
      // Auto prefill debt amount if available
      const foundDebt = summary?.myDebts?.find(
        (d) => d.creditorId === initialRecipientId
      );
      if (foundDebt && foundDebt.outstanding > 0) {
        setAmountRupees((foundDebt.outstanding / 100).toFixed(2));
      }
      setModalOpen(true);
    } else if (!recipientId && otherMembers.length > 0) {
      setRecipientId(otherMembers[0].id);
    }
  }, [initialRecipientId, members, summary]);

  // UPI QR Query for selected recipient & amount
  const selectedPaise = rupeesToPaise(amountRupees);
  const { data: upiQrData, isFetching: isQrLoading } = useQuery<{
    qrDataUrl?: string;
    upiUri?: string;
    upiId?: string;
    displayName?: string;
  }>({
    queryKey: ['recipient_qr', recipientId, selectedPaise],
    queryFn: async () => {
      if (!recipientId || method !== 'upi') return {};
      return api('GET', `/profile/qr?userId=${recipientId}&amount=${selectedPaise || 0}`);
    },
    enabled: !!recipientId && method === 'upi' && modalOpen,
    retry: false,
  });

  // Submit Claim Mutation
  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!recipientId) throw new Error('Please select a recipient.');
      if (selectedPaise <= 0) throw new Error('Please enter a valid repayment amount.');

      return api('POST', '/settlements', {
        recipient_id: recipientId,
        amount_paise: selectedPaise,
        method,
        transaction_reference: txRef.trim() || undefined,
        note: note.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['balances_summary'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setModalOpen(false);
      setAmountRupees('');
      setTxRef('');
      setNote('');
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to submit payment claim.');
    },
  });

  // Confirm Mutation
  const confirmMutation = useMutation({
    mutationFn: (id: string) => api('POST', `/settlements/${id}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['balances_summary'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: (id: string) => api('POST', `/settlements/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['balances_summary'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const [repaymentTab, setRepaymentTab] = useState<'needs_action' | 'pending' | 'history' | 'all'>('needs_action');

  // Pagination state (10 items per page optimal for mobile Android viewport)
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Reset page when tab changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [repaymentTab]);

  // Segregate incoming vs outgoing settlements
  const incomingPending = settlements.filter(
    (s) => s.recipient_id === user?.id && s.status === 'verification_pending'
  );
  const outgoingPending = settlements.filter(
    (s) => s.payer_id === user?.id && s.status === 'verification_pending'
  );
  const historySettlements = settlements.filter(
    (s) => s.status === 'confirmed' || s.status === 'rejected'
  );

  const filteredSettlements =
    repaymentTab === 'needs_action'
      ? incomingPending
      : repaymentTab === 'pending'
      ? outgoingPending
      : repaymentTab === 'history'
      ? historySettlements
      : settlements;

  const totalPages = Math.ceil(filteredSettlements.length / PAGE_SIZE) || 1;
  const paginatedSettlements = React.useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSettlements.slice(start, start + PAGE_SIZE);
  }, [filteredSettlements, currentPage, PAGE_SIZE]);

  return (
    <main className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-3 sm:pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">Repayments & Claims</h1>
            <Badge variant="outline" className="border-border text-muted-foreground font-mono text-xs">
              {settlements.length} total
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Initiate UPI settlements and verify payment claims
          </p>
        </div>
        <Button
          onClick={() => {
            setFormError(null);
            setModalOpen(true);
          }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Settle / Pay Flatmate
        </Button>
      </header>

      {/* Segmented Control per Section 10.9 */}
      <div className="grid grid-cols-4 w-full sm:max-w-md p-1 bg-surface-subtle border border-border rounded-lg gap-0.5">
        <button
          type="button"
          onClick={() => setRepaymentTab('needs_action')}
          className={`py-2 px-1.5 sm:px-3 rounded-md text-xs font-semibold transition-[color,background-color,box-shadow] duration-100 ease-out flex items-center justify-center gap-1 min-h-[38px] touch-manipulation active:scale-[0.98] ${
            repaymentTab === 'needs_action'
              ? 'bg-card text-foreground shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="truncate">Needs action</span>
          {incomingPending.length > 0 && (
            <span className="h-4.5 min-w-[18px] px-1 rounded-full bg-pending text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
              {incomingPending.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setRepaymentTab('pending')}
          className={`py-2 px-1.5 sm:px-3 rounded-md text-xs font-semibold transition-[color,background-color,box-shadow] duration-100 ease-out flex items-center justify-center gap-1 min-h-[38px] touch-manipulation active:scale-[0.98] ${
            repaymentTab === 'pending'
              ? 'bg-card text-foreground shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="truncate">Pending</span>
          {outgoingPending.length > 0 && (
            <span className="h-4.5 min-w-[18px] px-1 rounded-full bg-surface-subtle text-muted-foreground font-mono text-xs font-bold border border-border flex items-center justify-center shrink-0">
              {outgoingPending.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setRepaymentTab('history')}
          className={`py-2 px-1.5 sm:px-3 rounded-md text-xs font-semibold transition-[color,background-color,box-shadow] duration-100 ease-out text-center truncate min-h-[38px] touch-manipulation active:scale-[0.98] ${
            repaymentTab === 'history'
              ? 'bg-card text-foreground shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          History
        </button>
        <button
          type="button"
          onClick={() => setRepaymentTab('all')}
          className={`py-2 px-1.5 sm:px-3 rounded-md text-xs font-semibold transition-[color,background-color,box-shadow] duration-100 ease-out text-center truncate min-h-[38px] touch-manipulation active:scale-[0.98] ${
            repaymentTab === 'all'
              ? 'bg-card text-foreground shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All
        </button>
      </div>

      {/* ── Settlement Cards / List ──────────────────────────────────────────────── */}
      <Card className="border-border bg-card overflow-hidden">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            {repaymentTab === 'needs_action'
              ? 'Claims Requiring Your Confirmation'
              : repaymentTab === 'pending'
              ? 'Your Pending Claims Waiting Recipient'
              : repaymentTab === 'history'
              ? 'Resolved Settlement History'
              : 'All Settlements & Claims'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isSettlementsLoading ? (
            <ResponsiveTableSkeleton rows={5} mobileCards={3} />
          ) : filteredSettlements.length === 0 ? (
            <div className="p-8 sm:p-12 text-center text-muted-foreground text-sm">
              {repaymentTab === 'needs_action'
                ? 'No incoming payment claims require your attention.'
                : repaymentTab === 'pending'
                ? 'No pending claims waiting for confirmation.'
                : 'No settlements found for this filter.'}
            </div>
          ) : (
            <>
              <div className="divide-y divide-border">
                {paginatedSettlements.map((s) => {
                  const isPayer = s.payer_id === user?.id;
                  const isRecipient = s.recipient_id === user?.id;
                  const isActionRequired = isRecipient && s.status === 'verification_pending';

                  return (
                    <div
                      key={s.id}
                      className={`p-3 min-[360px]:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isActionRequired ? 'bg-pending-soft/30' : 'hover:bg-muted/30'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">
                          {isPayer ? (
                            <>
                              You paid <strong className="text-foreground">{s.recipient_name}</strong>
                            </>
                          ) : (
                            <>
                              <strong className="text-foreground">{s.payer_name}</strong> paid you
                            </>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1">
                          <span className="font-mono text-muted-foreground">
                            {new Date(s.claimed_at || s.created_at).toLocaleDateString()}
                          </span>
                          <span>&bull;</span>
                          <span className="uppercase text-foreground font-medium">{s.method}</span>
                          {s.transaction_reference && (
                            <>
                              <span>&bull;</span>
                              <span className="truncate max-w-[160px]">Ref: {s.transaction_reference}</span>
                            </>
                          )}
                          {s.note && (
                            <>
                              <span>&bull;</span>
                              <span className="truncate max-w-[160px]">{s.note}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between sm:justify-end gap-2.5">
                        <div className="flex items-center justify-between sm:justify-end gap-2.5">
                          <div className="font-mono font-bold text-sm text-foreground">
                            {formatPaise(s.amount_paise)}
                          </div>
                          <div>
                            {s.status === 'confirmed' && (
                              <Badge className="bg-positive-soft text-positive border-positive/30 text-xs font-mono">
                                Confirmed
                              </Badge>
                            )}
                            {s.status === 'verification_pending' && !isActionRequired && (
                              <Badge className="bg-pending-soft text-pending border-pending/30 text-xs font-mono">
                                Pending
                              </Badge>
                            )}
                            {s.status === 'rejected' && (
                              <Badge className="bg-negative-soft text-negative border-negative/30 text-xs font-mono">
                                Rejected
                              </Badge>
                            )}
                          </div>
                        </div>

                        {isActionRequired && (
                          <div className="flex items-center gap-2 pt-1 sm:pt-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (confirm(`Reject payment claim from ${s.payer_name}?`)) {
                                  rejectMutation.mutate(s.id);
                                }
                              }}
                              disabled={rejectMutation.isPending}
                              className="flex-1 sm:flex-none text-xs min-h-10 border-border text-foreground hover:bg-muted active:scale-95"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1 text-negative" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (confirm(`Confirm receipt of ${formatPaise(s.amount_paise)} from ${s.payer_name}?`)) {
                                  confirmMutation.mutate(s.id);
                                }
                              }}
                              disabled={confirmMutation.isPending}
                              className="flex-1 sm:flex-none text-xs min-h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold active:scale-95"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Confirm
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Responsive Mobile-First Pagination */}
              <div className="p-3 border-t border-border">
                <ResponsivePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filteredSettlements.length}
                  pageSize={PAGE_SIZE}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Settle Up / Pay Modal ───────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Settle / Pay Roommate
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
              claimMutation.mutate();
            }}
            className="space-y-4 pt-1"
          >
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Recipient roommate</label>
              <select
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                aria-label="Select roommate to pay"
                className="w-full min-h-11 rounded-lg border border-border bg-surface-subtle px-3 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                {otherMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.username})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Amount to pay (₹)</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="e.g. 500"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                className="bg-surface-subtle border-border font-mono text-base"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Payment method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod('upi')}
                  className={`min-h-11 rounded-lg border px-3 text-sm font-medium transition-colors ${
                    method === 'upi'
                      ? 'border-primary bg-accent text-accent-foreground'
                      : 'border-border bg-background text-muted-foreground'
                  }`}
                >
                  UPI (QR Code)
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('cash')}
                  className={`min-h-11 rounded-lg border px-3 text-sm font-medium transition-colors ${
                    method === 'cash'
                      ? 'border-primary bg-accent text-accent-foreground'
                      : 'border-border bg-background text-muted-foreground'
                  }`}
                >
                  Cash / Direct
                </button>
              </div>
            </div>

            {/* UPI QR Code Container if UPI selected */}
            {method === 'upi' && (
              <div className="rounded-lg border border-border bg-muted/40 p-4 flex flex-col items-center justify-center gap-3">
                {isQrLoading ? (
                  <div className="py-8 flex flex-col items-center justify-center space-y-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Loading UPI profile...</span>
                  </div>
                ) : upiQrData?.qrDataUrl ? (
                  <>
                    <div className="bg-white p-2.5 rounded-lg border border-border">
                      <img
                        src={upiQrData.qrDataUrl}
                        alt="UPI QR Code"
                        className="w-40 h-40 object-contain rounded-lg"
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-mono font-semibold text-primary">
                        {upiQrData.upiId}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {upiQrData.displayName}
                      </div>
                    </div>
                    {upiQrData.upiUri && (
                      <a
                        href={upiQrData.upiUri}
                        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4"
                      >
                        Open in UPI App (GPay / PhonePe)
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    <AlertCircle className="h-6 w-6 text-pending mx-auto mb-1.5" />
                    This roommate has not added a UPI ID yet.
                    <div className="text-xs text-muted-foreground mt-2">
                      You can pay in cash or ask them to add a UPI ID in Profile.
                    </div>
                  </div>
                )}
              </div>
            )}

            <p role="note" className="text-xs leading-relaxed text-muted-foreground">
              A QR code only helps initiate payment; it does not verify receipt. The recipient must confirm the claim after checking their payment app or bank statement.
            </p>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">
                UTR / transaction reference (optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. 331458921829"
                value={txRef}
                onChange={(e) => setTxRef(e.target.value)}
                className="bg-background border-border text-sm font-mono min-h-11"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Note (optional)</label>
              <Input
                type="text"
                placeholder="e.g. WiFi share, dinner settlement"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="bg-background border-border text-sm min-h-11"
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
                disabled={claimMutation.isPending}
                className="w-full sm:w-auto min-h-11 font-medium bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {claimMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Claim'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
