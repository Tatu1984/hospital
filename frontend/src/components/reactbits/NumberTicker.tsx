import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useRef } from 'react';

/**
 * Counts up from 0 to `value` once the component scrolls into view. Used for
 * stat blocks ("12,000 patients treated", "98% satisfaction").
 */
export function NumberTicker({
  value,
  duration = 1.6,
  className,
  decimals = 0,
  prefix = '',
  suffix = '',
}: {
  value: number;
  duration?: number;
  className?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (n) => {
    const v = Number(n).toFixed(decimals);
    // Indian-style grouping (1,00,000) reads more naturally for a hospital
    // marketing site in Bengal than US-style 100,000.
    const [intPart, decPart] = v.split('.');
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
    return `${prefix}${grouped}${decPart ? '.' + decPart : ''}${suffix}`;
  });

  useEffect(() => {
    if (!inView) return;
    const controls = animate(motionValue, value, { duration, ease: 'easeOut' });
    return () => controls.stop();
  }, [inView, motionValue, value, duration]);

  return <motion.span ref={ref} className={className}>{rounded}</motion.span>;
}
