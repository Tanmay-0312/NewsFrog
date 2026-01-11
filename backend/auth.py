from fastapi import APIRouter, Depends, HTTPException
from passlib.context import CryptContext
from jose import jwt
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer
from database import SessionLocal
from models import User
from schemas import SignupRequest, AuthRequest  # 🔴 IMPORTANT
from schemas import ArticleRequest
from models import Article
from models import UserPreference, UserNewspaper
import json
from datetime import datetime
from datetime import date
router = APIRouter()
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET = "dev_secret"
ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ======================
# SIGNUP
# ======================
@router.post("/signup")
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    # 1️⃣ Check if user already exists
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="User exists")

    # 2️⃣ Validate role
    if data.role not in ["user", "blogger"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    # 3️⃣ Create user
    user = User(
        email=data.email,
        password=pwd.hash(data.password),
        role=data.role
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"msg": "Account created"}


# ======================
# LOGIN
# ======================
from fastapi.security import OAuth2PasswordRequestForm

@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not pwd.verify(form_data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = jwt.encode(
        {
            "sub": user.email,
            "role": user.role
        },
        SECRET,
        algorithm=ALGORITHM
    )

    return {"access_token": token, "token_type": "bearer"}

@router.post("/blogger/article")
def create_article(
    data: ArticleRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    # 🔓 Decode JWT
    payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])

    # 🔒 Blogger-only access
    if payload.get("role") != "blogger":
        raise HTTPException(status_code=403, detail="Not authorized")

    article = Article(
        title=data.title,
        content=data.content,
        summary=data.content[:300] + "...",
        category=data.category,
        author_email=payload["sub"],
        source="blogger"
    )

    db.add(article)
    db.commit()
    db.refresh(article)

    return {"msg": "Article published"}
@router.get("/blogger/articles")
def get_blogger_articles(db: Session = Depends(get_db)):
    articles = (
        db.query(Article)
        .order_by(Article.created_at.desc())
        .all()
    )

    return [
        {
            "id": a.id,
            "title": a.title,
            "summary": a.summary,
            "content": a.content,
            "category": a.category,
            "author": a.author_email,
            "created_at": a.created_at.isoformat(),
            "source": a.source
        }
        for a in articles
    ]

def update_user_preference(db, user_email, category, weight=1):
    pref = (
        db.query(UserPreference)
        .filter_by(user_email=user_email, category=category)
        .first()
    )

    if pref:
        pref.score += weight
    else:
        pref = UserPreference(
            user_email=user_email,
            category=category,
            score=weight
        )
        db.add(pref)

    db.commit()


@router.post("/newspaper/build")
def build_newspaper(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    email = payload["sub"]

    today = date.today().isoformat()

    # 🔒 24-hour lock
    existing = (
        db.query(UserNewspaper)
        .filter_by(user_email=email, date=today)
        .first()
    )

    if existing:
        return {"msg": "Newspaper already generated today"}

    # 1️⃣ Get user preferences
    prefs = (
        db.query(UserPreference)
        .filter_by(user_email=email)
        .order_by(UserPreference.score.desc())
        .all()
    )

    if not prefs:
        return {"msg": "No preferences yet"}

    # 2️⃣ Fetch summarized news
    from storage import load_json
    news = load_json("summarized_news.json")

    picked = []
    seen = set()

    for p in prefs:
        for n in news:
            if n["category"] == p.category and n["title"] not in seen:
                picked.append(n)
                seen.add(n["title"])
            if len(picked) >= 12:
                break

    paper = UserNewspaper(
        user_email=email,
        date=today,
        articles_json=json.dumps(picked)
    )

    db.add(paper)
    db.commit()

    return {"msg": "Personalized newspaper created"}



@router.get("/newspaper")
def get_my_newspaper(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    email = payload["sub"]

    paper = (
        db.query(UserNewspaper)
        .filter_by(user_email=email)
        .order_by(UserNewspaper.created_at.desc())
        .first()
    )

    if not paper:
        return []

    return json.loads(paper.articles_json)


@router.post("/track")
def track_preference(
    category: str,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    email = payload["sub"]

    print("📌 TRACK HIT:", email, category)  # 👈 ADD THIS

    pref = (
        db.query(UserPreference)
        .filter_by(user_email=email, category=category)
        .first()
    )

    if pref:
        pref.score += 1
    else:
        pref = UserPreference(
            user_email=email,
            category=category,
            score=1
        )
        db.add(pref)

    db.commit()
    return {"msg": "Preference updated"}

