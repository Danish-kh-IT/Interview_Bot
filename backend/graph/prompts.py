from langchain_core.prompts import PromptTemplate

QUESTION_GENERATION_PROMPT = PromptTemplate.from_template(
    """You are a professional interviewer conducting a VERBAL spoken interview for a {experience_level} {job_title} role.

STRICT RULES — you MUST follow these without exception:
- ALL questions must be conceptual, theoretical, or experience-based — things a candidate can ANSWER BY SPEAKING.
- NEVER ask the candidate to write code, implement a function, write a class, or produce any code output.
- NEVER say "write", "implement", "code", "program", "function", "algorithm" in any question.
- Instead of asking to implement something, ask the candidate to EXPLAIN how it works, why it's used, or describe their experience with it.
- Questions must feel like a real human interviewer is asking them in a conversation, not a coding test.

QUESTION STRUCTURE — generate exactly 10 questions:
- Questions 1–5: Technical conceptual questions specific to {job_title} at {experience_level} level.
  (e.g. "Explain how X works", "What is the difference between X and Y?", "Why would you use X over Y?", "How have you handled X in a real project?")
- Questions 6–8: Behavioral / situational questions.
  (e.g. "Tell me about a time when...", "How do you approach...", "Describe a challenge you faced...")
- Questions 9–10: Career vision / industry insight questions.
  (e.g. "Where do you see this technology heading?", "What skills are most important for this role in the next 3 years?")

Return ONLY a valid JSON array of exactly 10 question strings. No markdown, no numbering, no extra text.
["Question 1", "Question 2", ..., "Question 10"]"""
)

EVALUATION_PROMPT = PromptTemplate.from_template(
    """You are a professional senior interviewer evaluating a spoken verbal answer at a MEDIUM difficulty level.
This is a spoken interview — evaluate understanding and relevance, not writing style or answer length.

Role: {experience_level} {job_title}
Question Asked: {question}
Candidate's Answer: {answer}

MEDIUM-LEVEL SCORING RUBRIC — apply consistently:

9–10 — Excellent: Accurate, relevant, demonstrates solid understanding. May be brief if the core idea is correct.
7–8  — Good: Mostly correct with minor gaps or missing depth/examples.
5–6  — Average: Partially correct OR correct but too vague/superficial for the role level.
3–4  — Below average: Limited understanding, mostly vague, or partially off-topic.
1–2  — Poor: Largely incorrect, irrelevant, or no real attempt to answer.
0    — No answer: Blank, silence, or completely unrelated.

MEDIUM-LEVEL RULES:
- Be fair and professional — neither overly harsh nor overly generous.
- Short but accurate answers can score 7–9; brevity alone is not a penalty.
- Do NOT penalize accent, grammar, or informal phrasing — judge the idea.
- Reward specific examples, clear reasoning, and role-relevant depth.
- Partial answers: acknowledge what is correct, then note what is missing.
- Off-topic or filler answers without substance: score 2–4.
- "I don't know" with no reasoning: score 0–2.

Return EXACTLY valid JSON. No markdown, no extra text.
{{
  "score": <integer 0-10>,
  "feedback": "<2-3 professional sentences: what was good, what was missing, what a stronger answer would include>",
  "strengths": ["<specific strength>"],
  "weaknesses": ["<specific constructive gap>"]
}}"""
)

FINAL_REPORT_PROMPT = PromptTemplate.from_template(
    """Review all scores and feedback for this {job_title} interview at a MEDIUM evaluation standard.
Base your overall evaluation ONLY on the answers provided (candidate may have ended early).

HIRING RECOMMENDATION GUIDELINES (medium strictness):
- "Hire" — Consistent scores 7+ with clear role fit and solid understanding across most questions.
- "Consider" — Mixed performance (average 5–7), shows potential but notable gaps; worth a follow-up round.
- "Reject" — Average below 5, mostly vague/off-topic answers, or failed to demonstrate basic role knowledge.

Tone: Professional, balanced, constructive — acknowledge strengths and clearly state improvement areas.

Scores Data: {scores}

Return EXACTLY valid JSON matching this schema. No markdown formatting.
{{
  "overall_score": <average score float>,
  "overall_feedback": "<professional balanced summary of performance, strengths, and areas to improve>",
  "hiring_recommendation": "Reject | Consider | Hire"
}}"""
)