/**
 * InterviewSocket — WebSocket connection manager for the Interview Bot.
 *
 * Responsibilities:
 *  - Maintain a persistent WebSocket connection for a session
 *  - Send binary audio chunks & JSON control messages
 *  - Route incoming messages to registered handlers
 *  - Keepalive ping every 20s to prevent idle disconnection
 */

const WS_BASE = "ws://localhost:8000";
const PING_INTERVAL_MS = 20_000;

export class InterviewSocket {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this._ws = null;
    this._pingTimer = null;
    this._handlers = {}; // { messageType: [fn, ...] }
    this._connected = false;
    this._reconnectAttempts = 0;
    this._maxReconnects = 3;
  }

  /** Open the WebSocket connection */
  connect() {
    return new Promise((resolve, reject) => {
      const url = `${WS_BASE}/ws/interview/${this.sessionId}`;
      console.log("[Socket] Connecting:", url);

      const ws = new WebSocket(url);
      ws.binaryType = "arraybuffer";
      this._ws = ws;

      ws.onopen = () => {
        console.log("[Socket] Connected");
        this._connected = true;
        this._reconnectAttempts = 0;
        this._startPing();
        resolve();
      };

      ws.onmessage = (event) => {
        if (typeof event.data === "string") {
          try {
            const msg = JSON.parse(event.data);
            this._dispatch(msg.type, msg);
          } catch (e) {
            console.warn("[Socket] Failed to parse message:", e);
          }
        }
      };

      ws.onerror = (err) => {
        console.error("[Socket] Error:", err);
        if (!this._connected) reject(err);
      };

      ws.onclose = (event) => {
        console.log("[Socket] Closed:", event.code, event.reason);
        this._connected = false;
        this._stopPing();
        this._dispatch("disconnected", { code: event.code });
      };
    });
  }

  /** Register a handler for a specific message type */
  on(type, handler) {
    if (!this._handlers[type]) this._handlers[type] = [];
    this._handlers[type].push(handler);
  }

  /** Remove all handlers for a type, or a specific handler */
  off(type, handler) {
    if (!handler) {
      delete this._handlers[type];
    } else {
      this._handlers[type] = (this._handlers[type] || []).filter(
        (h) => h !== handler
      );
    }
  }

  /** Send a JSON control message */
  send(obj) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(obj));
    } else {
      console.warn("[Socket] Cannot send — not connected");
    }
  }

  /** Send raw binary audio chunk */
  sendAudio(arrayBuffer) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(arrayBuffer);
    }
  }

  /** Signal end of speech — triggers server-side STT + evaluation */
  endOfSpeech(retrySame = false) {
    this.send({ type: "end_of_speech", retry_same: retrySame });
  }

  /** Ask server to advance to next question (with streaming TTS) */
  advanceQuestion() {
    this.send({ type: "advance_question" });
  }

  /** Tell server to end the interview */
  endInterview() {
    this.send({ type: "end_interview" });
  }

  /** Close the connection */
  disconnect() {
    this._stopPing();
    if (this._ws) {
      this._ws.onclose = null; // suppress handler
      this._ws.close(1000, "Client disconnecting");
      this._ws = null;
    }
    this._connected = false;
  }

  get isConnected() {
    return this._connected && this._ws?.readyState === WebSocket.OPEN;
  }

  // ── Private helpers ──

  _dispatch(type, msg) {
    const handlers = this._handlers[type] || [];
    handlers.forEach((h) => {
      try {
        h(msg);
      } catch (e) {
        console.error(`[Socket] Handler error for '${type}':`, e);
      }
    });
    // Also dispatch to wildcard handlers
    (this._handlers["*"] || []).forEach((h) => {
      try {
        h(msg);
      } catch (e) {}
    });
  }

  _startPing() {
    this._pingTimer = setInterval(() => {
      this.send({ type: "ping" });
    }, PING_INTERVAL_MS);
  }

  _stopPing() {
    clearInterval(this._pingTimer);
    this._pingTimer = null;
  }
}
