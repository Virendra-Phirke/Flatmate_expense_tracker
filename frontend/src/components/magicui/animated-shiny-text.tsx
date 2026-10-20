import React from 'react';
import { cn } from '@/lib/utils';

export interface AnimatedShinyTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  shimmerWidth?: number;
}

export function AnimatedShinyText({
  children,
  className,
  shimmerWidth = 100,
  ...props
}: AnimatedShinyTextProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center bg-clip-text text-transparent',
        'bg-gradient-to-r from-muted-foreground via-foreground to-muted-foreground',
        'bg-[length:200%_100%] animate-shimmer',
        className
      )}
      style={{
        backgroundSize: `${shimmerWidth * 2}% 100%`,
      }}
      {...props}
    >
      {children}
    </span>
  );
}
