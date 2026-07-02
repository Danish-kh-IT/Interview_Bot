import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  generateQuestions,
  getFirstQuestion,
  endInterview,
} from "../utils/api";
import { InterviewSocket } from "../utils/socket";
import AudioPlayer, { stopCurrentAudio } from "../components/AudioPlayer";
import AudioRecorder from "../components/AudioRecorder";

/* ── Professional SVG Logo Mark (shared) ── */
function LogoMark({ size = 28 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="lgIntv"
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#lgIntv)" />
      <circle cx="16" cy="11" r="3.5" fill="white" fillOpacity="0.95" />
      <circle cx="9" cy="19" r="2.5" fill="white" fillOpacity="0.75" />
      <circle cx="23" cy="19" r="2.5" fill="white" fillOpacity="0.75" />
      <circle cx="16" cy="24" r="2" fill="white" fillOpacity="0.6" />
      <line
        x1="16"
        y1="14.5"
        x2="10.5"
        y2="17"
        stroke="white"
        strokeOpacity="0.5"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <line
        x1="16"
        y1="14.5"
        x2="21.5"
        y2="17"
        stroke="white"
        strokeOpacity="0.5"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <line
        x1="11"
        y1="21"
        x2="15"
        y2="23"
        stroke="white"
        strokeOpacity="0.4"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <line
        x1="21"
        y1="21"
        x2="17"
        y2="23"
        stroke="white"
        strokeOpacity="0.4"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── AI Avatar SVG (no emoji) ── */
function AIAvatarIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="11" r="3.5" fill="white" fillOpacity="0.9" />
      <circle cx="9" cy="19" r="2.5" fill="white" fillOpacity="0.7" />
      <circle cx="23" cy="19" r="2.5" fill="white" fillOpacity="0.7" />
      <circle cx="16" cy="25" r="2" fill="white" fillOpacity="0.55" />
      <line
        x1="16"
        y1="14.5"
        x2="10.5"
        y2="17"
        stroke="white"
        strokeOpacity="0.5"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <line
        x1="16"
        y1="14.5"
        x2="21.5"
        y2="17"
        stroke="white"
        strokeOpacity="0.5"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <line
        x1="11"
        y1="21"
        x2="15"
        y2="23.5"
        stroke="white"
        strokeOpacity="0.4"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <line
        x1="21"
        y1="21"
        x2="17"
        y2="23.5"
        stroke="white"
        strokeOpacity="0.4"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── Typewriter hook ── */
function useTypewriter(text, speed = 20) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!text) {
      setDisplayed("");
      return;
    }
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text]);
  return displayed;
}

/* ── AI Avatar ── */
function AIAvatar({ size = 40, pulse = false }) {
  return (
    <div
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      {pulse && (
        <div
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: "50%",
            background: "rgba(99,102,241,0.3)",
          }}
          className="pulse-ring"
        />
      )}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <AIAvatarIcon size={Math.round(size * 0.58)} />
      </div>
    </div>
  );
}

/* ── User Avatar ── */
function UserAvatar({ size = 40 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: "linear-gradient(135deg, #334155, #475569)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.3,
        fontWeight: 700,
        color: "#94a3b8",
        border: "2px solid rgba(148,163,184,0.2)",
      }}
    >
      You
    </div>
  );
}

