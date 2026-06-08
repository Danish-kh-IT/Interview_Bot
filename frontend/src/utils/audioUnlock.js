// Global audio unlock utility
// Call this once on first user interaction to unlock browser autoplay policy
let audioUnlocked = false;

export function unlockAudio() {
  if (audioUnlocked) return;
  // Play a silent sound to unlock autoplay
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const buf = ctx.createBuffer(1, 1, 22050);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(0);
  ctx.resume().then(() => {
    audioUnlocked = true;
    console.log("Audio unlocked");
  });
}

export function isAudioUnlocked() {
  return audioUnlocked;
}
