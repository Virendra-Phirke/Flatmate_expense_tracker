import React from 'react';
import { cn } from '@/lib/utils';

interface ShineBorderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'> {
  borderRadius?: number;
  borderWidth?: number;
  duration?: number;
  color?: string[];
  className?: string;
  children: React.ReactNode;
}

export function ShineBorder({
  borderRadius = 16,
  borderWidth = 1.5,
  duration = 8,
  color = ['#06b6d4', '#10b981', '#8b5cf6'],
  className,
  children,
  ...props
}: ShineBorderProps) {
  const gradientString = color.join(', ');

  return (
    <div
      style={{
        borderRadius: `${borderRadius}px`,
      }}
      className={cn(
        'relative isolate overflow-hidden rounded-2xl border border-border/80 bg-card/60 p-[1px]',
        className
      )}
      {...props}
    >
      {/* Animated Shine Mask Background */}
      <div
        style={{
          background: `conic-gradient(from 0deg at 50% 50%, ${gradientString}, ${color[0]})`,
          animationDuration: `${duration}s`,
        }}
        className="pointer-events-none absolute -inset-[100%] animate-[spin_8s_linear_infinite] opacity-40 blur-xs"
      />
      {/* Content wrapper */}
      <div
        style={{
          borderRadius: `${Math.max(0, borderRadius - borderWidth)}px`,
        }}
        className="relative h-full w-full rounded-2xl bg-card/90 backdrop-blur-md"
      >
        {children}
      </div>
    </div>
  );
}
