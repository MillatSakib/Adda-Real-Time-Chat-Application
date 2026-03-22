import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { playMessageNotificationSound } from "../lib/sound";

let typingFeedbackTimeout = null;

const buildUnreadCounts = (users) =>
  users.reduce((counts, user) => {
    counts[String(user._id)] = user.unreadCount || 0;
    return counts;
  }, {});

const clearUnreadCountForUser = (unreadCounts, userId) => {
  if (!userId) return unreadCounts;

  return {
    ...unreadCounts,
    [String(userId)]: 0,
  };
};

const incrementUnreadCountForUser = (unreadCounts, userId) => {
  const key = String(userId);

  return {
    ...unreadCounts,
    [key]: (unreadCounts[key] || 0) + 1,
  };
};

const clearTypingFeedbackTimeout = () => {
  if (typingFeedbackTimeout) {
    clearTimeout(typingFeedbackTimeout);
    typingFeedbackTimeout = null;
  }
};

const handleIncomingMessage = (newMessage, set, get) => {
  const activeUser = get().selectedUser;
  const authUserId = useAuthStore.getState().authUser?._id;
  const senderId = String(newMessage.senderId);
  const isIncomingMessage =
    authUserId &&
    String(newMessage.receiverId) === String(authUserId) &&
    senderId !== String(authUserId);

  if (isIncomingMessage) {
    playMessageNotificationSound();
  }

  if (!isIncomingMessage) {
    return;
  }

  if (activeUser && senderId === String(activeUser._id)) {
    clearTypingFeedbackTimeout();
    set((state) => ({
      messages: [...state.messages, newMessage],
      typingFeedback: null,
      unreadCounts: clearUnreadCountForUser(state.unreadCounts, senderId),
    }));
    get().markMessagesAsRead(senderId);
    return;
  }

  set((state) => ({
    unreadCounts: incrementUnreadCountForUser(state.unreadCounts, senderId),
  }));
};

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  unreadCounts: {},
  selectedUser: null,
  typingFeedback: null,
  viewerFeedback: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({
        users: res.data,
        unreadCounts: buildUnreadCounts(res.data),
      });
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
      set((state) => ({
        messages: res.data,
        unreadCounts: clearUnreadCountForUser(state.unreadCounts, userId),
      }));
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

  markMessagesAsRead: async (userId) => {
    if (!userId) return;

    set((state) => ({
      unreadCounts: clearUnreadCountForUser(state.unreadCounts, userId),
    }));

    try {
      await axiosInstance.patch(`/messages/read/${userId}`);
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  },

  initializeMessageHandlers: (socket) => {
    if (!socket) return;

    socket.off("newMessage");
    socket.off("typing:update");
    socket.off("chat:view");

    socket.on("newMessage", (newMessage) => {
      handleIncomingMessage(newMessage, set, get);
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

  cleanupMessageHandlers: (socket) => {
    clearTypingFeedbackTimeout();
    set({ typingFeedback: null, viewerFeedback: null });
    if (!socket) return;

    socket.off("newMessage");
    socket.off("typing:update");
    socket.off("chat:view");
  },

  setSelectedUser: (selectedUser) => {
    clearTypingFeedbackTimeout();
    set((state) => ({
      selectedUser,
      typingFeedback: null,
      viewerFeedback: null,
      unreadCounts: clearUnreadCountForUser(
        state.unreadCounts,
        selectedUser?._id,
      ),
    }));
  },
}));
