import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { playMessageNotificationSound } from "../lib/sound";

let typingFeedbackTimeout = null;

const DIRECT_CHAT = "direct";
const GROUP_CHAT = "group";

const isGroupChat = (chat) => chat?.type === GROUP_CHAT;

const normalizeConversation = (conversation, fallbackType = DIRECT_CHAT) => {
  if (!conversation?._id) return null;

  return {
    ...conversation,
    _id: String(conversation._id),
    type: conversation.type || fallbackType,
    unreadCount: conversation.unreadCount || 0,
    members: Array.isArray(conversation.members)
      ? conversation.members.map((member) => ({
          ...member,
          _id: String(member._id),
        }))
      : [],
  };
};

const normalizeConversationList = (items, type) =>
  Array.isArray(items)
    ? items
        .map((item) => normalizeConversation(item, type))
        .filter(Boolean)
    : [];

const normalizeMessage = (message) => {
  const sender =
    message?.sender ||
    (message?.senderId && typeof message.senderId === "object"
      ? message.senderId
      : null);
  const senderId = sender?._id || message?.senderId || null;
  const receiver =
    message?.receiverId && typeof message.receiverId === "object"
      ? message.receiverId
      : null;
  const receiverId = receiver?._id || message?.receiverId || null;
  const group =
    message?.group ||
    (message?.groupId && typeof message.groupId === "object"
      ? message.groupId
      : null);
  const groupId = group?._id || message?.groupId || null;

  return {
    ...message,
    _id: String(message._id),
    sender: sender
      ? {
          ...sender,
          _id: String(sender._id),
        }
      : null,
    senderId: senderId ? String(senderId) : null,
    receiverId: receiverId ? String(receiverId) : null,
    group: group ? normalizeConversation(group, GROUP_CHAT) : null,
    groupId: groupId ? String(groupId) : null,
    readBy: Array.isArray(message.readBy)
      ? message.readBy.map((value) => String(value?._id || value))
      : [],
  };
};

const buildUnreadCounts = (users, groups) =>
  [...users, ...groups].reduce((counts, item) => {
    counts[String(item._id)] = item.unreadCount || 0;
    return counts;
  }, {});

const clearUnreadCount = (unreadCounts, conversationId) => {
  if (!conversationId) return unreadCounts;

  return {
    ...unreadCounts,
    [String(conversationId)]: 0,
  };
};

const incrementUnreadCount = (unreadCounts, conversationId) => {
  const key = String(conversationId);

  return {
    ...unreadCounts,
    [key]: (unreadCounts[key] || 0) + 1,
  };
};

const upsertConversation = (items, nextItem) => {
  const normalizedItem = normalizeConversation(nextItem, nextItem?.type);
  if (!normalizedItem) return items;

  const existingIndex = items.findIndex(
    (item) =>
      String(item._id) === String(normalizedItem._id) &&
      item.type === normalizedItem.type,
  );

  if (existingIndex === -1) {
    return [normalizedItem, ...items];
  }

  const updatedItems = [...items];
  updatedItems[existingIndex] = {
    ...updatedItems[existingIndex],
    ...normalizedItem,
  };

  return updatedItems;
};

const updateSelectedChat = (selectedChat, users, groups) => {
  if (!selectedChat?._id) return null;

  const source = isGroupChat(selectedChat) ? groups : users;
  const nextSelectedChat = source.find(
    (item) => String(item._id) === String(selectedChat._id),
  );

  return nextSelectedChat || selectedChat;
};

const clearTypingFeedbackTimeout = () => {
  if (typingFeedbackTimeout) {
    clearTimeout(typingFeedbackTimeout);
    typingFeedbackTimeout = null;
  }
};

const handleIncomingDirectMessage = (incomingMessage, set, get) => {
  const newMessage = normalizeMessage(incomingMessage);
  const activeChat = get().selectedChat;
  const authUserId = useAuthStore.getState().authUser?._id;
  const senderId = String(newMessage.senderId);
  const isIncomingMessage =
    authUserId &&
    String(newMessage.receiverId) === String(authUserId) &&
    senderId !== String(authUserId);

  if (!isIncomingMessage) return;

  playMessageNotificationSound();

  if (
    activeChat &&
    !isGroupChat(activeChat) &&
    senderId === String(activeChat._id)
  ) {
    clearTypingFeedbackTimeout();
    set((state) => ({
      messages: [...state.messages, newMessage],
      typingFeedback: null,
      unreadCounts: clearUnreadCount(state.unreadCounts, senderId),
    }));
    get().markMessagesAsRead(senderId);
    return;
  }

  set((state) => ({
    unreadCounts: incrementUnreadCount(state.unreadCounts, senderId),
  }));
};

