from groq import AsyncGroq
import edge_tts
import tempfile
import base64
import os
import sys
import asyncio
from fastapi import UploadFile
from dotenv import load_dotenv
from services.transcript_filter import is_audio_too_quiet, sanitize_transcript

load_dotenv()

client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY"))

# Browser MediaRecorder WebM often lacks a parseable audio track for Groq — convert first.
_NEEDS_CONVERSION = {".webm", ".weba", ".ogg", ".opus", ".m4a", ".mp4"}


def _guess_extension(content_type: str, filename: str) -> str:
    ct = (content_type or "").split(";")[0].strip().lower()
    mapping = {
        "audio/webm": ".webm",
        "audio/ogg": ".ogg",
        "audio/wav": ".wav",
        "audio/x-wav": ".wav",
        "audio/mpeg": ".mp3",
        "audio/mp3": ".mp3",
        "audio/mp4": ".m4a",
        "audio/x-m4a": ".m4a",
    }
    if ct in mapping:
        return mapping[ct]
    if filename and "." in filename:
        return os.path.splitext(filename)[1].lower()
    return ".webm"


def _is_wav(audio_bytes: bytes) -> bool:
    return len(audio_bytes) >= 12 and audio_bytes[:4] == b"RIFF" and audio_bytes[8:12] == b"WAVE"


def _run_ffmpeg_to_wav(audio_bytes: bytes, input_ext: str) -> bytes:
    """Sync ffmpeg conversion — works on Windows regardless of asyncio event loop."""
    import subprocess
    from imageio_ffmpeg import get_ffmpeg_exe

    ffmpeg = get_ffmpeg_exe()
    input_fd, input_path = tempfile.mkstemp(suffix=input_ext)
    output_fd, output_path = tempfile.mkstemp(suffix=".wav")
    os.close(input_fd)
    os.close(output_fd)

    try:
        with open(input_path, "wb") as f:
            f.write(audio_bytes)

        cmd = [
            ffmpeg,
            "-y",
            "-nostdin",
            "-i",
            input_path,
            "-vn",
            "-acodec",
            "pcm_s16le",
            "-ar",
            "16000",
            "-ac",
            "1",
            "-f",
            "wav",
            output_path,
        ]
        result = subprocess.run(
            cmd,
            capture_output=True,
            timeout=60,
            check=False,
        )
        if result.returncode != 0:
            err = result.stderr.decode(errors="replace").strip()[-400:]
            raise RuntimeError(err or f"ffmpeg exited with code {result.returncode}")

        with open(output_path, "rb") as f:
            wav_bytes = f.read()

        if len(wav_bytes) < 1000:
            raise RuntimeError("ffmpeg produced empty WAV output")

        print(f"[TRANSCRIBE] Converted {len(audio_bytes)} bytes -> {len(wav_bytes)} bytes WAV")
        return wav_bytes
    finally:
        for path in (input_path, output_path):
            try:
                os.remove(path)
            except OSError:
                pass


async def _convert_to_wav(audio_bytes: bytes, input_ext: str) -> bytes:
    if _is_wav(audio_bytes):
        print("[TRANSCRIBE] Input is already WAV, skipping conversion")
        return audio_bytes
    return await asyncio.to_thread(_run_ffmpeg_to_wav, audio_bytes, input_ext)


async def _groq_transcribe(audio_bytes: bytes, filename: str, content_type: str) -> str:
    content_type_clean = content_type.split(";")[0].strip()
    # No prompt — prompts increase Whisper hallucinations on quiet audio
    transcription = await client.audio.transcriptions.create(
        file=(filename, audio_bytes, content_type_clean),
        model="whisper-large-v3",
        response_format="text",
        temperature=0,
        language="en",
    )
    cleaned = sanitize_transcript(transcription)
    if not cleaned and transcription:
        print(f"[TRANSCRIBE] Filtered hallucination: '{transcription[:120]}'")
    return cleaned


