import os
from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv()

def get_llm():
    return ChatGroq(
        temperature=0.7,
        model_name="llama-3.1-8b-instant",  
        api_key=os.getenv("GROQ_API_KEY")
    )
