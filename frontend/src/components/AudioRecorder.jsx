import { useEffect, useRef, useCallback, useState } from "react";
import { encodeWav, mergeFloat32 } from "../utils/wavEncoder";
import { isLikelySpeech } from "../utils/audioAnalysis";

const SAMPLE_RATE = 16000;
const SILENCE_THRESHOLD = 2.5;        // lowered: detect softer voices quickly
const SILENCE_SHORT_MS = 1200;        // short answer: stop after 1.2s silence (was 1.8s)
const SILENCE_LONG_MS  = 2500;        // long answer: allow 2.5s thinking pause (was 3.2s)
const LONG_SPEECH_THRESHOLD_MS = 4000; // if spoken >= 4s → treat as long answer
const MIN_SPEECH_MS = 250;            // minimum speech: 250ms (was 600ms) — detect quick answers
const NO_SPEECH_TIMEOUT_MS = 10000;   // if no speech is detected for 10s, auto-stop

/* ── Mic Icon SVG ── */
function MicIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.93V20H9v2h6v-2h-2v-2.07A7 7 0 0 0 19 11h-2z" />
    </svg>
  );
}

/* ── Stop Icon SVG ── */
function StopIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  );
}

/* ── Ripple animation ring ── */
function RippleRing({ color = "rgba(239,68,68,0.5)" }) {
  return (
    <>
      {[1, 2].map((n) => (
        <div
          key={n}
          style={{
            position: "absolute",
            inset: -(n * 8),
            borderRadius: "50%",
            border: `1px solid ${color}`,
            animation: `pulseRing ${1.4 + n * 0.3}s ease-out infinite`,
            animationDelay: `${n * 0.3}s`,
          }}
        />
      ))}
    </>
  );
}

/* ── Voice Volume Visualizer ── */
function VoiceVisualizer({ volume }) {
  // volume is expected to be 0 to ~100
  const normalized = Math.min(Math.max(volume / 50, 0.1), 1);
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        alignItems: "center",
        height: 40,
        padding: "0 10px",
      }}
    >
      {[0.4, 0.8, 1, 0.8, 0.4].map((scale, i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: Math.max(8, 36 * normalized * scale),
            background: "linear-gradient(180deg, #ef4444, #dc2626)",
            borderRadius: 3,
            transition: "height 0.1s ease",
          }}
        />
      ))}
    </div>
  );
}

