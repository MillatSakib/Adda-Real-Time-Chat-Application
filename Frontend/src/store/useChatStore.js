import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

let typingFeedbackTimeout = null;

const clearTypingFeedbackTimeout = () => {
  if (typingFeedbackTimeout) {
    clearTimeout(typingFeedbackTimeout);
    typingFeedbackTimeout = null;
  }
};

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  typingFeedback: null,
  viewerFeedback: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    clearTypingFeedbackTimeout();
    set({
      isMessagesLoading: true,
      typingFeedback: null,
      viewerFeedback: null,
    });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData,
      );
      clearTypingFeedbackTimeout();
      set({
        messages: [...messages, res.data],
        typingFeedback: null,
      });
      return res.data;
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to send message";
      toast.error(message);
      throw new Error(message);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.off("typing:update");
    socket.off("chat:view");

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser =
        String(newMessage.senderId) === String(selectedUser._id);
      if (!isMessageSentFromSelectedUser) return;

      clearTypingFeedbackTimeout();
      set({
        messages: [...get().messages, newMessage],
        typingFeedback: null,
      });
    });

    socket.on("typing:update", ({ from, feedback, isTyping }) => {
      const activeUser = get().selectedUser;
      if (!activeUser || String(from) !== String(activeUser._id)) return;

      clearTypingFeedbackTimeout();

      if (!isTyping || !feedback) {
        set({ typingFeedback: null });
        return;
      }

      set({ typingFeedback: feedback });

      typingFeedbackTimeout = setTimeout(() => {
        set({ typingFeedback: null });
        typingFeedbackTimeout = null;
      }, 1800);
    });

    socket.on("chat:view", ({ from, feedback, isViewing }) => {
      const activeUser = get().selectedUser;
      if (!activeUser || String(from) !== String(activeUser._id)) return;

      set({
        viewerFeedback: isViewing && feedback ? feedback : null,
      });
    });
  },

  sendTypingFeedback: (userId, feedback) => {
    const socket = useAuthStore.getState().socket;
    if (!socket || !userId || !feedback) return;

    socket.emit("typing:update", {
      to: userId,
      feedback,
      isTyping: true,
    });
  },

  stopTypingFeedback: (userId) => {
    const socket = useAuthStore.getState().socket;
    if (!socket || !userId) return;

    socket.emit("typing:update", {
      to: userId,
      isTyping: false,
    });
  },

  sendViewerFeedback: (userId, feedback) => {
    const socket = useAuthStore.getState().socket;
    if (!socket || !userId || !feedback) return;

    socket.emit("chat:view", {
      to: userId,
      feedback,
      isViewing: true,
    });
  },

  stopViewerFeedback: (userId) => {
    const socket = useAuthStore.getState().socket;
    if (!socket || !userId) return;

    socket.emit("chat:view", {
      to: userId,
      isViewing: false,
    });
  },

  unsubscribeFromMessages: () => {
    clearTypingFeedbackTimeout();
    set({ typingFeedback: null, viewerFeedback: null });

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.off("typing:update");
    socket.off("chat:view");
  },

  setSelectedUser: (selectedUser) => {
    clearTypingFeedbackTimeout();
    set({
      selectedUser,
      typingFeedback: null,
      viewerFeedback: null,
    });
  },
}));
