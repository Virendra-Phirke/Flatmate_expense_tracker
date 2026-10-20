import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number;
  withBackground?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className = '',
  size = 36,
  withBackground = true,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 192 192"
      width={size}
      height={size}
      className={`shrink-0 select-none ${className}`}
      aria-label="Flat Expenses Logo"
    >
      <defs>
        <linearGradient id="appLogoBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#090d16" />
        </linearGradient>
        <linearGradient id="appLogoTeal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#22d3ee" />
          <stop offset="100%" stop-color="#0d9488" />
        </linearGradient>
        <linearGradient id="appLogoRupee" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#14b8a6" />
        </linearGradient>
      </defs>

      {/* Optional squircle backdrop */}
      {withBackground && (
        <>
          <rect width="192" height="192" rx="44" fill="url(#appLogoBg)" />
          <rect
            x="5"
            y="5"
            width="182"
            height="182"
            rx="39"
            fill="none"
            stroke="url(#appLogoTeal)"
            strokeWidth="2.5"
            strokeOpacity="0.4"
          />
        </>
      )}

      {/* Chimney */}
      <path
        d="M128 70 V48 H144 V82"
        fill="none"
        stroke="url(#appLogoTeal)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* House Outline (Option 1 Ledger House) */}
      <path
        d="M36 94 L96 44 L156 94 V152 C156 155.3 153.3 158 150 158 H42 C38.7 158 36 155.3 36 152 Z"
        fill="none"
        stroke="url(#appLogoTeal)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Indian Rupee (₹) Symbol */}
      <line
        x1="70"
        y1="80"
        x2="114"
        y2="80"
        stroke="url(#appLogoRupee)"
        strokeWidth="8.5"
        strokeLinecap="round"
      />
      <line
        x1="70"
        y1="96"
        x2="110"
        y2="96"
        stroke="url(#appLogoRupee)"
        strokeWidth="8.5"
        strokeLinecap="round"
      />
      <path
        d="M85 80 V110 C99 110 109 104 109 95 C109 86 99 80 85 80"
        fill="none"
        stroke="url(#appLogoRupee)"
        strokeWidth="8.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="85"
        y1="110"
        x2="116"
        y2="142"
        stroke="url(#appLogoRupee)"
        strokeWidth="9"
        strokeLinecap="round"
      />

      {/* Equal-Split Ledger Balance Indicators */}
      <line
        x1="126"
        y1="114"
        x2="144"
        y2="114"
        stroke="#2dd4bf"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <line
        x1="126"
        y1="126"
        x2="144"
        y2="126"
        stroke="#2dd4bf"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
    </svg>
  );
};
