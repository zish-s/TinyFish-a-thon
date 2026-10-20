/**
 * Hand-drawn doodles.
 *
 * Everything here is an inline SVG with slightly wobbly paths and round caps,
 * so it reads as a doodle rather than an icon. They are decorative, so they
 * are hidden from screen readers.
 */

type Props = { className?: string };

const base = 'shrink-0';

export function Squiggle({ className = '' }: Props) {
  return (
    <svg viewBox="0 0 120 14" className={`${base} ${className}`} aria-hidden="true" fill="none">
      <path
        d="M2 8c10-9 20 9 30 0s20 9 30 0 20 9 30 0 18 6 26 0"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Star({ className = '' }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} aria-hidden="true" fill="none">
      <path
        d="M12 2.6c.6 4.6 2 6 6.6 6.6-4.6.6-6 2-6.6 6.6-.6-4.6-2-6-6.6-6.6C10 8.6 11.4 7.2 12 2.6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Sparkles({ className = '' }: Props) {
  return (
    <svg viewBox="0 0 40 24" className={`${base} ${className}`} aria-hidden="true" fill="none">
      <path
        d="M8 3.5c.5 4 1.5 5 5.5 5.5-4 .5-5 1.5-5.5 5.5C7.5 10.5 6.5 9.5 2.5 9 6.5 8.5 7.5 7.5 8 3.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M28 9c.4 3 1.2 3.8 4.2 4.2-3 .4-3.8 1.2-4.2 4.2-.4-3-1.2-3.8-4.2-4.2 3-.4 3.8-1.2 4.2-4.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowCurve({ className = '' }: Props) {
  return (
    <svg viewBox="0 0 70 34" className={`${base} ${className}`} aria-hidden="true" fill="none">
      <path
        d="M3 5c18-2 34 4 38 16 2 6 0 9-4 9-3 0-5-2-4-4"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M28 24c2 3 5 4 9 3"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Underline({ className = '' }: Props) {
  return (
    <svg viewBox="0 0 160 12" className={`${base} ${className}`} aria-hidden="true" fill="none" preserveAspectRatio="none">
      <path
        d="M4 8c28-5 52 3 76-1s50 1 76-3"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CircleScribble({ className = '' }: Props) {
  return (
    <svg viewBox="0 0 120 40" className={`${base} ${className}`} aria-hidden="true" fill="none">
      <path
        d="M58 6c26-2 50 6 54 16 4 11-20 16-48 14-28-2-56-6-56-15 0-8 24-13 50-13"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Shield({ className = '' }: Props) {
  return (
    <svg viewBox="0 0 24 26" className={`${base} ${className}`} aria-hidden="true" fill="none">
      <path
        d="M12 2.4c3 2 6 2.8 8.6 3 0 9-3 14.4-8.6 18.2C6.4 19.8 3.4 14.4 3.4 5.4c2.6-.2 5.6-1 8.6-3Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path d="M8.6 12.4c1.2 1.4 2.2 2.2 3.4 2.2s2.2-.8 3.4-2.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function Net({ className = '' }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} aria-hidden="true" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M3 12h18M12 3c2.6 2.6 4 5.6 4 9s-1.4 6.4-4 9c-2.6-2.6-4-5.6-4-9s1.4-6.4 4-9Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}
