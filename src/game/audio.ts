import type { Cue, Phase } from "./tavern";

/**
 * Everything the game plays: one piece of music at a time, the room's looping ambience, and one-shot
 * effects. The pure helpers at the top decide what should sound; `Soundscape` is the part that talks to
 * the browser, and stays silent rather than failing if the browser can't or won't play anything.
 */

export type Track =
  | "bards_tale"
  | "harvest_season"
  | "exploration"
  | "old_tower_inn"
  | "kings_feast"
  | "minstrel_dance"
  | "market_day"
  | "rejoicing"
  | "crowded_pub"
  | "flutenist_dance";
export type Layer = "fire" | "crowd" | "stew";
/** Sounds the game itself asks for, on top of what the tavern's rules cue. */
export type Effect = Cue | "step" | "click" | "page" | "cloth" | "visitor" | "cheers";

/** Each track's file in `audio/music/`. Browsers decode both Ogg and MP3. */
export const MUSIC_FILES: Record<Track, string> = {
  bards_tale: "bards_tale.ogg",
  harvest_season: "harvest_season.ogg",
  exploration: "exploration.mp3",
  old_tower_inn: "old_tower_inn.ogg",
  kings_feast: "kings_feast.ogg",
  minstrel_dance: "minstrel_dance.ogg",
  market_day: "market_day.mp3",
  rejoicing: "rejoicing.mp3",
  crowded_pub: "crowded_pub.ogg",
  flutenist_dance: "flutenist_dance.ogg",
};

/** Songs played one after another, round and round. A playlist of one just loops. */
export type Playlist = readonly Track[];

const TITLE_PLAYLIST: Playlist = ["bards_tale"];
const DAY_PLAYLIST: Playlist = ["harvest_season", "exploration"];
/** The band's set. Each night starts somewhere else in it, so the nights don't all open the same way. */
const NIGHT_SET: Playlist = [
  "old_tower_inn",
  "market_day",
  "kings_feast",
  "crowded_pub",
  "minstrel_dance",
  "rejoicing",
  "flutenist_dance",
];
/** Each night's set, made once, so asking every frame hands back the same playlist. */
const nightSets = new Map<number, Playlist>();

function nightSet(nightIndex: number): Playlist {
  let set = nightSets.get(nightIndex);
  if (!set) {
    // Spread the openers across the set rather than walking it one song at a time.
    const start = (nightIndex * 3) % NIGHT_SET.length;
    set = [...NIGHT_SET.slice(start), ...NIGHT_SET.slice(0, start)];
    nightSets.set(nightIndex, set);
  }
  return set;
}

/**
 * The music for a moment of the game, or null for none. After last call the band has stopped: only the
 * fire is left, which is the point of the visitor's scene.
 */
export function musicFor(staging: boolean, phase: Phase, nightIndex: number): Playlist | null {
  if (staging || phase === "ended") return TITLE_PLAYLIST;
  switch (phase) {
    case "service":
      return nightSet(nightIndex);
    case "lastcall":
    case "bedtime":
      return null;
    default:
      return DAY_PLAYLIST;
  }
}

/**
 * How many feet came down while the stride angle moved from `before` to `after`. A foot lands at the
 * far end of each swing, a quarter of the way through each half of the stride cycle.
 */
export function footfalls(before: number, after: number): number {
  const landed = (stride: number) => Math.floor((stride - Math.PI / 2) / Math.PI);
  return Math.max(0, landed(after) - landed(before));
}

/** How loud something is at `distance` metres: 1 up close, fading away to nothing at `reach`. */
export function falloff(distance: number, reach: number): number {
  const t = Math.min(1, Math.max(0, 1 - distance / reach));
  return t * t;
}

export interface SoundSettings {
  /** 0 to 1. */
  music: number;
  /** 0 to 1. Covers the effects and the room's ambience. */
  effects: number;
  muted: boolean;
}

export const DEFAULT_SOUND: SoundSettings = { music: 0.75, effects: 1, muted: false };
/** The steps the sound menu goes through. */
export const SOUND_LEVELS: readonly number[] = [0, 0.25, 0.5, 0.75, 1];
const SETTINGS_KEY = "tarven.sound";

/** The next step up from `level`, wrapping round to off after full. */
export function nextSoundLevel(level: number): number {
  return SOUND_LEVELS.find((step) => step > level + 0.001) ?? SOUND_LEVELS[0];
}

