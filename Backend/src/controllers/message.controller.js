import mongoose from "mongoose";
import cloudinary from "../lib/cloudinary.js";
import { emitToUser, emitToUsers } from "../lib/socket.js";
import Group from "../models/group.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

const buildDirectMessageQuery = (senderId, receiverId) => ({
  $or: [
    { senderId, receiverId, groupId: null },
    { senderId: receiverId, receiverId: senderId, groupId: null },
  ],
});

const sanitizeGroup = (group, loggedInUserId) => ({
  ...group,
  type: "group",
  unreadCount: group.unreadCount || 0,
  membersCount: group.members?.length || 0,
  isMember: group.members?.some(
    (member) => String(member._id || member) === String(loggedInUserId),
  ),
});

const getGroupOrThrow = async (groupId, userId) => {
  const group = await Group.findOne({
    _id: groupId,
    members: userId,
  }).populate("members", "fullName email profilePicture");

  return group;
};

const uploadImageIfNeeded = async (image) => {
  if (!image) return "";

  const uploadResponse = await cloudinary.uploader.upload(image);
  return uploadResponse.secure_url;
};

const ensureMessagePayload = (text, image) =>
  Boolean(String(text || "").trim() || image);

export const getMessageList = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const loggedInUserObjectId = toObjectId(loggedInUserId);

    const [filteredUsers, groups, unreadDirectCounts] = await Promise.all([
      User.find({
        _id: { $ne: loggedInUserId },
      })
        .select("-password")
        .lean(),
      Group.find({
        members: loggedInUserId,
      })
        .populate("members", "fullName email profilePicture")
        .lean(),
      Message.aggregate([
        {
          $match: {
            receiverId: loggedInUserObjectId,
            groupId: null,
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

    const groupIds = groups.map((group) => group._id);
    const unreadGroupCounts =
      groupIds.length === 0
        ? []
        : await Message.aggregate([
            {
              $match: {
                groupId: { $in: groupIds },
                senderId: { $ne: loggedInUserObjectId },
                readBy: { $ne: loggedInUserObjectId },
              },
            },
            {
              $group: {
                _id: "$groupId",
                count: { $sum: 1 },
              },
            },
          ]);

    const unreadCountMap = new Map(
      unreadDirectCounts.map(({ _id, count }) => [String(_id), count]),
    );
    const unreadGroupCountMap = new Map(
      unreadGroupCounts.map(({ _id, count }) => [String(_id), count]),
    );

    const usersWithUnreadCount = filteredUsers.map((user) => ({
      ...user,
      type: "direct",
      unreadCount: unreadCountMap.get(String(user._id)) || 0,
    }));

    const groupsWithUnreadCount = groups.map((group) =>
      sanitizeGroup(
        {
          ...group,
          unreadCount: unreadGroupCountMap.get(String(group._id)) || 0,
        },
        loggedInUserId,
      ),
    );

    res.status(200).json({
      users: usersWithUnreadCount,
      groups: groupsWithUnreadCount,
    });
  } catch (error) {
    console.log("Error in getMessageList controller:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error in fetching message list",
    });
  }
};

export const createGroup = async (req, res) => {
  try {
    const loggedInUserId = String(req.user._id);
    const requestedMemberIds = Array.isArray(req.body.memberIds)
      ? req.body.memberIds
      : [];
    const memberIds = [...new Set([loggedInUserId, ...requestedMemberIds.map(String)])];

    if (memberIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Select at least one more person to create a group",
      });
    }

    const members = await User.find({
      _id: { $in: memberIds },
    }).select("fullName email profilePicture");

    if (members.length !== memberIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more selected members could not be found",
      });
    }

    const trimmedName = String(req.body.name || "").trim();
    const fallbackName = members
      .map((member) => member.fullName)
      .join(", ")
      .slice(0, 80);

    const group = await Group.create({
      name: trimmedName || fallbackName || "New Group",
      members: memberIds,
      createdBy: loggedInUserId,
    });

    const populatedGroup = await Group.findById(group._id)
      .populate("members", "fullName email profilePicture")
      .lean();

    const responseGroup = sanitizeGroup(populatedGroup, loggedInUserId);

    emitToUsers(memberIds, "group:created", responseGroup);

    res.status(201).json(responseGroup);
  } catch (error) {
    console.log("Error in createGroup controller:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error in creating group",
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
        groupId: null,
        isRead: { $ne: true },
      },
      {
        $set: { isRead: true },
      },
    );

    const message = await Message.find(
      buildDirectMessageQuery(senderId, userToChatId),
    ).sort({ createdAt: 1 });

    res.status(200).json(message);
  } catch (error) {
    console.log("Error in getAllMessages controller:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error in fetching messages",
    });
  }
};

export const getGroupMessages = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const loggedInUserId = req.user._id;
    const group = await getGroupOrThrow(groupId, loggedInUserId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    await Message.updateMany(
      {
        groupId,
        senderId: { $ne: loggedInUserId },
        readBy: { $ne: loggedInUserId },
      },
      {
        $addToSet: { readBy: loggedInUserId },
      },
    );

    const messages = await Message.find({
      groupId,
    })
      .populate("senderId", "fullName email profilePicture")
      .sort({ createdAt: 1 });

    res.status(200).json(
      messages.map((message) => ({
        ...message.toObject(),
        group: sanitizeGroup(group.toObject(), loggedInUserId),
      })),
    );
  } catch (error) {
    console.log("Error in getGroupMessages controller:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error in fetching group messages",
    });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const receiverId = req.params.id;
    const senderId = req.user._id;

    if (!ensureMessagePayload(text, image)) {
      return res.status(400).json({
        success: false,
        message: "Message text or image is required",
      });
    }

    const imageUrl = await uploadImageIfNeeded(image);

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text: String(text || "").trim(),
      image: imageUrl,
      isRead: false,
      readBy: [],
      groupId: null,
    });

    emitToUser(receiverId, "newMessage", newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error in sending message",
    });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { groupId } = req.params;
    const senderId = req.user._id;
    const group = await getGroupOrThrow(groupId, senderId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (!ensureMessagePayload(text, image)) {
      return res.status(400).json({
        success: false,
        message: "Message text or image is required",
      });
    }

    const imageUrl = await uploadImageIfNeeded(image);

    let newMessage = await Message.create({
      senderId,
      groupId,
      text: String(text || "").trim(),
      image: imageUrl,
      isRead: false,
      readBy: [senderId],
      receiverId: null,
    });

    newMessage = await newMessage.populate("senderId", "fullName email profilePicture");

    const payload = {
      ...newMessage.toObject(),
      group: sanitizeGroup(group.toObject(), senderId),
    };

    emitToUsers(
      group.members
        .map((member) => String(member._id))
        .filter((memberId) => memberId !== String(senderId)),
      "newGroupMessage",
      payload,
    );

    res.status(201).json(payload);
  } catch (error) {
    console.log("Error in sendGroupMessage controller:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error in sending group message",
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
        groupId: null,
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

export const markGroupMessagesAsRead = async (req, res) => {
  try {
    const { groupId } = req.params;
    const loggedInUserId = req.user._id;
    const group = await getGroupOrThrow(groupId, loggedInUserId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const updateResult = await Message.updateMany(
      {
        groupId,
        senderId: { $ne: loggedInUserId },
        readBy: { $ne: loggedInUserId },
      },
      {
        $addToSet: { readBy: loggedInUserId },
      },
    );

    res.status(200).json({
      success: true,
      updatedCount: updateResult.modifiedCount,
    });
  } catch (error) {
    console.log("Error in markGroupMessagesAsRead controller:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error in updating group message status",
    });
  }
};
