import React, { useState } from 'react';
import { AnalyticsData } from '@/types';
import { formatPaise } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MoreHorizontal,
  RefreshCw,
  Sparkles,
  Check,
} from '@/components/ui/icons';
import { AnimatedShinyText } from '@/components/magicui/animated-shiny-text';

interface AnalyticsActionsMenuProps {
  analytics: AnalyticsData;
  onRefresh: () => void;
  isFetching?: boolean;
}

/**
 * Sanitizes CSV field values to prevent CSV Formula Injection (CWE-1236).
 * Escapes leading formula characters (=, +, -, @, \t, \r) by prepending a single quote.
 */
function sanitizeCSVField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).trim();
  // If field starts with formula triggers, prepend a single quote to neutralize execution in Excel/Sheets
  if (/^[=+@-|\t\r]/.test(str)) {
    return `"'${str.replace(/"/g, '""')}"`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export function AnalyticsActionsMenu({
  analytics,
  onRefresh,
  isFetching,
}: AnalyticsActionsMenuProps) {
  const [copied, setCopied] = useState(false);

  // ── 1. Export CSV Handler (Secured against CWE-1236) ────────
  const handleExportCSV = () => {
    if (!analytics.topTransactions || analytics.topTransactions.length === 0) return;

    const headers = ['Date', 'Description', 'Type', 'Category', 'Beneficiary', 'Amount_INR'];
    const rows = analytics.topTransactions.map((t) => [
      sanitizeCSVField(t.expenseDate),
      sanitizeCSVField(t.description),
      sanitizeCSVField(t.expenseType),
      sanitizeCSVField(t.categoryName),
      sanitizeCSVField(t.otherUserName || ''),
      (t.amountPaise / 100).toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expense-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── 2. Copy Financial Summary Report (With Cross-Browser Fallback) ─
  const handleCopySummary = async () => {
    const topCategory =
      analytics.categories && analytics.categories.length > 0
        ? `${analytics.categories[0].categoryName} (${formatPaise(analytics.categories[0].totalPaise)})`
        : 'N/A';

    const text = [
      '📊 *Expense Intelligence Summary*',
      `💰 Total Spending: ${formatPaise(analytics.kpi.totalSpendingPaise)} (${analytics.kpi.transactionCount} transactions)`,
      `🏠 Household Share: ${formatPaise(analytics.kpi.commonSharePaise)} (${analytics.typeDistribution.commonPercentage.toFixed(1)}%)`,
      `👤 Personal Spend: ${formatPaise(analytics.kpi.personalSpendingPaise)} (${analytics.typeDistribution.personalPercentage.toFixed(1)}%)`,
      `🛍️ Advanced for Flatmates: ${formatPaise(analytics.kpi.onBehalfPaidPaise)} (${analytics.typeDistribution.onBehalfPercentage.toFixed(1)}%)`,
      `🏷️ Top Category: ${topCategory}`,
      `⚡ Daily Velocity: ~${formatPaise(analytics.kpi.dailyAveragePaise)}/day`,
      `Generated on ${new Date().toLocaleDateString()}`,
    ].join('\n');

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure context or older mobile WebViews
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback grace
      console.warn('Clipboard write was not permitted');
    }
  };

  // ── 3. Print Brief ─────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 gap-1.5 border-border/80 bg-card/80 hover:bg-card hover:border-primary/50 text-foreground transition-all active:scale-95 touch-manipulation shadow-xs"
          aria-label="Analytics options and export menu"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-xs font-semibold">
            <AnimatedShinyText shimmerWidth={70}>Actions</AnimatedShinyText>
          </span>
          <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground ml-0.5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 p-1.5">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Intelligence Actions</span>
          {copied && (
            <Badge variant="outline" className="text-[9px] font-mono bg-positive/10 text-positive border-positive/30 py-0">
              Copied!
            </Badge>
          )}
        </DropdownMenuLabel>

        <DropdownMenuItem onClick={handleCopySummary} className="flex items-center gap-2">
          {copied ? <Check className="h-4 w-4 text-positive" /> : <Sparkles className="h-4 w-4 text-primary" />}
          <div className="flex-1">
            <p className="text-xs font-medium">Copy Summary Brief</p>
            <p className="text-[10px] text-muted-foreground">Formatted metrics to clipboard</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleExportCSV} className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/10 text-emerald-400 font-bold text-[10px]">
            CSV
          </span>
          <div className="flex-1">
            <p className="text-xs font-medium">Export CSV Report</p>
            <p className="text-[10px] text-muted-foreground">Filtered transactions spreadsheet</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handlePrint} className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-500/10 text-blue-400 font-bold text-[10px]">
            PDF
          </span>
          <div className="flex-1">
            <p className="text-xs font-medium">Print / Save PDF</p>
            <p className="text-[10px] text-muted-foreground">Clean visual report preview</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={onRefresh}
          disabled={isFetching}
          className="flex items-center gap-2 text-primary focus:text-primary"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          <div className="flex-1">
            <p className="text-xs font-semibold">Force Recalculate</p>
            <p className="text-[10px] text-muted-foreground">Flush cache and query live</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
