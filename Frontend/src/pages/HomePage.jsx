import React from "react";
import { useChatStore } from "../store/useChatStore";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

export default function HomePage() {
  const { selectedUser } = useChatStore();
  return (
    <div className="h-[calc(100dvh-4rem)] overflow-hidden bg-base-200 p-2 sm:p-3">
      <div className="h-full w-full">
        <div className="h-full w-full overflow-hidden rounded-lg bg-base-100 shadow-cl">
          <div className="flex h-full min-h-0 overflow-hidden rounded-lg">
            <Sidebar />

            {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
          </div>
        </div>
      </div>
    </div>
  );
}