async def transcribe_audio(file: UploadFile) -> str:
    audio_bytes = await file.read()
 
    if len(audio_bytes) < 500:
        print(f"[TRANSCRIBE] Audio too small ({len(audio_bytes)} bytes) — treating as silence")
        return ""

    content_type = (file.content_type or "audio/webm").lower()
    filename = file.filename or "audio.webm"
    ext = _guess_extension(content_type, filename)

    print(
        f"[TRANSCRIBE] Received {len(audio_bytes)} bytes, "
        f"content_type={content_type}, filename={filename}, ext={ext}"
    )

    # Already-valid WAV from frontend → send directly to Groq
    if _is_wav(audio_bytes):
        filename = "audio.wav"
        content_type = "audio/wav"
        ext = ".wav"
    # Browser WebM/OGG/MP4 → convert first (Groq often rejects raw webm)
    elif ext in _NEEDS_CONVERSION:
        try:
            audio_bytes = await _convert_to_wav(audio_bytes, ext)
            filename = "audio.wav"
            content_type = "audio/wav"
            ext = ".wav"
        except Exception as conv_err:
            msg = str(conv_err).strip() or repr(conv_err)
            print(f"[TRANSCRIBE] Conversion failed: {msg}")
            raise Exception(f"Audio conversion failed: {msg}") from conv_err

    # Skip Whisper on near-silent audio (main cause of fake transcripts)
    if _is_wav(audio_bytes) and is_audio_too_quiet(audio_bytes):
        print("[TRANSCRIBE] Audio too quiet — skipping Whisper to avoid hallucinations")
        return ""

    for attempt in range(3):
        try:
            print(
                f"[TRANSCRIBE] Submitting to Groq: filename={filename}, "
                f"bytes={len(audio_bytes)}, attempt={attempt + 1}"
            )
            return await _groq_transcribe(audio_bytes, filename, content_type)
        except Exception as e:
            err_str = str(e)
            print(f"[TRANSCRIBE] Attempt {attempt + 1}/3 failed: {err_str[:200]}")

            if "429" in err_str or "rate_limit" in err_str.lower():
                await asyncio.sleep((attempt + 1) * 5)
                continue

            # Last resort: convert even if we thought format was OK
            if attempt == 0 and ext not in _NEEDS_CONVERSION:
                try:
                    audio_bytes = await _convert_to_wav(audio_bytes, ext or ".webm")
                    filename = "audio.wav"
                    content_type = "audio/wav"
                    continue
                except Exception:
                    pass

            if attempt < 2:
                await asyncio.sleep(2)
                continue

            raise Exception(f"Transcription failed: {err_str[:200]}") from e

    raise Exception("Transcription failed after all attempts")


async def transcribe_audio_bytes(audio_bytes: bytes, filename: str, content_type: str) -> str:
    """
    Transcribe audio from raw bytes (used by WebSocket endpoint).
    Same logic as transcribe_audio() but accepts bytes directly.
    """
    if len(audio_bytes) < 500:
        print(f"[TRANSCRIBE-WS] Audio too small ({len(audio_bytes)} bytes) — treating as silence")
        return ""

    ext = _guess_extension(content_type, filename)

    print(
        f"[TRANSCRIBE-WS] Received {len(audio_bytes)} bytes, "
        f"content_type={content_type}, filename={filename}, ext={ext}"
    )

    if _is_wav(audio_bytes):
        filename = "audio.wav"
        content_type = "audio/wav"
        ext = ".wav"
    elif ext in _NEEDS_CONVERSION:
        try:
            audio_bytes = await _convert_to_wav(audio_bytes, ext)
            filename = "audio.wav"
            content_type = "audio/wav"
            ext = ".wav"
        except Exception as conv_err:
            msg = str(conv_err).strip() or repr(conv_err)
            print(f"[TRANSCRIBE-WS] Conversion failed: {msg}")
            raise Exception(f"Audio conversion failed: {msg}") from conv_err

    if _is_wav(audio_bytes) and is_audio_too_quiet(audio_bytes):
        print("[TRANSCRIBE-WS] Audio too quiet — skipping Whisper")
        return ""

    for attempt in range(3):
        try:
            print(
                f"[TRANSCRIBE-WS] Submitting to Groq: filename={filename}, "
                f"bytes={len(audio_bytes)}, attempt={attempt + 1}"
            )
            return await _groq_transcribe(audio_bytes, filename, content_type)
        except Exception as e:
            err_str = str(e)
            print(f"[TRANSCRIBE-WS] Attempt {attempt + 1}/3 failed: {err_str[:200]}")

            if "429" in err_str or "rate_limit" in err_str.lower():
                await asyncio.sleep((attempt + 1) * 5)
                continue

            if attempt == 0 and ext not in _NEEDS_CONVERSION:
                try:
                    audio_bytes = await _convert_to_wav(audio_bytes, ext or ".webm")
                    filename = "audio.wav"
                    content_type = "audio/wav"
                    continue
                except Exception:
                    pass

            if attempt < 2:
                await asyncio.sleep(2)
                continue

            raise Exception(f"Transcription failed: {err_str[:200]}") from e

    raise Exception("Transcription failed after all attempts")

async def generate_tts(text: str) -> str:
    # Use mkstemp to avoid Windows file-locking issue with NamedTemporaryFile
    temp_fd, temp_path = tempfile.mkstemp(suffix=".mp3")
    os.close(temp_fd)  # Close fd so edge-tts can write freely

    try:
        communicate = edge_tts.Communicate(text, "en-US-AriaNeural")
        await communicate.save(temp_path)

        with open(temp_path, "rb") as f:
            audio_bytes = f.read()

        if len(audio_bytes) == 0:
            raise ValueError(f"TTS generated empty file for text: {text[:50]}")

        return base64.b64encode(audio_bytes).decode("utf-8")
    except Exception as e:
        print(f"[TTS ERROR] {e}", file=sys.stderr)
        raise
    finally:
        try:
            os.remove(temp_path)
        except Exception:
            pass
