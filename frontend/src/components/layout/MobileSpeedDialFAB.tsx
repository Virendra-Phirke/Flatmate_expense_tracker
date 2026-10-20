import React, { useState } from 'react';
import { NavTab } from './Shell';
import {
  Plus,
  CreditCard,
  Users,
  ShoppingBag,
  Mic,
  Receipt,
  X,
} from '@/components/ui/icons';

interface MobileSpeedDialFABProps {
  onNavigate: (tab: NavTab) => void;
  onOpenVoice: () => void;
}

export function MobileSpeedDialFAB({
  onNavigate,
  onOpenVoice,
}: MobileSpeedDialFABProps) {
  const [open, setOpen] = useState(false);

  const handleAction = (callback: () => void) => {
    callback();
    setOpen(false);
  };

  return (
    <>
      {/* Backdrop overlay when open */}
      {open && (
        <button
          type="button"
          aria-label="Close action menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] md:hidden animate-fade-in transition-opacity"
        />
      )}

      {/* Floating Speed-Dial Container - positioned with comfortable clearance above bottom dock */}
      <div className="fixed bottom-[calc(5.875rem+env(safe-area-inset-bottom,0px))] right-4 z-40 md:hidden flex flex-col items-end gap-2.5">
        {/* Speed-dial options list */}
        {open && (
          <div className="flex flex-col items-end gap-2 pb-1 animate-slide-up">
            {/* 1. Voice Dictate */}
            <button
              type="button"
              onClick={() => handleAction(onOpenVoice)}
              className="flex items-center gap-2.5 pl-3.5 pr-2.5 py-1.5 rounded-full bg-card border border-border shadow-lg text-foreground hover:bg-muted active:scale-95 transition-transform"
            >
              <span className="text-xs font-semibold">Voice Dictate (Ctrl+M)</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-primary">
                <Mic className="h-4 w-4" />
              </span>
            </button>

            {/* 2. Common Shared Bill */}
            <button
              type="button"
              onClick={() => handleAction(() => onNavigate('common'))}
              className="flex items-center gap-2.5 pl-3.5 pr-2.5 py-1.5 rounded-full bg-card border border-border shadow-lg text-foreground hover:bg-muted active:scale-95 transition-transform"
            >
              <span className="text-xs font-semibold">Common Shared Bill</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-foreground">
                <Users className="h-4 w-4" />
              </span>
            </button>

            {/* 3. Bought for Flatmate */}
            <button
              type="button"
              onClick={() => handleAction(() => onNavigate('purchases_made'))}
              className="flex items-center gap-2.5 pl-3.5 pr-2.5 py-1.5 rounded-full bg-card border border-border shadow-lg text-foreground hover:bg-muted active:scale-95 transition-transform"
            >
              <span className="text-xs font-semibold">Bought for Flatmate</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-foreground">
                <ShoppingBag className="h-4 w-4" />
              </span>
            </button>

            {/* 4. Personal Expense */}
            <button
              type="button"
              onClick={() => handleAction(() => onNavigate('personal'))}
              className="flex items-center gap-2.5 pl-3.5 pr-2.5 py-1.5 rounded-full bg-card border border-border shadow-lg text-foreground hover:bg-muted active:scale-95 transition-transform"
            >
              <span className="text-xs font-semibold">Personal Expense</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-foreground">
                <Receipt className="h-4 w-4" />
              </span>
            </button>
          </div>
        )}

        {/* Primary FAB Trigger Button */}
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? 'Close quick actions menu' : 'Open quick actions menu'}
          onClick={() => setOpen((prev) => !prev)}
          className={`h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-90 touch-manipulation select-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
            open
              ? 'bg-foreground text-background rotate-45'
              : 'bg-primary text-primary-foreground hover:bg-primary/95 shadow-primary/25'
          }`}
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </button>
      </div>
    </>
  );
}
