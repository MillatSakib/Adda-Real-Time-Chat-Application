import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";

const allowedOrigins = [
  "http://localhost:5173",
  "https://app-hp.millatsakib.com",
  process.env.FRONTEND_URL,
].filter(Boolean);

export const app = express();
export const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

const userSocketMap = new Map();

const normalizeUserId = (userId) => String(userId);
const isSocketActive = (socketId) => io.sockets.sockets.has(socketId);

const addUserSocket = (userId, socketId) => {
  if (!userId || !socketId) return;

  const normalizedUserId = normalizeUserId(userId);
  const socketIds = userSocketMap.get(normalizedUserId) ?? new Set();
  socketIds.add(socketId);
  userSocketMap.set(normalizedUserId, socketIds);
};

const getUserSocketIds = (userId) => {
  if (!userId) return [];

  const normalizedUserId = normalizeUserId(userId);
  const socketIds = userSocketMap.get(normalizedUserId);

  if (!socketIds) return [];

  for (const socketId of [...socketIds]) {
    if (!isSocketActive(socketId)) {
      socketIds.delete(socketId);
    }
  }

  if (socketIds.size === 0) {
    userSocketMap.delete(normalizedUserId);
    return [];
  }

  return [...socketIds];
};

const removeUserSocket = (userId, socketId) => {
  if (!userId || !socketId) return;

  const normalizedUserId = normalizeUserId(userId);
  const socketIds = userSocketMap.get(normalizedUserId);

  if (!socketIds) return;

  socketIds.delete(socketId);

  if (socketIds.size === 0) {
    userSocketMap.delete(normalizedUserId);
  }
};

const getOnlineUserIds = () => {
  for (const userId of [...userSocketMap.keys()]) {
    getUserSocketIds(userId);
  }

  return [...userSocketMap.keys()];
};

export const getReceiverSocketId = (userId) => getUserSocketIds(userId).at(-1);
export const emitToUser = (userId, event, payload) => {
  const socketIds = getUserSocketIds(userId);
  if (socketIds.length === 0) return false;

  socketIds.forEach((socketId) => {
    io.to(socketId).emit(event, payload);
  });

  return true;
};

export const emitToUsers = (userIds, event, payload) => {
  const uniqueUserIds = [...new Set(userIds.map(String).filter(Boolean))];
  let delivered = false;

  uniqueUserIds.forEach((userId) => {
    delivered = emitToUser(userId, event, payload) || delivered;
  });

  return delivered;
};

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId) {
    addUserSocket(userId, socket.id);
  }

  socket.data.activeViewedUserId = null;

  io.emit("getOnlineUsers", getOnlineUserIds());

  socket.on("call:offer", ({ to, offer, caller }) => {
    const delivered = emitToUser(to, "call:offer", {
      from: userId,
      caller,
      offer,
    });

    if (!delivered) {
      socket.emit("call:unavailable");
    }
  });

  socket.on("call:answer", ({ to, answer }) => {
    emitToUser(to, "call:answer", {
      from: userId,
      answer,
    });
  });

  socket.on("call:ice-candidate", ({ to, candidate }) => {
    emitToUser(to, "call:ice-candidate", {
      from: userId,
      candidate,
    });
  });

  socket.on("call:end", ({ to }) => {
    emitToUser(to, "call:end", {
      from: userId,
    });
  });

  socket.on("call:decline", ({ to }) => {
    emitToUser(to, "call:decline", {
      from: userId,
    });
  });

  socket.on("call:busy", ({ to }) => {
    emitToUser(to, "call:busy", {
      from: userId,
    });
  });

  socket.on("typing:update", ({ to, feedback, isTyping }) => {
    emitToUser(to, "typing:update", {
      from: userId,
      feedback,
      isTyping: Boolean(isTyping),
    });
  });

  socket.on("chat:view", ({ to, feedback, isViewing }) => {
    const previousViewedUserId = socket.data.activeViewedUserId;

    if ((!isViewing || !to) && previousViewedUserId) {
      emitToUser(previousViewedUserId, "chat:view", {
        from: userId,
        isViewing: false,
      });
      socket.data.activeViewedUserId = null;
      return;
    }

    if (!isViewing || !to) return;

    if (previousViewedUserId && previousViewedUserId !== to) {
      emitToUser(previousViewedUserId, "chat:view", {
        from: userId,
        isViewing: false,
      });
    }

    socket.data.activeViewedUserId = to;

    emitToUser(to, "chat:view", {
      from: userId,
      feedback,
      isViewing: true,
    });
  });

  socket.on("disconnect", () => {
    const viewedUserId = socket.data.activeViewedUserId;

    if (viewedUserId) {
      emitToUser(viewedUserId, "chat:view", {
        from: userId,
        isViewing: false,
      });
    }

    removeUserSocket(userId, socket.id);

    io.emit("getOnlineUsers", getOnlineUserIds());
  });
});
