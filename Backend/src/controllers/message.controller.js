import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import mongoose from "mongoose";

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

export const getMessageList = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const [filteredUsers, unreadCounts] = await Promise.all([
      User.find({
        _id: { $ne: loggedInUserId },
      })
        .select("-password")
        .lean(),
      Message.aggregate([
        {
          $match: {
            receiverId: toObjectId(loggedInUserId),
            isRead: { $ne: true },
          },
        },
        {
          $group: {
            _id: "$senderId",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const unreadCountMap = new Map(
      unreadCounts.map(({ _id, count }) => [String(_id), count]),
    );

    const usersWithUnreadCount = filteredUsers.map((user) => ({
      ...user,
      unreadCount: unreadCountMap.get(String(user._id)) || 0,
    }));

    res.status(200).json(usersWithUnreadCount);
  } catch (error) {
    console.log("Error in getMessageList controller:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error in fetching message list",
    });
  }
};

export const getAllMessages = async (req, res) => {
  try {
    const userToChatId = req.params.id;
    const senderId = req.user._id;

    await Message.updateMany(
      {
        senderId: userToChatId,
        receiverId: senderId,
        isRead: { $ne: true },
      },
      {
        $set: { isRead: true },
      },
    );

    const message = await Message.find({
      $or: [
        { senderId: senderId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: senderId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(message);
  } catch (error) {
    console.log("Error in getAllMessages controller:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error in fetching messages",
    });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const receiverId = req.params.id;
    const senderId = req.user._id;
    let imageUrl = "";

    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      isRead: false,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error in sending message",
    });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const userToChatId = req.params.id;
    const loggedInUserId = req.user._id;

    const updateResult = await Message.updateMany(
      {
        senderId: userToChatId,
        receiverId: loggedInUserId,
        isRead: { $ne: true },
      },
      {
        $set: { isRead: true },
      },
    );

    res.status(200).json({
      success: true,
      updatedCount: updateResult.modifiedCount,
    });
  } catch (error) {
    console.log("Error in markMessagesAsRead controller:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error in updating message status",
    });
  }
};
