/** Analyze recorded PCM samples for real speech (not background noise). */
export function analyzeAudio(samples, sampleRate = 16000) {
  if (!samples?.length) {
    return { rms: 0, peak: 0, speechMs: 0, durationSec: 0 };
  }

  const frameSize = Math.max(1, Math.floor(sampleRate * 0.05)); // 50 ms frames
  const speechThreshold = 0.012;
  let sumSq = 0;
  let peak = 0;
  let speechMs = 0;

  for (let i = 0; i < samples.length; i += frameSize) {
    const end = Math.min(i + frameSize, samples.length);
    let frameSq = 0;
    for (let j = i; j < end; j++) {
      const s = samples[j];
      frameSq += s * s;
      peak = Math.max(peak, Math.abs(s));
    }
    const frameRms = Math.sqrt(frameSq / (end - i));
    sumSq += frameSq;
    if (frameRms > speechThreshold) {
      speechMs += 50;
    }
  }

  return {
    rms: Math.sqrt(sumSq / samples.length),
    peak,
    speechMs,
    durationSec: samples.length / sampleRate,
  };
}

export function isLikelySpeech(samples, sampleRate = 16000) {
  const { peak, rms, speechMs, durationSec } = analyzeAudio(samples, sampleRate);
  if (durationSec < 0.5) return false;
  if (peak < 0.025) return false;        // stricter peak for background noise
  if (rms < 0.008) return false;         // stricter rms for background noise
  if (speechMs < 400) return false;      // was 1000ms - detect shorter answers
  return true;
}