export default function AudioRecorder({
  onRecordingComplete,
  onNoVoice,
  isProcessing,
  recordingTrigger,
  onLiveText,
  onStopRef,
  onSpeechStart,
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);

  const pcmChunksRef = useRef([]);
  const sampleRateRef = useRef(SAMPLE_RATE);
  const processorRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const animFrameRef = useRef(null);
  const isRecordingRef = useRef(false);
  const hasSpokenRef = useRef(false);
  const speechMsRef = useRef(0);
  const lastLiveTextTimeRef = useRef(0);
  const isSRActiveRef = useRef(false); // true while SR recognition is actively running
  const onDoneRef = useRef(onRecordingComplete);
  const onNoVoiceRef = useRef(onNoVoice);
  const onLiveTextRef = useRef(onLiveText);
  const onSpeechStartRef = useRef(onSpeechStart);
  const noSpeechTimerRef = useRef(null);
  const stopRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    onDoneRef.current = onRecordingComplete;
    onNoVoiceRef.current = onNoVoice;
    onLiveTextRef.current = onLiveText;
    onSpeechStartRef.current = onSpeechStart;
  }, [onRecordingComplete, onNoVoice, onLiveText, onSpeechStart]);

  const finalizeRecording = useCallback(() => {
    const processor = processorRef.current;
    if (processor) {
      try {
        processor.onaudioprocess = null;
        processor.disconnect();
      } catch (_) {}
      processorRef.current = null;
    }

    const samples = mergeFloat32(pcmChunksRef.current);
    pcmChunksRef.current = [];

    if (samples.length < sampleRateRef.current * 0.4) {
      console.log("[AudioRecorder] Recording too short");
      onNoVoiceRef.current?.();
      return;
    }

    if (speechMsRef.current < MIN_SPEECH_MS) {
      console.log(
        "[AudioRecorder] Not enough speech (ms=",
        speechMsRef.current,
        ")",
      );
      onNoVoiceRef.current?.();
      return;
    }

    if (!isLikelySpeech(samples, sampleRateRef.current)) {
      console.log("[AudioRecorder] Audio failed speech quality check");
      onNoVoiceRef.current?.();
      return;
    }

    const blob = encodeWav(samples, sampleRateRef.current);
    console.log(
      "[AudioRecorder] WAV blob:",
      blob.size,
      "bytes, type:",
      blob.type,
    );
    onDoneRef.current?.(blob);
  }, []);

  /* ── stopRecording ── */
  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    setIsRecording(false);
    setVolume(0);
    onLiveTextRef.current?.("");
    cancelAnimationFrame(animFrameRef.current);
    clearTimeout(silenceTimerRef.current);
    clearTimeout(noSpeechTimerRef.current);
    silenceTimerRef.current = null;
    noSpeechTimerRef.current = null;
    isSRActiveRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch (_) {}
    recognitionRef.current = null;
    finalizeRecording();
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [finalizeRecording]);

  useEffect(() => {
    stopRef.current = stopRecording;
  }, [stopRecording]);
  // Expose stop function to parent via ref callback
  useEffect(() => {
    if (onStopRef) onStopRef.current = stopRecording;
  }, [onStopRef, stopRecording]);

  /* ── Silence detection (shared AudioContext) ── */
  const startSilenceDetection = useCallback((analyser) => {
    try {
      const data = new Uint8Array(analyser.fftSize);
      hasSpokenRef.current = false;
      speechMsRef.current = 0;

      if (noSpeechTimerRef.current) clearTimeout(noSpeechTimerRef.current);
      noSpeechTimerRef.current = setTimeout(() => {
        if (isRecordingRef.current && !hasSpokenRef.current) {
          console.log("[AudioRecorder] Absolute timeout - no speech detected");
          stopRef.current?.();
        }
      }, NO_SPEECH_TIMEOUT_MS);

      let lastTime = performance.now();
      const check = () => {
        if (!isRecordingRef.current) return;
        const now = performance.now();
        const delta = now - lastTime;
        lastTime = now;

        analyser.getByteTimeDomainData(data);
        let sumSq = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / data.length) * 100;
        setVolume(rms);
        
        if (hasSpokenRef.current) {
          speechMsRef.current += delta;
        }

        if (rms > SILENCE_THRESHOLD) {
          if (!hasSpokenRef.current) {
            onSpeechStartRef.current?.();
            hasSpokenRef.current = true;
            if (noSpeechTimerRef.current) {
              clearTimeout(noSpeechTimerRef.current);
              noSpeechTimerRef.current = null;
            }
          }
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (hasSpokenRef.current) {
          const timeSinceLastText = performance.now() - (lastLiveTextTimeRef.current || 0);
          // Only block silence timer if SR is actively transcribing AND very recent
          const isBrowserTranscribing = isSRActiveRef.current && timeSinceLastText < 400;

          if (isBrowserTranscribing) {
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
          } else if (!silenceTimerRef.current) {
            // Adaptive silence window:
            // — Short answer (< 4s of speech) → 1.8s silence = stop quickly
            // — Long  answer (>= 4s of speech) → 3.2s silence = allow thinking pauses
            const isLongAnswer = speechMsRef.current >= LONG_SPEECH_THRESHOLD_MS;
            const silenceWait = isLongAnswer ? SILENCE_LONG_MS : SILENCE_SHORT_MS;
            silenceTimerRef.current = setTimeout(() => {
              silenceTimerRef.current = null;
              if (isRecordingRef.current) stopRef.current?.();
            }, silenceWait);
          }
        }
        animFrameRef.current = requestAnimationFrame(check);
      };
      animFrameRef.current = requestAnimationFrame(check);
    } catch (e) {
      console.warn("Silence detection unavailable:", e);
    }
  }, []);

  /* ── Live speech-to-text ── */
  const startLiveTranscription = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;
    let finalText = "";
    recognition.onstart = () => { isSRActiveRef.current = true; };
    recognition.onend = () => { isSRActiveRef.current = false; };
    recognition.onerror = (e) => {
      isSRActiveRef.current = false;
      if (e.error !== "no-speech") console.warn("SR error:", e.error);
    };
    recognition.onresult = (e) => {
      lastLiveTextTimeRef.current = performance.now();
      isSRActiveRef.current = true; // still producing results
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " ";
        else interim = t;
      }
      onLiveTextRef.current?.((finalText + interim).trim());
    };
    try {
      recognition.start();
    } catch (_) {}
  }, []);

  /* ── startRecording ── */
  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) return;
    hasSpokenRef.current = false;
    speechMsRef.current = 0;
    onLiveTextRef.current?.("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Record as 16 kHz mono WAV (Groq Whisper accepts this reliably)
      const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();
      sampleRateRef.current = ctx.sampleRate;
      const source = ctx.createMediaStreamSource(stream);

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      pcmChunksRef.current = [];
      const processor = ctx.createScriptProcessor(1024, 1, 1); // smaller buffer = lower latency
      processorRef.current = processor;
      processor.onaudioprocess = (e) => {
        if (!isRecordingRef.current) return;
        pcmChunksRef.current.push(
          new Float32Array(e.inputBuffer.getChannelData(0)),
        );
      };
      source.connect(processor);
      processor.connect(ctx.destination);

      isRecordingRef.current = true;
      setIsRecording(true);
      startSilenceDetection(analyser);
      startLiveTranscription();
    } catch (err) {
      console.error("Mic error:", err);
      alert("Microphone access is required for the interview.");
    }
  }, [startSilenceDetection, startLiveTranscription]);

  useEffect(() => {
    if (recordingTrigger > 0 && !isProcessing) startRecording();
  }, [recordingTrigger]); // eslint-disable-line

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      clearTimeout(silenceTimerRef.current);
      try {
        recognitionRef.current?.stop();
      } catch (_) {}
      if (isRecordingRef.current) {
        isRecordingRef.current = false;
        finalizeRecording();
      }
      audioCtxRef.current?.close().catch(() => {});
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /* ── RENDER ── */
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      {isProcessing ? (
        /* Processing state */
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
              border: "2px solid var(--border-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: "2.5px solid rgba(99,102,241,0.25)",
                borderTopColor: "#6366f1",
              }}
              className="animate-spin"
            />
          </div>
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            Evaluating…
          </p>
        </div>
      ) : isRecording ? (
        /* Recording state */
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <VoiceVisualizer volume={volume} />
            <button
              onClick={stopRecording}
              style={{
                position: "relative",
                zIndex: 1,
                width: 50,
                height: 50,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow: "0 6px 24px rgba(239,68,68,0.45)",
                transition:
                  "transform var(--ease-bounce), box-shadow var(--ease-normal)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <StopIcon size={16} />
            </button>
            <VoiceVisualizer volume={volume} />
          </div>
          <p
            style={{ fontSize: "0.75rem", color: "#f87171", fontWeight: 600 }}
            className="animate-pulse"
          >
            🎙 Listening…
          </p>
        </div>
      ) : (
        /* Idle state */
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <button
            onClick={startRecording}
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 6px 24px rgba(99,102,241,0.40)",
              transition:
                "transform var(--ease-bounce), box-shadow var(--ease-normal)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.06)";
              e.currentTarget.style.boxShadow =
                "0 10px 32px rgba(99,102,241,0.55)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow =
                "0 6px 24px rgba(99,102,241,0.40)";
            }}
          >
            <MicIcon size={24} />
          </button>
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            Tap to speak
          </p>
        </div>
      )}
    </div>
  );
}
