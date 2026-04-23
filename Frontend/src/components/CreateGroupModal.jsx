import { useState } from "react";
import { X } from "lucide-react";

const CreateGroupModal = ({
  isOpen,
  onClose,
  users,
  onCreateGroup,
  isCreatingGroup,
}) => {
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

  if (!isOpen) return null;

  const toggleMember = (userId) => {
    setSelectedMembers((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (selectedMembers.length === 0) return;

    await onCreateGroup({
      name: groupName.trim(),
      memberIds: selectedMembers,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
      <div className="w-full max-w-lg rounded-2xl border border-base-300 bg-base-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Create group</h2>
            <p className="text-sm text-base-content/65">
              Pick the people you want in this conversation.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-ghost btn-circle"
            onClick={onClose}
            disabled={isCreatingGroup}
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <label className="form-control">
            <span className="label-text mb-2 text-sm font-medium">
              Group name
            </span>
            <input
              type="text"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Optional group name"
              className="input input-bordered w-full"
              maxLength={80}
              disabled={isCreatingGroup}
            />
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Members</span>
              <span className="text-xs text-base-content/60">
                {selectedMembers.length} selected
              </span>
            </div>

            <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-base-300 bg-base-200/50 p-2">
              {users.map((user) => {
                const isSelected = selectedMembers.includes(user._id);

                return (
                  <label
                    key={user._id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
                      isSelected ? "bg-base-300" : "hover:bg-base-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={isSelected}
                      onChange={() => toggleMember(user._id)}
                      disabled={isCreatingGroup}
                    />
                    <img
                      src={user.profilePicture || "/avatar.png"}
                      alt={user.fullName}
                      className="size-11 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{user.fullName}</div>
                      <div className="truncate text-sm text-base-content/60">
                        {user.email}
                      </div>
                    </div>
                  </label>
                );
              })}

              {users.length === 0 && (
                <div className="rounded-xl border border-dashed border-base-300 px-4 py-8 text-center text-sm text-base-content/60">
                  No contacts available to add right now.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isCreatingGroup}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={selectedMembers.length === 0 || isCreatingGroup}
            >
              {isCreatingGroup ? "Creating..." : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
