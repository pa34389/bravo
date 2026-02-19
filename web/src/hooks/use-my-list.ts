"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WatchlistItem {
  productId: string;
  store: "woolworths" | "coles";
  name: string;
  addedAt: string;
}

interface WatchlistState {
  items: WatchlistItem[];
  addItem: (item: Omit<WatchlistItem, "addedAt">) => void;
  removeItem: (store: string, productId: string) => void;
  toggleItem: (item: Omit<WatchlistItem, "addedAt">) => void;
  hasItem: (store: string, productId: string) => boolean;
  clear: () => void;
}

export const useWatchlist = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const exists = state.items.some(
            (i) => i.store === item.store && i.productId === item.productId
          );
          if (exists) return state;
          return {
            items: [...state.items, { ...item, addedAt: new Date().toISOString() }],
          };
        }),
      removeItem: (store, productId) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.store === store && i.productId === productId)
          ),
        })),
      toggleItem: (item) => {
        const { items } = get();
        const exists = items.some(
          (i) => i.store === item.store && i.productId === item.productId
        );
        if (exists) {
          set({
            items: items.filter(
              (i) => !(i.store === item.store && i.productId === item.productId)
            ),
          });
        } else {
          set({
            items: [...items, { ...item, addedAt: new Date().toISOString() }],
          });
        }
      },
      hasItem: (store, productId) =>
        get().items.some((i) => i.store === store && i.productId === productId),
      clear: () => set({ items: [] }),
    }),
    { name: "bravo-watchlist" }
  )
);
