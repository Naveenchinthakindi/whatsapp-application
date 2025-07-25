import { create } from "zustand";
import { persist } from "zustand/middleware";

const useUserStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setUser: (userData) =>
        set({
          user: userData,
          isAuthenticated: true,
        }),

      clearUser: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "login-storage", // storage key
      getStorage: () => localStorage, // using localStorage for persistence
    }
  )
);

export default useUserStore;