const isLevel = (value: unknown): value is number => typeof value === "number" && value >= 0 && value <= 1;

/** The saved sound settings. Anything missing or broken falls back to its default. */
export function readSoundSettings(): SoundSettings {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null");
    if (!raw || typeof raw !== "object") return { ...DEFAULT_SOUND };
    const saved = raw as Partial<SoundSettings>;
    return {
      music: isLevel(saved.music) ? saved.music : DEFAULT_SOUND.music,
      effects: isLevel(saved.effects) ? saved.effects : DEFAULT_SOUND.effects,
      muted: saved.muted === true,
    };
  } catch {
    return { ...DEFAULT_SOUND };
  }
}

function writeSoundSettings(settings: SoundSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // The settings just won't be remembered.
  }
}

interface EffectSound {
  /** Files in public/audio/sfx; one is picked at random, never the same one twice running. */
  files: readonly string[];
  volume: number;
  /** How far the pitch may wander either way, so repeated sounds don't machine-gun. */
  pitch?: number;
}

const numbered = (name: string, count: number) => Array.from({ length: count }, (_, i) => `${name}${i + 1}`);

export const EFFECTS: Record<Effect, EffectSound> = {
  step: { files: numbered("step", 6), volume: 0.16, pitch: 0.08 },
  click: { files: ["click"], volume: 0.3, pitch: 0.04 },
  page: { files: numbered("page", 3), volume: 0.4, pitch: 0.05 },
  cloth: { files: numbered("cloth", 4), volume: 0.45, pitch: 0.06 },

  pour: { files: ["pour"], volume: 0.55 },
  aleReady: { files: numbered("clink", 2), volume: 0.28, pitch: 0.05 },
  takeAle: { files: numbered("clink", 2), volume: 0.4, pitch: 0.05 },
  takeBread: { files: numbered("cloth", 2), volume: 0.45, pitch: 0.06 },
  takeStew: { files: numbered("pot", 3), volume: 0.3, pitch: 0.05 },
  takeCask: { files: ["creak"], volume: 0.5, pitch: 0.05 },
  putDown: { files: ["drop"], volume: 0.4, pitch: 0.08 },
  refill: { files: ["latch"], volume: 0.55 },
  stewStart: { files: numbered("pot", 3), volume: 0.35, pitch: 0.05 },
  stewReady: { files: ["pot3"], volume: 0.55 },
  stewBurnt: { files: ["pot1"], volume: 0.6, pitch: 0.03 },
  serve: { files: ["coins1"], volume: 0.5, pitch: 0.05 },
  tip: { files: ["coins2"], volume: 0.6, pitch: 0.05 },
  buy: { files: ["coins2"], volume: 0.6, pitch: 0.05 },
  drink: { files: ["gulp"], volume: 0.7 },
  cheers: { files: numbered("clink", 2), volume: 0.6, pitch: 0.06 },
  guestIn: { files: ["door_open2"], volume: 0.2, pitch: 0.06 },
  walkOut: { files: ["door_slam"], volume: 0.55 },
  visitor: { files: ["door_open1"], volume: 0.75 },
  doorOpen: { files: ["door_open1"], volume: 0.45, pitch: 0.04 },
  doorClose: { files: ["door_close1"], volume: 0.45, pitch: 0.04 },
  smashTray: { files: ["smash_big"], volume: 0.6 },
  smashOne: { files: ["smash_small"], volume: 0.55, pitch: 0.06 },
  drop: { files: ["drop"], volume: 0.55, pitch: 0.08 },
  dishes: { files: ["clink1", "clink2", "pot2"], volume: 0.4, pitch: 0.06 },
  wipe: { files: ["cloth3", "cloth4"], volume: 0.5, pitch: 0.06 },
  rumor: { files: ["book_open"], volume: 0.55 },
  // A guest sitting down and calling her over; then her jotting down what they want.
  call: { files: ["click"], volume: 0.35, pitch: 0.1 },
  order: { files: numbered("page", 3), volume: 0.35, pitch: 0.05 },
};

/** Every effect file, once each. */
export const EFFECT_FILES: readonly string[] = [...new Set(Object.values(EFFECTS).flatMap((effect) => effect.files))];

