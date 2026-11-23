import React, { useState } from 'react';
import { NavTab } from './Shell';
import {
  Plus,
  Users,
  ShoppingBag,
  Mic,
  Receipt,
} from '@/components/ui/icons';
import { motion, AnimatePresence } from 'motion/react';

interface MobileSpeedDialFABProps {
  onNavigate: (tab: NavTab, openModal?: boolean) => void;
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
      <AnimatePresence>
        {open && (
          <motion.button
            key="fab-backdrop"
            type="button"
            aria-label="Close action menu"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden select-none"
          />
        )}
      </AnimatePresence>

      {/* Floating Speed-Dial Container - positioned with comfortable clearance above bottom dock */}
      <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] right-4 z-40 md:hidden flex flex-col items-end gap-2.5">
        {/* Speed-dial options list */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="fab-options"
              initial={{ opacity: 0, y: 14, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-end gap-2 pb-1"
            >
              {/* 1. Voice Dictate */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => handleAction(onOpenVoice)}
                className="flex items-center gap-2.5 pl-3.5 pr-2 py-1.5 rounded-full bg-card border border-border shadow-md text-foreground hover:bg-muted transition-colors"
              >
                <span className="text-xs font-semibold">Voice Dictate (Ctrl+M)</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-primary">
                  <Mic className="h-3.5 w-3.5" />
                </span>
              </motion.button>

              {/* 2. Common Shared Bill */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => handleAction(() => onNavigate('common', true))}
                className="flex items-center gap-2.5 pl-3.5 pr-2 py-1.5 rounded-full bg-card border border-border shadow-md text-foreground hover:bg-muted transition-colors"
              >
                <span className="text-xs font-semibold">Common Shared Bill</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-foreground">
                  <Users className="h-3.5 w-3.5" />
                </span>
              </motion.button>

              {/* 3. Bought for Flatmate */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => handleAction(() => onNavigate('purchases_made', true))}
                className="flex items-center gap-2.5 pl-3.5 pr-2 py-1.5 rounded-full bg-card border border-border shadow-md text-foreground hover:bg-muted transition-colors"
              >
                <span className="text-xs font-semibold">Bought for Flatmate</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-foreground">
                  <ShoppingBag className="h-3.5 w-3.5" />
                </span>
              </motion.button>

              {/* 4. Personal Expense */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => handleAction(() => onNavigate('personal', true))}
                className="flex items-center gap-2.5 pl-3.5 pr-2 py-1.5 rounded-full bg-card border border-border shadow-md text-foreground hover:bg-muted transition-colors"
              >
                <span className="text-xs font-semibold">Personal Expense</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-foreground">
                  <Receipt className="h-3.5 w-3.5" />
                </span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Primary FAB Trigger Button */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.18, ease: 'easeInOut' }}
          type="button"
          aria-expanded={open}
          aria-label={open ? 'Close quick actions menu' : 'Open quick actions menu'}
          onClick={() => setOpen((prev) => !prev)}
          className={`h-11 w-11 rounded-full shadow-lg flex items-center justify-center transition-colors duration-150 touch-manipulation select-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
            open
              ? 'bg-foreground text-background'
              : 'bg-primary text-primary-foreground hover:bg-primary/95 shadow-primary/20'
          }`}
        >
          <Plus className="h-5 w-5 stroke-[2.5]" />
        </motion.button>
      </div>
    </>
  );
}

export default MobileSpeedDialFAB;
