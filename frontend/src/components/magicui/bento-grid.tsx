import React from 'react';
import { cn } from '@/lib/utils';

export function BentoGrid({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'grid w-full auto-rows-[16rem] grid-cols-1 md:grid-cols-3 gap-4',
        className
      )}
    >
      {children}
    </div>
  );
}

export function BentoCard({
  className,
  children,
  header,
  icon: Icon,
  title,
  description,
  cta,
}: {
  className?: string;
  children?: React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ComponentType<any>;
  title?: string;
  description?: string;
  cta?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card/60 p-5 shadow-xs backdrop-blur-xs transition-all duration-300 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5',
        className
      )}
    >
      {/* Background/header visual */}
      {header && <div className="w-full flex-1 min-h-0 overflow-hidden">{header}</div>}

      {/* Content */}
      <div className="z-10 mt-auto pt-3">
        {Icon && (
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
            <Icon className="h-4 w-4" />
          </div>
        )}
        {title && <h3 className="text-sm font-bold text-foreground tracking-tight">{title}</h3>}
        {description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>}
        {cta && <div className="mt-3">{cta}</div>}
      </div>

      {children}
    </div>
  );
}
