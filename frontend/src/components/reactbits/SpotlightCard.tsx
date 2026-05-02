import { ReactNode, useRef, MouseEvent } from 'react';
import { cn } from '@/lib/utils';

/**
 * Card with a soft mouse-following spotlight glow on hover. Reactbits/aceternity
 * pattern. Pure CSS variables + JS — no framer.
 */
export function SpotlightCard({
  children,
  className,
  spotlightColor = 'rgba(20, 184, 166, 0.15)', // teal/medical
}: {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition-shadow',
        'hover:shadow-xl',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(420px circle at var(--mx) var(--my), ${spotlightColor}, transparent 60%)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
