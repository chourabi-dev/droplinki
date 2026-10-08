/**
 * Loud audio feedback for the warehouse scan stations.
 *
 * The employee holding the scanner gun is looking at the package, not at the
 * screen, so every scan MUST be audible:
 *  - `playScanBeep()`  : one short, piercing beep — "the gun read a code".
 *  - `playErrorBuzz()` : three low, harsh pulses — "the server refused it".
 *
 * Both use square/sawtooth waves at full gain (the loudest, most cutting
 * waveforms WebAudio offers) and go through a compressor so that stacked
 * tones don't clip. The physical volume is of course still up to the device.
 *
 * Browsers only let a page play sound after a user gesture. A key press (and
 * a laser scanner "types" keys) counts, so `installStationSoundUnlock()`
 * resumes the AudioContext on the very first key/pointer event.
 */

let ctx: AudioContext | null = null;
let master: DynamicsCompressorNode | null = null;

function getCtx(): AudioContext | null {
  try {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) {
      ctx = new Ctor() as AudioContext;
      master = ctx.createDynamicsCompressor();
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(c: AudioContext, opts: { freq: number; start: number; duration: number; type: OscillatorType; gain?: number }) {
  const t0 = c.currentTime + opts.start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = opts.type;
  osc.frequency.value = opts.freq;
  // Hard attack / short release: loud right away, no click at the end.
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(opts.gain ?? 1, t0 + 0.005);
  gain.gain.setValueAtTime(opts.gain ?? 1, t0 + opts.duration - 0.02);
  gain.gain.linearRampToValueAtTime(0.0001, t0 + opts.duration);
  osc.connect(gain);
  gain.connect(master ?? c.destination);
  osc.start(t0);
  osc.stop(t0 + opts.duration + 0.02);
}

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}

/** Loud, short, high beep: a code was read by the scanner. */
export function playScanBeep() {
  const c = getCtx();
  if (c) {
    tone(c, { freq: 2400, start: 0, duration: 0.18, type: "square" });
    tone(c, { freq: 1200, start: 0, duration: 0.18, type: "square", gain: 0.6 });
  }
  vibrate(120);
}

/** Long, low, ugly triple buzz: the scan was refused — clearly not the "ok" beep. */
export function playErrorBuzz() {
  const c = getCtx();
  if (c) {
    for (let i = 0; i < 3; i++) {
      tone(c, { freq: 220, start: i * 0.32, duration: 0.26, type: "sawtooth" });
      tone(c, { freq: 233, start: i * 0.32, duration: 0.26, type: "square", gain: 0.7 });
    }
  }
  vibrate([250, 80, 250, 80, 250]);
}

/**
 * Call once when a station mounts. Resumes (or creates) the AudioContext on
 * the first key press / click / touch so the first scan is already audible.
 * Returns a cleanup function.
 */
export function installStationSoundUnlock(): () => void {
  const unlock = () => {
    getCtx();
  };
  const events: (keyof WindowEventMap)[] = ["keydown", "pointerdown", "touchend", "click"];
  events.forEach((e) => window.addEventListener(e, unlock, { passive: true }));
  return () => events.forEach((e) => window.removeEventListener(e, unlock));
}
