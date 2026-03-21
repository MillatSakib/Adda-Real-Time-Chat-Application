import { create } from "zustand";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

const MEDIA_PERMISSION_TOAST_ID = "call-secure-context";

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const stopStream = (stream) => {
  stream?.getTracks().forEach((track) => track.stop());
};

export const canUseCalling = () =>
  typeof window !== "undefined" &&
  window.isSecureContext &&
  typeof navigator !== "undefined" &&
  Boolean(navigator.mediaDevices?.getUserMedia);

const initialState = {
  peerConnection: null,
  localStream: null,
  remoteStream: null,
  incomingCall: null,
  activeCall: null,
  callStatus: "idle",
  callType: "audio",
  pendingCandidates: [],
  isMuted: false,
  isCameraOff: false,
};

export const useCallStore = create((set, get) => ({
  ...initialState,

  initializeCallHandlers: (socket) => {
    if (!socket) return;

    socket.off("call:offer");
    socket.off("call:answer");
    socket.off("call:ice-candidate");
    socket.off("call:end");
    socket.off("call:decline");
    socket.off("call:busy");
    socket.off("call:unavailable");

    socket.on("call:offer", ({ from, caller, offer, callType }) => {
      if (get().incomingCall || get().activeCall || get().callStatus !== "idle") {
        socket.emit("call:busy", { to: from });
        return;
      }

      set({
        incomingCall: { from, caller, offer, callType },
        callStatus: "ringing",
        callType,
      });
      toast(`${caller.fullName} is calling...`);
    });

    socket.on("call:answer", async ({ answer }) => {
      try {
        const peerConnection = get().peerConnection;
        if (!peerConnection) return;

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(answer),
        );
        await get().flushPendingCandidates();
        set({ callStatus: "connecting" });
      } catch (error) {
        console.error("Failed to handle call answer:", error);
        toast.error("Failed to connect the call");
        get().endCall(false);
      }
    });

    socket.on("call:ice-candidate", async ({ candidate }) => {
      try {
        const peerConnection = get().peerConnection;

        if (!peerConnection || !peerConnection.remoteDescription) {
          set({
            pendingCandidates: [...get().pendingCandidates, candidate],
          });
          return;
        }

        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("Failed to add ICE candidate:", error);
      }
    });

    socket.on("call:end", () => {
      toast("Call ended");
      get().endCall(false);
    });

    socket.on("call:decline", () => {
      toast.error("Call declined");
      get().endCall(false);
    });

    socket.on("call:busy", () => {
      toast.error("User is busy on another call");
      get().endCall(false);
    });

    socket.on("call:unavailable", () => {
      toast.error("User is unavailable for a call");
      get().endCall(false);
    });
  },

  cleanupCallHandlers: (socket) => {
    if (!socket) return;

    socket.off("call:offer");
    socket.off("call:answer");
    socket.off("call:ice-candidate");
    socket.off("call:end");
    socket.off("call:decline");
    socket.off("call:busy");
    socket.off("call:unavailable");
  },

  prepareLocalStream: async (callType) => {
    const existingStream = get().localStream;
    if (existingStream) return existingStream;

    if (!canUseCalling()) {
      throw new Error(
        "Calling needs HTTPS or localhost so the browser can access microphone/camera.",
      );
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === "video",
    });

    set({
      localStream: stream,
      isMuted: false,
      isCameraOff: callType !== "video",
    });

    return stream;
  },

  createPeerConnection: (targetUserId) => {
    const existingPeerConnection = get().peerConnection;
    if (existingPeerConnection) return existingPeerConnection;

    const socket = useAuthStore.getState().socket;
    const peerConnection = new RTCPeerConnection(rtcConfig);
    const remoteStream = new MediaStream();

    peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });

      set({
        remoteStream,
        callStatus: "connected",
      });
    };

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate || !socket) return;

      socket.emit("call:ice-candidate", {
        to: targetUserId,
        candidate: event.candidate,
      });
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === "connected") {
        set({ callStatus: "connected" });
      }

      if (
        ["failed", "disconnected", "closed"].includes(
          peerConnection.connectionState,
        )
      ) {
        get().endCall(false);
      }
    };

    const localStream = get().localStream;
    localStream?.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    set({
      peerConnection,
      remoteStream,
    });

    return peerConnection;
  },

  flushPendingCandidates: async () => {
    const peerConnection = get().peerConnection;
    const pendingCandidates = get().pendingCandidates;

    if (!peerConnection || !peerConnection.remoteDescription) return;

    for (const candidate of pendingCandidates) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("Failed to apply queued ICE candidate:", error);
      }
    }

    set({ pendingCandidates: [] });
  },

  startCall: async (user, callType = "audio") => {
    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;

    if (!socket || !authUser) {
      toast.error("You must be connected to start a call");
      return;
    }

    if (get().callStatus !== "idle") {
      toast.error("You are already in a call");
      return;
    }

    try {
      await get().prepareLocalStream(callType);

      set({
        activeCall: { user, callType },
        incomingCall: null,
        callType,
        callStatus: "calling",
      });

      const peerConnection = get().createPeerConnection(user._id);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit("call:offer", {
        to: user._id,
        offer,
        callType,
        caller: {
          _id: authUser._id,
          fullName: authUser.fullName,
          profilePicture: authUser.profilePicture,
        },
      });
    } catch (error) {
      console.error("Failed to start call:", error);
      toast.error(error.message || "Could not start the call", {
        id: MEDIA_PERMISSION_TOAST_ID,
      });
      get().endCall(false);
    }
  },

  acceptIncomingCall: async () => {
    const socket = useAuthStore.getState().socket;
    const incomingCall = get().incomingCall;

    if (!socket || !incomingCall) return;

    try {
      await get().prepareLocalStream(incomingCall.callType);

      set({
        activeCall: {
          user: incomingCall.caller,
          callType: incomingCall.callType,
        },
        callType: incomingCall.callType,
        incomingCall: null,
        callStatus: "connecting",
      });

      const peerConnection = get().createPeerConnection(incomingCall.from);
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(incomingCall.offer),
      );
      await get().flushPendingCandidates();

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit("call:answer", {
        to: incomingCall.from,
        answer,
      });
    } catch (error) {
      console.error("Failed to accept call:", error);
      toast.error(error.message || "Could not accept the call", {
        id: MEDIA_PERMISSION_TOAST_ID,
      });
      get().endCall(false);
    }
  },

  declineIncomingCall: () => {
    const socket = useAuthStore.getState().socket;
    const incomingCall = get().incomingCall;

    if (socket && incomingCall) {
      socket.emit("call:decline", { to: incomingCall.from });
    }

    set({
      incomingCall: null,
      callStatus: "idle",
      callType: "audio",
    });
  },

  endCall: (notifyPeer = true) => {
    const socket = useAuthStore.getState().socket;
    const activeCall = get().activeCall;
    const incomingCall = get().incomingCall;

    if (notifyPeer && socket) {
      const targetUserId =
        activeCall?.user?._id || incomingCall?.from || null;

      if (targetUserId) {
        socket.emit("call:end", { to: targetUserId });
      }
    }

    get().peerConnection?.close();
    stopStream(get().localStream);
    stopStream(get().remoteStream);

    set({
      ...initialState,
    });
  },

  toggleMute: () => {
    const localStream = get().localStream;
    if (!localStream) return;

    const nextMutedState = !get().isMuted;

    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMutedState;
    });

    set({ isMuted: nextMutedState });
  },

  toggleCamera: () => {
    const localStream = get().localStream;
    if (!localStream) return;

    const videoTracks = localStream.getVideoTracks();
    if (!videoTracks.length) return;

    const nextCameraState = !get().isCameraOff;

    videoTracks.forEach((track) => {
      track.enabled = !nextCameraState;
    });

    set({ isCameraOff: nextCameraState });
  },
}));
