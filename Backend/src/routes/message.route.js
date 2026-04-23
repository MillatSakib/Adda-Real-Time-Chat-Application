import express from "express";
import {
  createGroup,
  getMessageList,
  getAllMessages,
  getGroupMessages,
  markMessagesAsRead,
  markGroupMessagesAsRead,
  sendMessage,
  sendGroupMessage,
} from "../controllers/message.controller.js";
import { protectedRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/users", protectedRoute, getMessageList);
router.get("/messagelist", protectedRoute, getMessageList);
router.post("/groups", protectedRoute, createGroup);
router.get("/groups/:groupId/messages", protectedRoute, getGroupMessages);
router.post("/groups/:groupId/messages", protectedRoute, sendGroupMessage);
router.patch("/groups/:groupId/read", protectedRoute, markGroupMessagesAsRead);
router.patch("/read/:id", protectedRoute, markMessagesAsRead);
router.get("/:id", protectedRoute, getAllMessages);
router.post("/send/:id", protectedRoute, sendMessage);

export default router;
