import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Word-by-word reveal headline. Adapted from reactbits.dev / aceternity-style
 * "split text" animations. Each word fades + rises into place with a small
 * cascade so the line reads naturally rather than popping in at once.
 *
 * Usage:
 *   <TextReveal>Care that listens. Healing that works.</TextReveal>
 */
export function TextReveal({
  children,
  className,
  delay = 0,
  staggerMs = 60,
}: {
  children: string;
  className?: string;
  delay?: number;
  staggerMs?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const words = children.split(' ');

  return (
    <span ref={ref} className={cn('inline-block', className)}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block"
          initial={{ opacity: 0, y: '0.3em' }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{
            duration: 0.5,
            delay: delay + (i * staggerMs) / 1000,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          {word}
          {i < words.length - 1 && ' '}
        </motion.span>
      ))}
    </span>
  );
}
