export const spring = {
  snappy: { type: "spring" as const, stiffness: 300, damping: 30 },
  sheet: { type: "spring" as const, stiffness: 400, damping: 35 },
  micro: { type: "spring" as const, stiffness: 500, damping: 25 },
  gentle: { type: "spring" as const, stiffness: 200, damping: 25 },
};

export const counter = {
  duration: 0.4,
  ease: [0.25, 0.1, 0.25, 1] as const,
};

export const stagger = {
  container: {
    initial: {},
    animate: {
      transition: { staggerChildren: 0.03 },
    },
  },
  item: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
  },
};
