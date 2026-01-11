from pydantic import BaseModel

class SignupRequest(BaseModel):
    email: str
    password: str
    role: str  # user | blogger

class AuthRequest(BaseModel):
    email: str
    password: str

class ArticleRequest(BaseModel):
    title: str
    content: str
    category: str