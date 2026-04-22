import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set, get) => ({
      token:    null,
      user:     null,
      balance:  0,
      onlineCount: 0,
      notifications: [],
      activityFeed: [],

      setAuth: (token, user) => set({ token, user, balance: parseFloat(user.balance) }),
      setBalance: (balance) => set({ balance }),
      adjustBalance: (delta) => set(s => ({ balance: s.balance + delta })),
      setOnline: (count) => set({ onlineCount: count }),

      addNotification: (n) => set(s => ({ notifications: [n, ...s.notifications].slice(0, 50) })),
      markNotificationsRead: () => set(s => ({
        notifications: s.notifications.map(n => ({ ...n, read: true }))
      })),

      prependActivity: (item) => set(s => ({ activityFeed: [item, ...s.activityFeed].slice(0, 100) })),

      logout: () => {
        set({ token: null, user: null, balance: 0, notifications: [], activityFeed: [] });
      },
    }),
    { name: 'nftsea-auth', partialize: s => ({ token: s.token, user: s.user }) }
  )
);
