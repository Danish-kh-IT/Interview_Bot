import json
from .state import InterviewState
from .prompts import QUESTION_GENERATION_PROMPT, EVALUATION_PROMPT, FINAL_REPORT_PROMPT
from services.llm import get_llm
from services.rag import get_rag_context
from langchain_core.messages import HumanMessage

def generate_questions_node(state: InterviewState) -> InterviewState:
    llm = get_llm()
    rag_context = get_rag_context(state["session_id"])
    
    prompt = QUESTION_GENERATION_PROMPT.format(
        job_title=state["job_title"],
        experience_level=state.get("experience_level", "Mid-level"),
        rag_context=rag_context if rag_context else "No context provided."
    )
    response = llm.invoke([HumanMessage(content=prompt)])
    
    try:
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()
        questions = json.loads(content)
        if len(questions) < 10:
            while len(questions) < 10:
                questions.append(f"Could you tell me more about your experience as a {state['job_title']}?")
    except Exception as e:
        print(f"Error parsing questions: {e}")
        questions = [f"General Question {i+1} for {state['job_title']}" for i in range(10)]
    
    return {"questions": questions}

def evaluate_answer_node(state: InterviewState) -> InterviewState:
    llm = get_llm()
    prompt = EVALUATION_PROMPT.format(
        job_title=state["job_title"],
        experience_level=state.get("experience_level", "Mid-level"),
        question=state["current_question"],
        answer=state["transcript"]
    )
    response = llm.invoke([HumanMessage(content=prompt)])
    
    try:
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()
        eval_data = json.loads(content)
    except Exception as e:
        print(f"Error parsing evaluation: {e}")
        eval_data = {
            "score": 5,
            "feedback": "Could not parse detailed feedback.",
            "strengths": [],
            "weaknesses": []
        }
        
    score_entry = {
        "question": state["current_question"],
        "answer": state["transcript"],
        "score": eval_data.get("score", 0),
        "feedback": eval_data.get("feedback", ""),
        "strengths": eval_data.get("strengths", []),
        "weaknesses": eval_data.get("weaknesses", [])
    }
    
    return {"scores": [score_entry]}

def next_question_node(state: InterviewState) -> InterviewState:
    current_index = state.get("current_question_index", 0)
    questions = state.get("questions", [])
    
    if not state.get("current_question"):
        return {
            "current_question": questions[0],
            "current_question_index": 0,
            "interview_completed": False
        }
        
    next_index = current_index + 1
    if next_index >= 10 or next_index >= len(questions):
        return {
            "interview_completed": True,
            "current_question_index": next_index
        }
        
    return {
        "current_question": questions[next_index],
        "current_question_index": next_index,
        "interview_completed": False
    }

def generate_final_report_node(state: InterviewState) -> InterviewState:
    llm = get_llm()
    prompt = FINAL_REPORT_PROMPT.format(
        job_title=state["job_title"],
        scores=json.dumps(state.get("scores", []))
    )
    
    response = llm.invoke([HumanMessage(content=prompt)])
    try:
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()
        final_report = json.loads(content)
        final_report["question_scores"] = state.get("scores", [])
    except Exception as e:
        print(f"Error parsing final report: {e}")
        final_report = {
            "overall_score": 0,
            "overall_feedback": "Could not parse final report.",
            "hiring_recommendation": "Consider",
            "question_scores": state.get("scores", [])
        }
        
    return {"final_report": final_report}
