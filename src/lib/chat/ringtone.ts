/**
 * The sound of a call connecting.
 *
 * Pressing Call starts a spoken conversation, and for a second or so nothing
 * happens: the greeting has to be fetched from Sarvam before it can play. A
 * ring fills that gap the way a telephone does — it says the call is going
 * through, rather than leaving a visitor wondering whether the button worked.
 *
 * It is generated, not a file. Two oscillators and a gain envelope cost nothing
 * to download, need no media asset, and cannot 404. This is interface
 * furniture, the audible equivalent of the button's blink, so it lives in code
 * (CLAUDE.md section 4) rather than in the Media Library, which is for the
 * community's recordings and the site's published media.
 *
 * The cadence is India's ringback tone: 400 Hz, two bursts, then a rest. The
 * rest is shortened from the real 2 seconds, because a visitor who has just
 * pressed a button reads two seconds of silence as a fault.
 */

const FREQUENCY = 400;
const BURST = 0.4;
const GAP = 0.2;
const REST = 1.2;
/** A bound, not a duration — the ring is stopped when the greeting arrives. */
const RINGS = 8;
/** Quiet. A synthesised sine at full gain in someone's headphones is unkind. */
const VOLUME = 0.09;

export type Ringing = { stop: () => void };

/** A ring that is doing nothing, for browsers with no Web Audio at all. */
const SILENT: Ringing = { stop: () => {} };

export function ring(): Ringing {
  if (typeof window === "undefined") return SILENT;

  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return SILENT;

  try {
    const context = new Ctor();
    // Started from a click, so this is allowed; asked for anyway because a
    // context can also be created suspended for reasons of its own.
    void context.resume();

    const gain = context.createGain();
    gain.gain.value = 0;
    gain.connect(context.destination);

    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = FREQUENCY;
    oscillator.connect(gain);

    // One oscillator running throughout, made audible in bursts by the gain.
    // Starting and stopping an oscillator per burst would click.
    const begins = context.currentTime + 0.02;
    let at = begins;
    for (let i = 0; i < RINGS; i += 1) {
      for (const isFirstBurst of [true, false]) {
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(VOLUME, at + 0.02);
        gain.gain.setValueAtTime(VOLUME, at + BURST - 0.02);
        gain.gain.linearRampToValueAtTime(0, at + BURST);
        at += BURST + (isFirstBurst ? GAP : REST);
      }
    }

    oscillator.start(begins);
    oscillator.stop(at);

    let stopped = false;
    return {
      stop() {
        if (stopped) return;
        stopped = true;
        try {
          const now = context.currentTime;
          // Faded rather than cut: stopping a tone at full amplitude is a
          // click, and the greeting starts immediately afterwards.
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.06);
          oscillator.stop(now + 0.08);
          window.setTimeout(() => void context.close(), 200);
        } catch {
          // Already stopped, or the context closed under us. Nothing to undo.
        }
      },
    };
  } catch {
    // No audio output, a blocked context, a browser that disagrees about the
    // API. The greeting still plays; only the ring is missing.
    return SILENT;
  }
}
