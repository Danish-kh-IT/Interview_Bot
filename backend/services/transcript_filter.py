import re
import struct

# Whisper often hallucinates these on silence / background noise
_HALLUCINATION_PHRASES = (
    "thank you for watching",
    "thanks for watching",
    "please subscribe",
    "like and subscribe",
    "subtitles by",
    "amara.org",
    "t-mobile",
    "i'm a deaf person",
    "i am a deaf person",
    "this song will never",
    "never be enough",
    "click the title",
    "correct message",
    "can't help searching",
    "she is not answering",
    "they found the correct",
    "watch one more time",
    "music playing",
    "captioned by",
    "transcribed by",
    "for watching",
    "see you in the next",
    "don't forget to subscribe",
)


def measure_wav_pcm(wav_bytes: bytes) -> dict:
    """Return peak, rms, and fraction of frames with audible speech."""
    if len(wav_bytes) < 44:
        return {"peak": 0.0, "rms": 0.0, "speech_ratio": 0.0}

    pcm = wav_bytes[44:]
    n = len(pcm) // 2
    if n == 0:
        return {"peak": 0.0, "rms": 0.0, "speech_ratio": 0.0}

    frame = 1600  # 100 ms at 16 kHz
    sum_sq = 0.0
    peak = 0.0
    speech_frames = 0
    total_frames = 0

    for i in range(0, n, frame):
        end = min(i + frame, n)
        frame_sq = 0.0
        for j in range(i, end):
            sample = struct.unpack_from("<h", pcm, j * 2)[0] / 32768.0
            frame_sq += sample * sample
            peak = max(peak, abs(sample))
        frame_rms = (frame_sq / (end - i)) ** 0.5
        sum_sq += frame_sq
        total_frames += 1
        if frame_rms > 0.012:
            speech_frames += 1

    rms = (sum_sq / n) ** 0.5
    speech_ratio = speech_frames / max(1, total_frames)
    return {"peak": peak, "rms": rms, "speech_ratio": speech_ratio}


def is_audio_too_quiet(wav_bytes: bytes) -> bool:
    m = measure_wav_pcm(wav_bytes)
    if m["peak"] < 0.018:
        return True
    if m["rms"] < 0.006:
        return True
    if m["speech_ratio"] < 0.08:
        return True
    return False


def is_likely_hallucination(text: str) -> bool:
    t = re.sub(r"\s+", " ", (text or "").lower().strip())
    if not t:
        return True
    if len(t) < 6:
        return True

    for phrase in _HALLUCINATION_PHRASES:
        if phrase in t:
            return True

    # Same chunk repeated twice (common Whisper artifact)
    words = t.split()
    if len(words) >= 8:
        mid = len(words) // 2
        first = " ".join(words[:mid])
        second = " ".join(words[mid:])
        if len(first) > 15 and first in second:
            return True

    return False


def sanitize_transcript(text: str) -> str:
    """Return cleaned transcript or empty string if unreliable."""
    cleaned = re.sub(r"\s+", " ", (text or "").strip())
    if is_likely_hallucination(cleaned):
        return ""
    return cleaned
