import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Receipt,
  ShoppingBag,
  Gift,
  Users,
  Scale,
  ArrowRightLeft,
  UserCircle,
  Mic,
  LogOut,
  X,
  CreditCard,
  MoreHorizontal,
  ChevronRight,
  Palette,
} from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VoiceAssistantModal } from '@/components/voice/VoiceAssistantModal';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
import { ThemePaletteModal } from '@/components/layout/ThemePaletteModal';
import { useTheme } from '@/context/ThemeContext';
import { HouseholdMember, Category } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type NavTab =
  | 'dashboard'
  | 'expenses'
  | 'personal'
  | 'purchases_made'
  | 'purchases_for_me'
  | 'common'
  | 'balances'
  | 'repayments'
  | 'profile';

interface ShellProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  children: React.ReactNode;
}

const mainNavItems = [
  { id: 'dashboard' as NavTab, label: 'Home', icon: LayoutDashboard },
  { id: 'expenses' as NavTab, label: 'Expenses', icon: Receipt },
  { id: 'balances' as NavTab, label: 'Balances', icon: Scale },
  { id: 'repayments' as NavTab, label: 'Repay', icon: ArrowRightLeft },
];

const householdNavItems = [
  { id: 'common' as NavTab, label: 'Common expenses', icon: Users },
  { id: 'purchases_for_me' as NavTab, label: 'Bought for me', icon: Gift },
];

const accountNavItems = [
  { id: 'profile' as NavTab, label: 'Profile & UPI', icon: UserCircle },
];

const pageTitles: Record<NavTab, string> = {
  dashboard: 'Home',
  expenses: 'Expenses',
  personal: 'Expenses',
  purchases_made: 'Bought for others',
  purchases_for_me: 'Bought for me',
  common: 'Common expenses',
  balances: 'Balances',
  repayments: 'Repayments',
  profile: 'Profile & UPI',
};

