import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEvaluation } from '../utils/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ── SVG Logo Mark ── */
function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lgRes" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#lgRes)" />
      <circle cx="16" cy="11" r="3.5" fill="white" fillOpacity="0.95" />
      <circle cx="9"  cy="19" r="2.5" fill="white" fillOpacity="0.75" />
      <circle cx="23" cy="19" r="2.5" fill="white" fillOpacity="0.75" />
      <circle cx="16" cy="24" r="2"   fill="white" fillOpacity="0.6"  />
      <line x1="16" y1="14.5" x2="10.5" y2="17" stroke="white" strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="16" y1="14.5" x2="21.5" y2="17" stroke="white" strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="11" y1="21" x2="15" y2="23" stroke="white" strokeOpacity="0.4" strokeWidth="1" strokeLinecap="round" />
      <line x1="21" y1="21" x2="17" y2="23" stroke="white" strokeOpacity="0.4" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

/* ── Helpers ── */
const fmt = (n) => {
  const num = Number(n ?? 0);
  return Number.isInteger(num) ? num.toString() : num.toFixed(1);
};

function scoreColor(n) {
  if (n >= 8) return { text: '#6ee7b7', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', bar: 'score-bar-high' };
  if (n >= 5) return { text: '#fcd34d', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)',  bar: 'score-bar-mid' };
  return         { text: '#fca5a5', bg: 'rgba(239,68,68,0.12)',    border: 'rgba(239,68,68,0.25)',   bar: 'score-bar-low' };
}

function ScoreBar({ score, max = 10 }) {
  const n   = Number(score ?? 0);
  const pct = Math.min((n / max) * 100, 100);
  const c   = scoreColor(n);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div className="score-bar-track" style={{ flex: 1 }}>
        <div className={`score-bar-fill ${c.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: c.text, minWidth: 42, textAlign: 'right' }}>
        {fmt(n)}/10
      </span>
    </div>
  );
}

function ScoreRing({ score }) {
  const n    = Number(score ?? 0);
  const pct  = Math.min((n / 10) * 100, 100);
  const c    = scoreColor(n);
  const SIZE = 120, CX = 60, CY = 60, R = 48, SW = 8;
  const CIRC = 2 * Math.PI * R;
  const offset = CIRC * (1 - pct / 100);
  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <defs>
          <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={SW} />
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={c.text} strokeWidth={SW} strokeLinecap="round"
          strokeDasharray={CIRC} strokeDashoffset={offset} filter="url(#ringGlow)"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <span style={{ fontSize: '1.85rem', fontWeight: 800, lineHeight: 1, color: c.text, fontFamily: "'Space Grotesk', sans-serif" }}>{fmt(n)}</span>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em' }}>/ 10</span>
      </div>
    </div>
  );
}

function RecommendationBadge({ rec }) {
  const MAP = {
    Hire:     { bg: 'rgba(16,185,129,0.15)', text: '#6ee7b7', border: 'rgba(16,185,129,0.3)', emoji: '✅', label: 'Hire' },
    Consider: { bg: 'rgba(245,158,11,0.15)', text: '#fcd34d', border: 'rgba(245,158,11,0.3)', emoji: '🤔', label: 'Consider' },
    Reject:   { bg: 'rgba(239,68,68,0.15)',  text: '#fca5a5', border: 'rgba(239,68,68,0.3)',  emoji: '❌', label: 'Reject' },
  };
  const s = MAP[rec] ?? MAP.Consider;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 24px', borderRadius: 'var(--radius-lg)', background: s.bg, border: `1px solid ${s.border}`, color: s.text, fontWeight: 700, fontSize: '1.1rem', fontFamily: "'Space Grotesk', sans-serif" }}>
      <span style={{ fontSize: '1.3rem' }}>{s.emoji}</span> {s.label}
    </div>
  );
}

function catTag(idx) {
  if (idx < 5) return { label: 'Technical',  cls: 'badge badge-indigo' };
  if (idx < 8) return { label: 'Behavioral', cls: 'badge badge-purple' };
  return           { label: 'Vision',        cls: 'badge badge-amber' };
}

function QuestionCard({ q, i, expanded, onToggle }) {
  const cat    = catTag(i);
  const qScore = Number(q.score ?? 0);
  const c      = scoreColor(qScore);
  return (
    <div className="glass-card animate-fade-in-up" style={{ animationDelay: `${i * 60}ms`, overflow: 'hidden', border: '1px solid var(--border-subtle)', transition: 'border-color var(--ease-normal)' }}>
      <button onClick={onToggle} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', textAlign: 'left' }}>
        <span style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{i + 1}</span>
        <span className={cat.cls} style={{ flexShrink: 0 }}>{cat.label}</span>
        <p style={{ flex: 1, color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 500, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{q.question}</p>
        <span style={{ flexShrink: 0, padding: '4px 12px', borderRadius: 'var(--radius-full)', background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontSize: '0.8rem', fontWeight: 700 }}>{fmt(qScore)}/10</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform var(--ease-normal)' }}>▼</span>
      </button>
      <div style={{ padding: '0 20px 10px', marginTop: -4 }}><ScoreBar score={qScore} /></div>
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }} className="animate-fade-in-up">
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontWeight: 600 }}>Question</p>
            <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.65 }}>{q.question}</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: '14px 16px', border: '1px solid var(--border-subtle)' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontWeight: 600 }}>Candidate's Answer</p>
            <p style={{ color: '#cbd5e1', fontSize: '0.875rem', fontStyle: 'italic', lineHeight: 1.65 }}>"{q.answer || 'No answer recorded'}"</p>
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontWeight: 600 }}>AI Feedback</p>
            <p style={{ color: '#cbd5e1', fontSize: '0.875rem', lineHeight: 1.7 }}>{q.feedback}</p>
          </div>
          {(q.strengths?.length > 0 || q.weaknesses?.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {q.strengths?.length > 0 && (
                <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: 'var(--radius-md)', padding: '14px', border: '1px solid rgba(16,185,129,0.18)' }}>
                  <p style={{ fontSize: '0.72rem', color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 700 }}>✅ Strengths</p>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {q.strengths.map((s, idx) => (
                      <li key={idx} style={{ display: 'flex', gap: 8, fontSize: '0.8rem', color: 'rgba(110,231,183,0.85)', lineHeight: 1.5 }}><span style={{ flexShrink: 0, marginTop: 3 }}>•</span>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {q.weaknesses?.length > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-md)', padding: '14px', border: '1px solid rgba(239,68,68,0.18)' }}>
                  <p style={{ fontSize: '0.72rem', color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 700 }}>⚠ To Improve</p>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {q.weaknesses.map((w, idx) => (
                      <li key={idx} style={{ display: 'flex', gap: 8, fontSize: '0.8rem', color: 'rgba(252,165,165,0.85)', lineHeight: 1.5 }}><span style={{ flexShrink: 0, marginTop: 3 }}>•</span>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PDF GENERATOR — Light / Print-ready professional theme
═══════════════════════════════════════════════════════ */
function generatePDF(report, sessionData) {
  const doc      = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW    = doc.internal.pageSize.getWidth();
  const pageH    = doc.internal.pageSize.getHeight();
  const margin   = 15;
  const contentW = pageW - margin * 2;
  const FOOTER_H = 12;
  const SAFE_H   = pageH - FOOTER_H - 4;

  /* ── data ── */
  const scores        = report.question_scores || [];
  const overallScore  = Number(report.overall_score ?? 0);
  const answeredCount = report.questions_answered ?? scores.length;
  const totalCount    = report.total_questions ?? 10;
  const jobTitle      = sessionData?.job_title        || 'Unknown Role';
  const expLevel      = sessionData?.experience_level  || '';
  const rec           = report.hiring_recommendation   || 'Consider';
  const now           = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  /* ── color palette (all readable on white PDF background) ── */
  const PURPLE   = [79, 70, 229];
  const DARK     = [17, 24, 39];
  const MID      = [75, 85, 99];
  const LTBG     = [248, 249, 252];
  const BORDER   = [226, 232, 240];
  const GREEN    = [22, 163, 74];
  const AMBER    = [180, 83, 9];
  const RED_C    = [185, 28, 28];
  const GRN_BG   = [240, 253, 244];
  const RED_BG   = [254, 242, 242];
  const PUR_BG   = [238, 242, 255];

  const scoreClr = (n) => n >= 8 ? GREEN : n >= 5 ? AMBER : RED_C;
  const recClr   = rec === 'Hire' ? GREEN : rec === 'Consider' ? AMBER : RED_C;

  /* ── helpers ── */
  const spl = (txt, maxW, fs) => {
    doc.setFontSize(fs);
    return doc.splitTextToSize(String(txt || '—'), maxW);
  };

  /* ── HEADER BANNER (purple, readable white text) ── */
  doc.setFillColor(...PURPLE);
  doc.rect(0, 0, pageW, 52, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('InterviewAI', margin, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(199, 210, 254);
  doc.text('Performance Report', margin, 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(224, 231, 255);
  doc.text(`Generated: ${now}`, pageW - margin, 14, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`${expLevel} ${jobTitle}`, pageW - margin, 23, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(199, 210, 254);
  doc.text(`${answeredCount} / ${totalCount} questions answered`, pageW - margin, 31, { align: 'right' });

  /* rec chip */
  const cW = 36, cH = 8, cX = pageW - margin - cW, cY = 38;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(cX, cY, cW, cH, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...recClr);
  doc.text(rec.toUpperCase(), cX + cW / 2, cY + 5.3, { align: 'center' });

  let y = 60;

  /* ── SCORE SUMMARY BOXES ── */
  const boxH = 28;
  const bW   = (contentW - 8) / 3;
  const compPct = Math.round((answeredCount / totalCount) * 100);

  [
    { val: `${fmt(overallScore)} / 10`, label: 'Overall Score',   clr: scoreClr(overallScore) },
    { val: `${compPct}%`,               label: 'Completion',       clr: PURPLE },
    { val: rec,                          label: 'Recommendation',   clr: recClr },
  ].forEach(({ val, label, clr }, i) => {
    const bx = margin + i * (bW + 4);
    doc.setFillColor(...LTBG);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.4);
    doc.roundedRect(bx, y, bW, boxH, 3, 3, 'FD');
    /* top color accent bar */
    doc.setFillColor(...clr);
    doc.rect(bx, y, bW, 3, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MID);
    doc.text(label.toUpperCase(), bx + bW / 2, y + 12, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...clr);
    doc.text(String(val), bx + bW / 2, y + 23, { align: 'center' });
  });

  y += boxH + 10;

  /* ── AI SUMMARY ── */
  if (report.overall_feedback) {
    const fbLines = spl(report.overall_feedback, contentW - 16, 9.5);
    const fbH     = fbLines.length * 5.5 + 14;
    if (y + fbH > SAFE_H) { drawPageFooter(); doc.addPage(); y = 12; }
    doc.setFillColor(...PUR_BG);
    doc.setDrawColor(...PURPLE);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, contentW, fbH, 3, 3, 'FD');
    doc.setFillColor(...PURPLE);
    doc.rect(margin, y, 3.5, fbH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...PURPLE);
    doc.text("AI EVALUATOR'S SUMMARY", margin + 7, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK);
    doc.text(fbLines, margin + 7, y + 13);
    y += fbH + 10;
  }

  /* ── QUESTION CARDS ── */
  if (scores.length > 0) {
    if (y + 14 > SAFE_H) { drawPageFooter(); doc.addPage(); y = 12; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text('Question-by-Question Breakdown', margin, y);
    doc.setDrawColor(...PURPLE);
    doc.setLineWidth(0.6);
    doc.line(margin, y + 2, margin + 85, y + 2);
    y += 9;

    scores.forEach((q, idx) => {
      const qNum     = idx + 1;
      const qScore   = Number(q.score ?? 0);
      const sClr     = scoreClr(qScore);
      const catLabel = idx < 5 ? 'Technical' : idx < 8 ? 'Behavioral' : 'Vision';
      const catClr   = idx < 5 ? PURPLE : idx < 8 ? [109,40,217] : [180,83,9];

      /* measure text */
      const qLines = spl(q.question || 'N/A',                    contentW - 12, 9.5);
      const aLines = spl(q.answer   || '(no answer recorded)',   contentW - 16, 9);
      const fLines = spl(q.feedback || 'No feedback provided.',  contentW - 16, 9);

      const strItems = (q.strengths  || []).filter(Boolean);
      const wkItems  = (q.weaknesses || []).filter(Boolean);
      const colW     = (contentW - 12) / 2;
      const strLines = strItems.flatMap(s => spl(`• ${s}`, colW - 6, 8.5));
      const wkLines  = wkItems.flatMap( w => spl(`• ${w}`, colW - 6, 8.5));
      const hasSW    = strItems.length > 0 || wkItems.length > 0;

      const LH  = 5;
      const qH  = qLines.length * LH;
      const aH  = aLines.length * LH;
      const fH  = fLines.length * LH;
      const swH = hasSW ? Math.max(strLines.length, wkLines.length) * LH + 14 : 0;

      const cardH = 14           // header strip
        + 4 + qH                 // question
        + 7 + 4 + aH             // divider + answer
        + 7 + 4 + fH             // divider + feedback
        + (hasSW ? 7 + swH : 0) // divider + SW boxes
        + 6;                     // bottom pad

      /* page break */
      if (y + cardH > SAFE_H) {
        drawPageFooter();
        doc.addPage();
        y = 12;
      }

      /* ── CARD: white bg, gray border ── */
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.35);
      doc.roundedRect(margin, y, contentW, cardH, 3, 3, 'FD');

      /* ── HEADER STRIP: light gray ── */
      doc.setFillColor(...LTBG);
      doc.roundedRect(margin, y, contentW, 13, 3, 3, 'F');
      doc.rect(margin, y + 10, contentW, 3, 'F');
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.3);
      doc.line(margin, y + 13, margin + contentW, y + 13);

      /* Q number badge */
      doc.setFillColor(...sClr);
      doc.roundedRect(margin + 3, y + 2.5, 9, 8, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(String(qNum), margin + 7.5, y + 8, { align: 'center' });

      /* Category */
      doc.setFontSize(7.5);
      doc.setTextColor(...catClr);
      doc.setFont('helvetica', 'bold');
      doc.text(catLabel, margin + 16, y + 8);

      /* Score */
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...sClr);
      doc.text(`${fmt(qScore)} / 10`, margin + contentW - 4, y + 8.5, { align: 'right' });

      let cy = y + 17;

      /* ── QUESTION ── */
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...MID);
      doc.text('QUESTION', margin + 5, cy);
      cy += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...DARK);
      doc.text(qLines, margin + 5, cy);
      cy += qH + 5;

      /* divider */
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.25);
      doc.line(margin + 3, cy, margin + contentW - 3, cy);
      cy += 5;

      /* ── CANDIDATE'S ANSWER ── */
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(37, 99, 235);
      doc.text("CANDIDATE'S ANSWER", margin + 5, cy);
      cy += 4;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      doc.text(aLines, margin + 5, cy);
      cy += aH + 5;

      /* divider */
      doc.setDrawColor(...BORDER);
      doc.line(margin + 3, cy, margin + contentW - 3, cy);
      cy += 5;

      /* ── AI FEEDBACK ── */
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...PURPLE);
      doc.text('AI FEEDBACK', margin + 5, cy);
      cy += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(31, 41, 55);
      doc.text(fLines, margin + 5, cy);
      cy += fH + 4;

      /* ── STRENGTHS & WEAKNESSES ── */
      if (hasSW) {
        doc.setDrawColor(...BORDER);
        doc.line(margin + 3, cy, margin + contentW - 3, cy);
        cy += 5;

        if (strItems.length > 0) {
          const shH = strLines.length * LH + 12;
          doc.setFillColor(...GRN_BG);
          doc.setDrawColor(134, 239, 172);
          doc.setLineWidth(0.3);
          doc.roundedRect(margin + 3, cy, colW - 2, shH, 2, 2, 'FD');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(...GREEN);
          doc.text('STRENGTHS', margin + 7, cy + 5);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(21, 128, 61);
          doc.text(strLines, margin + 7, cy + 11);
        }

        if (wkItems.length > 0) {
          const wkH = wkLines.length * LH + 12;
          const wx  = margin + 3 + colW + 3;
          doc.setFillColor(...RED_BG);
          doc.setDrawColor(252, 165, 165);
          doc.setLineWidth(0.3);
          doc.roundedRect(wx, cy, colW - 2, wkH, 2, 2, 'FD');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(...RED_C);
          doc.text('AREAS TO IMPROVE', wx + 4, cy + 5);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(153, 27, 27);
          doc.text(wkLines, wx + 4, cy + 11);
        }
      }

      y += cardH + 4;
    });
  }

  /* ── footer on ALL pages ── */
  const total = doc.internal.getNumberOfPages();
  for (let pg = 1; pg <= total; pg++) {
    doc.setPage(pg);
    drawPageFooter();
  }

  /* ── save ── */
  const safeName = jobTitle.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
  const fileName = `InterviewAI_Report_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);

  function drawPageFooter() {
    const pg = doc.internal.getCurrentPageInfo().pageNumber;
    doc.setFillColor(226, 232, 240);
    doc.rect(0, pageH - FOOTER_H, pageW, FOOTER_H, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(75, 85, 99);
    doc.text('InterviewAI — Confidential Performance Report', margin, pageH - 4);
    doc.text(`Page ${pg}`, pageW - margin, pageH - 4, { align: 'right' });
  }
}

/* ═══════════════════════════════════════════════════════
   MAIN RESULT PAGE
═══════════════════════════════════════════════════════ */
export default function Result({ sessionData }) {
  const [report, setReport]           = useState(null);
  const [loading, setLoading]         = useState(true);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionData?.session_id) { navigate('/'); return; }
    getEvaluation(sessionData.session_id)
      .then((data) => setReport(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionData, navigate]);

  const handleDownloadPDF = async () => {
    if (!report) return;
    setDownloading(true);
    try {
      generatePDF(report, sessionData);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('PDF generate karne mein masla aaya. Please dobara try karein.');
    } finally {
      setTimeout(() => setDownloading(false), 1500);
    }
  };

  /* ── Loading ── */
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', border: '3px solid rgba(99,102,241,0.15)', borderTop: '3px solid #6366f1' }} className="animate-spin" />
      <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }} className="animate-pulse">AI is generating your report…</p>
    </div>
  );

  /* ── No report ── */
  if (!report || Object.keys(report).length === 0) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 32 }}>
      <div style={{ fontSize: 64 }}>📋</div>
      <h1 style={{ fontSize: '1.5rem' }}>No Report Available</h1>
      <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: 380 }}>The interview ended before any questions were answered.</p>
      <button onClick={() => navigate('/')} className="btn btn-primary">Start New Interview</button>
    </div>
  );

  const scores        = report.question_scores || [];
  const answeredCount = report.questions_answered ?? scores.length;
  const totalCount    = report.total_questions ?? 10;
  const completionPct = Math.round((answeredCount / totalCount) * 100);
  const overallScore  = Number(report.overall_score ?? 0);

  /* ── Download button JSX (reusable) ── */
  const DownloadBtn = ({ size = 'md' }) => {
    const big = size === 'lg';
    return (
      <button
        onClick={handleDownloadPDF}
        disabled={downloading}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: big ? '14px 32px' : '9px 20px',
          borderRadius: big ? 12 : 10, border: 'none',
          cursor: downloading ? 'not-allowed' : 'pointer',
          background: downloading ? 'rgba(99,102,241,0.35)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff', fontWeight: 600,
          fontSize: big ? '0.95rem' : '0.85rem',
          boxShadow: downloading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
          transition: 'all 0.2s ease', opacity: downloading ? 0.7 : 1,
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { if (!downloading) { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(99,102,241,0.55)'; }}}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = downloading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)'; }}
      >
        {downloading ? (
          <><div style={{ width: big ? 16 : 14, height: big ? 16 : 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} className="animate-spin" />Generating PDF…</>
        ) : (
          <>
            <svg width={big ? 17 : 15} height={big ? 17 : 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PDF Report
          </>
        )}
      </button>
    );
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>

      {/* ── NAV ── */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '1px solid var(--border-subtle)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(2,8,23,0.90)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark size={30} />
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>InterviewAI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <DownloadBtn size="sm" />
          <button onClick={() => navigate('/')} className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>← New Interview</button>
        </div>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px 0' }}>

        {/* ── HERO ── */}
        <div className="animate-fade-in-up" style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ marginBottom: 12, display: 'inline-block' }}>
            <span className="badge badge-indigo" style={{ fontSize: '0.8125rem', padding: '6px 16px' }}>📊 Interview Complete</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: 12 }}>Your <span className="gradient-text-green">Performance Report</span></h1>
          {sessionData?.job_title && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{sessionData.experience_level} {sessionData.job_title}</span>
              {' · '}{answeredCount} of {totalCount} questions answered
            </p>
          )}
        </div>

        {/* ── SUMMARY CARDS ── */}
        <div className="animate-fade-in-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28, animationDelay: '80ms' }}>
          <div className="glass-card" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Overall Score</p>
            <ScoreRing score={overallScore} />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{overallScore >= 8 ? '🏆 Excellent' : overallScore >= 5 ? '🎯 Good' : '📚 Needs Work'}</p>
          </div>
          <div className="glass-card" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Completion</p>
            <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '3rem', fontWeight: 800, lineHeight: 1, color: '#a5b4fc' }}>{completionPct}%</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{answeredCount}/{totalCount} questions</p>
            <ScoreBar score={completionPct / 10} />
          </div>
          <div className="glass-card" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Recommendation</p>
            <RecommendationBadge rec={report.hiring_recommendation} />
          </div>
        </div>

        {/* ── PDF DOWNLOAD BANNER ── */}
        <div className="animate-fade-in-up" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 14, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, gap: 16, animationDelay: '120ms' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📄</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 2 }}>Save Your Report</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Full interview report with all questions, answers, scores & feedback — download as PDF</p>
            </div>
          </div>
          <DownloadBtn size="sm" />
        </div>

        {/* ── AI SUMMARY ── */}
        {report.overall_feedback && (
          <div className="glass-card animate-fade-in-up" style={{ padding: '24px', marginBottom: 36, animationDelay: '160ms', borderLeft: '3px solid rgba(99,102,241,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 22 }}>🧠</span>
              <p style={{ fontSize: '0.8rem', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>AI Evaluator's Summary</p>
            </div>
            <p style={{ color: '#cbd5e1', lineHeight: 1.8, fontSize: '0.9375rem' }}>{report.overall_feedback}</p>
          </div>
        )}

        {/* ── QUESTION BREAKDOWN ── */}
        <div className="animate-fade-in-up" style={{ animationDelay: '240ms' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Question-by-Question Breakdown</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{scores.length} questions</span>
          </div>
          {scores.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No answers recorded.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {scores.map((q, i) => (
                <QuestionCard key={i} q={q} i={i} expanded={expandedIdx === i} onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)} />
              ))}
            </div>
          )}
        </div>

        {/* ── FOOTER BUTTONS ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 56 }}>
          <DownloadBtn size="lg" />
          <button onClick={() => navigate('/')} className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '0.95rem' }}>
            🚀 Start New Interview
          </button>
        </div>

      </div>
    </div>
  );
}
