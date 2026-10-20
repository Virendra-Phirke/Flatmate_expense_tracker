import * as React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { ButtonProps, buttonVariants } from '@/components/ui/button';

const Pagination = ({ className, ...props }: React.ComponentProps<'nav'>) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn('mx-auto flex w-full justify-center', className)}
    {...props}
  />
);
Pagination.displayName = 'Pagination';

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<'ul'>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn('flex flex-row items-center gap-1', className)}
    {...props}
  />
));
PaginationContent.displayName = 'PaginationContent';

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<'li'>
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn('', className)} {...props} />
));
PaginationItem.displayName = 'PaginationItem';

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ButtonProps, 'size'> &
  React.ComponentProps<'button'>;

const PaginationLink = ({
  className,
  isActive,
  size = 'icon',
  ...props
}: PaginationLinkProps) => (
  <button
    type="button"
    aria-current={isActive ? 'page' : undefined}
    className={cn(
      buttonVariants({
        variant: isActive ? 'outline' : 'ghost',
        size,
      }),
      'h-9 min-w-9 px-3 text-xs font-semibold rounded-lg transition-colors',
      isActive && 'border-primary bg-primary/10 text-primary font-bold shadow-xs',
      className
    )}
    {...props}
  />
);
PaginationLink.displayName = 'PaginationLink';

const PaginationPrevious = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="default"
    className={cn('gap-1 pl-2.5 h-9 text-xs', className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>{children ?? 'Previous'}</span>
  </PaginationLink>
);
PaginationPrevious.displayName = 'PaginationPrevious';

const PaginationNext = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to next page"
    size="default"
    className={cn('gap-1 pr-2.5 h-9 text-xs', className)}
    {...props}
  >
    <span>{children ?? 'Next'}</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
);
PaginationNext.displayName = 'PaginationNext';

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<'span'>) => (
  <span
    aria-hidden
    className={cn('flex h-9 w-9 items-center justify-center text-muted-foreground', className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = 'PaginationEllipsis';

export interface ResponsivePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  className?: string;
}

/**
 * Mobile-first responsive pagination component designed specifically for Android touch ergonomics.
 * On mobile (< sm): Prev / Next touch buttons with Page X of Y status indicator (zero horizontal overflow on 360px).
 * On desktop (sm+): Full windowed page buttons with direct page navigation.
 */
export function ResponsivePagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize = 10,
  className,
}: ResponsivePaginationProps) {
  if (totalPages <= 1 && (totalItems === undefined || totalItems <= pageSize)) {
    return null;
  }

  // Calculate window of page numbers for desktop view
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();
  const startItem = totalItems !== undefined ? (currentPage - 1) * pageSize + 1 : undefined;
  const endItem = totalItems !== undefined ? Math.min(currentPage * pageSize, totalItems) : undefined;

  return (
    <nav
      role="navigation"
      aria-label="Pagination Navigation"
      className={cn('w-full pt-3 pb-1', className)}
    >
      {/* ── Mobile View (< sm): Ultra-compact & touch-friendly for Android ── */}
      <div className="flex sm:hidden items-center justify-between gap-2 px-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex items-center justify-center gap-1 h-9 px-3 text-xs font-semibold rounded-lg border border-border bg-card text-foreground disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-xs min-h-[38px] touch-manipulation"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Prev</span>
        </button>

        <div className="flex flex-col items-center justify-center text-center px-1">
          <span className="text-xs font-mono font-bold text-foreground tracking-tight">
            Page {currentPage} of {Math.max(1, totalPages)}
          </span>
          {totalItems !== undefined && startItem !== undefined && endItem !== undefined && (
            <span className="text-xs font-mono text-muted-foreground mt-0.5">
              {startItem}–{endItem} of {totalItems}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center justify-center gap-1 h-9 px-3 text-xs font-semibold rounded-lg border border-border bg-card text-foreground disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-xs min-h-[38px] touch-manipulation"
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* ── Desktop View (sm+): Full windowed shadcn pagination ── */}
      <div className="hidden sm:flex items-center justify-between gap-4">
        {totalItems !== undefined && startItem !== undefined && endItem !== undefined ? (
          <p className="text-xs font-mono text-muted-foreground">
            Showing <strong className="text-foreground">{startItem}–{endItem}</strong> of{' '}
            <strong className="text-foreground">{totalItems}</strong> records
          </p>
        ) : (
          <div />
        )}

        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className={cn(currentPage <= 1 && 'opacity-40 pointer-events-none')}
            />
          </PaginationItem>

          {pages.map((p, idx) =>
            p === 'ellipsis' ? (
              <PaginationItem key={`ellipsis-${idx}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink
                  isActive={p === currentPage}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            )
          )}

          <PaginationItem>
            <PaginationNext
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className={cn(currentPage >= totalPages && 'opacity-40 pointer-events-none')}
            />
          </PaginationItem>
        </PaginationContent>
      </div>
    </nav>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
