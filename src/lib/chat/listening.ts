/**
 * Knowing when someone has finished speaking.
 *
 * Without this the microphone opens and never closes on its own. A visitor
 * presses Call, hears the greeting, answers it — and nothing happens, because
 * the only things that end a recording are pressing the button again or a
 * twenty-five second timeout. Sarvam is not slow or silent in that case; it has
 * not been asked anything yet. To the person waiting, the assistant simply
 * stopped responding.
 *
 * So the turn ends the way it does in a conversation: when the talking stops.
 *
 * This is arithmetic on the microphone's own signal — root mean square over a
 * window of samples, which is the browser telling us how loud the room is. No
 * model, no service, no library, nothing sent anywhere (CLAUDE.md section 18).
 * The audio never leaves the page until the recording is complete.
 */

/** Quiet for this long, after speech, ends the turn. */
const SILENCE_MS = 1500;

/**
 * Nothing heard at all for this long: give up and say so.
 *
 * A muted microphone, an input another tab has taken, or someone who pressed
 * Call and walked away. Twenty-five seconds of nothing is indistinguishable
 * from the feature being broken.
 */
const NO_SPEECH_MS = 8000;

/**
 * Loud enough to be someone talking.
 *
 * Deliberately low. A missed word is a bad failure and a little room noise
 * costs nothing but a slightly later stop, so this errs towards hearing.
 */
const SPEECH_LEVEL = 0.015;

/** How often the level is measured. Ten times a second is far finer than speech. */
const EVERY_MS = 100;

export type Listening = { stop: () => void };

/**
 * Watch a live microphone stream and call back when the turn is over.
 *
 * @param onFinished Someone spoke, and has now stopped.
 * @param onNothingHeard Nothing was ever heard.
 *
 * Returns a handle whose stop() must be called when the recording ends for any
 * other reason — a press, an error, the panel closing — so the audio context
 * does not outlive it.
 */
export function listenForEndOfTurn(
  stream: MediaStream,
  onFinished: () => void,
  onNothingHeard: () => void
): Listening {
  const Ctor =
    typeof window === "undefined"
      ? undefined
      : (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext);

  // No Web Audio: the recording still works, it just has to be stopped by
  // hand, exactly as it did before. Never a reason to fail the whole turn.
  if (!Ctor) return { stop: () => {} };

  let context: AudioContext;
  let analyser: AnalyserNode;
  try {
    context = new Ctor();
    void context.resume();
    analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    context.createMediaStreamSource(stream).connect(analyser);
  } catch {
    return { stop: () => {} };
  }

  const samples = new Float32Array(analyser.fftSize);
  const began = Date.now();
  let spoke = false;
  let quietSince: number | null = null;
  let done = false;
  let timer = 0;

  function stop() {
    if (done) return;
    done = true;
    window.clearInterval(timer);
    try {
      void context.close();
    } catch {
      // Already closed.
    }
  }

  timer = window.setInterval(() => {
    if (done) return;

    analyser.getFloatTimeDomainData(samples);
    let sum = 0;
    for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
    const level = Math.sqrt(sum / samples.length);

    if (level > SPEECH_LEVEL) {
      spoke = true;
      quietSince = null;
      return;
    }

    if (!spoke) {
      if (Date.now() - began > NO_SPEECH_MS) {
        stop();
        onNothingHeard();
      }
      return;
    }

    // Quiet, and they had been talking. Wait to be sure it is the end of a
    // sentence and not the pause in the middle of one.
    quietSince ??= Date.now();
    if (Date.now() - quietSince > SILENCE_MS) {
      stop();
      onFinished();
    }
  }, EVERY_MS);

  return { stop };
}
