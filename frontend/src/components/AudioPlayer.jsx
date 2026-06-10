import { useEffect, useRef, useState } from 'react';

let currentAudio = null;

/* ── Animated Waveform bars ── */
function Waveform({ active }) {
  const heights = [40, 90, 60, 100, 50, 80, 35, 70, 55, 85];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2.5, height: 20 }}>
      {heights.map((h, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 2,
          background: active ? '#6ee7b7' : 'rgba(255,255,255,0.15)',
          height: active ? `${h}%` : '20%',
          transition: 'height 0.4s ease, background 0.4s ease',
          animation: active ? `bounceDot ${0.5 + (i % 3) * 0.15}s ease-in-out infinite alternate` : 'none',
          animationDelay: `${i * 0.06}s`,
        }} />
      ))}
    </div>
  );
}

export default function AudioPlayer({ base64Audio, onEnded }) {
  const [status, setStatus] = useState('idle');
  const onEndedRef = useRef(onEnded);

  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);

  useEffect(() => {
    if (!base64Audio) return;
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
      currentAudio = null;
    }
    setStatus('loading');
    const audio = new Audio();
    currentAudio = audio;
    audio.preload = 'auto';
    audio.src = `data:audio/mpeg;base64,${base64Audio}`;
    audio.oncanplaythrough = () => {
      if (currentAudio !== audio) return;
      audio.play()
        .then(() => setStatus('playing'))
        .catch((err) => { console.warn('Autoplay blocked:', err.message); setStatus('paused'); });
    };
    audio.onended = () => {
      setStatus('idle');
      if (onEndedRef.current) onEndedRef.current();
    };
    audio.onerror = () => {
      if (currentAudio !== audio) return;
      console.error('Audio failed to load');
      setStatus('error');
    };
    return () => {
      audio.pause();
      audio.src = '';
      if (currentAudio === audio) currentAudio = null;
    };
  }, [base64Audio]);

  const handleManualPlay = () => {
    if (!currentAudio) return;
    if (status === 'playing') {
      currentAudio.pause();
      setStatus('paused');
    } else {
      currentAudio.play()
        .then(() => setStatus('playing'))
        .catch(console.error);
    }
  };

  if (!base64Audio) return null;

  const isPlaying = status === 'playing';
  const isLoading = status === 'loading';
  const isPaused  = status === 'paused' || status === 'idle';
  const isError   = status === 'error';

  return (
    <button
      onClick={handleManualPlay}
      disabled={isLoading}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 20px', borderRadius: 'var(--radius-full)',
        background: isPlaying
          ? 'rgba(16,185,129,0.12)'
          : isError
          ? 'rgba(239,68,68,0.12)'
          : 'rgba(255,255,255,0.05)',
        border: `1px solid ${isPlaying ? 'rgba(16,185,129,0.3)' : isError ? 'rgba(239,68,68,0.3)' : 'var(--border-light)'}`,
        color: isPlaying ? '#6ee7b7' : isError ? '#fca5a5' : 'var(--text-secondary)',
        cursor: isLoading ? 'wait' : 'pointer',
        transition: 'all var(--ease-normal)',
        fontSize: '0.875rem', fontWeight: 600,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {isLoading && (
        <>
          <span style={{
            width: 16, height: 16, borderRadius: '50%',
            border: '2px solid rgba(148,163,184,0.3)',
            borderTopColor: '#94a3b8',
            display: 'inline-block',
          }} className="animate-spin" />
          <span style={{ color: 'var(--text-muted)' }}>Loading…</span>
        </>
      )}
      {isPlaying && (
        <>
          <Waveform active />
          <span>AI Speaking — click to pause</span>
        </>
      )}
      {isPaused && !isLoading && (
        <>
          <svg style={{ width: 16, height: 16, flexShrink: 0 }} viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          <span>{status === 'idle' ? 'Replay Voice' : 'Click to hear AI voice'}</span>
        </>
      )}
      {isError && <span>⚠ Audio Error — retry</span>}
    </button>
  );
}
