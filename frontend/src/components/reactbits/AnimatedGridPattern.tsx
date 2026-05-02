import { useEffect, useId, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Decorative animated grid background — random cells light up and fade out,
 * giving "the system is breathing" feel without being distracting. Direct
 * port of the reactbits.dev / magicui AnimatedGridPattern.
 *
 * Use as an absolute-positioned background inside a relative parent:
 *   <div className="relative">
 *     <AnimatedGridPattern className="absolute inset-0" />
 *     ...content...
 *   </div>
 */
export function AnimatedGridPattern({
  width = 40,
  height = 40,
  numSquares = 30,
  maxOpacity = 0.4,
  duration = 4,
  className,
}: {
  width?: number;
  height?: number;
  numSquares?: number;
  maxOpacity?: number;
  duration?: number;
  className?: string;
}) {
  const id = useId();
  const [dim, setDim] = useState({ w: 0, h: 0 });
  const [squares, setSquares] = useState<Array<{ id: number; pos: [number, number] }>>([]);

  useEffect(() => {
    const onResize = () => setDim({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!dim.w || !dim.h) return;
    const cols = Math.ceil(dim.w / width);
    const rows = Math.ceil(dim.h / height);
    const fresh = Array.from({ length: numSquares }, (_, i) => ({
      id: i,
      pos: [Math.floor(Math.random() * cols), Math.floor(Math.random() * rows)] as [number, number],
    }));
    setSquares(fresh);
  }, [dim, width, height, numSquares]);

  return (
    <svg
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 h-full w-full fill-slate-300/30 stroke-slate-300/30', className)}
    >
      <defs>
        <pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse" x={-1} y={-1}>
          <path d={`M.5 ${height}V.5H${width}`} fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
      <svg x={0} y={0} className="overflow-visible">
        {squares.map(({ id: sId, pos: [x, y] }, idx) => (
          <motion.rect
            key={sId}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, maxOpacity, 0] }}
            transition={{
              duration,
              repeat: Infinity,
              delay: idx * 0.1,
              repeatDelay: Math.random() * 2 + 1,
            }}
            width={width - 1}
            height={height - 1}
            x={x * width + 1}
            y={y * height + 1}
            fill="currentColor"
            strokeWidth={0}
          />
        ))}
      </svg>
    </svg>
  );
}
