import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { SERVER_URL } from "../lib/config";

const isBrowser = typeof window !== "undefined";

const isNetworkError = (error) =>
  !error?.response &&
  (error?.code === "ERR_NETWORK" ||
    error?.message === "Network Error" ||
    (isBrowser && navigator.onLine === false));

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  isOffline: isBrowser ? !navigator.onLine : false,
  socket: null,
  onlineUsers: [],
  isUserOnline: (userId) => get().onlineUsers.includes(String(userId)),
  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({
        authUser: res.data.user,
        isCheckingAuth: false,
        isOffline: false,
      });
      get().connectSocket();
    } catch (error) {
      if (isNetworkError(error)) {
        set({ isCheckingAuth: false, isOffline: true });
        return;
      }

      set({ authUser: null, isCheckingAuth: false, isOffline: false });
      get().disconnectSocket();
    }
  },
  signup: async (formData) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", formData);
      set({ authUser: res.data.user || res.data, isSigningUp: false });
      get().connectSocket();
    } catch (err) {
      set({ isSigningUp: false });
      throw new Error(err.response?.data?.message || "Failed to create account");
    }
  },
  login: async (formData) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/signin", formData);
      set({ authUser: res.data.user || res.data, isLoggingIn: false });
      get().connectSocket();
    } catch (err) {
      set({ isLoggingIn: false });
      throw new Error(err.response?.data?.message || "Failed to login");
    }
  },
  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      get().disconnectSocket();
      set({ authUser: null, onlineUsers: [] });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data.user || res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("error in update profile:", error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser, socket: existingSocket } = get();
    if (!authUser) return;

    const existingSocketUserId = existingSocket?.io?.opts?.query?.userId;

    if (
      existingSocket &&
      String(existingSocketUserId) === String(authUser._id)
    ) {
      if (!existingSocket.connected) {
        existingSocket.connect();
      }

      return;
    }

    if (existingSocket) {
      existingSocket.removeAllListeners();
      existingSocket.disconnect();
    }

    const socket = io(SERVER_URL, {
      autoConnect: false,
      withCredentials: true,
      query: {
        userId: authUser._id,
      },
    });

    set({ socket, onlineUsers: [] });

    socket.on("connect", () => {
      if (get().socket !== socket) return;

      set({ isOffline: false });
    });

    socket.on("getOnlineUsers", (userIds) => {
      if (get().socket !== socket) return;

      set({ onlineUsers: [...new Set(userIds.map(String))] });
    });

    socket.on("connect_error", (error) => {
      if (get().socket !== socket || !isNetworkError(error)) return;

      set({ isOffline: true });
    });

    socket.on("disconnect", () => {
      if (get().socket !== socket) return;

      set({
        onlineUsers: [],
        isOffline: isBrowser ? !navigator.onLine : false,
      });
    });

    socket.connect();
  },
  handleBrowserOffline: () => {
    set({ isOffline: true, onlineUsers: [] });
  },
  handleBrowserOnline: () => {
    set({ isOffline: false });

    const { authUser, socket } = get();

    if (socket) {
      socket.connect();
      return;
    }

    if (authUser) {
      get().connectSocket();
      return;
    }

    get().checkAuth();
  },
  disconnectSocket: () => {
    const socket = get().socket;
    socket?.removeAllListeners();
    socket?.disconnect();
    set({ socket: null, onlineUsers: [] });
  },
}));
