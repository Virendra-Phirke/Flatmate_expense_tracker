import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * On mobile (< sm): renders as a bottom sheet that slides up.
 * On sm+: renders as a centred modal.
 */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Mobile: fixed to bottom, full-width bottom sheet
        'fixed z-50 bg-card border-border shadow-2xl duration-200',
        'inset-x-0 bottom-0 rounded-t-2xl border-t px-0 pb-0',
        'max-h-[90dvh] overflow-y-auto',
        // sm+: centred modal
        'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:right-auto',
        'sm:-translate-x-1/2 sm:-translate-y-1/2',
        'sm:w-full sm:max-w-lg sm:rounded-2xl sm:border sm:p-6',
        'sm:max-h-[88dvh]',
        // Animations
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        // Mobile: slide up from bottom
        'data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-bottom-4',
        // Desktop: zoom
        'sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95',
        'sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%]',
        'sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]',
        className
      )}
      {...props}
    >
      {/* Drag handle visible only on mobile */}
      <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
        <div className="h-1 w-10 rounded-full bg-border" aria-hidden="true" />
      </div>
      {/* Content wrapper with mobile padding */}
      <div className="px-4 pb-6 sm:p-0">
        {children}
      </div>
      <DialogPrimitive.Close className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-md opacity-70 ring-offset-background transition-all hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none p-1.5 hover:bg-muted active:scale-95">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-1 text-left pt-1 sm:pt-0',
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2 pt-3 border-t border-border mt-2',
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-base font-semibold leading-snug tracking-tight text-foreground',
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-xs text-muted-foreground mt-0.5', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
