import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { LoginPage } from '@/pages/LoginPage';
import { Shell, NavTab } from '@/components/layout/Shell';
import { DashboardPage } from '@/pages/DashboardPage';
import { Loader2 } from '@/components/ui/icons';

// Route-level code splitting to optimize bundle size and startup performance
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const ExpensesPage = lazy(() => import('@/pages/ExpensesPage').then((m) => ({ default: m.ExpensesPage })));
const PurchasesForMePage = lazy(() => import('@/pages/PurchasesForMePage').then((m) => ({ default: m.PurchasesForMePage })));
const CommonExpensesPage = lazy(() => import('@/pages/CommonExpensesPage').then((m) => ({ default: m.CommonExpensesPage })));
const BalancesPage = lazy(() => import('@/pages/BalancesPage').then((m) => ({ default: m.BalancesPage })));
const RepaymentsPage = lazy(() => import('@/pages/RepaymentsPage').then((m) => ({ default: m.RepaymentsPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const PrivacyPolicyPage = lazy(() => import('@/pages/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage })));
const TermsPage = lazy(() => import('@/pages/TermsPage').then((m) => ({ default: m.TermsPage })));
const SecurityPage = lazy(() => import('@/pages/SecurityPage').then((m) => ({ default: m.SecurityPage })));

function TabFallback() {
  return (
    <div className="flex h-64 w-full items-center justify-center" aria-busy="true" aria-label="Loading view">
      <div className="flex items-center space-x-2.5 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>Loading view...</span>
      </div>
    </div>
  );
}

export function App() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedRepaymentTarget, setSelectedRepaymentTarget] = useState<string | undefined>();

  // Background warm-up: prefetch core tabs once authenticated so navigation is instantaneous
  useEffect(() => {
    if (user?.id) {
      queryClient.prefetchQuery({ queryKey: ['balances_summary'], queryFn: () => api('GET', '/balances/summary') });
      queryClient.prefetchQuery({ queryKey: ['analytics', undefined, undefined, 'all', ''], queryFn: () => api('GET', '/analytics') });
      queryClient.prefetchQuery({ queryKey: ['members'], queryFn: () => api('GET', '/members'), staleTime: 5 * 60 * 1000 });
      queryClient.prefetchQuery({ queryKey: ['categories'], queryFn: () => api('GET', '/categories'), staleTime: 10 * 60 * 1000 });
      queryClient.prefetchQuery({ queryKey: ['personal_expenses'], queryFn: () => api('GET', '/expenses?type=personal') });
      queryClient.prefetchQuery({ queryKey: ['common_expenses'], queryFn: () => api('GET', '/expenses?type=common') });
      queryClient.prefetchQuery({ queryKey: ['purchases_made'], queryFn: () => api('GET', '/purchases/made') });
      queryClient.prefetchQuery({ queryKey: ['purchases_for_me'], queryFn: () => api('GET', '/purchases/for-me') });
    }
  }, [user?.id, queryClient]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Loading Household Ledger...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const navigateToRepayments = (targetMemberId?: string) => {
    setSelectedRepaymentTarget(targetMemberId);
    setActiveTab('repayments');
  };

  return (
    <Shell activeTab={activeTab} onTabChange={setActiveTab}>
      <Suspense fallback={<TabFallback />}>
        {activeTab === 'dashboard' && (
          <DashboardPage
            onNavigate={setActiveTab}
            onOpenVoice={() => {
              const event = new KeyboardEvent('keydown', { key: 'm', ctrlKey: true });
              window.dispatchEvent(event);
            }}
          />
        )}
        {activeTab === 'analytics' && <AnalyticsPage />}
        {(activeTab === 'expenses' || activeTab === 'personal') && (
          <ExpensesPage initialSubTab="personal" />
        )}
        {activeTab === 'purchases_made' && (
          <ExpensesPage initialSubTab="purchases_made" />
        )}
        {activeTab === 'purchases_for_me' && (
          <PurchasesForMePage onNavigateToRepayments={() => navigateToRepayments()} />
        )}
        {activeTab === 'common' && <CommonExpensesPage />}
        {activeTab === 'balances' && (
          <BalancesPage onNavigateToRepayments={navigateToRepayments} />
        )}
        {activeTab === 'repayments' && (
          <RepaymentsPage initialRecipientId={selectedRepaymentTarget} />
        )}
        {activeTab === 'profile' && <ProfilePage />}
        {activeTab === 'privacy' && <PrivacyPolicyPage onBack={() => setActiveTab('dashboard')} />}
        {activeTab === 'terms' && <TermsPage onBack={() => setActiveTab('dashboard')} />}
        {activeTab === 'security' && <SecurityPage onBack={() => setActiveTab('dashboard')} />}
      </Suspense>
    </Shell>
  );
}

export default App;
