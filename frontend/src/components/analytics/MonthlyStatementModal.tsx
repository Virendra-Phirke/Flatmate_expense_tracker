import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BalanceSummary } from '@/types';
import { formatPaise } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  Copy,
  Check,
  Printer,
  Scale,
  CreditCard,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
} from '@/components/ui/icons';

interface MonthlyStatementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary?: BalanceSummary;
}

export function MonthlyStatementModal({
  open,
  onOpenChange,
  summary,
}: MonthlyStatementModalProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const now = new Date();
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Generate plain-text formatted WhatsApp statement
  const generateWhatsAppStatement = () => {
    if (!summary) return '';

    const lines: string[] = [];
    lines.push(`🏡 *Flat Expenses Ledger — ${monthName}*`);
    lines.push(`Household: *${user?.householdName || 'Flat'}*`);
    lines.push('');
    lines.push(`📊 *Household Summary:*`);
    lines.push(`• Common Expenses Paid: ${formatPaise(summary.commonPaid || 0)}`);
    lines.push(`• Your Common Share: ${formatPaise(summary.commonShare || 0)}`);
    lines.push(`• Personal Spending: ${formatPaise(summary.personalSpending || 0)}`);
    lines.push('');

    const debts = summary.myDebts?.filter((d) => d.outstanding > 0) || [];
    const credits = summary.pairwise?.filter((c) => c.outstanding > 0) || [];

    if (debts.length === 0 && credits.length === 0) {
      lines.push(`✨ *All Balances Settled Up!* Zero outstanding debts.`);
    } else {
      lines.push(`💰 *Bilateral Net Settlements:*`);
      if (debts.length > 0) {
        lines.push(`*You Owe:*`);
        debts.forEach((d) => {
          lines.push(`  → Pay ${d.creditorName}: ${formatPaise(d.outstanding)}`);
        });
      }
      if (credits.length > 0) {
        lines.push(`*Owed to You:*`);
        credits.forEach((c) => {
          lines.push(`  ← ${c.debtorName} pays you: ${formatPaise(c.outstanding)}`);
        });
      }
    }

    lines.push('');
    lines.push(`⚡ Please verify and settle via UPI.`);
    lines.push(`— Shared via Flatmate Expense Manager`);

    return lines.join('\n');
  };

  const handleCopy = async () => {
    const text = generateWhatsAppStatement();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy statement', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const debts = summary?.myDebts?.filter((d) => d.outstanding > 0) || [];
  const credits = summary?.pairwise?.filter((c) => c.outstanding > 0) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-card text-card-foreground border-border print:max-w-full print:p-0 print:border-none">
        <DialogHeader className="text-left pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Scale className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  Monthly Ledger Statement
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {monthName} • {user?.householdName || 'Household'}
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-xs uppercase">
              Bilateral Netted
            </Badge>
          </div>
        </DialogHeader>

        {/* Printable & Shareable Statement Body */}
        <div className="space-y-4 pt-3 text-sm">
          {/* Top Outflow Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-lg border border-border bg-muted/20">
              <span className="text-xs font-mono uppercase text-muted-foreground block font-semibold">
                Common Paid
              </span>
              <span className="text-base sm:text-lg font-mono font-bold text-foreground block mt-1">
                {formatPaise(summary?.commonPaid || 0)}
              </span>
              <span className="text-xs text-muted-foreground">Household bills</span>
            </div>

            <div className="p-3 rounded-lg border border-border bg-muted/20">
              <span className="text-xs font-mono uppercase text-muted-foreground block font-semibold">
                Your Share
              </span>
              <span className="text-base sm:text-lg font-mono font-bold text-foreground block mt-1">
                {formatPaise(summary?.commonShare || 0)}
              </span>
              <span className="text-xs text-muted-foreground">Your responsibility</span>
            </div>

            <div className="p-3 rounded-lg border border-border bg-muted/20 col-span-2 sm:col-span-1">
              <span className="text-xs font-mono uppercase text-muted-foreground block font-semibold">
                Net Position
              </span>
              <span
                className={`text-base sm:text-lg font-mono font-bold block mt-1 ${
                  (summary?.owedToMe || 0) >= (summary?.owedByMe || 0)
                    ? 'text-positive'
                    : 'text-negative'
                }`}
              >
                {formatPaise(
                  Math.abs((summary?.owedToMe || 0) - (summary?.owedByMe || 0))
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {(summary?.owedToMe || 0) >= (summary?.owedByMe || 0)
                  ? 'Owed to you overall'
                  : 'You owe overall'}
              </span>
            </div>
          </div>

          {/* Detailed Net Settlements */}
          <div className="space-y-2 border border-border rounded-lg p-3 sm:p-4 bg-card">
            <h4 className="text-xs font-mono uppercase tracking-wider font-semibold text-muted-foreground">
              Bilateral Settlements for {monthName}
            </h4>

            {debts.length === 0 && credits.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                All flatmate balances are fully cleared and settled!
              </p>
            ) : (
              <div className="divide-y divide-border text-xs">
                {debts.map((d) => (
                  <div key={d.creditorId} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-foreground">You owe {d.creditorName}</span>
                      <span className="text-muted-foreground block text-xs">
                        Net debt across bills & advances
                      </span>
                    </div>
                    <span className="font-mono font-bold text-negative">
                      {formatPaise(d.outstanding)}
                    </span>
                  </div>
                ))}

                {credits.map((c) => (
                  <div key={c.debtorId} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-foreground">
                        {c.debtorName} owes you
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        Net balance to collect
                      </span>
                    </div>
                    <span className="font-mono font-bold text-positive">
                      {formatPaise(c.outstanding)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <span>
              Calculated using integer-paise bilateral netting with zero circular debt loops.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-4 border-t border-border print:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="w-full sm:w-auto h-9 text-xs font-medium border-border"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print / PDF
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleCopy}
            className="w-full sm:w-auto h-9 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5 text-positive" />
                Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                1-Click Copy for WhatsApp
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
