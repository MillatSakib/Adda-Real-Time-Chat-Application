import { Phone, Users, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { canUseCalling, useCallStore } from "../store/useCallStore";

const ChatHeader = () => {
  const { selectedChat, setSelectedChat } = useChatStore();
  const isUserOnline = useAuthStore((state) => state.isUserOnline);
  const startCall = useCallStore((state) => state.startCall);
  const isGroupChat = selectedChat?.type === "group";
  const selectedUserOnline = !isGroupChat && isUserOnline(selectedChat._id);
  const callTitle = !selectedUserOnline
    ? "User is offline"
    : !canUseCalling()
      ? "Calling requires HTTPS or localhost"
      : "Start a call";

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              {isGroupChat ? (
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Users className="size-5" />
                </div>
              ) : (
                <img
                  src={selectedChat.profilePicture || "/avatar.png"}
                  alt={selectedChat.fullName}
                />
              )}
            </div>
          </div>

          <div>
            <h3 className="font-medium">
              {isGroupChat ? selectedChat.name : selectedChat.fullName}
            </h3>
            <p className="text-sm text-base-content/70">
              {isGroupChat
                ? `${selectedChat.membersCount || selectedChat.members?.length || 0} members`
                : selectedUserOnline
                  ? "Online"
                  : "Offline"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isGroupChat && (
            <button
              className="btn btn-sm btn-circle"
              onClick={() => startCall(selectedChat)}
              disabled={!selectedUserOnline}
              title={callTitle}
            >
              <Phone className="size-4" />
            </button>
          )}
          <button
            className="btn btn-sm btn-ghost btn-circle"
            onClick={() => setSelectedChat(null)}
          >
            <X />
          </button>
        </div>
      </div>
    </div>
  );
};
export default ChatHeader;
