import { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Marquee({
  children,
  className,
  reverse = false,
  pauseOnHover = true,
  speedSec = 40,
  gap = '1.5rem',
}: {
  children: ReactNode;
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  speedSec?: number;
  gap?: string;
}) {
  return (
    <div
      className={cn('group flex overflow-hidden', className)}
      style={{
        '--marquee-duration': `${speedSec}s`,
        '--marquee-gap': gap,
        gap,
      } as CSSProperties}
    >
      {Array.from({ length: 2 }).map((_, idx) => (
        <div
          key={idx}
          className={cn(
            'flex shrink-0',
            reverse ? 'animate-marquee-reverse' : 'animate-marquee',
            pauseOnHover && 'pause-on-hover',
          )}
          style={{ gap } as CSSProperties}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
