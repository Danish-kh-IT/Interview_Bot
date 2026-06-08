from pydantic import BaseModel

class StartRequest(BaseModel):
    job_title: str
    experience_level: str
