import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startInterview } from '../utils/api';
import { unlockAudio } from '../utils/audioUnlock';

/* ── Professional SVG Logo Mark ── */
function LogoMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#logoGrad)" />
      {/* Brain / circuit node design */}
      <circle cx="16" cy="11" r="3.5" fill="white" fillOpacity="0.95" />
      <circle cx="9"  cy="19" r="2.5" fill="white" fillOpacity="0.75" />
      <circle cx="23" cy="19" r="2.5" fill="white" fillOpacity="0.75" />
      <circle cx="16" cy="24" r="2"   fill="white" fillOpacity="0.6"  />
      {/* Connecting lines */}
      <line x1="16" y1="14.5" x2="10.5" y2="17" stroke="white" strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="16" y1="14.5" x2="21.5" y2="17" stroke="white" strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="11"  y1="21"  x2="15"  y2="23"  stroke="white" strokeOpacity="0.4" strokeWidth="1"   strokeLinecap="round" />
      <line x1="21"  y1="21"  x2="17"  y2="23"  stroke="white" strokeOpacity="0.4" strokeWidth="1"   strokeLinecap="round" />
    </svg>
  );
}

/* ── Level SVG Icons — all distinct shapes ── */
function LevelIcon({ level, size = 18, active }) {
  const c = active ? '#a5b4fc' : '#64748b';
  const f = active ? 'rgba(99,102,241,0.18)' : 'none';

  if (level === 'Junior') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <line x1="12" y1="22" x2="12" y2="10" stroke={c} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 14 C9 14 6 12 6 8 C9 8 12 10 12 14Z" stroke={c} strokeWidth="1.5" strokeLinejoin="round" fill={f} />
      <path d="M12 10 C15 10 18 8 18 4 C15 4 12 6 12 10Z" stroke={c} strokeWidth="1.5" strokeLinejoin="round" fill={f} />
    </svg>
  );

  if (level === 'Mid-level') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={c} strokeWidth="1.7" strokeLinejoin="round" fill={f} />
    </svg>
  );

  if (level === 'Senior') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 3h8v7a4 4 0 0 1-8 0V3z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill={f} />
      <path d="M8 5H5a2 2 0 0 0 0 4h3" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 5h3a2 2 0 0 1 0 4h-3" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="12" y1="14" x2="12" y2="18" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="9" y1="18" x2="15" y2="18" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="8" y1="21" x2="16" y2="21" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );

  if (level === 'Lead') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 8l3 6h10l3-6-4 3-4-6-4 6-4-3z" stroke={c} strokeWidth="1.7" strokeLinejoin="round" fill={f} />
      <line x1="4" y1="17" x2="20" y2="17" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="4"  cy="8" r="1.3" fill={c} />
      <circle cx="12" cy="3" r="1.3" fill={c} />
      <circle cx="20" cy="8" r="1.3" fill={c} />
    </svg>
  );

  return null;
}


/* ── Feature Card SVG Icons ── */
function MicSVG() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="2" width="6" height="11" rx="3" stroke="#6366f1" strokeWidth="1.8" />
      <path d="M5 11a7 7 0 0 0 14 0" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="22" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="9"  y1="22" x2="15" y2="22" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function BrainSVG() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 4C10.4 4 9 5.1 8.5 6.6 7.7 6.2 6.5 6.4 5.8 7.1 5 7.9 5 9.1 5.5 9.9 4.6 10.4 4 11.3 4 12.3 4 13.7 5 14.9 6.4 15.2L6 19h12l-.4-3.8C18.9 14.9 20 13.7 20 12.3c0-1-.6-1.9-1.5-2.4.5-.8.5-2-.3-2.8-.7-.7-1.9-.9-2.7-.5C15 5.1 13.6 4 12 4z"
        stroke="#8b5cf6" strokeWidth="1.7" strokeLinejoin="round" />
      <line x1="12" y1="9"  x2="12" y2="15" stroke="#8b5cf6" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="9"  y1="12" x2="15" y2="12" stroke="#8b5cf6" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function ChartSVG() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3"  y="12" width="4" height="9" rx="1" stroke="#06b6d4" strokeWidth="1.7" />
      <rect x="10" y="7"  width="4" height="14" rx="1" stroke="#06b6d4" strokeWidth="1.7" />
      <rect x="17" y="3"  width="4" height="18" rx="1" stroke="#06b6d4" strokeWidth="1.7" />
    </svg>
  );
}

/* ── Spark icon for hero pill ── */
function SparkSVG() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ── Arrow icon for submit button ── */
function ArrowRightSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const LEVELS = ['Junior', 'Mid-level', 'Senior', 'Lead'];
const LEVEL_DESCS = {
  Junior:      '0–2 yrs · Fundamentals & problem solving',
  'Mid-level': '2–5 yrs · Architecture & ownership',
  Senior:      '5+ yrs · System design & strategy',
  Lead:        'Staff+ · Vision, people & cross-team impact',
};

