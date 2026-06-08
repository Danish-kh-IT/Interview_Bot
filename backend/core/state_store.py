from typing import Dict, Any

# Simple In-Memory Store
# In production, replace this with a Redis instance.
SESSIONS: Dict[str, Any] = {}

def get_session(session_id: str) -> Any:
    return SESSIONS.get(session_id)

def save_session(session_id: str, state: Any):
    SESSIONS[session_id] = state
