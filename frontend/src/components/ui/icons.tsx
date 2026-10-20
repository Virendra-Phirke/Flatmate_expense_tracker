import React from 'react';
import { cn } from '@/lib/utils';

export interface IconProps extends React.HTMLAttributes<HTMLElement> {
  size?: number | string;
  className?: string;
}

/**
 * Factory to create Flaticon UIcon components from flaticon.com
 */
export function createFlaticon(glyph: string) {
  const Component = React.forwardRef<HTMLElement, IconProps>(({ className, size, style, ...props }, ref) => {
    const iconName = glyph.startsWith('fi-') ? glyph : `fi-rr-${glyph}`;
    const customStyle: React.CSSProperties = {
      ...style,
      ...(size ? { fontSize: typeof size === 'number' ? `${size}px` : size, width: size, height: size } : {}),
    };

    return (
      <i
        ref={ref as any}
        aria-hidden="true"
        className={cn('fi shrink-0 leading-none inline-flex items-center justify-center select-none', iconName, className)}
        style={customStyle}
        {...props}
      />
    );
  });

  Component.displayName = `Flaticon(${glyph})`;
  return Component;
}

/**
 * Universal Flaticon Component (supports any glyph name from https://www.flaticon.com/uicons)
 */
export const Flaticon = React.forwardRef<HTMLElement, IconProps & { name: string }>(
  ({ name, className, size, style, ...props }, ref) => {
    const iconName = name.startsWith('fi-') ? name : `fi-rr-${name}`;
    const customStyle: React.CSSProperties = {
      ...style,
      ...(size ? { fontSize: typeof size === 'number' ? `${size}px` : size, width: size, height: size } : {}),
    };

    return (
      <i
        ref={ref as any}
        aria-hidden="true"
        className={cn('fi shrink-0 leading-none inline-flex items-center justify-center select-none', iconName, className)}
        style={customStyle}
        {...props}
      />
    );
  }
);
Flaticon.displayName = 'Flaticon';

// ── Drop-in replacement Flaticon icon components ───────────────────────────────
export const Home = createFlaticon('home');
export const LayoutDashboard = createFlaticon('apps');
export const Receipt = createFlaticon('receipt');
export const ShoppingBag = createFlaticon('shopping-bag');
export const Gift = createFlaticon('gift');
export const Users = createFlaticon('users');
export const Scale = createFlaticon('scale');
export const ArrowRightLeft = createFlaticon('arrows-repeat');
export const User = createFlaticon('user');
export const UserCircle = createFlaticon('circle-user');
export const Mic = createFlaticon('microphone');
export const MicOff = createFlaticon('microphone-slash');
export const LogOut = createFlaticon('sign-out-alt');
export const X = createFlaticon('cross-small');
export const CreditCard = createFlaticon('credit-card');
export const MoreHorizontal = createFlaticon('menu-dots');
export const ChevronLeft = createFlaticon('angle-small-left');
export const ChevronRight = createFlaticon('angle-small-right');
export const ChevronDown = createFlaticon('angle-small-down');
export const ChevronUp = createFlaticon('angle-small-up');
export const Filter = createFlaticon('filter');
export const Check = createFlaticon('check');
export const CheckCircle = createFlaticon('check-circle');
export const CheckCircle2 = createFlaticon('check-circle');
export const AlertCircle = createFlaticon('exclamation');
export const Loader2 = createFlaticon('spinner');
export const RefreshCw = createFlaticon('refresh');
export const Volume2 = createFlaticon('volume');
export const Calendar = createFlaticon('calendar');
export const Tag = createFlaticon('label');
export const ArrowRight = createFlaticon('arrow-right');
export const ArrowUpRight = createFlaticon('arrow-up-right');
export const ArrowDownLeft = createFlaticon('arrow-down-left');
export const Plus = createFlaticon('plus');
export const Trash2 = createFlaticon('trash');
export const Wallet = createFlaticon('wallet');
export const Clock = createFlaticon('clock');
export const Eye = createFlaticon('eye');
export const EyeOff = createFlaticon('eye-crossed');
export const Shield = createFlaticon('shield');
export const ShieldCheck = createFlaticon('shield-check');
export const Lock = createFlaticon('lock');
export const Key = createFlaticon('key');
export const QrCode = createFlaticon('qrcode');
export const XCircle = createFlaticon('cross-circle');
export const ExternalLink = createFlaticon('share');
export const Sparkles = createFlaticon('sparkles');
export const Search = createFlaticon('search');
export const Copy = createFlaticon('copy');
export const Palette = createFlaticon('palette');
export const Sun = createFlaticon('sun');
export const Moon = createFlaticon('moon');
export const Cloud = createFlaticon('cloud');
export const CloudOff = createFlaticon('cloud-disabled');
export const ChartPie = createFlaticon('chart-pie');
export const ChartHistogram = createFlaticon('chart-histogram');
export const ChartLine = createFlaticon('chart-line-up');
export const Layers = createFlaticon('layers');
export const Grid = createFlaticon('grid');
export const TrendingUp = createFlaticon('arrow-trend-up');
export const Download = createFlaticon('download');
export const Fingerprint = createFlaticon('fingerprint');
export const MessageSquare = createFlaticon('comment-alt');
export const Target = createFlaticon('target');
export const Printer = createFlaticon('print');
export const Share2 = createFlaticon('share');
export const ArrowLeft = createFlaticon('arrow-left');
export const FileText = createFlaticon('document');
export const UserCheck = createFlaticon('user-check');
export const Database = createFlaticon('database');
export const AlertTriangle = createFlaticon('triangle-warning');
export const HelpCircle = createFlaticon('interrogation');
export const Cpu = createFlaticon('microchip');
export const Server = createFlaticon('server');
export const FileSpreadsheet = createFlaticon('file-spreadsheet');
export const Terminal = createFlaticon('terminal');

