import { create } from "zustand";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";
import {
  playIncomingCallSound,
  playOutgoingCallSound,
  stopCallSounds,
} from "../lib/sound";

const MEDIA_PERMISSION_TOAST_ID = "call-secure-context";
const CALL_RING_TIMEOUT_MS = 27_000;

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const stopStream = (stream) => {
  stream?.getTracks().forEach((track) => track.stop());
};

let outgoingCallTimeout = null;

const clearOutgoingCallTimeout = () => {
  if (outgoingCallTimeout) {
    clearTimeout(outgoingCallTimeout);
    outgoingCallTimeout = null;
  }
};

const connectionReadyStates = new Set(["connected", "completed"]);
const connectionClosedStates = new Set(["failed", "disconnected", "closed"]);

const hasActiveCallState = (state) =>
  Boolean(
    state.incomingCall || state.activeCall || state.callStatus !== "idle",
  );

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
  callConnectedAt: null,
  pendingCandidates: [],
  isMuted: false,
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

    socket.on("call:offer", ({ from, caller, offer }) => {
      if (
        get().incomingCall ||
        get().activeCall ||
        get().callStatus !== "idle"
      ) {
        socket.emit("call:busy", { to: from });
        return;
      }

      set({
        incomingCall: { from, caller, offer },
        callStatus: "ringing",
      });
      playIncomingCallSound();
      toast(`${caller.fullName} is calling...`);
    });

    socket.on("call:answer", async ({ answer }) => {
      try {
        const peerConnection = get().peerConnection;
        if (!peerConnection) return;

        clearOutgoingCallTimeout();
        stopCallSounds();
        set((state) => ({
          callStatus:
            state.callStatus === "connected" ? "connected" : "connecting",
        }));

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(answer),
        );
        await get().flushPendingCandidates();
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
          set((state) => ({
            pendingCandidates: [...state.pendingCandidates, candidate],
          }));
          return;
        }

        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("Failed to add ICE candidate:", error);
      }
    });

    socket.on("call:end", () => {
      if (!hasActiveCallState(get())) return;

      toast("Call ended");
      get().endCall(false);
    });

    socket.on("call:decline", () => {
      if (!hasActiveCallState(get())) return;

      toast.error("Call declined");
      get().endCall(false);
    });

    socket.on("call:busy", () => {
      if (!hasActiveCallState(get())) return;

      toast.error("User is busy on another call");
      get().endCall(false);
    });

    socket.on("call:unavailable", () => {
      if (!hasActiveCallState(get())) return;

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

  prepareLocalStream: async () => {
    const existingStream = get().localStream;
    if (existingStream) return existingStream;

    if (!canUseCalling()) {
      throw new Error(
        "Calling needs HTTPS or localhost so the browser can access your microphone.",
      );
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    set({
      localStream: stream,
      isMuted: false,
    });

    return stream;
  },

  createPeerConnection: (targetUserId) => {
    const existingPeerConnection = get().peerConnection;
    if (existingPeerConnection) return existingPeerConnection;

    const socket = useAuthStore.getState().socket;
    const peerConnection = new RTCPeerConnection(rtcConfig);
    const remoteStream = new MediaStream();
    let callEndedFromStateChange = false;

    const markCallConnected = () => {
      set((state) => ({
        remoteStream,
        callStatus:
          state.callStatus === "idle" ? state.callStatus : "connected",
        callConnectedAt:
          state.callStatus === "idle"
            ? state.callConnectedAt
            : state.callConnectedAt ?? Date.now(),
      }));
    };

    const endCallFromStateChange = () => {
      if (callEndedFromStateChange || !hasActiveCallState(get())) return;

      callEndedFromStateChange = true;
      get().endCall(false);
    };

    peerConnection.ontrack = (event) => {
      const incomingTracks = event.streams[0]?.getTracks?.() || [event.track];

      incomingTracks.forEach((track) => {
        const hasTrack = remoteStream
          .getTracks()
          .some((existingTrack) => existingTrack.id === track.id);

        if (!hasTrack) {
          remoteStream.addTrack(track);
        }

        track.onunmute = markCallConnected;
      });

      markCallConnected();
    };

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate || !socket) return;

      socket.emit("call:ice-candidate", {
        to: targetUserId,
        candidate: event.candidate,
      });
    };

    peerConnection.onconnectionstatechange = () => {
      if (connectionReadyStates.has(peerConnection.connectionState)) {
        markCallConnected();
      }

      if (connectionClosedStates.has(peerConnection.connectionState)) {
        endCallFromStateChange();
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      if (connectionReadyStates.has(peerConnection.iceConnectionState)) {
        markCallConnected();
      }

      if (connectionClosedStates.has(peerConnection.iceConnectionState)) {
        endCallFromStateChange();
      }
    };

    const localStream = get().localStream;
    localStream?.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    set({
      peerConnection,
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

  startCall: async (user) => {
    const {
      socket,
      authUser,
      isOffline,
      isUserOnline,
    } = useAuthStore.getState();

    if (!socket || !socket.connected || !authUser || isOffline) {
      toast.error("You must be connected to start a call");
      return;
    }

    if (!user?._id || !isUserOnline(user._id)) {
      toast.error("User is offline");
      return;
    }

    if (get().callStatus !== "idle") {
      toast.error("You are already in a call");
      return;
    }

    try {
      await get().prepareLocalStream();

      set({
        activeCall: { user },
        incomingCall: null,
        callStatus: "calling",
      });

      const peerConnection = get().createPeerConnection(user._id);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit("call:offer", {
        to: user._id,
        offer,
        caller: {
          _id: authUser._id,
          fullName: authUser.fullName,
          profilePicture: authUser.profilePicture,
        },
      });

      playOutgoingCallSound();
      clearOutgoingCallTimeout();
      outgoingCallTimeout = setTimeout(() => {
        const { callStatus, activeCall } = get();

        if (callStatus === "calling" && activeCall?.user?._id === user._id) {
          toast.error("No answer. Call ended.");
          get().endCall(true);
        }
      }, CALL_RING_TIMEOUT_MS);
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
      stopCallSounds();

      await get().prepareLocalStream();

      set({
        activeCall: {
          user: incomingCall.caller,
        },
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

    clearOutgoingCallTimeout();
    stopCallSounds();
    set({ ...initialState });
  },

  endCall: (notifyPeer = true) => {
    const socket = useAuthStore.getState().socket;
    const activeCall = get().activeCall;
    const incomingCall = get().incomingCall;

    if (notifyPeer && socket) {
      const targetUserId = activeCall?.user?._id || incomingCall?.from || null;

      if (targetUserId) {
        socket.emit("call:end", { to: targetUserId });
      }
    }

    clearOutgoingCallTimeout();
    stopCallSounds();
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
}));
