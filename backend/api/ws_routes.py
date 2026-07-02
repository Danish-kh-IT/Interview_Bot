"""
WebSocket endpoint for real-time interview audio streaming.

Flow:
  1. Client connects: ws://localhost:8000/ws/interview/{session_id}
  2. Client sends binary audio chunks (raw WAV blob)
  3. Client sends JSON {"type": "end_of_speech"} when done speaking
  4. Server transcribes -> evaluates -> streams TTS back sentence by sentence
  5. Server sends:
       {"type": "transcript", "text": "..."}
       {"type": "tts_chunk", "audio": "<base64>", "is_last": bool}
       {"type": "done", ...}
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from core.state_store import get_session, save_session
from graph.nodes import evaluate_answer_node, next_question_node, generate_final_report_node
from services.audio import transcribe_audio_bytes, generate_tts
from services.transcript_filter import sanitize_transcript
import json
import asyncio

ws_router = APIRouter()


def _split_sentences(text: str) -> list:
    """Split text into sentence chunks for streaming TTS."""
    sentences = []
    current = ""
    enders = {".", "!", "?"}
    for char in text:
        current += char
        if char in enders and len(current.strip()) > 10:
            sentences.append(current.strip())
            current = ""
    if current.strip():
        sentences.append(current.strip())
    return sentences if sentences else [text]


def _store_score(state: dict, score_entry: dict) -> None:
    scores = list(state.get("scores", []))
    idx = state.get("current_question_index", 0)
    while len(scores) <= idx:
        scores.append({})
    scores[idx] = score_entry
    state["scores"] = scores


LEAVE_PHRASES = [
    "end meeting", "end this meeting", "end the meeting", "stop interview",
    "stop the interview", "leave meeting", "leave the meeting",
    "i'm leaving the meeting", "i'm leaving the interview",
    "quit", "leave the interview", "i want to end", "i want to end this meeting",
    "i want to end this interview", "i want to stop this interview",
    "i don't want to continue",
]


@ws_router.websocket("/ws/interview/{session_id}")
async def websocket_interview(websocket: WebSocket, session_id: str):
    await websocket.accept()
    print(f"[WS] Client connected: {session_id}")

    audio_buffer = bytearray()

    try:
        while True:
            message = await websocket.receive()

            # Binary = audio chunk from microphone
            if "bytes" in message and message["bytes"]:
                audio_buffer.extend(message["bytes"])
                continue

            if "text" not in message or not message["text"]:
                continue

            try:
                data = json.loads(message["text"])
            except json.JSONDecodeError:
                continue

            msg_type = data.get("type")

            # ── USER FINISHED SPEAKING: process audio ──
            if msg_type == "end_of_speech":
                if not audio_buffer:
                    await websocket.send_text(json.dumps({
                        "type": "no_speech",
                        "message": "No audio received"
                    }))
                    audio_buffer = bytearray()
                    continue

                state = get_session(session_id)
                if not state:
                    await websocket.send_text(json.dumps({
                        "type": "error", "message": "Session not found"
                    }))
                    audio_buffer = bytearray()
                    continue

                audio_bytes = bytes(audio_buffer)
                audio_buffer = bytearray()

                # Step 1: Transcribe
                await websocket.send_text(json.dumps({
                    "type": "processing", "stage": "transcribing"
                }))
                try:
                    transcript = await transcribe_audio_bytes(
                        audio_bytes, "audio.wav", "audio/wav"
                    )
                    transcript = sanitize_transcript(transcript or "")
                except Exception as e:
                    print(f"[WS] Transcription error: {e}")
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": f"Transcription failed: {str(e)}"
                    }))
                    continue

                state["transcript"] = transcript

                if not transcript.strip():
                    await websocket.send_text(json.dumps({
                        "type": "no_speech",
                        "question_text": state.get("current_question", ""),
                        "question_number": state.get("current_question_index", 0) + 1,
                    }))
                    save_session(session_id, state)
                    continue

                # Send transcript back immediately so UI can show it
                await websocket.send_text(json.dumps({
                    "type": "transcript", "text": transcript
                }))

                # Check for leave/end phrases
                lower_t = transcript.lower()
                if any(p in lower_t for p in LEAVE_PHRASES):
                    scores = state.get("scores", [])
                    if not scores:
                        report = {
                            "overall_score": 0,
                            "overall_feedback": f"Candidate ended early. Last: '{transcript}'",
                            "hiring_recommendation": "Reject",
                            "question_scores": [],
                            "questions_answered": 0,
                            "total_questions": 10,
                        }
                    else:
                        state["interview_completed"] = True
                        result = generate_final_report_node(state)
                        report = result.get("final_report", {})
                        report["question_scores"] = scores
                        report["questions_answered"] = len(scores)
                        report["total_questions"] = 10
                    state["final_report"] = report
                    state["interview_completed"] = True
                    save_session(session_id, state)
                    await websocket.send_text(json.dumps({
                        "type": "done", "completed": True,
                        "message": "Candidate ended interview early"
                    }))
                    continue

                # Step 2: Evaluate
                await websocket.send_text(json.dumps({
                    "type": "processing", "stage": "evaluating"
                }))
                try:
                    eval_result = evaluate_answer_node(state)
                    new_scores = eval_result.get("scores", [])
                    if new_scores:
                        _store_score(state, new_scores[0])
                except Exception as e:
                    print(f"[WS] Evaluation error: {e}")
                    await websocket.send_text(json.dumps({
                        "type": "error", "message": f"Evaluation failed: {str(e)}"
                    }))
                    continue

                state["awaiting_confirmation"] = True
                save_session(session_id, state)

                total_questions = len(state.get("questions", [])) or 10
                is_last_question = (
                    state.get("current_question_index", 0) + 1
                ) >= total_questions
                score_entry = state["scores"][state["current_question_index"]]

                await websocket.send_text(json.dumps({
                    "type": "done",
                    "completed": False,
                    "awaiting_confirmation": True,
                    "is_last_question": is_last_question,
                    "question_text": state.get("current_question", ""),
                    "question_number": state.get("current_question_index", 0) + 1,
                    "transcript_preview": transcript,
                    "score": score_entry.get("score", 0),
                    "feedback": score_entry.get("feedback", ""),
                }))

            # ── ADVANCE TO NEXT QUESTION with streaming TTS ──
            elif msg_type == "advance_question":
                state = get_session(session_id)
                if not state:
                    await websocket.send_text(json.dumps({
                        "type": "error", "message": "Session not found"
                    }))
                    continue

                try:
                    next_result = next_question_node(state)
                    state.update(next_result)
                except Exception as e:
                    await websocket.send_text(json.dumps({
                        "type": "error", "message": str(e)
                    }))
                    continue

                state["awaiting_confirmation"] = False

                if state.get("interview_completed"):
                    try:
                        report_result = generate_final_report_node(state)
                        final_report = report_result.get("final_report", {})
                        final_report["question_scores"] = state["scores"]
                        final_report["questions_answered"] = len(state["scores"])
                        final_report["total_questions"] = 10
                        state["final_report"] = final_report
                        save_session(session_id, state)
                    except Exception as e:
                        await websocket.send_text(json.dumps({
                            "type": "error", "message": str(e)
                        }))
                        continue
                    await websocket.send_text(json.dumps({
                        "type": "done", "completed": True, "message": "Interview Finished"
                    }))
                    continue

                question_text = state["current_question"]
                question_number = state.get("current_question_index", 0) + 1
                save_session(session_id, state)

                # Tell frontend the question text immediately (for typewriter effect)
                await websocket.send_text(json.dumps({
                    "type": "question_start",
                    "question_text": question_text,
                    "question_number": question_number,
                }))

                # Stream TTS sentence by sentence for low latency
                sentences = _split_sentences(question_text)
                for i, sentence in enumerate(sentences):
                    try:
                        audio_b64 = await generate_tts(sentence)
                        is_last = (i == len(sentences) - 1)
                        await websocket.send_text(json.dumps({
                            "type": "tts_chunk",
                            "audio": audio_b64,
                            "text": sentence,
                            "chunk_index": i,
                            "total_chunks": len(sentences),
                            "is_last": is_last,
                        }))
                        # Small gap to let client queue audio smoothly
                        await asyncio.sleep(0.05)
                    except Exception as e:
                        print(f"[WS] TTS error for sentence {i}: {e}")

                await websocket.send_text(json.dumps({
                    "type": "question_done",
                    "question_text": question_text,
                    "question_number": question_number,
                }))

            # ── END INTERVIEW ──
            elif msg_type == "end_interview":
                state = get_session(session_id)
                if not state:
                    await websocket.send_text(json.dumps({
                        "type": "error", "message": "Session not found"
                    }))
                    continue

                scores = state.get("scores", [])
                if not scores:
                    report = {
                        "overall_score": 0,
                        "overall_feedback": "The candidate left before answering any questions.",
                        "hiring_recommendation": "Reject",
                        "question_scores": [],
                        "questions_answered": 0,
                        "total_questions": 10,
                    }
                else:
                    state["interview_completed"] = True
                    result = generate_final_report_node(state)
                    report = result.get("final_report", {})
                    report["question_scores"] = scores
                    report["questions_answered"] = len(scores)
                    report["total_questions"] = 10

                state["final_report"] = report
                state["interview_completed"] = True
                save_session(session_id, state)
                await websocket.send_text(json.dumps({
                    "type": "done",
                    "completed": True,
                    "questions_answered": len(scores),
                }))

            # ── KEEPALIVE PING ──
            elif msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        print(f"[WS] Client disconnected: {session_id}")
    except Exception as e:
        print(f"[WS] Unexpected error for {session_id}: {e}")
        try:
            await websocket.send_text(json.dumps({
                "type": "error", "message": str(e)
            }))
        except Exception:
            pass