const LAYER_FILES: Record<Layer, string> = { fire: "fire", crowd: "crowd", stew: "stew" };
/** Each layer at full: quiet enough to stay behind the music. */
const LAYER_VOLUME: Record<Layer, number> = { fire: 0.32, crowd: 0.42, stew: 0.3 };
const LAYERS = Object.keys(LAYER_FILES) as Layer[];

const MUSIC_FADE_SECONDS = 1.6;
const LAYER_SMOOTHING_SECONDS = 0.4;
const BUS_SMOOTHING_SECONDS = 0.08;
/** How far the room drops while the game is paused. */
const PAUSED_LEVEL = 0.35;
/** Level changes smaller than this aren't worth scheduling. */
const LEVEL_EPSILON = 0.01;

interface Playing {
  playlist: Playlist;
  source: AudioBufferSourceNode;
  gain: GainNode;
}

export class Soundscape {
  readonly settings = readSoundSettings();
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private effectBus: GainNode | null = null;
  private layerBus: GainNode | null = null;
  private readonly effectBuffers = new Map<string, AudioBuffer>();
  private readonly layerGains = new Map<Layer, GainNode>();
  private readonly layerLevels: Record<Layer, number> = { fire: 0, crowd: 0, stew: 0 };
  private readonly lastFile = new Map<Effect, string>();
  /** The playlist that should be playing. A slow download that is no longer wanted gets dropped. */
  private wanted: Playlist | null = null;
  private playing: Playing | null = null;
  private paused = false;

  constructor(private readonly base: string) {
    // Browsers won't start sound until the player has done something, so the first key or click does it.
    const unlock = () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      this.start();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    // Nothing keeps playing in the background while you're in another window.
    window.addEventListener("blur", () => void this.context?.suspend());
    window.addEventListener("focus", () => void this.context?.resume());
  }

  private start(): void {
    try {
      const context = new AudioContext();
      this.context = context;
      this.master = context.createGain();
      this.master.connect(context.destination);
      const bus = () => {
        const gain = context.createGain();
        gain.connect(this.master!);
        return gain;
      };
      this.musicBus = bus();
      this.effectBus = bus();
      this.layerBus = bus();
      this.applySettings();
      void context.resume();
      for (const file of EFFECT_FILES) void this.loadEffect(file);
      for (const layer of LAYERS) void this.startLayer(layer);
      if (this.wanted) void this.startTrack(this.wanted, 0);
    } catch {
      // No sound is fine.
      this.context = null;
    }
  }

  /** `path` is under `audio/` and includes the file's extension. */
  private async fetchBuffer(path: string): Promise<AudioBuffer | null> {
    if (!this.context) return null;
    try {
      const response = await fetch(`${this.base}audio/${path}`);
      if (!response.ok) return null;
      return await this.context.decodeAudioData(await response.arrayBuffer());
    } catch {
      return null;
    }
  }

  private async loadEffect(file: string): Promise<void> {
    const buffer = await this.fetchBuffer(`sfx/${file}.ogg`);
    if (buffer) this.effectBuffers.set(file, buffer);
  }

  private async startLayer(layer: Layer): Promise<void> {
    const { context, layerBus } = this;
    const buffer = await this.fetchBuffer(`ambience/${LAYER_FILES[layer]}.ogg`);
    if (!buffer || !context || !layerBus) return;
    const gain = context.createGain();
    gain.gain.value = this.layerLevels[layer] * LAYER_VOLUME[layer];
    gain.connect(layerBus);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    // Each layer starts somewhere different, so they don't repeat in step.
    source.start(0, Math.random() * buffer.duration);
    this.layerGains.set(layer, gain);
  }

  /** Plays song `index` of `playlist`, and the next one when it finishes. */
  private async startTrack(playlist: Playlist, index: number, failed = 0): Promise<void> {
    const buffer = await this.fetchBuffer(`music/${MUSIC_FILES[playlist[index]]}`);
    const { context, musicBus } = this;
    if (!context || !musicBus || this.wanted !== playlist) return;
    if (this.playing?.playlist === playlist) return;
    const next = (index + 1) % playlist.length;
    if (!buffer) {
      // A song that won't load is skipped; if none of them will, the music stays quiet.
      if (failed + 1 < playlist.length) void this.startTrack(playlist, next, failed + 1);
      return;
    }
    this.fadeOutMusic();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(1, context.currentTime + MUSIC_FADE_SECONDS);
    gain.connect(musicBus);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = playlist.length === 1;
    source.connect(gain);
    source.onended = () => {
      // Only a song that ran out moves the set on. A faded-out one has already been let go.
      if (this.playing?.source !== source) return;
      this.playing = null;
      void this.startTrack(playlist, next);
    };
    source.start();
    this.playing = { playlist, source, gain };
  }

