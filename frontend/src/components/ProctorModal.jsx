import React from "react";

export default function ProctorModal({
  show,
  warningCount,
  maxWarnings,
  reason,
  onDismiss,
  onEnterFullscreen,
  isFullscreen,
}) {
  if (!show) return null;

  const isFinalWarning = warningCount >= maxWarnings;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(2, 8, 23, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: "20px",
        animation: "fadeIn 0.25s ease-out",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "460px",
          background: "linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.98))",
          border: "1px solid rgba(239, 68, 68, 0.35)",
          borderRadius: "24px",
          padding: "32px 28px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(239, 68, 68, 0.15)",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          overflow: "hidden",
        }}
      >
        {/* Glow accent element */}
        <div
          style={{
            position: "absolute",
            top: "-40px",
            right: "-40px",
            width: "140px",
            height: "140px",
            background: "radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 70%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />

        {/* Warning Icon Badge */}
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.12)",
            border: "1.5px solid rgba(239, 68, 68, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ef4444",
            boxShadow: "0 0 20px rgba(239, 68, 68, 0.2)",
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* Title & Description */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <h3
            style={{
              fontSize: "1.35rem",
              fontWeight: "700",
              color: "#f8fafc",
              letterSpacing: "-0.02em",
            }}
          >
            {isFinalWarning ? "Interview Terminated" : "Security Warning Detected"}
          </h3>
          <p
            style={{
              fontSize: "0.9rem",
              color: "#94a3b8",
              lineHeight: "1.5",
              margin: 0,
            }}
          >
            {reason ||
              "Leaving the interview window or splitting screens is strictly prohibited during proctored evaluation."}
          </p>
        </div>

        {/* Status Pill */}
        <div
          style={{
            width: "100%",
            background: "rgba(15, 23, 42, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.85rem",
          }}
        >
          <span style={{ color: "#64748b", fontWeight: 500 }}>Warnings Used</span>
          <span
            style={{
              fontWeight: 700,
              color: isFinalWarning ? "#ef4444" : "#f59e0b",
              background: isFinalWarning ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
              padding: "3px 10px",
              borderRadius: "20px",
              border: `1px solid ${isFinalWarning ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`,
            }}
          >
            {warningCount} / {maxWarnings}
          </span>
        </div>

        {!isFullscreen && (
          <p
            style={{
              fontSize: "0.8rem",
              color: "#f59e0b",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              margin: 0,
            }}
          >
            <span>⚠️</span> Please re-enable Fullscreen mode to continue.
          </p>
        )}

        {/* Buttons */}
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginTop: "4px",
          }}
        >
          {!isFullscreen && (
            <button
              onClick={onEnterFullscreen}
              style={{
                width: "100%",
                padding: "12px 20px",
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "14px",
                fontSize: "0.92rem",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
                transition: "all 0.2s ease",
              }}
            >
              Enter Fullscreen Mode
            </button>
          )}

          <button
            onClick={onDismiss}
            style={{
              width: "100%",
              padding: "12px 20px",
              background: "rgba(30, 41, 59, 0.8)",
              color: "#e2e8f0",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "14px",
              fontSize: "0.92rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            I Understand & Resume
          </button>
        </div>
      </div>
    </div>
  );
}
