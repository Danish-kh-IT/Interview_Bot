import os
import shutil
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
import pdfplumber

VECTOR_STORE_DIR = "vector_stores"
os.makedirs(VECTOR_STORE_DIR, exist_ok=True)

# Using a lightweight, fast local embedding model
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def extract_text_from_pdf(pdf_path: str) -> str:
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text

def process_and_store_context(session_id: str, resume_path: str, jd_text: str):
    """
    Extracts text from the resume, combines it with the JD,
    chunks the text, and stores it in a FAISS vector database.
    """
    # 1. Extract text
    resume_text = ""
    if resume_path and os.path.exists(resume_path):
        resume_text = extract_text_from_pdf(resume_path)
    
    # 2. Combine with clear markers
    combined_text = ""
    if resume_text:
        combined_text += "--- CANDIDATE RESUME ---\n" + resume_text + "\n\n"
    if jd_text:
        combined_text += "--- JOB DESCRIPTION ---\n" + jd_text + "\n\n"
        
    if not combined_text.strip():
        return False
        
    # 3. Chunking
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100,
        separators=["\n\n", "\n", ".", " ", ""]
    )
    chunks = text_splitter.split_text(combined_text)
    
    # 4. Create and save FAISS index
    if chunks:
        vectorstore = FAISS.from_texts(chunks, embeddings)
        index_path = os.path.join(VECTOR_STORE_DIR, f"{session_id}_faiss")
        vectorstore.save_local(index_path)
        return True
    return False

def get_rag_context(session_id: str, query: str = "Key skills, job requirements, and candidate experience") -> str:
    """
    Retrieves the most relevant chunks from the FAISS index for the given session.
    """
    index_path = os.path.join(VECTOR_STORE_DIR, f"{session_id}_faiss")
    if not os.path.exists(index_path):
        return "" # No context uploaded
        
    try:
        vectorstore = FAISS.load_local(index_path, embeddings, allow_dangerous_deserialization=True)
        docs = vectorstore.similarity_search(query, k=4)
        
        context = "\n\n".join([doc.page_content for doc in docs])
        return context
    except Exception as e:
        print(f"[RAG ERROR] Failed to retrieve context: {e}")
        return ""