const FEATURES = [
  { Icon: MicSVG,   title: 'Voice-Powered',  desc: 'Answer naturally by speaking — AI listens & transcribes in real-time', accent: '#6366f1' },
  { Icon: BrainSVG, title: 'AI Evaluator',    desc: 'Instant scoring on technical depth, communication & problem-solving',   accent: '#8b5cf6' },
  { Icon: ChartSVG, title: 'Detailed Report', desc: 'Strength/weakness breakdown per question with actionable feedback',      accent: '#06b6d4' },
];

export default function Home({ setSessionData }) {
  const [jobTitle, setJobTitle] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Mid-level');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleStart = async (e) => {
    e.preventDefault();
    if (!jobTitle.trim()) return;
    unlockAudio();
    setIsLoading(true);
    try {
      const data = await startInterview(jobTitle, experienceLevel);
      // job_title aur experience_level bhi save karo takey Result page mein kaam aaye
      setSessionData({ ...data, job_title: jobTitle, experience_level: experienceLevel });
      navigate('/interview');
    } catch (error) {
      console.error('Failed to start interview:', error);
      alert('Failed to start the interview. Check backend connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── NAV — no badge, professional logo ── */}
      <nav style={{
        display: 'flex', alignItems: 'center',
        padding: '18px 40px',
        borderBottom: '1px solid var(--border-subtle)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(2,8,23,0.88)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark size={32} />
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700, fontSize: '1.05rem',
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}>
            InterviewAI
          </span>
        </div>
      </nav>

      {/* ── HERO ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px 80px' }}>

        {/* Hero Title */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0ms', textAlign: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)', fontWeight: 800, lineHeight: 1.1 }}>
            Ace Your Next Interview
            <br />
            <span className="gradient-text">with AI Precision</span>
          </h1>
        </div>

        {/* Hero Sub */}
        <div className="animate-fade-in-up" style={{ animationDelay: '160ms', marginBottom: 52 }}>
          <p style={{
            fontSize: '1.05rem', color: 'var(--text-secondary)',
            textAlign: 'center', maxWidth: 520, lineHeight: 1.75,
          }}>
            Practice real interview questions, speak your answers, and get instant
            AI feedback — tailored to your job role and experience level.
          </p>
        </div>

        {/* ── FORM CARD ── */}
        <div className="glass-card animate-fade-in-up" style={{
          animationDelay: '240ms', width: '100%', maxWidth: 520,
          padding: 36, marginBottom: 64,
          boxShadow: 'var(--shadow-brand), var(--shadow-lg)',
        }}>
          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 6 }}>Start Your Interview</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Fill in the details below to begin</p>
          </div>

          <form onSubmit={handleStart} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Job Title */}
            <div>
              <label htmlFor="jobTitle" className="form-label">Job Title</label>
              <input
                id="jobTitle"
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. React Developer, Data Scientist…"
                className="form-input"
                required
                autoComplete="off"
              />
            </div>

            {/* Experience Level — card picker with SVG icons */}
            <div>
              <label className="form-label">Experience Level</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {LEVELS.map((lvl) => {
                  const active = experienceLevel === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setExperienceLevel(lvl)}
                      style={{
                        padding: '13px 14px', borderRadius: 'var(--radius-md)',
                        border: active ? '1px solid var(--brand-primary)' : '1px solid var(--border-light)',
                        background: active ? 'rgba(99,102,241,0.11)' : 'rgba(255,255,255,0.03)',
                        color: active ? '#a5b4fc' : 'var(--text-secondary)',
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'all var(--ease-normal)',
                        boxShadow: active ? '0 0 0 1px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
                      }}
                    >
                      <div style={{ marginBottom: 6 }}>
                        <LevelIcon level={lvl} size={18} active={active} />
                      </div>
                      <div style={{ fontWeight: 650, fontSize: '0.875rem', marginBottom: 3 }}>{lvl}</div>
                      <div style={{ fontSize: '0.71rem', opacity: 0.65, lineHeight: 1.45 }}>{LEVEL_DESCS[lvl]}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !jobTitle.trim()}
              className="btn btn-primary"
              style={{ width: '100%', padding: '15px', fontSize: '0.9375rem', borderRadius: 'var(--radius-md)', marginTop: 4 }}
            >
              {isLoading ? (
                <>
                  <span style={{
                    width: 17, height: 17, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', display: 'inline-block',
                  }} className="animate-spin" />
                  Preparing Interview…
                </>
              ) : (
                <>
                  Start Interview <ArrowRightSVG />
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── FEATURES ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 18, width: '100%', maxWidth: 760,
        }}>
          {FEATURES.map((f, i) => (
            <div key={f.title} className="glass-card animate-fade-in-up" style={{
              animationDelay: `${320 + i * 80}ms`,
              padding: '22px 20px',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              {/* Icon wrapper with subtle accent glow */}
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `rgba(${f.accent === '#6366f1' ? '99,102,241' : f.accent === '#8b5cf6' ? '139,92,246' : '6,182,212'}, 0.10)`,
                border: `1px solid rgba(${f.accent === '#6366f1' ? '99,102,241' : f.accent === '#8b5cf6' ? '139,92,246' : '6,182,212'}, 0.2)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <f.Icon />
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{f.title}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center', padding: '20px 24px',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '0.8rem', color: 'var(--text-muted)',
      }}>
        InterviewAI · AI-Powered Interview Practice
      </footer>
    </div>
  );
}
