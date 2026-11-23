import React from 'react';
import { useTheme, THEME_PALETTES } from '@/context/ThemeContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Check, Palette, Moon, Sun } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';

interface ThemePaletteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ThemePaletteModal({ open, onOpenChange }: ThemePaletteModalProps) {
  const { palette, setPalette, isDark, toggleDark } = useTheme();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto p-4 sm:p-5 bg-card text-card-foreground border-border">
        <DialogHeader className="space-y-1.5 pb-2 text-left">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Palette className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <DialogTitle className="text-base font-bold text-foreground tracking-tight">
                  Theme & Appearance
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Select an executive color palette tailored for clarity and focus.
                </DialogDescription>
              </div>
            </div>

            {/* Light / Dark Mode Toggle */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleDark}
              className="h-8 gap-1.5 px-2.5 text-xs font-semibold border-border text-foreground hover:bg-muted active:scale-95 transition-all shrink-0"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-pending" />
                  <span className="hidden xs:inline">Light mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-primary" />
                  <span className="hidden xs:inline">Dark mode</span>
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        {/* 6 Curated Executive Palettes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {THEME_PALETTES.map((p) => {
            const isSelected = palette === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPalette(p.id)}
                className={`group relative flex flex-col justify-between text-left rounded-lg border p-3 transition-all duration-150 active:scale-[0.99] text-card-foreground cursor-pointer ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/25 bg-primary/5 shadow-2xs'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30'
                }`}
              >
                {/* Top: Swatches + Active Badge */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-4 w-4 rounded-full border border-black/15 shadow-2xs shrink-0"
                      style={{ backgroundColor: p.primaryHex }}
                      title={`Primary: ${p.primaryHex}`}
                    />
                    <span
                      className="h-4 w-4 rounded-full border border-black/15 shadow-2xs shrink-0"
                      style={{ backgroundColor: p.accentHex }}
                      title={`Accent: ${p.accentHex}`}
                    />
                    <span
                      className="h-4 w-4 rounded-full border border-black/15 shadow-2xs shrink-0"
                      style={{ backgroundColor: p.bgHex }}
                      title={`Background: ${p.bgHex}`}
                    />
                    <span className="ml-1 text-[11px] font-mono uppercase text-muted-foreground font-medium">
                      {p.primaryHex}
                    </span>
                  </div>

                  {isSelected ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                      <Check className="h-3 w-3 stroke-[3]" />
                      Active
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
                      Preview
                    </span>
                  )}
                </div>

                {/* Bottom: Name & Category */}
                <div>
                  <div className="text-xs sm:text-sm font-bold text-foreground tracking-tight">
                    {p.name}
                  </div>
                  <div className="text-[11px] font-medium text-muted-foreground mt-0.5">
                    {p.category}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Clean, Professional Footer */}
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span className="hidden sm:inline">
            <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded border border-border text-[10px]">Ctrl+Shift+T</kbd> to toggle anytime
          </span>
          <span className="sm:hidden text-[11px]">
            Applies instantly across all pages
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-7 px-3 text-xs font-medium border-border"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
