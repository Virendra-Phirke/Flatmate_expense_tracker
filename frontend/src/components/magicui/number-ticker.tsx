import React, { useEffect, useState } from 'react';
import { formatPaise } from '@/lib/utils';

interface NumberTickerProps {
  value: number; // in paise
  durationMs?: number;
  className?: string;
  isCurrency?: boolean;
}

export function NumberTicker({
  value,
  durationMs = 600,
  className = '',
  isCurrency = true,
}: NumberTickerProps) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = displayValue;
    const endValue = value;

    if (startValue === endValue) return;

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / durationMs, 1);

      // Ease-out cubic formula
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (endValue - startValue) * easeProgress);

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value, durationMs]);

  const formatted = isCurrency
    ? formatPaise(displayValue)
    : displayValue.toLocaleString('en-IN');

  const fullText = isCurrency ? formatPaise(value) : value.toString();

  return (
    <span
      className={className}
      aria-label={fullText}
      role="text"
    >
      {formatted}
    </span>
  );
}
