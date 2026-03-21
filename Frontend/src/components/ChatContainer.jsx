import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    typingFeedback,
    viewerFeedback,
    sendViewerFeedback,
    stopViewerFeedback,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const viewerName = authUser?.fullName || "Someone";

  useEffect(() => {
    getMessages(selectedUser._id);

    subscribeToMessages();

    sendViewerFeedback(
      selectedUser._id,
      `${viewerName} is looking at your messages like a cat.`,
    );

    return () => {
      stopViewerFeedback(selectedUser._id);
      unsubscribeFromMessages();
    };
  }, [
    viewerName,
    selectedUser._id,
    getMessages,
    sendViewerFeedback,
    stopViewerFeedback,
    subscribeToMessages,
    unsubscribeFromMessages,
  ]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, typingFeedback, viewerFeedback]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
          >
            <div className=" chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePicture || "/avatar.png"
                      : selectedUser.profilePicture || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
            </div>
            <div className="chat-bubble flex max-w-[82%] flex-col overflow-hidden sm:max-w-[75%] [overflow-wrap:anywhere]">
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
            </div>
          </div>
        ))}
        {typingFeedback && (
          <div className="py-1 text-center text-xs italic tracking-wide text-base-content/55 animate-pulse">
            {typingFeedback}
          </div>
        )}
        {viewerFeedback && (
          <div className="py-1 text-center text-xs italic tracking-wide text-base-content/45">
            {viewerFeedback}
          </div>
        )}
        <div ref={messageEndRef} />
      </div>

      <MessageInput />
    </div>
  );
};
export default ChatContainer;
