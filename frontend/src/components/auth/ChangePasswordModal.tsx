import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle, CheckCircle2, Lock, Loader2 } from '@/components/ui/icons';

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mandatory?: boolean;
}

export function ChangePasswordModal({
  open,
  onOpenChange,
  mandatory = false,
}: ChangePasswordModalProps) {
  const { setPasswordChanged } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);

    try {
      await api('POST', '/auth/change-password', {
        currentPassword,
        newPassword,
      });

      setSuccess(true);
      setPasswordChanged();
      setTimeout(() => {
        setSuccess(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onOpenChange(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!mandatory) onOpenChange(val);
      }}
    >
      <DialogContent className="max-w-md bg-card border-border text-foreground">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-brand-soft border border-primary/20 flex items-center justify-center text-primary">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {mandatory ? 'Initial Password Setup Required' : 'Change Password'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {mandatory
                  ? 'For security compliance, you must set a permanent password before continuing.'
                  : 'Update your account password with a secure new passphrase.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-negative/30 bg-negative-soft p-3 text-xs text-negative flex items-start space-x-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-positive/30 bg-positive-soft p-3 text-xs text-positive flex items-center space-x-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Password updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Current / Temporary Password
            </label>
            <Input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-surface-subtle border-border"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">New Password</label>
            <Input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="bg-surface-subtle border-border"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Confirm New Password</label>
            <Input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="bg-surface-subtle border-border"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
            {!mandatory && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto min-h-11 border-border text-muted-foreground hover:bg-muted"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto min-h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Password'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
