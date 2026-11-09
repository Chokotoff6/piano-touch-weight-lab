import { getPreferences } from "@/lib/preferences";

export type WeighingCell = { index: number; field: "wd" | "wa" };
const ACTIVE_KEY = "ptw_active_weighing_cell";
let audio: AudioContext | undefined;

export function rememberWeighingCell(cell: WeighingCell) {
  try { window.sessionStorage.setItem(ACTIVE_KEY, JSON.stringify(cell)); } catch { /* offline/private storage */ }
}
export function readWeighingCell(): WeighingCell | null {
  try {
    const cell = JSON.parse(window.sessionStorage.getItem(ACTIVE_KEY) ?? "null");
    return cell && Number.isInteger(cell.index) && cell.index >= 0 && cell.index < 88 && (cell.field === "wd" || cell.field === "wa") ? cell : null;
  } catch { return null; }
}

/** Call only from a user gesture; browser audio restrictions remain respected. */
export function unlockWeighingAudio() {
  if (typeof window === "undefined") return;
  try {
    const Constructor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) return;
    audio ??= new Constructor();
    if (audio.state === "suspended") void audio.resume().catch(() => {});
  } catch { /* audio unavailable: weighing still works */ }
}
export function playWeighingSound(kind: "key" | "octave") {
  const prefs = getPreferences();
  if (!(kind === "key" ? prefs.keySound : prefs.octaveSound) || !audio || audio.state !== "running") return;
  try {
    const oscillator = audio.createOscillator(); const gain = audio.createGain();
    const now = audio.currentTime; const duration = kind === "key" ? 0.012 : 0.055;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(kind === "key" ? 1100 : 660, now);
    oscillator.frequency.exponentialRampToValueAtTime(kind === "key" ? 700 : 440, now + duration);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(kind === "key" ? 0.035 : 0.065, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain); gain.connect(audio.destination);
    oscillator.start(now); oscillator.stop(now + duration);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  } catch { /* never block input for sound */ }
}
/** Single crystal chime when Dashboard access turns green (follows the key-sound preference). */
export function playReadyChime() {
  const prefs = getPreferences();
  if (!(prefs.keySound || prefs.octaveSound) || !audio || audio.state !== "running") return;
  try {
    const now = audio.currentTime;
    [[880, 0], [1320, 0.07]].forEach(([freq, delay]) => {
      const o = audio!.createOscillator(); const g = audio!.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(freq, now + delay);
      g.gain.setValueAtTime(0, now + delay);
      g.gain.linearRampToValueAtTime(0.07, now + delay + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.15);
      o.connect(g); g.connect(audio!.destination);
      o.start(now + delay); o.stop(now + delay + 0.16);
      o.onended = () => { o.disconnect(); g.disconnect(); };
    });
  } catch { /* never block input for sound */ }
}
