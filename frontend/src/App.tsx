import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { LoginPage } from '@/pages/LoginPage';
import { Shell, NavTab } from '@/components/layout/Shell';
import { DashboardPage } from '@/pages/DashboardPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { ExpensesPage } from '@/pages/ExpensesPage';
import { PurchasesForMePage } from '@/pages/PurchasesForMePage';
import { CommonExpensesPage } from '@/pages/CommonExpensesPage';
import { BalancesPage } from '@/pages/BalancesPage';
import { RepaymentsPage } from '@/pages/RepaymentsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { Loader2 } from '@/components/ui/icons';

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
    </Shell>
  );
}

export default App;
