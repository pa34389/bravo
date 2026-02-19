"use client";

import { useEffect, useState, useCallback } from "react";
import { Undo2 } from "lucide-react";
import type { WatchlistItem } from "@/hooks/use-my-list";

interface UndoToastProps {
  item: WatchlistItem | null;
  onUndo: (item: WatchlistItem) => void;
  onDismiss: () => void;
}

export function UndoToast({ item, onUndo, onDismiss }: UndoToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!item) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [item, onDismiss]);

  const handleUndo = useCallback(() => {
    if (item) {
      onUndo(item);
      setVisible(false);
      setTimeout(onDismiss, 300);
    }
  }, [item, onUndo, onDismiss]);

  if (!item) return null;

  return (
    <div
      className={`fixed bottom-[calc(var(--nav-height)+var(--safe-bottom)+48px)] left-0 right-0 z-50 flex justify-center px-4 transition-all duration-300 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface-raised border border-separator shadow-lg max-w-sm w-full">
        <p className="text-sm text-text-primary truncate flex-1">
          <span className="font-medium">{item.name}</span>
          <span className="text-text-secondary"> removed</span>
        </p>
        <button
          onClick={handleUndo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand/10 text-brand text-sm font-semibold whitespace-nowrap"
        >
          <Undo2 size={14} strokeWidth={2.5} />
          Undo
        </button>
      </div>
    </div>
  );
}
