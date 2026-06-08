from langgraph.graph import StateGraph, END
from .state import InterviewState
from .nodes import (
    generate_questions_node,
    evaluate_answer_node,
    next_question_node,
    generate_final_report_node
)

def build_workflow():
    workflow = StateGraph(InterviewState)
    
    workflow.add_node("generate_questions", generate_questions_node)
    workflow.add_node("evaluate_answer", evaluate_answer_node)
    workflow.add_node("next_question", next_question_node)
    workflow.add_node("generate_final_report", generate_final_report_node)
    
    workflow.set_entry_point("generate_questions")
    workflow.add_edge("generate_questions", "next_question")
    workflow.add_edge("evaluate_answer", "next_question")
    
    def check_completion(state: InterviewState):
        if state.get("interview_completed"):
            return "generate_final_report"
        return END
        
    workflow.add_conditional_edges(
        "next_question",
        check_completion,
        {
            "generate_final_report": "generate_final_report",
            END: END
        }
    )
    workflow.add_edge("generate_final_report", END)
    
    return workflow.compile()

app = build_workflow()
