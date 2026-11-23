import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
import {
  User,
  QrCode,
  ShieldCheck,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Key,
  Palette,
  Sun,
  Moon,
  Check,
  Fingerprint,
} from '@/components/ui/icons';
import { useTheme, THEME_PALETTES } from '@/context/ThemeContext';
import {
  isBiometricAvailable,
  getRegisteredBiometric,
  registerBiometrics,
  removeRegisteredBiometric,
  StoredBiometricCredential,
} from '@/lib/biometrics';

import { ProfileSkeleton } from '@/components/ui/skeleton';

export function ProfilePage() {
  const { user } = useAuth();
  const { palette, setPalette, isDark, toggleDark } = useTheme();
  const queryClient = useQueryClient();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  // Biometric state
  const [bioSupported, setBioSupported] = useState(false);
  const [enrolledBio, setEnrolledBio] = useState<StoredBiometricCredential | null>(null);
  const [bioMsg, setBioMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [bioLoading, setBioLoading] = useState(false);

  React.useEffect(() => {
    async function checkBio() {
      const avail = await isBiometricAvailable();
      setBioSupported(avail);
      setEnrolledBio(getRegisteredBiometric());
    }
    checkBio();
  }, []);

  const handleEnrollBiometric = async () => {
    if (!user) return;
    setBioLoading(true);
    setBioMsg(null);
    try {
      await registerBiometrics(user.username, user.id, user.fullName || user.username);
      setEnrolledBio(getRegisteredBiometric());
      setBioMsg({ text: 'Fingerprint enrolled successfully on this device!' });
    } catch (err: any) {
      setBioMsg({ text: err.message || 'Failed to register fingerprint', error: true });
    } finally {
      setBioLoading(false);
    }
  };

  const handleRemoveBiometric = () => {
    removeRegisteredBiometric();
    setEnrolledBio(null);
    setBioMsg({ text: 'Fingerprint removed from this device.' });
  };

  // UPI Form state
  const [upiId, setUpiId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [upiMsg, setUpiMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Query UPI Profile
  const { data: upiProfile, isLoading } = useQuery<{
    upi_id: string;
    display_name: string;
  } | null>({
    queryKey: ['my_upi_profile'],
    queryFn: () => api('GET', '/profile/upi'),
  });

  // Pre-fill on load
  React.useEffect(() => {
    if (upiProfile) {
      setUpiId(upiProfile.upi_id || '');
      setDisplayName(upiProfile.display_name || user?.fullName || '');
    } else if (user) {
      setDisplayName(user.fullName || '');
    }
  }, [upiProfile, user]);

  // Query Personal QR Code
  const { data: qrData } = useQuery<{ qrDataUrl?: string }>({
    queryKey: ['my_qr_code', upiProfile?.upi_id],
    queryFn: () => api('GET', `/profile/qr?userId=${user?.id}`),
    enabled: !!upiProfile?.upi_id && !!user?.id,
    retry: false,
  });

  // Save UPI Profile Mutation
  const saveUpiMutation = useMutation({
    mutationFn: () =>
      api('PUT', '/profile/upi', {
        upi_id: upiId.trim(),
        display_name: displayName.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_upi_profile'] });
      queryClient.invalidateQueries({ queryKey: ['my_qr_code'] });
      setUpiMsg({ text: 'UPI Profile updated successfully! Roommates can now scan to pay you.' });
      setTimeout(() => setUpiMsg(null), 4000);
    },
    onError: (err: any) => {
      setUpiMsg({ text: err.message || 'Failed to update UPI ID', error: true });
    },
  });

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <main className="space-y-3 sm:space-y-4 w-full">
      {/* Header */}
      <header className="border-b border-border/70 pb-1.5">
        <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight truncate">Profile & Security</h1>
        <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
          Manage your UPI receiving details and account settings
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
        {/* Left Column: Account Details & Security */}
        <div className="space-y-3 sm:space-y-4 lg:col-span-1">
          {/* User Card */}
          <Card className="border-border bg-card shadow-2xs">
            <CardHeader className="p-3 sm:p-4 pb-2">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-brand-soft border border-primary/20 flex items-center justify-center text-base font-bold text-primary">
                  {user?.fullName?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm font-bold text-foreground truncate">
                    {user?.fullName}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground truncate">
                    @{user?.username}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-1 space-y-2">
              <div className="text-xs flex items-center justify-between border-b border-border pb-1.5">
                <span className="text-muted-foreground">Household:</span>
                <span className="font-semibold text-foreground truncate max-w-[140px]">{user?.householdName}</span>
              </div>
              <div className="text-xs flex items-center justify-between border-b border-border pb-1.5">
                <span className="text-muted-foreground">Role:</span>
                <Badge variant="outline" className="text-[10px] border-border text-foreground uppercase font-mono py-0 px-1.5">
                  {user?.role}
                </Badge>
              </div>

              <div className="pt-1">
                <Button
                  variant="outline"
                  onClick={() => setPasswordModalOpen(true)}
                  className="w-full h-8 border-border text-foreground hover:bg-muted text-xs font-semibold active:scale-95"
                >
                  <Key className="h-3 w-3 mr-1" />
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Biometric / Fingerprint Unlock Card */}
          <Card className="border-border bg-card">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-foreground text-xs font-semibold">
                  <Fingerprint className="h-4 w-4 text-primary" />
                  <span>Fingerprint & Biometrics</span>
                </div>
                {enrolledBio && (
                  <Badge variant="outline" className="text-xs bg-positive-soft text-positive border-positive/30 font-mono">
                    Enrolled
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-2.5 text-xs text-muted-foreground">
              <p>
                {bioSupported
                  ? 'Use your Android fingerprint scanner or device biometrics for instant 1-touch login without typing your password.'
                  : 'Biometric platform authenticator is not supported on this browser or desktop device.'}
              </p>

              {bioMsg && (
                <div
                  className={`p-2 rounded-md border text-xs ${
                    bioMsg.error
                      ? 'border-negative/30 bg-negative-soft text-negative'
                      : 'border-positive/30 bg-positive-soft text-positive'
                  }`}
                >
                  {bioMsg.text}
                </div>
              )}

              {bioSupported && (
                <div className="pt-1">
                  {enrolledBio ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveBiometric}
                      className="w-full h-9 text-xs border-negative/30 text-negative hover:bg-negative-soft/50"
                    >
                      Remove Fingerprint from this Device
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={bioLoading}
                      onClick={handleEnrollBiometric}
                      className="w-full h-9 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                    >
                      <Fingerprint className="h-4 w-4" />
                      {bioLoading ? 'Scanning...' : 'Enable Fingerprint Unlock'}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* CIA Triad & Audit Security Badge */}
          <Card className="border-border bg-card">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center space-x-2 text-primary text-xs font-semibold">
                <ShieldCheck className="h-4 w-4" />
                <span>Security & CIA Compliance</span>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-muted-foreground text-xs leading-relaxed space-y-2">
              <div>
                <strong className="text-foreground">Confidentiality:</strong> Encrypted sessions with httpOnly SameSite cookies.
              </div>
              <div>
                <strong className="text-foreground">Integrity:</strong> Financial numbers strictly validated in integer paise with audit logging.
              </div>
              <div>
                <strong className="text-foreground">Availability:</strong> Ultra-fast indexing on Neon PostgreSQL serverless.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Theme & UPI Settings */}
        <div className="space-y-3 sm:space-y-4 lg:col-span-2">
          {/* Theme & Palette Selection Card */}
          <Card className="border-border bg-card shadow-2xs">
            <CardHeader className="p-3 sm:p-4 pb-2 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Palette className="h-4 w-4 text-primary" />
                  App Color Scheme
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleDark}
                  className="h-7 px-2 gap-1 text-xs font-medium"
                >
                  {isDark ? (
                    <>
                      <Sun className="h-3 w-3 text-pending" />
                      <span>Light</span>
                    </>
                  ) : (
                    <>
                      <Moon className="h-3 w-3 text-primary" />
                      <span>Dark</span>
                    </>
                  )}
                </Button>
              </div>
              <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                Choose from 6 curated executive palettes.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2.5 sm:p-3">
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-2">
                {THEME_PALETTES.map((p) => {
                  const isSelected = palette === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPalette(p.id)}
                      className={`relative flex flex-col p-2.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-primary ring-2 ring-primary/25 bg-primary/5 shadow-2xs'
                          : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] shadow-2xs">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </span>
                      )}
                      <div className="flex items-center gap-1 mb-1.5">
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: p.primaryHex }}
                        />
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: p.accentHex }}
                        />
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: p.bgHex }}
                        />
                      </div>
                      <span className="text-xs font-bold text-foreground truncate">{p.name}</span>
                      <span className="text-[10px] text-muted-foreground truncate">{p.category}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-2xs">
            <CardHeader className="p-3 sm:p-4 pb-2 border-b border-border">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <QrCode className="h-4 w-4 text-primary" />
                Receiving UPI Details
              </CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground">
                Your UPI ID and QR code used when flatmates settle with you
              </CardDescription>
            </CardHeader>

            <CardContent className="p-3 sm:p-4 space-y-3">
              {upiMsg && (
                <div
                  className={`rounded-lg border p-3.5 text-xs flex items-start space-x-2.5 ${
                    upiMsg.error
                      ? 'border-negative/30 bg-negative-soft text-negative'
                      : 'border-positive/30 bg-positive-soft text-positive'
                  }`}
                >
                  {upiMsg.error ? (
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <span>{upiMsg.text}</span>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveUpiMutation.mutate();
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    UPI ID (Virtual Payment Address)
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. virendra@oksbi or 9876543210@paytm"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="bg-surface-subtle border-border font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: username@bank (Google Pay, PhonePe, Paytm, BHIM)
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    UPI Display Name
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Virendra Phirke"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-surface-subtle border-border text-sm"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    disabled={saveUpiMutation.isPending}
                    className="w-full sm:w-auto min-h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs sm:text-sm"
                  >
                    {saveUpiMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save UPI Profile'
                    )}
                  </Button>
                </div>
              </form>

              {/* QR Preview Card */}
              {qrData?.qrDataUrl && (
                <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center gap-4 min-[360px]:gap-5 bg-surface-subtle/50 p-3 min-[360px]:p-4 rounded-lg">
                  <div className="bg-white p-2 rounded-lg shadow-sm border border-border shrink-0">
                    <img
                      src={qrData.qrDataUrl}
                      alt="My UPI QR Code"
                      className="w-28 h-28 min-[360px]:w-32 min-[360px]:h-32 object-contain rounded"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1 text-center sm:text-left">
                    <div className="font-semibold text-foreground text-sm">
                      Personal QR Code Preview
                    </div>
                    <div>
                      UPI ID: <strong className="font-mono text-primary">{upiId}</strong>
                    </div>
                    <div>
                      Display Name: <strong className="text-foreground">{displayName}</strong>
                    </div>
                    <p className="text-xs text-muted-foreground pt-1">
                      Whenever someone selects to repay you, their app will display this dynamic QR code with exact amount prefilled.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ChangePasswordModal
        open={passwordModalOpen}
        onOpenChange={setPasswordModalOpen}
      />
    </main>
  );
}
