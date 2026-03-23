import { Phone, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { canUseCalling, useCallStore } from "../store/useCallStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const isUserOnline = useAuthStore((state) => state.isUserOnline);
  const startCall = useCallStore((state) => state.startCall);
  const selectedUserOnline = isUserOnline(selectedUser._id);
  const callTitle = !selectedUserOnline
    ? "User is offline"
    : !canUseCalling()
      ? "Calling requires HTTPS or localhost"
      : "Start a call";

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img
                src={selectedUser.profilePicture || "/avatar.png"}
                alt={selectedUser.fullName}
              />
            </div>
          </div>

          {/* User info */}
          <div>
            <h3 className="font-medium">{selectedUser.fullName}</h3>
            <p className="text-sm text-base-content/70">
              {selectedUserOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="btn btn-sm btn-circle"
            onClick={() => startCall(selectedUser)}
            disabled={!selectedUserOnline}
            title={callTitle}
          >
            <Phone className="size-4" />
          </button>
          <button className="btn btn-sm btn-ghost btn-circle" onClick={() => setSelectedUser(null)}>
            <X />
          </button>
        </div>
      </div>
    </div>
  );
};
export default ChatHeader;
