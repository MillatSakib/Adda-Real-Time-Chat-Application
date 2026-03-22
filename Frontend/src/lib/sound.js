import callingSoundSrc from "../assets/calling.mp3";
import ringtoneSoundSrc from "../assets/ringtone.mp3";
import messageNotificationSoundSrc from "../assets/message-not.mp3";

const isBrowser = () => typeof window !== "undefined";

const createManagedSound = (src, { loop = false, volume = 1 } = {}) => {
  let audio = null;

  const getAudio = () => {
    if (!isBrowser()) return null;

    if (!audio) {
      audio = new Audio(src);
      audio.loop = loop;
      audio.volume = volume;
      audio.preload = "auto";
    }

    return audio;
  };

  return {
    play: async ({ restart = true } = {}) => {
      const sound = getAudio();
      if (!sound) return;

      sound.loop = loop;
      sound.volume = volume;

      if (restart) {
        sound.currentTime = 0;
      }

      try {
        await sound.play();
      } catch (error) {
        if (error?.name !== "AbortError") {
          console.debug("Unable to play sound effect:", error);
        }
      }
    },

    stop: () => {
      const sound = getAudio();
      if (!sound) return;

      sound.pause();
      sound.currentTime = 0;
    },

    prime: () => {
      getAudio()?.load();
    },
  };
};

const outgoingCallSound = createManagedSound(callingSoundSrc, {
  loop: true,
});

const incomingCallSound = createManagedSound(ringtoneSoundSrc, {
  loop: true,
});

const messageNotificationSound = createManagedSound(
  messageNotificationSoundSrc,
);

export const warmupSoundEffects = () => {
  outgoingCallSound.prime();
  incomingCallSound.prime();
  messageNotificationSound.prime();
};

export const playOutgoingCallSound = () => {
  incomingCallSound.stop();
  outgoingCallSound.play();
};

export const playIncomingCallSound = () => {
  outgoingCallSound.stop();
  incomingCallSound.play();
};

export const stopCallSounds = () => {
  outgoingCallSound.stop();
  incomingCallSound.stop();
};

export const playMessageNotificationSound = () => {
  messageNotificationSound.play();
};
