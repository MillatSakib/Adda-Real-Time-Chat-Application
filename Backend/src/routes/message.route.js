import express from "express";
import {
  getMessageList,
  getAllMessages,
  sendMessage,
} from "../controllers/message.controller.js";
import { protectedRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/messagelist", protectedRoute, getMessageList);
router.get("/:id", protectedRoute, getAllMessages);
router.post("/send/:id", protectedRoute, sendMessage);

export default router;
