from typing import List, Dict, Any, TypedDict, Annotated
import operator

class QuestionScore(TypedDict):
    question: str
    answer: str
    score: int
    feedback: str
    strengths: List[str]
    weaknesses: List[str]

class InterviewState(TypedDict):
    session_id: str
    job_title: str
    experience_level: str
    questions: List[str]
    current_question_index: int
    current_question: str
    scores: Annotated[List[QuestionScore], operator.add]
    interview_completed: bool
    final_report: Dict[str, Any]
    transcript: str
