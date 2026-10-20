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
  Copy,
  Download,
  Check,
} from '@/components/ui/icons';

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

  // ── 1. Export CSV Handler ──────────────────────────────────
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

  // ── 2. Copy Financial Summary Report ───────────────────────
  const handleCopySummary = async () => {
    const topCategory =
      analytics.categories && analytics.categories.length > 0
        ? `${analytics.categories[0].categoryName} (${formatPaise(analytics.categories[0].totalPaise)})`
        : 'None';

    const text = [
      'Flatmate Expense Summary',
      `Total Spent: ${formatPaise(analytics.kpi.totalSpendingPaise)} (${analytics.kpi.transactionCount} transactions)`,
      `Household Split: ${formatPaise(analytics.kpi.commonSharePaise)} (${analytics.typeDistribution.commonPercentage.toFixed(1)}%)`,
      `Personal Costs: ${formatPaise(analytics.kpi.personalSpendingPaise)} (${analytics.typeDistribution.personalPercentage.toFixed(1)}%)`,
      `Fronted for Flatmates: ${formatPaise(analytics.kpi.onBehalfPaidPaise)} (${analytics.typeDistribution.onBehalfPercentage.toFixed(1)}%)`,
      `Top Category: ${topCategory}`,
      `Daily Average: ${formatPaise(analytics.kpi.dailyAveragePaise)}/day`,
      `Generated on ${new Date().toLocaleDateString()}`,
    ].join('\n');

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
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
          className="h-9 px-3 gap-1.5 border-border bg-card hover:bg-secondary text-foreground transition-colors shadow-xs"
          aria-label="Export and reports menu"
        >
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium">Export & Actions</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 p-1.5">
        <DropdownMenuLabel className="flex items-center justify-between text-xs">
          <span>Reports & Export</span>
          {copied && (
            <Badge variant="outline" className="text-[10px] font-mono bg-positive/10 text-positive border-positive/30 py-0">
              Copied
            </Badge>
          )}
        </DropdownMenuLabel>

        <DropdownMenuItem onClick={handleCopySummary} className="flex items-center gap-2 cursor-pointer">
          {copied ? <Check className="h-4 w-4 text-positive" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
          <div className="flex-1">
            <p className="text-xs font-medium">Copy Summary</p>
            <p className="text-[10px] text-muted-foreground">Text breakdown to clipboard</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleExportCSV} className="flex items-center gap-2 cursor-pointer">
          <Download className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-xs font-medium">Export CSV</p>
            <p className="text-[10px] text-muted-foreground">Download transactions spreadsheet</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handlePrint} className="flex items-center gap-2 cursor-pointer">
          <span className="flex h-4 w-4 items-center justify-center font-mono font-bold text-[9px] text-muted-foreground border border-border rounded">
            P
          </span>
          <div className="flex-1">
            <p className="text-xs font-medium">Print Report</p>
            <p className="text-[10px] text-muted-foreground">Printable view of this page</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={onRefresh}
          disabled={isFetching}
          className="flex items-center gap-2 text-foreground cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
          <div className="flex-1">
            <p className="text-xs font-medium">Refresh Data</p>
            <p className="text-[10px] text-muted-foreground">Reload latest entries</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

