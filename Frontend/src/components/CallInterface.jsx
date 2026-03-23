import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import defaultProfile from "../assets/avatar.webp";
import { useCallStore } from "../store/useCallStore";

const statusCopy = {
  idle: "",
  ringing: "Incoming call",
  calling: "Calling...",
  connecting: "Connecting...",
  connected: "Live",
};

const formatCallDuration = (elapsedMs) => {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export default function CallInterface() {
  const {
    incomingCall,
    activeCall,
    callStatus,
    callConnectedAt,
    remoteStream,
    isMuted,
    acceptIncomingCall,
    declineIncomingCall,
    endCall,
    toggleMute,
  } = useCallStore();

  const remoteAudioRef = useRef(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream || null;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (callStatus !== "connected" || !callConnectedAt) return undefined;

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [callStatus, callConnectedAt]);

  if (!incomingCall && !activeCall) return null;

  const callUser = incomingCall?.caller || activeCall?.user;
  const callDuration =
    callStatus === "connected" && callConnectedAt
      ? formatCallDuration(Math.max(0, now - callConnectedAt))
      : null;
  const statusLabel = callDuration || statusCopy[callStatus];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral/70 p-4 backdrop-blur-sm py-8">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {incomingCall && !activeCall ? (
        <div className="w-full max-w-sm rounded-3xl bg-base-100 p-6 text-center shadow-2xl">
          <img
            src={callUser?.profilePicture || defaultProfile}
            alt={callUser?.fullName || "Caller"}
            className="mx-auto mb-4 size-24 rounded-full object-cover ring-4 ring-primary/20"
          />
          <p className="text-sm uppercase tracking-[0.2em] text-base-content/60">
            Audio Call
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
                Audio Call
              </p>
              <h2 className="text-xl font-semibold">{callUser?.fullName}</h2>
            </div>
            <span className="badge badge-outline px-3 py-3">
              {statusLabel}
            </span>
          </div>
          <div className="p-4">
            <div className="relative min-h-80 rounded-2xl bg-neutral text-neutral-content">
              <div className="flex h-full min-h-80 flex-col items-center justify-center gap-4">
                <img
                  src={callUser?.profilePicture || defaultProfile}
                  alt={callUser?.fullName || "Remote user"}
                  className="size-28 rounded-full object-cover ring-4 ring-white/10"
                />
                <p className="text-lg font-medium">{callUser?.fullName}</p>
                <p className="text-sm text-white/70">
                  {callDuration
                    ? `Call time ${callDuration}`
                    : remoteStream
                      ? "Connected"
                      : `Waiting for ${callUser?.fullName}...`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 border-t border-base-300 px-6 py-4">
            <button className="btn btn-circle" onClick={toggleMute}>
              {isMuted ? (
                <MicOff className="size-5" />
              ) : (
                <Mic className="size-5" />
              )}
            </button>
            <button
              className="btn btn-error btn-circle"
              onClick={() => endCall(true)}
            >
              <PhoneOff className="size-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
