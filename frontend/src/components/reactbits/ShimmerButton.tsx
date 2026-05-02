import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Shimmering CTA button — the "primary" call-to-action style cribbed from
 * reactbits.dev / magicui. Use sparingly: one per fold.
 */
export const ShimmerButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => (
    <button
      ref={ref}
      {...props}
      className={cn(
        'group relative inline-flex h-12 items-center justify-center overflow-hidden',
        'rounded-xl bg-slate-900 px-8 font-medium text-white',
        'transition-transform active:scale-[0.98]',
        'shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_40px_rgb(15,23,42,0.35)]',
        className,
      )}
    >
      {/* Shimmer sweep */}
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
      </span>
    </button>
  ),
);
ShimmerButton.displayName = 'ShimmerButton';
