import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Lock,
  ArrowLeft,
  Key,
  CheckCircle,
  Cpu,
  Server,
  FileSpreadsheet,
  Terminal,
} from '@/components/ui/icons';

interface SecurityPageProps {
  onBack?: () => void;
}

export function SecurityPage({ onBack }: SecurityPageProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 text-xs font-medium">
              <Shield className="w-3 h-3 mr-1" /> Enterprise Hardened
            </Badge>
            <Badge variant="secondary" className="text-xs">
              TLS 1.3 · FIDO2 WebAuthn
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Security & Architecture
          </h1>
          <p className="text-sm text-muted-foreground">
            Detailed technical breakdown of our cryptographic and ledger integrity safeguards
          </p>
        </div>

        {onBack && (
          <Button variant="outline" size="sm" onClick={onBack} className="self-start sm:self-auto gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        )}
      </div>

      {/* Security Architecture Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1 */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              HTTPS & Strict Transport Security
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              100% of network traffic is encrypted in transit using modern TLS 1.3 / 1.2 ciphers. In production, unencrypted HTTP requests are automatically rejected with 301 Permanent Redirects to HTTPS.
            </p>
            <p className="text-xs bg-muted/40 p-2.5 rounded font-mono text-foreground border border-border">
              Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
            </p>
          </CardContent>
        </Card>

        {/* Card 2 */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              FIDO2 WebAuthn Biometric Passkeys
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Biometric login relies on asymmetric public-key cryptography. During enrollment, a cryptographic challenge is signed inside your device's biometric Secure Enclave.
            </p>
            <p>
              Raw biometric templates (fingerprint, Face ID) never leave your phone or laptop. The server stores only the public verification key.
            </p>
          </CardContent>
        </Card>

        {/* Card 3 */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" />
              Integer Paise Arithmetic Engine
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              All financial values are strictly modeled and stored as 64-bit integer paise (1 INR = 100 paise) across database tables, API payloads, and frontend state.
            </p>
            <p>
              This completely eliminates IEEE-754 floating point rounding drift, ensuring zero unallocated fractions across multi-party split transactions.
            </p>
          </CardContent>
        </Card>

        {/* Card 4 */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              Bilateral Netting & Graph Consistency
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              The balance engine executes pairwise consolidation over the full transaction graph. If Member A owes B ₹300, and Member B owes A ₹100, the system automatically nets the obligation to ₹200.
            </p>
            <p>
              Eliminates circular reimbursement loops without complex multi-party escrow intermediaries.
            </p>
          </CardContent>
        </Card>

        {/* Card 5 */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              CSV Formula Injection Protection
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Exported settlement reports and balance CSV files are sanitized to defend against CSV/Formula Injection attacks.
            </p>
            <p>
              Any expense description beginning with formula triggers (<code>=</code>, <code>+</code>, <code>-</code>, <code>@</code>, <code>tab</code>, <code>CR</code>) is prefixed with a single quote to prevent arbitrary execution in Microsoft Excel and LibreOffice.
            </p>
          </CardContent>
        </Card>

        {/* Card 6 */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary" />
              Defense in Depth & Headers
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1.5">
            <ul className="space-y-1 text-xs">
              <li className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span><code>X-Content-Type-Options: nosniff</code></span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span><code>X-Frame-Options: SAMEORIGIN</code></span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span><code>Referrer-Policy: strict-origin-when-cross-origin</code></span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Bcrypt password hashing (10 salt rounds)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Rate-limiting on sensitive authentication endpoints</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Vulnerability Reporting */}
      <Card className="border-border bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Responsible Disclosure
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            If you identify a security concern, vulnerability, or logic defect in the balance netting engine, please report it privately:
          </p>
          <p className="font-medium text-foreground">
            Contact:{' '}
            <a href="mailto:virendraphirke2222@gmail.com" className="text-primary hover:underline">
              virendraphirke2222@gmail.com
            </a>
          </p>
        </CardContent>
      </Card>

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
export default SecurityPage;
