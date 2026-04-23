import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { MessageSquarePlus, Users } from "lucide-react";
import CreateGroupModal from "./CreateGroupModal";

const getGroupInitials = (name) =>
  name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "GR";

const Sidebar = () => {
  const {
    getConversations,
    users,
    groups,
    unreadCounts,
    selectedChat,
    setSelectedChat,
    createGroup,
    isUsersLoading,
    isCreatingGroup,
  } = useChatStore();

  const onlineUsers = useAuthStore((state) => state.onlineUsers);
  const isUserOnline = useAuthStore((state) => state.isUserOnline);
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  useEffect(() => {
    getConversations();
  }, [getConversations]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => isUserOnline(user._id))
    : users;

  const handleCreateGroup = async (payload) => {
    await createGroup(payload);
    setIsCreateGroupOpen(false);
  };

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <>
      <aside className="flex h-full min-h-0 w-20 flex-col border-r border-base-300 transition-all duration-200 lg:w-72">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="font-medium hidden lg:block">Chats</span>
        </div>
        <div className="mt-3 hidden lg:flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">
            ({Math.max(0, onlineUsers.length - 1)} online)
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 w-full overflow-y-auto py-3">
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/45 lg:px-5">
            Contacts
          </div>
          {filteredUsers.map((user) => (
            <button
              key={user._id}
              onClick={() => setSelectedChat(user)}
              className={`
                w-full p-3 flex items-center gap-3
                hover:bg-base-300 transition-colors
                ${selectedChat?._id === user._id && selectedChat?.type === user.type ? "bg-base-300 ring-1 ring-base-300" : ""}
              `}
            >
              <div className="relative mx-auto lg:mx-0">
                <img
                  src={user.profilePicture || "/avatar.png"}
                  alt={user.fullName}
                  className="size-12 object-cover rounded-full"
                />
                {(unreadCounts[String(user._id)] || 0) > 0 && (
                  <span
                    className="absolute -right-1 -top-1 min-w-5 rounded-full bg-error px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-error-content shadow-sm"
                  >
                    {unreadCounts[String(user._id)] > 99
                      ? "99+"
                      : unreadCounts[String(user._id)]}
                  </span>
                )}
                {isUserOnline(user._id) && (
                  <span
                    className="absolute bottom-0 right-0 size-3 bg-green-500 
                  rounded-full ring-2 ring-zinc-900"
                  />
                )}
              </div>

              <div className="hidden lg:block text-left min-w-0">
                <div className="font-medium truncate">{user.fullName}</div>
                <div className="text-sm text-zinc-400">
                  {isUserOnline(user._id) ? "Online" : "Offline"}
                </div>
              </div>
            </button>
          ))}

          {filteredUsers.length === 0 && (
            <div className="px-5 py-4 text-sm text-zinc-500">
              No contacts match this filter.
            </div>
          )}
        </div>

        <div className="mt-4 space-y-1">
          <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/45 lg:px-5">
            Groups
          </div>
          {groups.map((group) => (
            <button
              key={group._id}
              onClick={() => setSelectedChat(group)}
              className={`
                w-full p-3 flex items-center gap-3
                hover:bg-base-300 transition-colors
                ${selectedChat?._id === group._id && selectedChat?.type === group.type ? "bg-base-300 ring-1 ring-base-300" : ""}
              `}
            >
              <div className="relative mx-auto lg:mx-0">
                {group.avatar ? (
                  <img
                    src={group.avatar}
                    alt={group.name}
                    className="size-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {getGroupInitials(group.name)}
                  </div>
                )}
                {(unreadCounts[String(group._id)] || 0) > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-error px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-error-content shadow-sm">
                    {unreadCounts[String(group._id)] > 99
                      ? "99+"
                      : unreadCounts[String(group._id)]}
                  </span>
                )}
              </div>

              <div className="hidden min-w-0 text-left lg:block">
                <div className="truncate font-medium">{group.name}</div>
                <div className="text-sm text-zinc-400">
                  {(group.membersCount || group.members?.length || 0)} members
                </div>
              </div>
            </button>
          ))}

          {groups.length === 0 && (
            <div className="px-5 py-4 text-sm text-zinc-500">
              No groups yet. Create one below.
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-base-300 p-3 lg:p-4">
        <button
          type="button"
          className="btn btn-primary w-full justify-center gap-2"
          onClick={() => setIsCreateGroupOpen(true)}
        >
          <MessageSquarePlus className="size-4" />
          <span className="hidden lg:inline">Create Group</span>
        </button>
      </div>
      </aside>

      {isCreateGroupOpen && (
        <CreateGroupModal
          isOpen={isCreateGroupOpen}
          onClose={() => setIsCreateGroupOpen(false)}
          users={users}
          onCreateGroup={handleCreateGroup}
          isCreatingGroup={isCreatingGroup}
        />
      )}
    </>
  );
};
export default Sidebar;
