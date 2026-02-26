export const AUDIO_ASSETS = {
  SPIN: "https://cdn.pixabay.com/audio/2025/11/01/audio_74da8906a3.mp3",
  LAND: "https://cdn.pixabay.com/audio/2025/11/01/audio_58db167ab0.mp3",
  WIN: "https://cdn.pixabay.com/audio/2025/09/01/audio_0fe263510a.mp3",
  CHIP: "https://cdn.pixabay.com/audio/2022/03/10/audio_66c3aa1f68.mp3",
};

class AudioService {
  private sounds: Record<string, HTMLAudioElement> = {};
  private isEnabled: boolean = true;
  private isRouletteEnabled: boolean = true;

  constructor() {
    // Preload sounds
    if (typeof window !== "undefined") {
      Object.entries(AUDIO_ASSETS).forEach(([key, url]) => {
        const audio = new Audio(url);
        audio.preload = "auto";
        this.sounds[key] = audio;
      });
    }
  }

  public play(key: keyof typeof AUDIO_ASSETS, loop: boolean = false) {
    if (!this.isEnabled) return;

    // Check roulette specific mute
    if (
      !this.isRouletteEnabled &&
      (key === "SPIN" || key === "LAND" || key === "CHIP")
    ) {
      return;
    }

    const sound = this.sounds[key];
    if (sound) {
      sound.currentTime = 0;
      sound.loop = loop;
      sound.play().catch((e) => console.warn("Audio play blocked:", e));
    }
  }

  public stop(key: keyof typeof AUDIO_ASSETS) {
    const sound = this.sounds[key];
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      Object.values(this.sounds).forEach((s) => {
        s.pause();
        s.currentTime = 0;
      });
    }
  }

  public setRouletteEnabled(enabled: boolean) {
    this.isRouletteEnabled = enabled;
    if (!enabled) {
      this.stop("SPIN");
      this.stop("LAND");
    }
  }
}

export const audioService = new AudioService();