export function Shell({ activeTab, onTabChange, children }: ShellProps) {
  const { user, logout } = useAuth();
  const { currentPalette } = useTheme();
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [paletteModalOpen, setPaletteModalOpen] = useState(false);

  const { data: members = [] } = useQuery<HouseholdMember[]>({
    queryKey: ['members'],
    queryFn: () => api<HouseholdMember[]>('GET', '/members'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('GET', '/categories'),
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        setVoiceModalOpen((open) => !open);
      }
      if (event.key === 'Escape') setMobileMoreOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setMobileMoreOpen(false);
  }, [activeTab]);

  // Lock body scroll when more sheet is open
  useEffect(() => {
    if (mobileMoreOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMoreOpen]);

  const isExpensesActive =
    activeTab === 'expenses' || activeTab === 'personal' || activeTab === 'purchases_made';
  const isMoreContext =
    activeTab === 'purchases_for_me' || activeTab === 'common' || activeTab === 'profile';

  const goTo = (tab: NavTab) => {
    onTabChange(tab);
    setMobileMoreOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-60 lg:w-64 md:shrink-0 md:flex-col md:border-r md:border-border md:bg-card">
        {/* Brand */}
        <div className="flex items-center justify-between border-b border-border p-4 lg:p-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <CreditCard className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold tracking-tight">Flat Expenses</div>
              <div className="truncate text-[11px] text-muted-foreground">{user?.householdName || 'Household'}</div>
            </div>
          </div>
          {user?.role === 'admin' && <Badge variant="outline" className="shrink-0 text-[10px] font-mono">Admin</Badge>}
        </div>

        {/* Voice assistant quick-launch */}
        <div className="p-3 pb-1">
          <button
            type="button"
            onClick={() => setVoiceModalOpen(true)}
            className="flex min-h-11 w-full items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-primary">
              <Mic className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold">Voice assistant</span>
              <span className="block text-[10px] text-muted-foreground">Dictate expense (Ctrl+M)</span>
            </span>
          </button>
        </div>

        {/* Theme palette selector */}
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={() => setPaletteModalOpen(true)}
            className="flex min-h-9 w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted group"
            title="Switch color palette"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-soft text-primary">
                <Palette className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold">{currentPalette.name}</div>
                <div className="truncate text-[10px] text-muted-foreground">{currentPalette.tagline}</div>
              </div>
            </div>
            <span
              className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10 ml-1.5"
              style={{ backgroundColor: currentPalette.primaryHex }}
            />
          </button>
        </div>

        {/* Nav */}
        <nav aria-label="Main navigation" className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
          <div className="space-y-0.5">
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Overview</div>
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === 'expenses' ? isExpensesActive : activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => goTo(item.id)}
                  className={
                    'flex min-h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-xs font-medium transition-colors ' +
                    (isActive
                      ? 'bg-brand-soft text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground')
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-0.5">
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Household</div>
            {householdNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => goTo(item.id)}
                  className={
                    'flex min-h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-xs font-medium transition-colors ' +
                    (isActive
                      ? 'bg-brand-soft text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground')
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-0.5">
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Account</div>
            {accountNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => goTo(item.id)}
                  className={
                    'flex min-h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-xs font-medium transition-colors ' +
                    (isActive
                      ? 'bg-brand-soft text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground')
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* User footer */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5 rounded-lg p-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-xs font-bold text-primary">
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold">{user?.fullName}</div>
              <div className="truncate text-[10px] text-muted-foreground">@{user?.username}</div>
            </div>
            <button
              type="button"
              onClick={logout}
              aria-label="Sign out"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-negative"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content area ───────────────────────────────────── */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Mobile top header */}
        <header className="sticky top-0 z-30 flex min-h-[52px] items-center justify-between gap-2 border-b border-border bg-background/95 px-3 xs:px-4 py-2 backdrop-blur-md md:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold leading-tight">{pageTitles[activeTab]}</h1>
              <p className="truncate text-[10px] text-muted-foreground leading-tight">{user?.householdName || 'Household'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setPaletteModalOpen(true)}
              aria-label="Theme palettes"
              title="Theme color palette"
              className="flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-xs text-foreground transition-colors hover:bg-muted active:scale-95 touch-manipulation"
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0 border border-black/10"
                style={{ backgroundColor: currentPalette.primaryHex }}
              />
              <span className="text-[11px] font-medium">Palette</span>
            </button>
            <button
              type="button"
              onClick={() => setVoiceModalOpen(true)}
              aria-label="Voice assistant"
              title="Voice assistant input"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted active:scale-95 touch-manipulation"
            >
              <Mic className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Page body */}
        <main className="min-w-0 flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
          <div className="mx-auto w-full max-w-6xl px-3 xs:px-4 py-3 xs:py-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile bottom navigation dock ────────────────────────────── */}
      <nav
        aria-label="Primary mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border/80 bg-card/95 backdrop-blur-xl shadow-lg md:hidden"
        style={{
          minHeight: '62px',
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
          paddingTop: '0.375rem',
        }}
      >
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === 'expenses' ? isExpensesActive : activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => goTo(item.id)}
              className="group relative flex flex-1 flex-col items-center justify-center gap-1 py-1 px-1 transition-all active:scale-95 touch-manipulation select-none"
            >
              {/* Active icon capsule pill */}
              <span
                className={
                  'flex h-7 px-3.5 items-center justify-center rounded-full transition-all ' +
                  (isActive
                    ? 'bg-primary/15 text-primary scale-105'
                    : 'text-muted-foreground/80 group-hover:text-foreground')
                }
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              </span>
              <span
                className={
                  'max-w-full truncate text-[11px] leading-tight transition-colors ' +
                  (isActive ? 'font-bold text-primary' : 'font-medium text-muted-foreground')
                }
              >
                {item.label}
              </span>
            </button>
          );
        })}
        {/* More button */}
        <button
          type="button"
          aria-expanded={mobileMoreOpen}
          aria-controls="mobile-more-menu"
          onClick={() => setMobileMoreOpen((open) => !open)}
          className="group relative flex flex-1 flex-col items-center justify-center gap-1 py-1 px-1 transition-all active:scale-95 touch-manipulation select-none"
        >
          <span
            className={
              'flex h-7 px-3.5 items-center justify-center rounded-full transition-all ' +
              (mobileMoreOpen || isMoreContext
                ? 'bg-primary/15 text-primary scale-105'
                : 'text-muted-foreground/80 group-hover:text-foreground')
            }
          >
            <MoreHorizontal className="h-5 w-5 shrink-0" aria-hidden="true" />
          </span>
          <span
            className={
              'max-w-full truncate text-[11px] leading-tight transition-colors ' +
              (mobileMoreOpen || isMoreContext ? 'font-bold text-primary' : 'font-medium text-muted-foreground')
            }
          >
            More
          </span>
        </button>
      </nav>

      {/* ── Mobile "More" bottom sheet ──────────────────────────── */}
      {mobileMoreOpen && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close More menu"
            onClick={() => setMobileMoreOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] md:hidden"
          />
          {/* Sheet */}
          <section
            id="mobile-more-menu"
            aria-label="More destinations"
            className="animate-slide-up fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border bg-card shadow-2xl md:hidden"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            {/* Sheet drag handle */}
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>

            <div className="px-4 pb-1 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">More</h2>
                  <p className="text-[11px] text-muted-foreground">Household tools and settings</p>
                </div>
                <button
                  type="button"
                  aria-label="Close More menu"
                  onClick={() => setMobileMoreOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted active:scale-95 transition-all"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="px-3 pb-2 space-y-1">
              {/* Household section */}
              <div className="pt-2 pb-1">
                <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Household</div>
              </div>
              {householdNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goTo(item.id)}
                    className={
                      'flex min-h-[46px] w-full items-center gap-3 rounded-xl px-3 text-left transition-colors active:scale-[0.98] ' +
                      (isActive ? 'bg-brand-soft text-primary font-semibold' : 'hover:bg-muted text-foreground')
                    }
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-foreground">
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="flex-1 text-xs font-medium truncate">{item.label}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                  </button>
                );
              })}

              {/* Account section */}
              <div className="pt-3 pb-1">
                <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Account</div>
              </div>
              {accountNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goTo(item.id)}
                    className={
                      'flex min-h-[46px] w-full items-center gap-3 rounded-xl px-3 text-left transition-colors active:scale-[0.98] ' +
                      (isActive ? 'bg-brand-soft text-primary font-semibold' : 'hover:bg-muted text-foreground')
                    }
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-foreground">
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="flex-1 text-xs font-medium truncate">{item.label}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                  </button>
                );
              })}

              {/* Color Theme switcher shortcut */}
              <button
                type="button"
                onClick={() => {
                  setMobileMoreOpen(false);
                  setPaletteModalOpen(true);
                }}
                className="flex min-h-[46px] w-full items-center gap-3 rounded-xl border border-border bg-card px-3 text-left transition-colors active:scale-[0.98] hover:bg-muted text-foreground"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-primary">
                  <Palette className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-medium truncate">Color Theme & Palette</span>
                  <span className="block text-[10px] text-muted-foreground truncate">Current: {currentPalette.name}</span>
                </div>
                <span
                  className="h-3.5 w-3.5 rounded-full border border-black/10 shrink-0"
                  style={{ backgroundColor: currentPalette.primaryHex }}
                />
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
              </button>

              {/* Session */}
              <div className="pt-3 border-t border-border">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-primary">
                    {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{user?.fullName}</p>
                    <p className="truncate text-[10px] text-muted-foreground">@{user?.username}</p>
                  </div>
                  {user?.role === 'admin' && <Badge variant="outline" className="text-[10px] font-mono shrink-0">Admin</Badge>}
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-center border-border text-negative hover:bg-negative-soft min-h-[42px] text-xs mt-1"
                  onClick={logout}
                >
                  <LogOut className="h-3.5 w-3.5 mr-2" aria-hidden="true" />
                  Sign out
                </Button>
              </div>
            </div>
          </section>
        </>
      )}

      <VoiceAssistantModal
        open={voiceModalOpen}
        onOpenChange={setVoiceModalOpen}
        members={members}
        categories={categories}
      />

      <ChangePasswordModal
        open={passwordModalOpen || !!user?.mustChangePassword}
        onOpenChange={setPasswordModalOpen}
        mandatory={!!user?.mustChangePassword}
      />

      <ThemePaletteModal
        open={paletteModalOpen}
        onOpenChange={setPaletteModalOpen}
      />
    </div>
  );
}