  private fadeOutMusic(): void {
    const { context, playing } = this;
    if (!context || !playing) return;
    const now = context.currentTime;
    playing.gain.gain.cancelScheduledValues(now);
    playing.gain.gain.setValueAtTime(playing.gain.gain.value, now);
    playing.gain.gain.linearRampToValueAtTime(0, now + MUSIC_FADE_SECONDS);
    playing.source.stop(now + MUSIC_FADE_SECONDS);
    this.playing = null;
  }

  /** Crossfades to `playlist`, or fades out for null. Asking for what's already playing does nothing. */
  setMusic(playlist: Playlist | null): void {
    if (playlist === this.wanted) return;
    this.wanted = playlist;
    if (!this.context) return;
    if (playlist) void this.startTrack(playlist, 0);
    else this.fadeOutMusic();
  }

  /** Sets how loud one layer of the room is, from 0 to 1. Called every frame, so it only acts on changes. */
  setLayer(layer: Layer, level: number): void {
    if (Math.abs(level - this.layerLevels[layer]) < LEVEL_EPSILON) return;
    this.layerLevels[layer] = level;
    const gain = this.layerGains.get(layer);
    if (gain && this.context) {
      gain.gain.setTargetAtTime(level * LAYER_VOLUME[layer], this.context.currentTime, LAYER_SMOOTHING_SECONDS);
    }
  }

  /** Quiets the game while the pause menu is up. */
  setPaused(paused: boolean): void {
    if (paused === this.paused) return;
    this.paused = paused;
    this.applySettings();
  }

  play(effect: Effect, loudness = 1): void {
    const { context, effectBus } = this;
    if (!context || !effectBus) return;
    const sound = EFFECTS[effect];
    const { files } = sound;
    const last = this.lastFile.get(effect);
    const choices = files.length > 1 ? files.filter((file) => file !== last) : files;
    const file = choices[Math.floor(Math.random() * choices.length)];
    const buffer = this.effectBuffers.get(file);
    if (!buffer) return;
    this.lastFile.set(effect, file);
    const gain = context.createGain();
    gain.gain.value = sound.volume * loudness;
    gain.connect(effectBus);
    const source = context.createBufferSource();
    source.buffer = buffer;
    if (sound.pitch) source.playbackRate.value = 1 + (Math.random() * 2 - 1) * sound.pitch;
    source.connect(gain);
    source.start();
  }

  /** A bright "ding": bell partials that fade out. */
  playBell(): void {
    const { context, effectBus } = this;
    if (!context || !effectBus) return;
    const now = context.currentTime;
    for (const [frequency, volume, length] of [[1760, 0.22, 1.6], [4400, 0.07, 0.6], [2637, 0.08, 1.1]]) {
      const tone = context.createOscillator();
      const gain = context.createGain();
      tone.type = "sine";
      tone.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
      tone.connect(gain).connect(effectBus);
      tone.start(now);
      tone.stop(now + length);
    }
  }

  private applySettings(): void {
    const { context, master, musicBus, effectBus, layerBus, settings } = this;
    if (!context || !master || !musicBus || !effectBus || !layerBus) return;
    const now = context.currentTime;
    const room = this.paused ? PAUSED_LEVEL : 1;
    master.gain.setTargetAtTime(settings.muted ? 0 : 1, now, BUS_SMOOTHING_SECONDS);
    musicBus.gain.setTargetAtTime(settings.music * room, now, BUS_SMOOTHING_SECONDS);
    effectBus.gain.setTargetAtTime(settings.effects, now, BUS_SMOOTHING_SECONDS);
    layerBus.gain.setTargetAtTime(settings.effects * room, now, BUS_SMOOTHING_SECONDS);
  }

  /** Changes the settings and remembers them. */
  change(update: Partial<SoundSettings>): void {
    Object.assign(this.settings, update);
    writeSoundSettings(this.settings);
    this.applySettings();
  }

  toggleMute(): boolean {
    this.change({ muted: !this.settings.muted });
    return this.settings.muted;
  }
}
