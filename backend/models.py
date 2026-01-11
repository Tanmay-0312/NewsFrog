from database import Base
from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String, default="user")  # user | blogger


class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    content = Column(Text)
    summary = Column(Text)
    category = Column(String)
    author_email = Column(String)
    source = Column(String, default="blogger")
    created_at = Column(DateTime, default=datetime.utcnow)


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True)
    user_email = Column(String, index=True)
    category = Column(String)  # india | tech | sports | world
    score = Column(Integer, default=0)


class UserNewspaper(Base):
    __tablename__ = "user_newspapers"

    id = Column(Integer, primary_key=True)
    user_email = Column(String, index=True)
    date = Column(String)  # YYYY-MM-DD
    articles_json = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)