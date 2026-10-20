import React, { useId } from 'react';

interface AppLogoProps {
  className?: string;
  size?: number | string;
  withBackground?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className = '',
  size = 36,
  withBackground = true,
}) => {
  const rawId = useId();
  // Sanitize id for SVG element references (replace colons from useId)
  const id = rawId.replace(/[^a-zA-Z0-9-_]/g, '_');
  const bgGradId = `appLogoBg_${id}`;
  const tealGradId = `appLogoTeal_${id}`;
  const rupeeGradId = `appLogoRupee_${id}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`shrink-0 select-none ${className}`}
      aria-label="Flat Expenses Logo"
    >
      <defs>
        <linearGradient id={bgGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#060913" />
        </linearGradient>
        <linearGradient id={tealGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
        <linearGradient id={rupeeGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>

      {/* Squircle backdrop */}
      {withBackground && (
        <>
          <rect width="100" height="100" rx="24" fill={`url(#${bgGradId})`} />
          <rect
            x="2.5"
            y="2.5"
            width="95"
            height="95"
            rx="21.5"
            fill="none"
            stroke={`url(#${tealGradId})`}
            strokeWidth="1.5"
            strokeOpacity="0.35"
          />
        </>
      )}

      {/* Chimney */}
      <path
        d="M66 36 V24 H75 V42"
        fill="none"
        stroke={`url(#${tealGradId})`}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* House Outline (Option 1 Ledger House) */}
      <path
        d="M17 48 L50 21 L83 48 V80 C83 81.7 81.7 83 80 83 H20 C18.3 83 17 81.7 17 80 Z"
        fill="none"
        stroke={`url(#${tealGradId})`}
        strokeWidth="4.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Indian Rupee (₹) Symbol */}
      <line
        x1="35"
        y1="42"
        x2="59"
        y2="42"
        stroke={`url(#${rupeeGradId})`}
        strokeWidth="4.4"
        strokeLinecap="round"
      />
      <line
        x1="35"
        y1="50"
        x2="57"
        y2="50"
        stroke={`url(#${rupeeGradId})`}
        strokeWidth="4.4"
        strokeLinecap="round"
      />
      <path
        d="M43 42 V58 C50.5 58 56 54.5 56 49.5 C56 44.5 50.5 42 43 42"
        fill="none"
        stroke={`url(#${rupeeGradId})`}
        strokeWidth="4.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="43"
        y1="58"
        x2="60"
        y2="75"
        stroke={`url(#${rupeeGradId})`}
        strokeWidth="4.6"
        strokeLinecap="round"
      />

      {/* Equal-Split Ledger Balance Indicators */}
      <line
        x1="65"
        y1="59"
        x2="76"
        y2="59"
        stroke="#2dd4bf"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <line
        x1="65"
        y1="66"
        x2="76"
        y2="66"
        stroke="#2dd4bf"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  );
};
