/**
 * Centralized motion variants for consistent animations across the app.
 * Using 'motion/react' (Framer Motion).
 */

export const TRANSITIONS = {
  default: { type: 'spring', damping: 20, stiffness: 100 },
  smooth: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  fast: { duration: 0.2, ease: 'easeOut' },
  stagger: {
    staggerChildren: 0.1,
    delayChildren: 0.05,
  }
};

export const FADE_UP = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const FADE_IN = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const STAGGER_CONTAINER = {
  initial: {},
  animate: {
    transition: TRANSITIONS.stagger,
  },
};

export const HOVER_SCALE = {
  hover: { scale: 1.02, transition: TRANSITIONS.fast },
  tap: { scale: 0.98 },
};

export const HOVER_GLOW = {
  hover: { 
    scale: 1.01, 
    boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    borderColor: "var(--primary-opacity-40)",
    transition: TRANSITIONS.fast 
  },
};

export const SLIDE_IN_RIGHT = {
  initial: { x: 20, opacity: 0 },
  animate: { x: 0, opacity: 1 },
};
