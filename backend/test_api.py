import asyncio
from core.state_store import save_session, get_session
from graph.workflow import app as graph_app
from services.audio import generate_tts
import uuid
import sys

# Windows asyncio fix for edge-tts
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def test():
    session_id = str(uuid.uuid4())
    state = {
        "session_id": session_id,
        "job_title": "PHP",
        "current_question_index": 0,
        "scores": [],
        "interview_completed": False
    }
    save_session(session_id, state)
    print("Running graph...")
    try:
        new_state = graph_app.invoke(state)
        print("Graph done. Generating TTS...")
        audio_base64 = await generate_tts(new_state["current_question"])
        print("TTS done.")
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test())
