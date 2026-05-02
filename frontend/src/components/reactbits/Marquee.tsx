import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Horizontal scrolling marquee. Pure CSS — no framer dep needed for the
 * loop. Used for testimonials and partner logos. Pauses on hover.
 *
 * Mirrors the shape of reactbits.dev's "Marquee" component.
 */
export function Marquee({
  children,
  className,
  reverse = false,
  pauseOnHover = true,
  speedSec = 40,
}: {
  children: ReactNode;
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  speedSec?: number;
}) {
  return (
    <div
      className={cn(
        'group flex overflow-hidden [--gap:1.5rem] gap-[--gap]',
        className,
      )}
      style={{ ['--duration' as any]: `${speedSec}s` }}
    >
      {Array.from({ length: 2 }).map((_, idx) => (
        <div
          key={idx}
          className={cn(
            'flex shrink-0 justify-around gap-[--gap]',
            'animate-marquee',
            reverse && '[animation-direction:reverse]',
            pauseOnHover && 'group-hover:[animation-play-state:paused]',
          )}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
