import { create } from "zustand";
import { persist } from "zustand/middleware"; 

const useLoginStore = create(
  persist(
    (set) => ({
      step: 1,
      userPhoneData: null,

      // Actions
      setStep: (step) => set({ step }),
      setUserPhoneData: (data) => set({ userPhoneData: data }),
      resetLoginState: () => set({ step: 1, userPhoneData: null }),
    }),
    {
      name: "login-storage",
      partialize: ({ step, userPhoneData }) => ({ step, userPhoneData }),
    }
  )
);

export default useLoginStore;