const handleIncomingGroupMessage = (incomingMessage, set, get) => {
  const newMessage = normalizeMessage(incomingMessage);
  const activeChat = get().selectedChat;
  const authUserId = useAuthStore.getState().authUser?._id;

  if (!newMessage.groupId || String(newMessage.senderId) === String(authUserId)) {
    return;
  }

  playMessageNotificationSound();

  if (
    activeChat &&
    isGroupChat(activeChat) &&
    String(activeChat._id) === String(newMessage.groupId)
  ) {
    set((state) => ({
      messages: [...state.messages, newMessage],
      unreadCounts: clearUnreadCount(state.unreadCounts, newMessage.groupId),
    }));
    get().markGroupMessagesAsRead(newMessage.groupId);
    return;
  }

  set((state) => ({
    unreadCounts: incrementUnreadCount(state.unreadCounts, newMessage.groupId),
    groups: newMessage.group
      ? upsertConversation(state.groups, newMessage.group)
      : state.groups,
  }));
};

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  groups: [],
  unreadCounts: {},
  selectedChat: null,
  typingFeedback: null,
  viewerFeedback: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isCreatingGroup: false,

  getConversations: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      const users = normalizeConversationList(res.data.users, DIRECT_CHAT);
      const groups = normalizeConversationList(res.data.groups, GROUP_CHAT);

      set((state) => ({
        users,
        groups,
        unreadCounts: buildUnreadCounts(users, groups),
        selectedChat: updateSelectedChat(state.selectedChat, users, groups),
      }));
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load conversations",
      );
    } finally {
      set({ isUsersLoading: false });
    }
  },

  createGroup: async (payload) => {
    set({ isCreatingGroup: true });
    try {
      const res = await axiosInstance.post("/messages/groups", payload);
      const group = normalizeConversation(res.data, GROUP_CHAT);

      set((state) => ({
        groups: upsertConversation(state.groups, group),
        selectedChat: group,
        unreadCounts: clearUnreadCount(state.unreadCounts, group?._id),
      }));

      toast.success("Group created successfully");
      return group;
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to create group";
      toast.error(message);
      throw new Error(message);
    } finally {
      set({ isCreatingGroup: false });
    }
  },

  getMessages: async (chat) => {
    if (!chat?._id) return;

    clearTypingFeedbackTimeout();
    set({
      isMessagesLoading: true,
      typingFeedback: null,
      viewerFeedback: null,
    });

    try {
      const url = isGroupChat(chat)
        ? `/messages/groups/${chat._id}/messages`
        : `/messages/${chat._id}`;
      const res = await axiosInstance.get(url);
      const messages = Array.isArray(res.data)
        ? res.data.map(normalizeMessage)
        : [];

      set((state) => ({
        messages,
        unreadCounts: clearUnreadCount(state.unreadCounts, chat._id),
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedChat, messages } = get();
    if (!selectedChat?._id) {
      throw new Error("No chat selected");
    }

    try {
      const url = isGroupChat(selectedChat)
        ? `/messages/groups/${selectedChat._id}/messages`
        : `/messages/send/${selectedChat._id}`;
      const res = await axiosInstance.post(url, messageData);
      const newMessage = normalizeMessage(res.data);

      clearTypingFeedbackTimeout();
      set({
        messages: [...messages, newMessage],
        typingFeedback: null,
      });

      if (newMessage.group) {
        set((state) => ({
          groups: upsertConversation(state.groups, newMessage.group),
        }));
      }

      return newMessage;
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
      unreadCounts: clearUnreadCount(state.unreadCounts, userId),
    }));

    try {
      await axiosInstance.patch(`/messages/read/${userId}`);
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  },

  markGroupMessagesAsRead: async (groupId) => {
    if (!groupId) return;

    set((state) => ({
      unreadCounts: clearUnreadCount(state.unreadCounts, groupId),
    }));

    try {
      await axiosInstance.patch(`/messages/groups/${groupId}/read`);
    } catch (error) {
      console.error("Failed to mark group messages as read:", error);
    }
  },

  initializeMessageHandlers: (socket) => {
    if (!socket) return;

    socket.off("newMessage");
    socket.off("newGroupMessage");
    socket.off("typing:update");
    socket.off("chat:view");
    socket.off("group:created");

    socket.on("newMessage", (newMessage) => {
      handleIncomingDirectMessage(newMessage, set, get);
    });

    socket.on("newGroupMessage", (newMessage) => {
      handleIncomingGroupMessage(newMessage, set, get);
    });

    socket.on("group:created", (group) => {
      const normalizedGroup = normalizeConversation(group, GROUP_CHAT);

      set((state) => {
        const groups = upsertConversation(state.groups, normalizedGroup);

        return {
          groups,
          selectedChat: updateSelectedChat(state.selectedChat, state.users, groups),
          unreadCounts: {
            ...state.unreadCounts,
            [normalizedGroup._id]:
              state.unreadCounts[normalizedGroup._id] || 0,
          },
        };
      });
    });

    socket.on("typing:update", ({ from, feedback, isTyping }) => {
      const activeChat = get().selectedChat;
      if (!activeChat || isGroupChat(activeChat)) return;
      if (String(from) !== String(activeChat._id)) return;

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
      const activeChat = get().selectedChat;
      if (!activeChat || isGroupChat(activeChat)) return;
      if (String(from) !== String(activeChat._id)) return;

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
    socket.off("newGroupMessage");
    socket.off("typing:update");
    socket.off("chat:view");
    socket.off("group:created");
  },

  setSelectedChat: (selectedChat) => {
    clearTypingFeedbackTimeout();
    set((state) => {
      const isSameChat =
        state.selectedChat &&
        selectedChat &&
        String(state.selectedChat._id) === String(selectedChat._id) &&
        state.selectedChat.type === selectedChat.type;

      return {
        selectedChat,
        messages: isSameChat ? state.messages : [],
        typingFeedback: null,
        viewerFeedback: null,
        unreadCounts: clearUnreadCount(state.unreadCounts, selectedChat?._id),
      };
    });
  },
}));
