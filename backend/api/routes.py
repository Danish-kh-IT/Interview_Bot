from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from .schemas import StartRequest
from core.state_store import get_session, save_session
from graph.workflow import app as graph_app
from graph.nodes import evaluate_answer_node, next_question_node, generate_final_report_node
from services.audio import transcribe_audio, generate_tts
import uuid

router = APIRouter()


def _store_score(state: dict, score_entry: dict) -> None:
    """Store or replace score for the current question index."""
    scores = list(state.get("scores", []))
    idx = state.get("current_question_index", 0)
    
    while len(scores) <= idx:
        scores.append({})
        
    scores[idx] = score_entry
    state["scores"] = scores


@router.post("/start-interview")
async def start_interview(req: StartRequest):
    session_id = str(uuid.uuid4())
    initial_state = {
        "session_id": session_id,
        "job_title": req.job_title,
        "experience_level": req.experience_level,
        "current_question_index": 0,
        "scores": [],
        "interview_completed": False
    }
    save_session(session_id, initial_state)

    welcome_text = (
        f"Welcome to the interview for the {req.experience_level} {req.job_title} role. "
        "I am your AI interviewer. Today, I will be asking you technical, "
        "behavioral, and vision-oriented questions. Let's begin."
    )
    audio_base64 = await generate_tts(welcome_text)

    return {
        "session_id": session_id,
        "welcome_text": welcome_text,
        "welcome_audio_base64": audio_base64
    }


@router.post("/generate-questions/{session_id}")
async def generate_questions(session_id: str):
    """Uses the full LangGraph workflow: generate_questions → next_question → END"""
    state = get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    new_state = graph_app.invoke(state)
    audio_base64 = await generate_tts(new_state["current_question"])
    new_state["current_audio_base64"] = audio_base64
    save_session(session_id, new_state)
    return {"status": "ready"}


@router.get("/get-first-question/{session_id}")
async def get_first_question(session_id: str):
    state = get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    if not state.get("current_question"):
        raise HTTPException(status_code=400, detail="Questions not ready yet")

    return {
        "question_text": state["current_question"],
        "audio_base64": state.get("current_audio_base64", ""),
        "question_number": 1
    }


@router.post("/submit-answer")
async def submit_answer(
    session_id: str = Form(...),
    audio: UploadFile = File(...),
    retry_same: str = Form("false"),
):
    state = get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    if not state.get("current_question"):
        raise HTTPException(
            status_code=400,
            detail="Interview not ready. Please wait for the question to load.",
        )

    # 1. Transcribe the audio
    try:
        transcript = await transcribe_audio(audio)
    except Exception as e:
        print(f"[ERROR] Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

    state["transcript"] = transcript

    if not (transcript or "").strip():
        # Do not advance or score — let the candidate answer the same question again
        save_session(session_id, state)
        return {
            "completed": False,
            "no_speech": True,
            "question_text": state["current_question"],
            "audio_base64": state.get("current_audio_base64", ""),
            "question_number": state["current_question_index"] + 1,
            "transcript_preview": "",
            "message": (
                "I didn't hear a clear answer. Please tap the microphone "
                "and speak your response clearly."
            ),
        }

    # 1.5. Check if candidate explicitly wants to end/leave
    lower_t = transcript.lower()
    leave_phrases = [
        "end meeting", "end this meeting", "end the meeting", "stop interview","stop the interview", 
        "leave meeting","leave the meeting","i'm leaving the meeting", "i'm leaving the interview", 
        "quit", "I'm quit this interview", "I have to quit this interview", "leave the interview",
        "i want to end", "stop the interview", "end the interview","i want to end this meeting","i want to end this interview",
        "i want to stop this interview", "i want to stop this meeting", "i want to stop the interview", "i want to stop the meeting",
        "i don't want to continue", "i don't want to do this anymore", "i don't want to do this interview anymore",
        "i don't want to continue with this interview", "i don't want to do this interview anymore",
    ]
    if any(p in lower_t for p in leave_phrases):
        scores = state.get("scores", [])
        if not scores:
            report = {
                "overall_score": 0,
                "overall_feedback": f"The candidate explicitly ended the interview early without answering any questions. Last statement: '{transcript}'",
                "hiring_recommendation": "Reject",
                "question_scores": [],
                "questions_answered": 0,
                "total_questions": 10
            }
        else:
            state["interview_completed"] = True
            result = generate_final_report_node(state)
            report = result.get("final_report", {})
            report["overall_feedback"] = f"The candidate explicitly ended the interview early. Last statement: '{transcript}'.\n\n" + report.get("overall_feedback", "")
            report["question_scores"] = scores
            report["questions_answered"] = len(scores)
            report["total_questions"] = 10

        state["final_report"] = report
        state["interview_completed"] = True
        save_session(session_id, state)
        return {"completed": True, "message": "Candidate ended interview early"}

    # 2. Evaluate the answer (stay on same question until user confirms)
    try:
        eval_result = evaluate_answer_node(state)
        new_scores = eval_result.get("scores", [])
        if not new_scores:
            raise HTTPException(status_code=500, detail="Evaluation returned no score")
        _store_score(state, new_scores[0])
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Evaluation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

    state["awaiting_confirmation"] = True
    save_session(session_id, state)

    score_entry = state["scores"][state["current_question_index"]]
    return {
        "completed": False,
        "awaiting_confirmation": True,
        "question_text": state["current_question"],
        "audio_base64": state.get("current_audio_base64", ""),
        "question_number": state["current_question_index"] + 1,
        "transcript_preview": transcript,
        "score": score_entry.get("score", 0),
        "feedback": score_entry.get("feedback", ""),
    }


@router.post("/advance-question/{session_id}")
async def advance_question(session_id: str):
    """Move to the next question after the candidate confirms."""
    state = get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    if not state.get("current_question"):
        raise HTTPException(status_code=400, detail="No active question")

    try:
        next_result = next_question_node(state)
        state.update(next_result)
    except Exception as e:
        print(f"[ERROR] Next question node failed: {e}")
        raise HTTPException(status_code=500, detail=f"Next question failed: {str(e)}")

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
            print(f"[ERROR] Final report failed: {e}")
            raise HTTPException(status_code=500, detail=f"Final report failed: {str(e)}")
        return {"completed": True, "message": "Interview Finished"}

    try:
        audio_base64 = await generate_tts(state["current_question"])
        state["current_audio_base64"] = audio_base64
    except Exception as e:
        print(f"[ERROR] TTS generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")

    save_session(session_id, state)
    return {
        "completed": False,
        "question_text": state["current_question"],
        "audio_base64": audio_base64,
        "question_number": state["current_question_index"] + 1,
    }


@router.post("/end-interview/{session_id}")
async def end_interview(session_id: str):
    """Early exit: generate report from however many answers exist."""
    state = get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    scores = state.get("scores", [])
    if not scores:
        report = {
            "overall_score": 0,
            "overall_feedback": "The candidate left before answering any questions.",
            "hiring_recommendation": "Reject",
            "question_scores": [],
            "questions_answered": 0,
            "total_questions": 10
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
    return {"completed": True, "questions_answered": len(scores)}


@router.get("/evaluation/{session_id}")
async def get_evaluation(session_id: str):
    state = get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    return state.get("final_report", {})
