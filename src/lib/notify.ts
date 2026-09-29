/**
 * Reminder delivery channels. A web app cannot wake itself up in the
 * background, so reminders fire through every channel available while the
 * app is open (in-app toast + system notification + vibration + beep); for
 * "app closed" safety the reschedule flow also offers a calendar (.ics)
 * alarm — see lib/ics.ts.
 */

export type NotifPermission = "granted" | "denied" | "default" | "unsupported";

export function notificationPermission(): NotifPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotifPermission> {
  if (!("Notification" in window)) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

let audioCtx: AudioContext | null = null;

/** Short two-tone beep. Silently does nothing if the browser blocks audio before a user gesture. */
export function beep() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx ?? new Ctx();
    const ctx = audioCtx;
    if (ctx.state === "suspended") void ctx.resume();
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.18);
    });
  } catch {
    /* ignore */
  }
}

export function alertUser(opts: { title: string; body: string; tag: string; onClick?: () => void }) {
  beep();
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    /* ignore */
  }
  if (notificationPermission() !== "granted") return;
  try {
    const n = new Notification(opts.title, { body: opts.body, tag: opts.tag, requireInteraction: true });
    n.onclick = () => {
      window.focus();
      opts.onClick?.();
      n.close();
    };
  } catch {
    // Some mobile browsers only allow notifications through a service worker
    // and throw on the constructor. The in-app alert still covers that case.
  }
}