/* ── Typing Indicator ── */
function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
      <AIAvatar size={38} pulse />
      <div
        style={{
          background: "rgba(99,102,241,0.10)",
          border: "1px solid rgba(99,102,241,0.18)",
          borderRadius: "4px 18px 18px 18px",
          padding: "12px 18px",
          display: "flex",
          gap: 5,
          alignItems: "center",
        }}
      >
        {[0, 160, 320].map((d) => (
          <span
            key={d}
            className="bounce-dot"
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#818cf8",
              animationDelay: `${d}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Countdown Badge ── */
function CountdownBadge({ seconds }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "rgba(16,185,129,0.12)",
        border: "1px solid rgba(16,185,129,0.3)",
        borderRadius: 20,
        padding: "4px 12px",
        fontSize: "0.75rem",
        color: "#6ee7b7",
        fontWeight: 600,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: "#10b981",
          boxShadow: "0 0 6px #10b981",
          display: "inline-block",
        }}
        className="animate-pulse"
      />
      Next question in {seconds}s…
    </div>
  );
}

/* ── Confirmation Panel ── */
function ConfirmationPanel({
  onPrimary,
  onSecondary,
  primaryLabel,
  secondaryLabel,
  hint,
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      {hint && (
        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            fontWeight: 500,
            textAlign: "center",
            marginBottom: 2,
          }}
        >
          {hint}
        </p>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onPrimary}
          style={{
            padding: "9px 22px",
            borderRadius: 24,
            border: "none",
            cursor: "pointer",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.85rem",
            boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
            transition: "transform 0.15s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "scale(1.04)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          {primaryLabel}
        </button>
        {onSecondary && secondaryLabel && (
          <button
            onClick={onSecondary}
            style={{
              padding: "9px 18px",
              borderRadius: 24,
              cursor: "pointer",
              background: "transparent",
              border: "1px solid rgba(148,163,184,0.25)",
              color: "var(--text-muted)",
              fontWeight: 500,
              fontSize: "0.82rem",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "rgba(148,163,184,0.55)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "rgba(148,163,184,0.25)")
            }
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── speak helper (browser TTS) ── */
function speak(text, onEnd) {
  if (!window.speechSynthesis) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.95;
  u.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const pref = voices.find(
    (v) =>
      /google|samantha|daniel|alex/i.test(v.name) && v.lang.startsWith("en"),
  );
  if (pref) u.voice = pref;

  // Fallback: if onend never fires (known Chrome/Windows bug), force it after timeout
  let fired = false;
  const fallbackMs = Math.max(4000, text.length * 80); // ~80ms per char
  const fallback = setTimeout(() => {
    if (!fired) {
      fired = true;
      onEnd?.();
    }
  }, fallbackMs);

  u.onend = () => {
    if (!fired) {
      fired = true;
      clearTimeout(fallback);
      onEnd?.();
    }
  };
  u.onerror = () => {
    if (!fired) {
      fired = true;
      clearTimeout(fallback);
      onEnd?.();
    }
  };
  window.speechSynthesis.speak(u);
}

/* ── phrase detection helpers ── */
const READY_PHRASES = [
  "yes",
  "yeah",
  "yep",
  "sure",
  "ready",
  "okay next question please",
  "okay",
  "let's go",
  "continue",
  "next",
  "proceed",
  "go ahead",
  "absolutely",
  "of course",
  "i'm ready",
  "next question",
  "i want to move next question",
  "definitely",
  "definitely next question",
];
const NOT_READY_PHRASES = [
  "no",
  "nope",
  "wait",
  "not ready",
  "hold on",
  "one minute",
  "just a minute",
  "i'm not ready",
  "i am not ready",
  "not ready yet",
  // End interview commands
  "end",
  "stop",
  "finish",
  "done",
  "end interview",
  "stop interview",
  "end the interview",
  "stop the interview",
  "finish the interview",
  "i want to end",
  "want to end",
  "end it",
  "that's all",
  "thats all",
  "i'm done",
  "i am done",
  "end the meeting",
  "stop the meeting",
];
const HEAR_ME_RESPONSES = [
  "yes",
  "yeah",
  "yep",
  "i can hear",
  "i hear you",
  "yes i can",
  "can hear",
  "you are audible",
  "i can hear you",
  "ok",
  "okay",
  "sure",
  "here",
  "present",
  "i'm here",
  "i'm present",
];

/* Additional phrase sets for repeat/end flow */
const YES_PHRASES = [
  "yes",
  "yeah",
  "yep",
  "sure",
  "ok",
  "okay",
  "go ahead",
  "of course",
  "please",
  "repeat",
];
const NO_PHRASES = [
  "no",
  "nope",
  "don't",
  "end",
  "stop",
  "finish",
];

function matchesPhrases(transcript, phrases) {
  const t = transcript.toLowerCase().trim();
  return phrases.some((p) => t.includes(p));
}

/* ─────────────────────────────────────────────────────────────── */
/*                       MAIN COMPONENT                            */
/* ─────────────────────────────────────────────────────────────── */
export default function Interview({ sessionData, setSessionData }) {
  /* ── Core state ── */
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWelcomePhase, setIsWelcomePhase] = useState(true);
  const [questionsReady, setQuestionsReady] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [recordingTrigger, setRecordingTrigger] = useState(0);
  const [currentBotText, setCurrentBotText] = useState("");
  const [liveText, setLiveText] = useState("");
  const typedBotText = useTypewriter(currentBotText, 20);

  /* ── Confirmation flow state ── */
  // 'idle' | 'awaiting_next' | 'confirm_end' | 'confirm_repeat' | 'confirm_listening'
  const [flowPhase, setFlowPhase] = useState("idle");
  const [countdown, setCountdown] = useState(0);
  const currentQuestionTextRef = useRef(""); // stores the active question text for repeat

  /* ── Refs ── */
  const navigate = useNavigate();
  const chatEndRef = useRef(null);
  const waitIntervalRef = useRef(null);
  const countdownRef = useRef(null);
  const silenceCheckRef = useRef(null);
  const confirmRecogRef = useRef(null);
  const pendingNextDataRef = useRef(null);
  const isRetryRef = useRef(false);
  const noVoiceRetryCountRef = useRef(0);
  const flowPhaseRef = useRef("idle");
  const scheduleSilenceCheckRef = useRef(null);
  const handleEndCallRef = useRef(null);
  const askEndInterviewRef = useRef(null);
  const askRepeatQuestionRef = useRef(null);
  const repeatCurrentQuestionRef = useRef(null);
  const confirmAdvanceNextRef = useRef(null);
  // WebSocket
  const socketRef = useRef(null);
  // Streaming TTS audio queue
  const ttsQueueRef = useRef([]);
  const ttsPlayingRef = useRef(false);
  const _pendingTTSCallback = useRef(null);
  const _drainTTSQueueRef = useRef(null); // ref so it's accessible inside useEffect
  const askMoveToNextRef = useRef(null);  // same
  const askAreYouListeningRef = useRef(null);

  /* ── Phrase sets for repeat/end flow are now module-level constants ── */

  /* progress % */
  const qNum = sessionData?.question_number ?? 0;
  const progressPct = Math.round((qNum / 10) * 100);

  /* ── Keep flowPhaseRef in sync and also track current question ── */
  const setFlowPhaseSync = (val) => {
    flowPhaseRef.current = val;
    setFlowPhase(val);
  };

  /* ── Store current question text whenever sessionData changes ── */
  useEffect(() => {
    if (sessionData?.question_text) {
      currentQuestionTextRef.current = sessionData.question_text;
    }
  }, [sessionData?.question_text]);

  /* ── Scroll to bottom ── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isProcessing, liveText, flowPhase]);

  /* ── Cleanup on unmount ── */
  useEffect(
    () => () => {
      clearInterval(waitIntervalRef.current);
      clearInterval(countdownRef.current);
      clearTimeout(silenceCheckRef.current);
      stopConfirmRecognition();
      window.speechSynthesis?.cancel();
      socketRef.current?.disconnect();
    },
    [],
  ); // eslint-disable-line

  /* ── Load questions + connect WebSocket ── */
  useEffect(() => {
    if (!sessionData?.session_id) {
      navigate("/");
      return;
    }
    generateQuestions(sessionData.session_id)
      .then(() => setQuestionsReady(true))
      .catch((err) => console.error("Question gen error:", err));

    // Connect WebSocket
    const socket = new InterviewSocket(sessionData.session_id);
    socketRef.current = socket;

    socket.connect().then(() => {
      console.log("[Interview] WebSocket connected");
    }).catch((err) => {
      console.warn("[Interview] WebSocket failed to connect, falling back to REST:", err);
    });

    // ── Handle streaming TTS chunks from server ──
    socket.on("tts_chunk", (msg) => {
      ttsQueueRef.current.push({ audio: msg.audio, isLast: msg.is_last, text: msg.text });
      if (!ttsPlayingRef.current) {
        _drainTTSQueueRef.current?.();
      }
    });

    // ── Question text arrives before audio ──
    socket.on("question_start", (msg) => {
      // NOTE: Do NOT clear isProcessing here, otherwise AudioRecorder starts picking up TTS!
      setIsWelcomePhase(false);
      setChatHistory((prev) => [...prev, { type: "bot", text: msg.question_text }]);
      setCurrentBotText(msg.question_text);
      setSessionData((prev) => ({
        ...prev,
        question_text: msg.question_text,
        question_number: msg.question_number,
        audio_base64: null,
      }));
    });

    // ── All TTS chunks sent, recording can start ──
    socket.on("question_done", (_msg) => {
      // Recording starts only after TTS queue finishes playing
      // handled inside _drainTTSQueue isLast callback
    });

    // ── Transcript received (show user bubble immediately) ──
    socket.on("transcript", (msg) => {
      setChatHistory((prev) => [...prev, { type: "user", text: msg.text }]);
      setLiveText("");
    });

    // ── No speech detected ──
    socket.on("no_speech", () => {
      setIsProcessing(false);
      noVoiceRetryCountRef.current += 1;
      if (noVoiceRetryCountRef.current <= 2) {
        setTimeout(() => {
          if (flowPhaseRef.current === "idle") setRecordingTrigger((p) => p + 1);
        }, 800);
      } else {
        noVoiceRetryCountRef.current = 0;
        askAreYouListeningRef.current?.();
      }
    });

    // ── Done: evaluation complete ──
    socket.on("done", (msg) => {
      setIsProcessing(false);
      if (msg.completed) {
        setFlowPhaseSync("ending");
        const endMsg = "Thank you so much for your time today. Your interview is now complete. We will generate your performance report shortly. Have a great day!";
        speak(endMsg, () => navigate("/result"));
        return;
      }
      if (msg.awaiting_confirmation) {
        noVoiceRetryCountRef.current = 0;
        if (msg.is_last_question) {
          confirmAdvanceNextRef.current?.();
        } else {
          askMoveToNextRef.current?.();
        }
      }
    });

    // ── Server error ──
    socket.on("error", (msg) => {
      setIsProcessing(false);
      setChatHistory((prev) => [...prev, {
        type: "bot",
        text: `⚠️ Error: ${msg.message}. Please try again.`,
        isError: true,
      }]);
    });

  }, []); // eslint-disable-line

  /* ── Drain TTS audio queue (play chunks sequentially) ── */
  function _drainTTSQueue() {
    const next = ttsQueueRef.current.shift();
    if (!next) {
      ttsPlayingRef.current = false;
      return;
    }
    ttsPlayingRef.current = true;
    setSessionData((prev) => ({ ...prev, audio_base64: next.audio }));
    _pendingTTSCallback.current = () => {
      if (next.isLast) {
        ttsPlayingRef.current = false;
        setIsProcessing(false); // FIX: allow AudioRecorder to start
        setRecordingTrigger((p) => p + 1);
        scheduleSilenceCheckRef.current?.();
      } else {
        _drainTTSQueue();
      }
    };
  }
  // Keep ref in sync so useEffect handlers can call it
  _drainTTSQueueRef.current = _drainTTSQueue;

  /* ──────────────────────────────────────────────── */
  /*          Confirmation Recognition               */
  /* ──────────────────────────────────────────────── */
  const stopConfirmRecognition = () => {
    try {
      confirmRecogRef.current?.stop();
    } catch (_) {}
    confirmRecogRef.current = null;
  };

  const startConfirmListening = useCallback(
    (onMatch, phraseSet = READY_PHRASES, onNoMatch = null, noPhraseSet = NOT_READY_PHRASES) => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return;
      stopConfirmRecognition();
      const recog = new SR();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = "en-US";
      confirmRecogRef.current = recog;
      recog.onresult = (e) => {
        const transcript = Array.from(e.results)
          .map((r) => r[0].transcript)
          .join(" ");
        if (matchesPhrases(transcript, phraseSet)) {
          stopConfirmRecognition();
          onMatch(transcript);
        } else if (onNoMatch && matchesPhrases(transcript, noPhraseSet)) {
          stopConfirmRecognition();
          onNoMatch(transcript);
        } else {
          // try again
          try {
            recog.start();
          } catch (_) {}
        }
      };
      recog.onerror = (e) => {
        if (e.error === "no-speech" || e.error === "aborted") {
          try {
            recog.start();
          } catch (_) {}
        }
      };
      recog.onend = () => {
        // restart if still needed
        if (confirmRecogRef.current === recog) {
          try {
            recog.start();
          } catch (_) {}
        }
      };
      try {
        recog.start();
      } catch (_) {}
    },
    [],
  );

  /* ──────────────────────────────────────────────── */
  /*     Move to next question (with countdown)      */
  /* ──────────────────────────────────────────────── */
  const proceedToNextQuestion = useCallback(
    (data, delaySeconds = 0) => {
      stopConfirmRecognition();
      clearTimeout(silenceCheckRef.current);
      clearInterval(countdownRef.current);

      if (delaySeconds > 0) {
        setFlowPhaseSync("counting_down");
        setCountdown(delaySeconds);
        let remaining = delaySeconds;
        countdownRef.current = setInterval(() => {
          remaining -= 1;
          setCountdown(remaining);
          if (remaining <= 0) {
            clearInterval(countdownRef.current);
            setFlowPhaseSync("idle");
            if (!data?.audio_base64) {
              setRecordingTrigger((p) => p + 1);
            }
          }
        }, 1000);
      } else {
        setFlowPhaseSync("idle");
        if (!data?.audio_base64) {
          // No backend TTS — speak the question via browser TTS, then start recording
          speak(data?.question_text || "", () => {
            setRecordingTrigger((p) => p + 1);
            scheduleSilenceCheckRef.current?.();
          });
        }
      }

      // Update session & chat with next question data
      if (data) {
        const candidateText = data._candidateText || "";
        const additions = [];
        if (candidateText)
          additions.push({ type: "user", text: candidateText });
        additions.push({ type: "bot", text: data.question_text });
        setChatHistory((prev) => [...prev, ...additions]);
        setCurrentBotText(data.question_text);
        setSessionData((prev) => ({
          ...prev,
          question_text: data.question_text,
          audio_base64: data.audio_base64,
          question_number: data.question_number,
        }));
        pendingNextDataRef.current = null;
      }
    },
    [setSessionData],
  );

  /* ── Repeat current question and start recording ── */
  const repeatCurrentQuestion = useCallback(() => {
    stopConfirmRecognition();
    const questionText = currentQuestionTextRef.current;
    // NOTE: do NOT push to chatHistory again — question is already visible in chat
    setCurrentBotText(questionText); // keep typewriter effect showing current question
    speak(questionText, () => {
      setFlowPhaseSync("idle"); // start recorder ONLY AFTER speaking finishes
      setRecordingTrigger((p) => p + 1);
      scheduleSilenceCheckRef.current?.();
    });
  }, []);

  /* ── Step 4b: NO to next → ask end interview? ── */
  const askEndInterview = useCallback(() => {
    stopConfirmRecognition();
    setFlowPhaseSync("confirm_end");
    const msg = "Would you like to end the interview?";
    // Do not show confirmation messages in UI, just play voice
    speak(msg, () => {
      startConfirmListening(
        () => handleEndCallRef.current?.(),
        YES_PHRASES,
        () => askRepeatQuestionRef.current?.(),
      );
    });
  }, [startConfirmListening]);

  /* ── Step 4c: NO to end → ask repeat same question? ── */
  const askRepeatQuestion = useCallback(() => {
    stopConfirmRecognition();
    setFlowPhaseSync("confirm_repeat");
    const msg =
      "Would you like to repeat the question, or move to the next question?";
    // Do not show confirmation messages in UI, just play voice
    speak(msg, () => {
      startConfirmListening(
        () => {
          isRetryRef.current = true;
          repeatCurrentQuestionRef.current?.();
        },
        // "repeat"/"again"/"no" → repeat the same question (user doesn't want to move forward)
        ["repeat", "repeat question", "same question", "again", "yes", "yeah", "sure", "repeat it",
         "no", "nope", "don't", "not"],
        () => confirmAdvanceNextRef.current?.(),
        // "next"/"move on" → go to next question
        ["next", "next question", "move on", "proceed", "skip", "forward", "next one"]
      );
    });
  }, [startConfirmListening]);

  /* ── Step 3: After answer → confirm next question ── */
  const askMoveToNext = useCallback(() => {
    pendingNextDataRef.current = null;
    setFlowPhaseSync("awaiting_next");
    const msg =
      "Thank you for your answer. Shall we move on to the next question?";
    speak(msg, () => {
      // 500ms buffer after TTS ends to prevent echo capture by confirmation SR
      setTimeout(() => {
        startConfirmListening(
          () => confirmAdvanceNextRef.current?.(),
          READY_PHRASES,
          () => askEndInterviewRef.current?.(),
        );
      }, 500);
    });
  }, [startConfirmListening]);

  /* ── Step 3 YES: advance to next question via WebSocket or REST ── */
  const confirmAdvanceNext = useCallback(async () => {
    if (isProcessing) return;
    stopConfirmRecognition();
    setIsProcessing(true);

    // WebSocket path
    const socket = socketRef.current;
    if (socket?.isConnected) {
      setFlowPhaseSync("idle");
      socket.advanceQuestion();
      // Response handled by socket.on("question_start") + socket.on("tts_chunk") + socket.on("done")
      return;
    }

    // REST fallback
    try {
      const { advanceQuestion } = await import("../utils/api");
      const data = await advanceQuestion(sessionData.session_id);
      if (data.completed) {
        setFlowPhaseSync("ending");
        setIsProcessing(false);
        const endMsg = "That was the last question. Thank you so much for your time today. Your interview is now complete. We will generate your performance report shortly. Have a great day!";
        speak(endMsg, () => navigate("/result"));
        return;
      }
      setIsProcessing(false);
      proceedToNextQuestion(data, 0);
      scheduleSilenceCheckRef.current?.();
    } catch (err) {
      console.error("[Advance Question Error]", err);
      setIsProcessing(false);
      setChatHistory((prev) => [...prev, {
        type: "bot",
        text: "Unable to load the next question. Please try again.",
        isError: true,
      }]);
      setFlowPhaseSync("awaiting_next");
    }
  }, [sessionData, navigate, proceedToNextQuestion, isProcessing]);

  /* ── Step 1: No speech → "Are you listening?" ── */
  const askAreYouListening = useCallback(() => {
    if (flowPhaseRef.current !== "idle") return;
    stopConfirmRecognition();
    setFlowPhaseSync("confirm_listening");
    const msg =
      "Are you still there? Can you hear me? Please say yes if you can hear me.";
    // Do not show confirmation messages in UI, just play voice
    speak(msg, () => {
      startConfirmListening(
        () => askRepeatQuestionRef.current?.(),
        HEAR_ME_RESPONSES,
      );
    });
  }, [startConfirmListening]);

  /* ── Long silence while waiting for answer ── */
  const scheduleSilenceCheck = useCallback(() => {
    clearTimeout(silenceCheckRef.current);
    if (liveText) return; // Safely skip if candidate is already speaking
    silenceCheckRef.current = setTimeout(() => {
      if (flowPhaseRef.current === "idle") askAreYouListening();
    }, 25000); // wait 25 seconds before asking if they are still there
  }, [askAreYouListening, liveText]);
  scheduleSilenceCheckRef.current = scheduleSilenceCheck;

  /* ── Track live speech to push silence check forward ── */
  useEffect(() => {
    // Only act when there is real live speech — ignore the cleared empty string
    if (!liveText || flowPhase !== "idle") return;
    if (silenceCheckRef.current) {
      clearTimeout(silenceCheckRef.current);
    }
    silenceCheckRef.current = setTimeout(() => {
      if (flowPhaseRef.current === "idle") {
        askAreYouListening();
      }
    }, 25000);
  }, [liveText, flowPhase]);
  repeatCurrentQuestionRef.current = repeatCurrentQuestion;
  askEndInterviewRef.current = askEndInterview;
  askRepeatQuestionRef.current = askRepeatQuestion;
  confirmAdvanceNextRef.current = confirmAdvanceNext;
  askMoveToNextRef.current = askMoveToNext;
  askAreYouListeningRef.current = askAreYouListening;

  /* ──────────────────────────────────────────────── */
  /*         Audio ended → get next question        */
  /* ──────────────────────────────────────────────── */
  const triggerRecording = useCallback(() => {
    setRecordingTrigger((prev) => prev + 1);
  }, []);

  const handleAudioEnded = useCallback(async () => {
    // ── If there's a pending WS TTS chunk callback, call it ──
    if (_pendingTTSCallback.current) {
      const cb = _pendingTTSCallback.current;
      _pendingTTSCallback.current = null;
      cb();
      return;
    }

    if (isWelcomePhase) {
      const tryGetFirst = async () => {
        try {
          const data = await getFirstQuestion(sessionData.session_id);
          clearInterval(waitIntervalRef.current);
          setIsProcessing(false);
          setIsWelcomePhase(false);
          setChatHistory([{ type: "bot", text: data.question_text }]);
          setCurrentBotText(data.question_text);
          setSessionData((prev) => ({
            ...prev,
            question_text: data.question_text,
            audio_base64: data.audio_base64,
            question_number: data.question_number,
          }));
        } catch {
          /* not ready yet */
        }
      };
      if (questionsReady) await tryGetFirst();
      else {
        setIsProcessing(true);
        waitIntervalRef.current = setInterval(tryGetFirst, 1500);
      }
    } else {
      // Question audio (REST path) finished → start recording
      triggerRecording();
      scheduleSilenceCheck();
    }
  }, [
    isWelcomePhase,
    questionsReady,
    sessionData,
    setSessionData,
    triggerRecording,
    scheduleSilenceCheck,
  ]);

  /* ──────────────────────────────────────────────── */
  /*         Handle recording complete              */
  /* ──────────────────────────────────────────────── */
  const handleNoVoiceDetected = useCallback(() => {
    if (flowPhaseRef.current !== "idle") return;
    noVoiceRetryCountRef.current += 1;
    if (noVoiceRetryCountRef.current <= 2) {
      // Silently retry recording first (up to 2 times)
      console.log("[Interview] No voice — retrying recording silently (attempt", noVoiceRetryCountRef.current, ")");
      setTimeout(() => {
        if (flowPhaseRef.current === "idle") {
          setRecordingTrigger((p) => p + 1);
        }
      }, 800);
    } else {
      // Only after multiple failures, ask if they can hear us
      noVoiceRetryCountRef.current = 0;
      askAreYouListening();
    }
  }, [askAreYouListening]);

  const handleRecordingComplete = useCallback(
    async (audioBlob) => {
      const currentPhase = flowPhaseRef.current;
      if (currentPhase !== "idle") {
        console.log(`[Interview] Recording discarded — flowPhase is '${currentPhase}'`);
        return;
      }

      if (silenceCheckRef.current) clearTimeout(silenceCheckRef.current);
      silenceCheckRef.current = null;
      stopConfirmRecognition();
      setIsProcessing(true);

      // ── WebSocket path (preferred) ──
      const socket = socketRef.current;
      if (socket?.isConnected) {
        try {
          // Send raw WAV bytes directly over WebSocket
          const arrayBuffer = await audioBlob.arrayBuffer();
          socket.sendAudio(arrayBuffer);
          socket.endOfSpeech(isRetryRef.current);
          isRetryRef.current = false;
          // Response handled by socket.on("done") / socket.on("transcript") etc.
        } catch (err) {
          console.error("[Interview-WS] Send error:", err);
          setIsProcessing(false);
        }
        return;
      }

      // ── REST fallback (if WebSocket not connected) ──
      console.warn("[Interview] WebSocket not connected — using REST fallback");
      try {
        const { submitAnswer } = await import("../utils/api");
        const data = await submitAnswer(
          sessionData.session_id,
          audioBlob,
          isRetryRef.current,
        );
        isRetryRef.current = false;

        if (data.no_speech) {
          setIsProcessing(false);
          noVoiceRetryCountRef.current += 1;
          if (noVoiceRetryCountRef.current <= 2) {
            setTimeout(() => {
              if (flowPhaseRef.current === "idle") {
                setRecordingTrigger((p) => p + 1);
                scheduleSilenceCheckRef.current?.();
              }
            }, 800);
          } else {
            noVoiceRetryCountRef.current = 0;
            askAreYouListening();
          }
          return;
        }

        if (data.completed) {
          setFlowPhaseSync("ending");
          setIsProcessing(false);
          const endMsg = "Thank you so much for your time today. Your interview is now complete. We have recorded all your responses and will generate your performance report shortly. Have a great day!";
          speak(endMsg, () => navigate("/result"));
          return;
        }

        const candidateText = data.transcript_preview?.trim();
        setLiveText("");

        if (!candidateText) {
          setIsProcessing(false);
          noVoiceRetryCountRef.current += 1;
          if (noVoiceRetryCountRef.current <= 2) {
            setTimeout(() => {
              if (flowPhaseRef.current === "idle") {
                setRecordingTrigger((p) => p + 1);
                scheduleSilenceCheckRef.current?.();
              }
            }, 800);
          } else {
            noVoiceRetryCountRef.current = 0;
            askAreYouListening();
          }
          return;
        }
        noVoiceRetryCountRef.current = 0;

        const lowerCandidate = candidateText.toLowerCase();
        const wantsToEnd = [
          "end the interview", "end interview", "stop the interview", "i want to end",
          "end the meeting", "i'm done", "i am done", "leave the interview", "quit",
        ].some((p) => lowerCandidate.includes(p));

        setChatHistory((prev) => [...prev, { type: "user", text: candidateText }]);
        setIsProcessing(false);

        if (wantsToEnd) {
          askEndInterviewRef.current?.();
          return;
        }

        if (data.is_last_question) {
          confirmAdvanceNextRef.current?.();
        } else {
          askMoveToNext();
        }
      } catch (err) {
        const errDetail = err?.response?.data?.detail || err?.message || "Unknown error";
        console.error("[Submit Answer Error]", errDetail, err);
        setIsProcessing(false);
        setChatHistory((prev) => [...prev, {
          type: "bot",
          text: `⚠️ Error (${errDetail}). Press the mic and try again.`,
          isError: true,
        }]);
        setTimeout(() => {
          if (flowPhaseRef.current === "idle") setRecordingTrigger((p) => p + 1);
        }, 2000);
      }
    },
    [sessionData, navigate, askMoveToNext, askAreYouListening],
  );

  /* ──────────────────────────────────────────────── */
  /*   Confirmation buttons (manual click)          */
  /* ──────────────────────────────────────────────── */
  // Primary button action depends on current phase
  const handleConfirmPrimary = useCallback(() => {
    stopConfirmRecognition();
    window.speechSynthesis?.cancel();
    if (flowPhaseRef.current === "awaiting_next") {
      confirmAdvanceNextRef.current?.();
    } else if (flowPhaseRef.current === "confirm_end") {
      handleEndCall();
    } else if (flowPhaseRef.current === "confirm_repeat") {
      isRetryRef.current = true;
      repeatCurrentQuestionRef.current?.();
    } else if (flowPhaseRef.current === "confirm_listening") {
      repeatCurrentQuestionRef.current?.();
    }
  }, []);

  const handleConfirmSecondary = useCallback(() => {
    stopConfirmRecognition();
    window.speechSynthesis?.cancel();
    if (flowPhaseRef.current === "awaiting_next") {
      askEndInterviewRef.current?.();
    } else if (flowPhaseRef.current === "confirm_end") {
      askRepeatQuestionRef.current?.();
    } else if (flowPhaseRef.current === "confirm_repeat") {
      askEndInterviewRef.current?.();
    }
  }, []);

  /* ──────────────────────────────────────────────── */
  /*         End Call                               */
  /* ──────────────────────────────────────────────── */
  const handleEndCall = useCallback(async () => {
    clearInterval(waitIntervalRef.current);
    clearInterval(countdownRef.current);
    clearTimeout(silenceCheckRef.current);
    stopConfirmRecognition();
    window.speechSynthesis?.cancel();
    stopCurrentAudio();
    setFlowPhaseSync("ending");
    setIsProcessing(true);

    const endMsg = "Thank you so much for your time today. Your interview is now complete. Please wait while we generate your performance report.";

    // Use WebSocket if connected, otherwise REST
    const socket = socketRef.current;
    if (socket?.isConnected) {
      socket.endInterview();
      // "done" event will be handled by socket.on("done") → navigate("/result")
      speak(endMsg, () => {});
      setTimeout(() => navigate("/result"), 5000); // safety fallback
      return;
    }

    // REST fallback
    try {
      const endPromise = endInterview(sessionData.session_id);
      speak(endMsg, async () => {
        try {
          await endPromise;
          navigate("/result");
        } catch (err) {
          console.error(err);
          setFlowPhaseSync("idle");
          setIsProcessing(false);
        }
      });
    } catch (err) {
      console.error(err);
      setFlowPhaseSync("idle");
      setIsProcessing(false);
    }
  }, [sessionData, navigate]);
  // Sync ref immediately after definition
  handleEndCallRef.current = handleEndCall;

  if (!sessionData) return null;

  /* ── Determine bottom control mode ── */
  const showConfirmButtons =
    !isWelcomePhase &&
    (flowPhase === "awaiting_next" ||
      flowPhase === "confirm_end" ||
      flowPhase === "confirm_repeat" ||
      flowPhase === "confirm_listening");
  const showRecorder = !isWelcomePhase && flowPhase === "idle" && !isProcessing;
  const showProcessing = !isWelcomePhase && isProcessing; // evaluating answer

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-base)",
      }}
    >
      {/* ── TOP BAR ── */}
      <header
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "rgba(2,8,23,0.90)",
          backdropFilter: "blur(16px)",
          gap: 16,
        }}
      >
        {/* Left: logo + status */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LogoMark size={30} />
            <span
              style={{
                fontFamily: "'Space Grotesk',sans-serif",
                fontWeight: 700,
                fontSize: "0.95rem",
                letterSpacing: "-0.01em",
              }}
            >
              InterviewAI
            </span>
          </div>

          <div
            style={{ width: 1, height: 20, background: "var(--border-light)" }}
          />

          {isWelcomePhase ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}
                className="animate-pulse"
              >
                AI is introducing the session…
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 8px #10b981",
                }}
                className="animate-pulse"
              />
              <span
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "#6ee7b7",
                }}
              >
                Live Interview
              </span>
              {sessionData.question_number && (
                <span className="badge badge-indigo">
                  Q {sessionData.question_number} / 10
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: progress + end */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {!isWelcomePhase && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 100,
                  height: 4,
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: "var(--radius-full)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: "var(--radius-full)",
                    background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                    width: `${progressPct}%`,
                    transition: "width 0.6s ease",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                }}
              >
                {progressPct}%
              </span>
            </div>
          )}
          <button
            onClick={handleEndCall}
            className="btn btn-danger"
            style={{ padding: "8px 16px", fontSize: "0.8125rem", gap: 8 }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#f87171",
                boxShadow: "0 0 6px #f87171",
              }}
              className="animate-pulse"
            />
            End Interview
          </button>
        </div>
      </header>

      {/* ── CHAT AREA ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "28px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(99,102,241,0.3) transparent",
        }}
      >
        {/* Welcome phase placeholder */}
        {isWelcomePhase && (
          <div
            style={{ display: "flex", justifyContent: "center", marginTop: 40 }}
          >
            <div
              className="glass-card"
              style={{
                padding: "32px 40px",
                textAlign: "center",
                maxWidth: 400,
                boxShadow: "var(--shadow-brand)",
              }}
            >
              <div
                style={{
                  marginBottom: 20,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <AIAvatar size={60} pulse />
              </div>
              <h3 style={{ marginBottom: 8, fontSize: "1.05rem" }}>
                AI Interviewer is Speaking
              </h3>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.875rem",
                  marginBottom: 20,
                }}
              >
                Please listen to the introduction…
              </p>
              {isProcessing && (
                <p
                  style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}
                  className="animate-pulse"
                >
                  ⏳ Preparing your questions…
                </p>
              )}
            </div>
          </div>
        )}

        {/* Chat bubbles */}
        {chatHistory.map((msg, idx) => {
          const isLastBot =
            msg.type === "bot" && idx === chatHistory.length - 1;
          const isConfirmMsg = msg.isConfirmation;
          const isSilenceMsg = msg.isSilenceCheck;
          return (
            <div
              key={idx}
              className="animate-slide-in"
              style={{
                display: "flex",
                justifyContent: msg.type === "user" ? "flex-end" : "flex-start",
                alignItems: "flex-end",
                gap: 10,
              }}
            >
              {msg.type === "bot" && (
                <AIAvatar
                  size={38}
                  pulse={isLastBot && (isConfirmMsg || isSilenceMsg)}
                />
              )}
              <div
                style={{
                  maxWidth: "72%",
                  padding: "13px 18px",
                  fontSize: "0.9125rem",
                  lineHeight: 1.65,
                  ...(msg.type === "bot"
                    ? {
                        background: isConfirmMsg
                          ? "rgba(16,185,129,0.10)"
                          : isSilenceMsg
                            ? "rgba(245,158,11,0.10)"
                            : "rgba(99,102,241,0.10)",
                        border: isConfirmMsg
                          ? "1px solid rgba(16,185,129,0.25)"
                          : isSilenceMsg
                            ? "1px solid rgba(245,158,11,0.25)"
                            : "1px solid rgba(99,102,241,0.18)",
                        borderRadius: "4px 18px 18px 18px",
                        color: isConfirmMsg
                          ? "#6ee7b7"
                          : isSilenceMsg
                            ? "#fcd34d"
                            : "#e2e8f0",
                      }
                    : {
                        background:
                          "linear-gradient(135deg, rgba(99,102,241,0.85), rgba(139,92,246,0.85))",
                        borderRadius: "18px 4px 18px 18px",
                        color: "#fff",
                        boxShadow: "0 4px 16px rgba(99,102,241,0.25)",
                      }),
                }}
              >
                {isLastBot ? (
                  <>
                    {typedBotText}
                    {typedBotText.length < msg.text.length && (
                      <span
                        style={{
                          display: "inline-block",
                          width: 2,
                          height: "1em",
                          background: "#818cf8",
                          marginLeft: 3,
                          verticalAlign: "text-bottom",
                        }}
                        className="animate-pulse"
                      />
                    )}
                  </>
                ) : (
                  msg.text
                )}
              </div>
              {msg.type === "user" && <UserAvatar size={38} />}
            </div>
          );
        })}

        {/* Live speech bubble */}
        {liveText && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "flex-end",
              gap: 10,
            }}
          >
            <div
              style={{
                maxWidth: "72%",
                padding: "13px 18px",
                fontSize: "0.9125rem",
                lineHeight: 1.65,
                background: "rgba(99,102,241,0.55)",
                borderRadius: "18px 4px 18px 18px",
                color: "#fff",
                fontStyle: "italic",
                border: "1px solid rgba(99,102,241,0.35)",
              }}
            >
              {liveText}
              <span
                style={{
                  display: "inline-block",
                  width: 2,
                  height: "1em",
                  background: "#c7d2fe",
                  marginLeft: 3,
                  verticalAlign: "text-bottom",
                }}
                className="animate-pulse"
              />
            </div>
            <UserAvatar size={38} />
          </div>
        )}

        {/* Typing / Processing indicator */}
        {isProcessing && !isWelcomePhase && <TypingIndicator />}

        <div ref={chatEndRef} />
      </div>

      {/* ── BOTTOM CONTROLS ── */}
      <div
        style={{
          flexShrink: 0,
          borderTop: "1px solid var(--border-subtle)",
          background: "rgba(2,8,23,0.92)",
          backdropFilter: "blur(16px)",
          padding: "16px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          minHeight: 100,
          flexDirection: "column",
        }}
      >
        {/* Always show AudioPlayer */}
        <AudioPlayer
          base64Audio={
            isWelcomePhase
              ? sessionData.welcome_audio_base64
              : sessionData.audio_base64
          }
          onEnded={handleAudioEnded}
        />

        {/* Confirmation panel — content changes per phase */}
        {showConfirmButtons &&
          (() => {
            const phaseConfig = {
              awaiting_next: {
                hint: 'Say "yes" to continue, or "no" to end',
                primaryLabel: "✓ Yes, Next Question",
                secondaryLabel: "✗ No",
              },
              confirm_end: {
                hint: "End the interview?",
                primaryLabel: "✓ Yes, End Interview",
                secondaryLabel: "✗ No",
              },
              confirm_repeat: {
                hint: "Repeat the same question?",
                primaryLabel: "✓ Yes, Repeat Question",
                secondaryLabel: "✗ No",
              },
              confirm_listening: {
                hint: "Can you hear me?",
                primaryLabel: "✓ Yes, I Can Hear You",
                secondaryLabel: null,
              },
            };
            const cfg = phaseConfig[flowPhase] || phaseConfig.awaiting_next;
            return (
              <ConfirmationPanel
                onPrimary={handleConfirmPrimary}
                onSecondary={
                  cfg.secondaryLabel ? handleConfirmSecondary : undefined
                }
                primaryLabel={cfg.primaryLabel}
                secondaryLabel={cfg.secondaryLabel || ""}
                hint={cfg.hint}
              />
            );
          })()}

        {/* Evaluating indicator — shows while API is processing */}
        {showProcessing && (
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
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 22px",
                borderRadius: 24,
                background: "rgba(99,102,241,0.10)",
                border: "1px solid rgba(99,102,241,0.25)",
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: "2.5px solid rgba(99,102,241,0.3)",
                  borderTopColor: "#6366f1",
                }}
                className="animate-spin"
              />
              <span
                style={{
                  fontSize: "0.85rem",
                  color: "#a5b4fc",
                  fontWeight: 600,
                }}
              >
                Evaluating your answer…
              </span>
            </div>
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              Please wait while AI reviews your response
            </p>
          </div>
        )}

        {/* Normal recorder */}
        {showRecorder && (
          <AudioRecorder
            onRecordingComplete={handleRecordingComplete}
            onNoVoice={handleNoVoiceDetected}
            onSpeechStart={() => clearTimeout(silenceCheckRef.current)}
            isProcessing={isProcessing}
            recordingTrigger={recordingTrigger}
            onLiveText={setLiveText}
          />
        )}
      </div>
    </div>
  );
}
