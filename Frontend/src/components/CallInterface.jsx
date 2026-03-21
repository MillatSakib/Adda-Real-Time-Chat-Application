import { useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";
import defaultProfile from "../assets/avatar.webp";
import { useCallStore } from "../store/useCallStore";

const statusCopy = {
  idle: "",
  ringing: "Incoming call",
  calling: "Calling...",
  connecting: "Connecting...",
  connected: "Live",
};

export default function CallInterface() {
  const {
    incomingCall,
    activeCall,
    callStatus,
    callType,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    acceptIncomingCall,
    declineIncomingCall,
    endCall,
    toggleMute,
    toggleCamera,
  } = useCallStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream || null;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream || null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream || null;
    }
  }, [remoteStream]);

  if (!incomingCall && !activeCall) return null;

  const callUser = incomingCall?.caller || activeCall?.user;
  const showVideoLayout = callType === "video";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral/70 p-4 backdrop-blur-sm">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {incomingCall && !activeCall ? (
        <div className="w-full max-w-sm rounded-3xl bg-base-100 p-6 text-center shadow-2xl">
          <img
            src={callUser?.profilePicture || defaultProfile}
            alt={callUser?.fullName || "Caller"}
            className="mx-auto mb-4 size-24 rounded-full object-cover ring-4 ring-primary/20"
          />
          <p className="text-sm uppercase tracking-[0.2em] text-base-content/60">
            {incomingCall.callType === "video" ? "Video Call" : "Audio Call"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold">{callUser?.fullName}</h2>
          <p className="mt-1 text-base-content/70">is calling you</p>

          <div className="mt-6 flex justify-center gap-4">
            <button
              className="btn btn-circle btn-success"
              onClick={acceptIncomingCall}
            >
              <Phone className="size-5" />
            </button>
            <button
              className="btn btn-circle btn-error"
              onClick={declineIncomingCall}
            >
              <PhoneOff className="size-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-base-100 shadow-2xl">
          <div className="flex items-center justify-between border-b border-base-300 px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-base-content/60">
                {showVideoLayout ? "Video Call" : "Audio Call"}
              </p>
              <h2 className="text-xl font-semibold">{callUser?.fullName}</h2>
            </div>
            <span className="badge badge-outline px-3 py-3">
              {statusCopy[callStatus]}
            </span>
          </div>

          <div
            className={`grid gap-4 p-4 ${
              showVideoLayout ? "md:grid-cols-[2fr_1fr]" : "md:grid-cols-2"
            }`}
          >
            <div className="relative min-h-80 rounded-2xl bg-neutral text-neutral-content">
              {showVideoLayout ? (
                remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="h-full min-h-80 w-full rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-full min-h-80 flex-col items-center justify-center gap-4">
                    <img
                      src={callUser?.profilePicture || defaultProfile}
                      alt={callUser?.fullName || "Remote user"}
                      className="size-24 rounded-full object-cover ring-4 ring-white/10"
                    />
                    <p className="text-lg font-medium">
                      Waiting for {callUser?.fullName}...
                    </p>
                  </div>
                )
              ) : (
                <div className="flex h-full min-h-80 flex-col items-center justify-center gap-4">
                  <img
                    src={callUser?.profilePicture || defaultProfile}
                    alt={callUser?.fullName || "Remote user"}
                    className="size-28 rounded-full object-cover ring-4 ring-white/10"
                  />
                  <p className="text-lg font-medium">{callUser?.fullName}</p>
                </div>
              )}
            </div>

            <div className="relative min-h-80 rounded-2xl bg-base-200">
              {showVideoLayout ? (
                localStream ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full min-h-80 w-full rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-full min-h-80 items-center justify-center">
                    <span className="loading loading-spinner loading-lg" />
                  </div>
                )
              ) : (
                <div className="flex h-full min-h-80 flex-col items-center justify-center gap-4">
                  <div className="avatar placeholder">
                    <div className="w-24 rounded-full bg-primary text-primary-content">
                      <span className="text-3xl">
                        {callUser?.fullName?.charAt(0) || "Y"}
                      </span>
                    </div>
                  </div>
                  <p className="text-base-content/70">Your microphone is live</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 border-t border-base-300 px-6 py-4">
            <button className="btn btn-circle" onClick={toggleMute}>
              {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </button>
            {showVideoLayout && (
              <button className="btn btn-circle" onClick={toggleCamera}>
                {isCameraOff ? (
                  <VideoOff className="size-5" />
                ) : (
                  <Video className="size-5" />
                )}
              </button>
            )}
            <button className="btn btn-error btn-circle" onClick={() => endCall(true)}>
              <PhoneOff className="size-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
