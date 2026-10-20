import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Lock,
  ArrowLeft,
  FileText,
  UserCheck,
  Database,
  EyeOff,
  CheckCircle,
} from '@/components/ui/icons';

interface PrivacyPolicyPageProps {
  onBack?: () => void;
}

export function PrivacyPolicyPage({ onBack }: PrivacyPolicyPageProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-xs font-medium">
              <Lock className="w-3 h-3 mr-1" /> HTTPS TLS 1.3
            </Badge>
            <Badge variant="secondary" className="text-xs">
              DPDP & GDPR Compliant
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Last Updated: October 20, 2026 · Effective for all household members
          </p>
        </div>

        {onBack && (
          <Button variant="outline" size="sm" onClick={onBack} className="self-start sm:self-auto gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        )}
      </div>

      {/* Highlights Banner */}
      <div className="rounded-xl p-4 bg-primary/5 border border-primary/20 text-sm space-y-2">
        <div className="flex items-center gap-2 font-semibold text-primary">
          <Shield className="w-4 h-4" />
          <span>Our Core Privacy Principle</span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Your shared expense and personal ledger data belongs entirely to your household. We never sell, rent, monetize, or broker your personal financial records to third parties or advertising networks. All in-transit communication is strictly mandated over encrypted HTTPS.
        </p>
      </div>

      {/* Main Content Sections */}
      <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
        {/* Section 1 */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              1. Information We Collect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              To maintain the household ledger and facilitate accurate bilateral debt netting, we collect and store:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-foreground">Account Credentials:</strong> Username, display name, and securely salted/hashed passwords (via bcrypt). We never store plaintext passwords.
              </li>
              <li>
                <strong className="text-foreground">Ledger Transactions:</strong> Shared common expenses, on-behalf grocery purchases, item allocations, personal expense notes, integer paise amounts, and expense timestamps.
              </li>
              <li>
                <strong className="text-foreground">UPI Payment Identifiers:</strong> Your Virtual Payment Address (VPA / UPI ID) when provided, used solely to generate instant dynamic payment QR codes for flatmate settlements.
              </li>
              <li>
                <strong className="text-foreground">Biometric Passkey Metadata:</strong> If enabled, WebAuthn FIDO2 public credentials and credential IDs. <em>Your actual fingerprint, Face ID, or biometric template remains strictly inside your device's hardware Secure Enclave and is never transmitted to or stored on our servers.</em>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 2 */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-primary" />
              2. How We Use Ledger Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>All recorded data is processed solely for functional household bookkeeping:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Consolidating pairwise debts through deterministic bilateral netting with zero circular debt loops.</li>
              <li>Computing monthly personal spending limits and budget burn rate pacing.</li>
              <li>Generating verified settlement receipts and downloadable statement reports.</li>
              <li>Enabling optional 1-click WhatsApp debt reminders with pre-filled payment links generated client-side.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 3 */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              3. HTTPS, Encryption & Data Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>We deploy robust enterprise security safeguards:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg border border-border/80 bg-muted/20 space-y-1">
                <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Mandatory HTTPS (TLS 1.3)
                </span>
                <p className="text-xs text-muted-foreground">
                  All HTTP traffic is automatically upgraded to HTTPS with HSTS enabled (max-age 1 year).
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border/80 bg-muted/20 space-y-1">
                <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Stateless Authenticated JWTs
                </span>
                <p className="text-xs text-muted-foreground">
                  Secure cryptographic token signing with SameSite cookie policies and timing-safe comparisons.
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border/80 bg-muted/20 space-y-1">
                <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  SQL Parameterization
                </span>
                <p className="text-xs text-muted-foreground">
                  Strictly compiled type-safe Drizzle ORM queries preventing all SQL injection vectors.
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border/80 bg-muted/20 space-y-1">
                <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Formula Injection Sanitization
                </span>
                <p className="text-xs text-muted-foreground">
                  CSV exports strip leading `=`, `+`, `-`, and `@` characters to protect spreadsheet users.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4 */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary" />
              4. User Rights, Deletion & Portability
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>In accordance with data protection regulations, you hold complete sovereignty over your data:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-foreground">Right to Erase:</strong> You may soft-delete personal expenses at any time.</li>
              <li><strong className="text-foreground">Right to Export:</strong> You can download comprehensive monthly reports and CSV audit logs.</li>
              <li><strong className="text-foreground">UPI Profile Control:</strong> You can modify or purge your registered UPI VPA at any time from your Profile settings.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 5 */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              5. Contact & Privacy Inquiries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              If you have any questions or data requests regarding the Flatmate Expense Manager privacy policy, contact the household administrator or lead maintainer at:
            </p>
            <p className="font-medium text-foreground">
              Email:{' '}
              <a href="mailto:virendraphirke2222@gmail.com" className="text-primary hover:underline">
                virendraphirke2222@gmail.com
              </a>
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
export default PrivacyPolicyPage;
