import React from 'react';
import { useTheme, THEME_PALETTES, ThemePaletteId } from '@/context/ThemeContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Check, Palette, Moon, Sun, Sparkles } from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ThemePaletteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ThemePaletteModal({ open, onOpenChange }: ThemePaletteModalProps) {
  const { palette, setPalette, isDark, toggleDark } = useTheme();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[88vh] overflow-y-auto p-4 sm:p-6 bg-card text-card-foreground border-border">
        <DialogHeader className="space-y-1.5 pb-2 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Palette className="h-4 w-4" aria-hidden="true" />
              </span>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                Theme & Color Palettes
              </DialogTitle>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleDark}
              className="h-8 gap-1.5 text-xs font-semibold border-border text-foreground hover:bg-muted active:scale-95 transition-transform"
            >
              {isDark ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-pending" />
                  <span>Light mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-primary" />
                  <span>Dark mode</span>
                </>
              )}
            </Button>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Click any palette to instantly preview it live across all pages, cards, and buttons.
          </DialogDescription>
        </DialogHeader>

        {/* Palettes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {THEME_PALETTES.map((p) => {
            const isSelected = palette === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPalette(p.id)}
                className={`group relative flex flex-col text-left rounded-lg border p-3.5 transition-colors duration-150 active:scale-[0.99] text-card-foreground ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/30 bg-primary/5 shadow-xs'
                    : 'border-border bg-card hover:border-primary/50 hover:bg-muted/30'
                }`}
              >
                {/* Active check pill */}
                {isSelected && (
                  <span className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs shadow-xs">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                )}

                {/* Color swatches preview bar */}
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span
                    className="h-6 w-6 rounded-md shadow-xs shrink-0 border border-black/10"
                    style={{ backgroundColor: p.primaryHex }}
                    title={`Primary: ${p.primaryHex}`}
                  />
                  <span
                    className="h-6 w-6 rounded-md shadow-xs shrink-0 border border-black/10"
                    style={{ backgroundColor: p.accentHex }}
                    title={`Accent: ${p.accentHex}`}
                  />
                  <span
                    className="h-6 w-6 rounded-md shadow-xs shrink-0 border border-black/10"
                    style={{ backgroundColor: p.bgHex }}
                    title={`Background: ${p.bgHex}`}
                  />
                  <span className="ml-auto text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                    {p.primaryHex}
                  </span>
                </div>

                {/* Title & Tagline */}
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm text-foreground">
                    {p.name}
                  </span>
                </div>
                <div className="text-xs font-medium text-muted-foreground mt-0.5">
                  {p.tagline}
                </div>

                {/* Vibe Badge */}
                <div className="mt-2 flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-xs px-2 py-0.5 font-medium">
                    {p.vibe}
                  </Badge>
                </div>

                {/* Description */}
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {p.description}
                </p>

                {/* Live Action footer */}
                <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                  <span className={isSelected ? 'font-bold text-primary' : 'text-muted-foreground'}>
                    {isSelected ? '✓ Active on app' : 'Click to preview'}
                  </span>
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: p.primaryHex }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer tip */}
        <div className="mt-4 rounded-lg bg-surface-subtle p-3 text-xs text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span>
            Tell me which palette you prefer (1 through 6) and I will make it the permanent default!
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
