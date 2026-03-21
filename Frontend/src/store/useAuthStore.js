import { create } from "zustand";
import { axiosInstance } from "../lib/axios";

export const useAuthStore = create((set) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdsatingProfile: false,
  isCheckingAuth: true,
  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data.user, isCheckingAuth: false });
    } catch (err) {
      set({ authUser: null, isCheckingAuth: false });
    }
  },
  signup: async (formData) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", formData);
      set({ authUser: res.data.user, isSigningUp: false });
    } catch (err) {
      set({ isSigningUp: false });
      throw err;
    }
  },
  login: async (formData) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/signin", formData);
      set({ authUser: res.data.user, isLoggingIn: false });
    } catch (err) {
      set({ isLoggingIn: false });
      throw err;
    }
  },
  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  },
}));
