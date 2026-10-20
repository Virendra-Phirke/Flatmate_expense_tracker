import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  DEFAULT_CATEGORIES,
  CategoryDefinition,
  findCategoryByName,
  getRelatedItems,
  getQuickChips,
  guessCategoryForItem,
  getRecentPurchases,
  saveRecentPurchase,
} from '@/data/categorySuggestions';
import { Search, ChevronDown, Check, X, Sparkles, Tag, Clock } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

// ── Text Highlight Helper ───────────────────────────────────────────────────

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;

  const q = query.trim().toLowerCase();
  const index = text.toLowerCase().indexOf(q);

  if (index === -1) return <span>{text}</span>;

  const before = text.slice(0, index);
  const match = text.slice(index, index + q.length);
  const after = text.slice(index + q.length);

  return (
    <span>
      {before}
      <span className="text-primary font-bold underline underline-offset-2 decoration-primary/40">
        {match}
      </span>
      {after}
    </span>
  );
}

// ── Category Combobox ─────────────────────────────────────────────────────────

export interface CategoryComboboxProps {
  value: string;
  onChange: (category: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'default';
  id?: string;
}

export function CategoryCombobox({
  value,
  onChange,
  placeholder = 'Select category...',
  className,
  disabled = false,
  size = 'default',
  id,
}: CategoryComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [dropPlacement, setDropPlacement] = useState<'bottom' | 'top'>('bottom');
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const matchedCategory = useMemo(() => findCategoryByName(value), [value]);

  // Filter categories based on search input or current value
  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return DEFAULT_CATEGORIES;
    return DEFAULT_CATEGORIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.items.some((item) => item.toLowerCase().includes(q))
    );
  }, [search]);

  // Adjust auto-flip position when opening
  const updatePlacement = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropPlacement(spaceBelow < 230 && rect.top > 230 ? 'top' : 'bottom');
    }
  }, []);

  const openDropdown = () => {
    if (disabled) return;
    updatePlacement();
    setSearch('');
    setHighlightIndex(0);
    setIsOpen(true);
  };

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation scrolling
  useEffect(() => {
    if (isOpen && listRef.current) {
      const itemEl = listRef.current.children[highlightIndex] as HTMLElement;
      if (itemEl && typeof itemEl.scrollIntoView === 'function') {
        itemEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex, isOpen]);

  const handleSelect = (categoryName: string) => {
    onChange(categoryName);
    setSearch('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        openDropdown();
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % Math.max(1, filteredCategories.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev <= 0 ? Math.max(0, filteredCategories.length - 1) : prev - 1
      );
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (filteredCategories[highlightIndex]) {
        e.preventDefault();
        handleSelect(filteredCategories[highlightIndex].name);
      } else if (search.trim()) {
        e.preventDefault();
        handleSelect(search.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const heightClass = size === 'sm' ? 'h-9 text-xs' : 'h-10 text-xs sm:text-sm';

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div
        className={cn(
          'relative flex items-center rounded-lg border border-border bg-background transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20',
          heightClass,
          disabled && 'opacity-60 cursor-not-allowed bg-muted/40'
        )}
      >
        <span className="pl-2.5 pr-1.5 flex items-center text-muted-foreground select-none shrink-0">
          {matchedCategory ? (
            <span className="text-sm leading-none mr-1">{matchedCategory.emoji}</span>
          ) : (
            <Tag className="h-3.5 w-3.5" />
          )}
        </span>

        <input
          id={id}
          ref={inputRef}
          type="text"
          disabled={disabled}
          placeholder={matchedCategory ? matchedCategory.name : placeholder}
          value={isOpen ? search : value || ''}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) {
              updatePlacement();
              setIsOpen(true);
            }
          }}
          onFocus={openDropdown}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent pr-8 outline-none text-foreground placeholder:text-muted-foreground truncate"
          autoComplete="off"
        />

        <div className="absolute right-1.5 flex items-center gap-0.5">
          {value && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setSearch('');
              }}
              className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
              title="Clear category"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              if (isOpen) {
                setIsOpen(false);
              } else {
                openDropdown();
              }
            }}
            className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
          >
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform duration-200', isOpen && 'rotate-180')}
            />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute left-0 z-50 max-h-60 w-full min-w-[220px] overflow-auto rounded-xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in-50 zoom-in-95',
            dropPlacement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          )}
        >
          <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase flex items-center justify-between border-b border-border/50 pb-1 mb-1">
            <span>Categories</span>
            {search ? (
              <span className="font-normal text-[9px] text-primary">{filteredCategories.length} matched</span>
            ) : (
              <span className="font-normal text-[9px]">Select or type</span>
            )}
          </div>

          <div ref={listRef} className="space-y-0.5">
            {filteredCategories.map((cat, idx) => {
              const isSelected =
                value?.toLowerCase() === cat.name.toLowerCase() ||
                value?.toLowerCase() === cat.id.toLowerCase();
              const isHighlighted = idx === highlightIndex;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelect(cat.name)}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors text-left',
                    isSelected
                      ? 'bg-primary/10 text-primary font-semibold'
                      : isHighlighted
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm shrink-0">{cat.emoji}</span>
                    <span className="truncate">
                      <HighlightText text={cat.name} query={search} />
                    </span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
              );
            })}

            {/* Custom Category fallback if user typed something not in list */}
            {search.trim() &&
              !filteredCategories.some(
                (c) => c.name.toLowerCase() === search.trim().toLowerCase()
              ) && (
                <button
                  type="button"
                  onClick={() => handleSelect(search.trim())}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-primary hover:bg-primary/10 transition-colors text-left font-medium border-t border-border mt-1 pt-2"
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Use &ldquo;{search.trim()}&rdquo;</span>
                </button>
              )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Item Combobox with Category-Driven Suggestions ───────────────────────────

export interface ItemComboboxProps {
  value: string;
  onChange: (item: string) => void;
  category?: string;
  onCategoryChange?: (category: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'default';
  showChips?: boolean;
  chipsLimit?: number;
  id?: string;
}

export function ItemCombobox({
  value,
  onChange,
  category,
  onCategoryChange,
  placeholder = 'Item name (e.g. Bread, Milk)...',
  className,
  disabled = false,
  size = 'default',
  showChips = false,
  chipsLimit = 5,
  id,
}: ItemComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [dropPlacement, setDropPlacement] = useState<'bottom' | 'top'>('bottom');
  const [recents, setRecents] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load recent items
  useEffect(() => {
    setRecents(getRecentPurchases());
  }, [isOpen]);

  // Available suggestions based on selected category
  const relatedItems = useMemo(() => getRelatedItems(category), [category]);
  const matchedCategory = useMemo(() => findCategoryByName(category), [category]);
  const quickChips = useMemo(() => getQuickChips(category).slice(0, chipsLimit), [category, chipsLimit]);

  // Filter items matching current input value
  const filteredSuggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return relatedItems;

    // Direct matches in current category first
    const directMatches = relatedItems.filter((it) => it.toLowerCase().includes(q));

    // If typing doesn't match current category items, search across all categories!
    if (directMatches.length === 0) {
      const allMatches: string[] = [];
      DEFAULT_CATEGORIES.forEach((c) => {
        c.items.forEach((it) => {
          if (it.toLowerCase().includes(q) && !allMatches.includes(it)) {
            allMatches.push(it);
          }
        });
      });
      return allMatches.slice(0, 10);
    }

    return directMatches;
  }, [value, relatedItems]);

  // Adjust auto-flip position when opening
  const updatePlacement = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropPlacement(spaceBelow < 230 && rect.top > 230 ? 'top' : 'bottom');
    }
  }, []);

  const openDropdown = () => {
    if (disabled) return;
    updatePlacement();
    setHighlightIndex(0);
    setIsOpen(true);
  };

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation scrolling
  useEffect(() => {
    if (isOpen && listRef.current) {
      const itemEl = listRef.current.children[highlightIndex] as HTMLElement;
      if (itemEl && typeof itemEl.scrollIntoView === 'function') {
        itemEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex, isOpen]);

  const handleSelect = (item: string) => {
    onChange(item);
    saveRecentPurchase(item);
    setIsOpen(false);

    // Auto-detect and propagate category if not set or user picks from another category
    if (onCategoryChange) {
      const guessed = guessCategoryForItem(item);
      if (guessed && (!category || category === 'Groceries' || category === 'General')) {
        onCategoryChange(guessed.name);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        openDropdown();
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % Math.max(1, filteredSuggestions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev <= 0 ? Math.max(0, filteredSuggestions.length - 1) : prev - 1
      );
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (filteredSuggestions[highlightIndex]) {
        e.preventDefault();
        handleSelect(filteredSuggestions[highlightIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const heightClass = size === 'sm' ? 'h-9 text-xs' : 'h-10 text-xs sm:text-sm';

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div
        className={cn(
          'relative flex items-center rounded-lg border border-border bg-background transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20',
          heightClass,
          disabled && 'opacity-60 cursor-not-allowed bg-muted/40'
        )}
      >
        <span className="pl-2.5 pr-1.5 flex items-center text-muted-foreground select-none shrink-0">
          <Search className="h-3.5 w-3.5" />
        </span>

        <input
          id={id}
          type="text"
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) {
              updatePlacement();
              setIsOpen(true);
            }
          }}
          onFocus={openDropdown}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent pr-7 outline-none text-foreground placeholder:text-muted-foreground truncate"
          autoComplete="off"
        />

        {value && !disabled && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => onChange('')}
            className="absolute right-2 p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
            title="Clear item name"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && (
        <div
          className={cn(
            'absolute left-0 z-50 max-h-56 w-full min-w-[220px] overflow-auto rounded-xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in-50 zoom-in-95',
            dropPlacement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          )}
        >
          {/* Recent Items (shown when input is empty and recents exist) */}
          {!value.trim() && recents.length > 0 && (
            <div className="mb-2 pb-1.5 border-b border-border/50">
              <div className="px-2 py-0.5 text-[9px] font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-1">
                <Clock className="h-2.5 w-2.5 text-primary" />
                Recent
              </div>
              <div className="flex flex-wrap gap-1 px-1.5 pt-1">
                {recents.slice(0, 4).map((rec, rIdx) => (
                  <button
                    key={rIdx}
                    type="button"
                    onClick={() => handleSelect(rec)}
                    className="inline-flex items-center gap-1 rounded-md bg-secondary/80 hover:bg-secondary px-2 py-0.5 text-[11px] text-foreground transition-colors hover:text-primary"
                  >
                    <span>{rec}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase flex items-center justify-between">
            <span>
              {matchedCategory
                ? `Suggested in ${matchedCategory.emoji} ${matchedCategory.name}`
                : 'Popular Items'}
            </span>
            <span className="text-[9px] text-muted-foreground font-normal">
              {filteredSuggestions.length} items
            </span>
          </div>

          <div ref={listRef} className="space-y-0.5">
            {filteredSuggestions.map((item, idx) => {
              const isSelected = value?.toLowerCase() === item.toLowerCase();
              const isHighlighted = idx === highlightIndex;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors text-left',
                    isSelected
                      ? 'bg-primary/10 text-primary font-semibold'
                      : isHighlighted
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground hover:bg-muted/50'
                  )}
                >
                  <span className="truncate">
                    <HighlightText text={item} query={value} />
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Clickable Quick-Suggestion Chips with Emojis */}
      {showChips && quickChips.length > 0 && !disabled && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-0.5 flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5 text-primary" />
            Quick:
          </span>
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(chip.label)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-all cursor-pointer',
                value.toLowerCase() === chip.label.toLowerCase()
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'bg-secondary/70 hover:bg-secondary text-secondary-foreground hover:border-primary/40 border border-transparent'
              )}
            >
              <span>{chip.emoji}</span>
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Linked Category + Item Selector ──────────────────────────────────────────

export interface CategoryItemSelectorProps {
  category: string;
  onCategoryChange: (cat: string) => void;
  item: string;
  onItemChange: (item: string) => void;
  itemPlaceholder?: string;
  size?: 'sm' | 'default';
  showChips?: boolean;
  className?: string;
}

export function CategoryItemSelector({
  category,
  onCategoryChange,
  item,
  onItemChange,
  itemPlaceholder = 'Item description...',
  size = 'default',
  showChips = true,
  className,
}: CategoryItemSelectorProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
        <div className="sm:col-span-5">
          <label className="block text-[11px] font-semibold text-foreground mb-1">
            Category
          </label>
          <CategoryCombobox
            value={category}
            onChange={onCategoryChange}
            size={size}
          />
        </div>
        <div className="sm:col-span-7">
          <label className="block text-[11px] font-semibold text-foreground mb-1">
            Item Name
          </label>
          <ItemCombobox
            value={item}
            onChange={onItemChange}
            category={category}
            onCategoryChange={onCategoryChange}
            placeholder={itemPlaceholder}
            size={size}
            showChips={showChips}
          />
        </div>
      </div>
    </div>
  );
}
