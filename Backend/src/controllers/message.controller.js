import User from "../models/user.model.js";
import Message from "../models/message.model.js";

export const getMessageList = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");
    res.status(200).json({
      success: true,
      message: "Message list fetched successfully",
      data: filteredUsers,
    });
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

    const message = await Message.find({
      $or: [
        { senderId: senderId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: senderId },
      ],
    });

    res.status(200).json({
      success: true,
      message: "Messages fetched successfully",
      data: message,
    });
  } catch (error) {
    console.log("Error in getAllMessages controller:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error in fetching messages",
    });
  }
  res.send(`This is all message: ${req.params.id}`);
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const reciverId = req.params.id;
    const senderId = req.user._id;
    let imageurl;
    if (image) {
      //Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageurl = uploadResponse.secure_url;
    }
    const newMessage = new Message({
      senderId,
      receiverId: reciverId,
      text,
      image: imageurl,
    });

    await newMessage.save();

    //real time functionality should be implemented here using socket.io or any other real time library

    res.status(200).json({
      success: true,
      message: "Message sent successfully",
      data: newMessage,
    });
  } catch (error) {
    console.log("Error in sendMessage controller:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error in sending message",
    });
  }
};
