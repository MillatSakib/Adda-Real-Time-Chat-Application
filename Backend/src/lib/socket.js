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

const userSocketMap = {};

export const getReceiverSocketId = (userId) => userSocketMap[userId];
const emitToUser = (userId, event, payload) => {
  const socketId = getReceiverSocketId(userId);
  if (socketId) {
    io.to(socketId).emit(event, payload);
    return true;
  }
  return false;
};

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId) {
    userSocketMap[userId] = socket.id;
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

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

  socket.on("disconnect", () => {
    if (userId) {
      delete userSocketMap[userId];
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});
