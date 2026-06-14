import { cn } from '../../lib/utils';
import type { HTMLAttributes } from 'react';

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
}

export function Progress({ className, value = 0, ...props }: ProgressProps) {
  const clamped = Math.min(Math.max(value, 0), 100);

  return (
    <div
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-secondary',
        className
      )}
      {...props}
    >
      <div
        className="h-full w-full flex-1 bg-primary transition-all duration-300 rounded-full"
        style={{ transform: `translateX(-${100 - clamped}%)` }}
      />
    </div>
  );
}
