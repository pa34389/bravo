"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SwipeToRemoveProps {
  children: ReactNode;
  onRemove: () => void;
}

export function SwipeToRemove({ children, onRemove }: SwipeToRemoveProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const threshold = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    currentX.current = e.touches[0].clientX;
    const diff = startX.current - currentX.current;
    if (diff > 0) {
      setOffset(Math.min(diff, 100));
    } else if (revealed) {
      setOffset(Math.max(100 + diff, 0));
    }
  };

  const handleTouchEnd = () => {
    if (offset >= threshold) {
      setRevealed(true);
      setOffset(100);
    } else {
      setRevealed(false);
      setOffset(0);
    }
  };

  const handleRemove = () => {
    setOffset(0);
    setRevealed(false);
    onRemove();
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Red remove button behind */}
      <div className="absolute inset-y-0 right-0 flex items-center">
        <button
          onClick={handleRemove}
          className={cn(
            "h-full flex items-center justify-center bg-red-500 text-white text-xs font-bold px-5 transition-opacity",
            offset > 20 ? "opacity-100" : "opacity-0"
          )}
          style={{ width: 100 }}
        >
          Remove
        </button>
      </div>

      {/* Swipeable content */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative transition-transform duration-150 ease-out"
        style={{ transform: `translateX(-${offset}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
