"use client";

import { cn } from "@/lib/utils";

interface CategoryPillProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export function CategoryPill({ label, isActive, onClick }: CategoryPillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all",
        isActive
          ? "bg-text-primary text-surface shadow-sm"
          : "bg-surface-secondary text-text-secondary"
      )}
    >
      {label}
    </button>
  );
}
