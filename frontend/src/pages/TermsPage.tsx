import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  ArrowLeft,
  Scale,
  AlertTriangle,
  Users,
  CheckCircle,
  HelpCircle,
  CreditCard,
} from '@/components/ui/icons';

interface TermsPageProps {
  onBack?: () => void;
}

export function TermsPage({ onBack }: TermsPageProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-xs font-medium">
              <Scale className="w-3 h-3 mr-1" /> Legal Terms
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Household Ledger Agreement
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground">
            Last Updated: October 20, 2026 · Governing all usage of Flatmate Expense Manager
          </p>
        </div>

        {onBack && (
          <Button variant="outline" size="sm" onClick={onBack} className="self-start sm:self-auto gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        )}
      </div>

      {/* Main Content Sections */}
      <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
        {/* Section 1 */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              1. Acceptance of Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              By accessing or creating an account on Flatmate Expense Manager, you agree to comply with and be bound by these Terms of Service. If you are participating as part of a shared flat or household, these terms govern the bookkeeping and accounting records maintained between household participants.
            </p>
          </CardContent>
        </Card>

        {/* Section 2 */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              2. Scope of Service & Settlement Disclaimer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              Flatmate Expense Manager is an informational and calculation utility designed to record shared expenditures, compute net bilateral obligations, and streamline reimbursement requests.
            </p>
            <div className="p-3.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-900 dark:text-amber-200 space-y-1.5">
              <span className="font-semibold flex items-center gap-1.5 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Important Payment Disclaimer
              </span>
              <p className="text-xs leading-relaxed">
                This platform is <strong>not an escrow provider, bank, or payment processor</strong>. Actual money transfers are conducted directly between flatmates via third-party Unified Payments Interface (UPI) applications (such as Google Pay, PhonePe, Paytm, or direct bank transfer). The recording of a settlement on this application signifies mutual acknowledgment between members but does not constitute legal banking proof of transfer.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 3 */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              3. Member Responsibilities & Honest Bookkeeping
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>Every household participant agrees to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Log accurate and truthful purchase amounts in integer paise.</li>
              <li>Assign fair split shares to participating flatmates.</li>
              <li>Promptly confirm settlements once received, or provide reasonable justification when rejecting a claim.</li>
              <li>Keep login credentials and personal recovery passwords confidential.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 4 */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              4. Household Administrator Authority
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              Designated household administrators possess permissions to invite new flatmates, create household-wide shared expenses (e.g. rent, electricity, Wi-Fi bills), and administer member statuses. In the event of a ledger dispute, members agree to resolve discrepancies amicably within the household.
            </p>
          </CardContent>
        </Card>

        {/* Section 5 */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" />
              5. Limitation of Liability
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              The service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind. Maintainers and contributors shall not be liable for any indirect, incidental, or consequential damages resulting from ledger errors, third-party UPI transmission delays, or unfulfilled peer repayments.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Footer Navigation */}
      {onBack && (
        <div className="pt-4 border-t border-border flex justify-end">
          <Button onClick={onBack} variant="default" size="sm">
            Return to Ledger
          </Button>
        </div>
      )}
    </div>
  );
}
export default TermsPage;
