# 🐸 NewsFrog — AI Powered News Website (Voice + Personalized Newspaper)

NewsFrog is a full-stack AI news platform that fetches news from multiple sources (APIs + RSS + Reddit), categorizes it, generates summaries, provides AI explanations (Kid / Hinglish / Bullet mode), supports voice interaction, and allows users to build a personalized daily newspaper based on their interests.

---

## ✨ Features

### 📰 News Aggregation
- Fetches real-time news from:
  - NewsAPI
  - GNews
  - NewsData.io
  - RSS feeds (Reuters, BBC, TOI, Hindustan Times)
  - Reddit RSS feeds

### 🧠 AI Summaries + Explanations
- Generates newspaper-style summaries
- AI explainer modes:
  - 👶 Explain like I’m 5 (Kid mode)
  - 🇮🇳 Hinglish explanation
  - 📌 Bullet-point explanation
- Caching system to avoid repeated AI calls and reduce API usage

### 🎙 Voice Features
- Voice headline reading (TTS)
- Voice supported user interaction (backend voice router)

### 👤 Authentication + Roles
- JWT Authentication
- Roles:
  - `user`
  - `blogger`

### 📝 Blogger Publishing
- Bloggers can publish articles
- Articles stored in database

### 🗞 Personalized Newspaper
- Users’ category preferences tracked
- Generates a personalized newspaper once per day (24-hour lock)

### 📄 Newspaper PDF Generation
- Generates a PDF newspaper with:
  - headlines
  - images (if available)
  - summaries

---

## 🧰 Tech Stack

### Frontend
- React + Vite
- React Router
- Auth-based protected routes

### Backend
- FastAPI
- SQLite Database (SQLAlchemy)
- JWT Auth
- ReportLab (PDF generation)
- Gemini API (AI explanation & summarization)

---

## 📁 Project Structure

NewsFrog/
│
├── backend/
│ ├── backend.py # FastAPI main server
│ ├── auth.py # Auth routes (signup/login/JWT)
│ ├── database.py # SQLite DB connection
│ ├── models.py # DB Models
│ ├── schemas.py # Pydantic schemas
│ ├── news_fetcher.py # News fetching logic
│ ├── summarizer.py # Categorization + summary helpers
│ ├── ai_explainer.py # Gemini AI explainer + caching
│ ├── tts_reader.py # Text-to-speech reading
│ ├── voice.py # Voice router
│ ├── storage.py # JSON save/load helpers
│ ├── requirements.txt # Backend dependencies
│ └── generated_pdfs/ # PDF outputs
│
├── frontend/
│ ├── src/
│ │ ├── pages/ # Home/Login/Signup/Newspaper etc.
│ │ ├── routes/ # BloggerRoute etc.
│ │ └── utils/ # auth.js
│ ├── package.json
│ └── vite.config.js
│
└── sources.json # RSS sources list



---

## ⚙️ Environment Variables

Create a `.env` file inside **backend/**:

`backend/.env`
```env
HF_API_KEY=your_huggingface_key
GNEWS_KEY=your_gnews_key
NEWSAPI_KEY=your_newsapi_key
NEWSDATA_KEY=your_newsdata_key
GEMINI_API_KEY=your_gemini_key
SECRET_KEY=your_jwt_secret


🚀 Run Locally
 Backend Setup (FastAPI)

cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend:app --reload
Backend runs at:
📍 http://127.0.0.1:8000

Swagger docs:
📍 http://127.0.0.1:8000/docs

  Frontend Setup (React)

cd frontend
npm install
npm run dev

Frontend runs at:
📍 http://localhost:5173

🔥 API Endpoints Overview

| Endpoint           | Method | Description                  |
| ------------------ | ------ | ---------------------------- |
| `/fetch`           | POST   | Fetch news from all sources  |
| `/summarize`       | POST   | Summarize & categorize news  |
| `/news`            | GET    | Get summarized news          |
| `/news/category`   | GET    | Filter news by category      |
| `/explain?mode=`   | POST   | Explain article using AI     |
| `/newspaper/pdf`   | POST   | Generate PDF newspaper       |
| `/signup`          | POST   | Signup user/blogger          |
| `/login`           | POST   | Login user/blogger           |
| `/blogger/article` | POST   | Blogger publish article      |
| `/newspaper/build` | POST   | Build personalized newspaper |
| `/newspaper`       | GET    | Get user newspaper           |

🛡 Security Notes

.env is ignored via .gitignore

API keys are never committed

SQLite database is local for development (can be upgraded to Postgres for production)

📌 Future Improvements

Deploy backend using Render / Railway

Deploy frontend using Vercel / Netlify

Replace SQLite with Postgres (Supabase / Railway DB)

Add recommendation engine using ML

Improve AI summarization with embeddings & semantic ranking

👨‍💻 Author

Tanmay Sharma
