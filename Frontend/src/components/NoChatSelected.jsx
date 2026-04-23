import { MessageSquare } from "lucide-react";

const NoChatSelected = () => {
  return (
    <div className="flex w-full min-h-0 flex-1 flex-col items-center justify-center bg-base-100/50 p-8 sm:p-16">
      <div className="max-w-md text-center space-y-6">
        {/* Icon Display */}
        <div className="flex justify-center gap-4 mb-4">
          <div className="relative">
            <div
              className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center
             justify-center animate-bounce"
            >
              <MessageSquare className="w-8 h-8 text-primary " />
            </div>
          </div>
        </div>

        {/* Welcome Text */}
        <h2 className="text-2xl font-bold">Welcome to aDDa!</h2>
        <p className="text-base-content/60">
          Select a conversation or create a group from the sidebar
        </p>
      </div>
    </div>
  );
};

export default NoChatSelected;
