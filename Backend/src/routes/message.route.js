import express from "express";
import {
  getMessageList,
  getAllMessages,
  markMessagesAsRead,
  sendMessage,
} from "../controllers/message.controller.js";
import { protectedRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/users", protectedRoute, getMessageList);
router.get("/messagelist", protectedRoute, getMessageList);
router.patch("/read/:id", protectedRoute, markMessagesAsRead);
router.get("/:id", protectedRoute, getAllMessages);
router.post("/send/:id", protectedRoute, sendMessage);

export default router;
