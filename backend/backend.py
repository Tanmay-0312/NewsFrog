from fastapi import FastAPI, BackgroundTasks, Body, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os, uuid, json, tempfile, requests, re
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from PIL import Image as PILImage
from io import BytesIO
from auth import router as auth_router
from database import engine, Base
import models

from news_fetcher import fetch_all_sources
from storage import save_json, load_json
from summarizer import categorize
from ai_explainer import explain_article
from voice import router as voice_router
from auth import router as auth_router

TEMP_DIR = tempfile.gettempdir()

# ---------------- APP ----------------
app = FastAPI(title="News AI API")
Base.metadata.create_all(bind=engine)

app.include_router(auth_router)

app.include_router(voice_router)
app.include_router(auth_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

print("🔥 backend.py loaded")

# ---------------- FETCH ----------------
@app.post("/fetch")
def fetch_articles():
    articles = fetch_all_sources()
    save_json("news_output.json", articles)
    return {"status": "fetched", "count": len(articles)}

# ---------------- LEAD SENTENCE LOGIC ----------------
def extract_lead_sentences(content: str, max_sentences=2) -> str:
    if not content:
        return ""

    text = content.strip()
    sentences = re.split(r'(?<=[.!?])\s+', text)

    lead = []
    for s in sentences:
        s = s.strip()
        if len(s) < 40:
            continue
        lead.append(s)
        if len(lead) >= max_sentences:
            break

    result = " ".join(lead)
    if result and not result.endswith("."):
        result += "."

    return result

def get_newspaper_summary(article: dict) -> str:
    """
    Newspaper priority order (REAL DATA):
    1. summary (already article-specific)
    2. content lead sentences (if available)
    3. headline-based fallback
    """

    # 1️⃣ BEST: existing summary
    summary = article.get("summary", "")
    if summary and len(summary.strip()) > 80:
        return summary.strip().rstrip(".") + "."

    # 2️⃣ Content lead (only if content exists)
    lead = extract_lead_sentences(article.get("content", ""))
    if lead:
        return lead

    # 3️⃣ Headline-based fallback (last resort)
    title = article.get("title", "").strip()
    source = article.get("source", "")

    if title:
        main = title.split(":")[0]
        return f"{main}. The story reports key developments as covered by {source or 'the news outlet'}."

    return "Key developments were reported in this story."


# ---------------- SUMMARIZE ----------------
def run_summarization():
    articles = load_json("news_output.json")
    summarized = []

    for article in articles:
        newspaper_summary = get_newspaper_summary(article)

        summarized.append({
            "source": article.get("source"),
            "title": article.get("title"),
            "url": article.get("url"),
            "date": article.get("date"),
            "image": article.get("image"),
            "summary": article.get("summary"),
            "description": article.get("description"),
            "content": article.get("content"),
            "newspaper_summary": newspaper_summary,
            "category": categorize(article)
        })

    save_json("summarized_news.json", summarized)
    print("✅ Summarized:", len(summarized))

@app.post("/summarize")
def summarize(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_summarization)
    return {"status": "started"}

# ---------------- DATA ----------------
@app.get("/news")
def get_news(limit: int = 200):
    return load_json("summarized_news.json")[:limit]

# ---------------- IMAGE HELPER ----------------
def download_image(url):
    try:
        if not url:
            return None

        headers = {
            "User-Agent": "Mozilla/5.0",
            "Accept": "image/*"
        }

        r = requests.get(url, headers=headers, timeout=8)
        if r.status_code != 200:
            return None

        if not r.headers.get("Content-Type", "").startswith("image/"):
            return None

        image = PILImage.open(BytesIO(r.content)).convert("RGB")

        path = os.path.join(TEMP_DIR, f"{uuid.uuid4().hex}.jpg")
        image.save(path, "JPEG", quality=85)

        return path

    except Exception:
        return None
@app.get("/news/category")
def get_news_by_category(category: str = Query(...)):
    from storage import load_json

    news = load_json("summarized_news.json")

    filtered = [
        n for n in news
        if n.get("category") == category
    ]

    return filtered
# ---------------- PDF ----------------
@app.post("/newspaper/pdf")
async def generate_newspaper_pdf(payload: dict):
    articles = payload.get("articles", [])
    date = payload.get("date", "Today")

    if not articles:
        raise HTTPException(400, "No articles provided")

    file_name = f"newspaper_{uuid.uuid4().hex}.pdf"
    base = os.path.dirname(__file__)
    pdf_dir = os.path.join(base, "generated_pdfs")
    os.makedirs(pdf_dir, exist_ok=True)
    path = os.path.join(pdf_dir, file_name)

    doc = SimpleDocTemplate(
        path,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("<b>AI Daily Newspaper</b>", styles["Title"]))
    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph(f"<i>{date}</i>", styles["Normal"]))
    story.append(Spacer(1, 0.4 * inch))

    temp_images = []

    for idx, article in enumerate(articles, start=1):
        title_text = article.get("title", "No title")

        summary_text = (
                article.get("newspaper_summary")
                or article.get("summary")
                or ""
        )

        # 🔒 FINAL GUARANTEE: NEVER EMPTY IN PDF
        if not summary_text or len(summary_text.strip()) < 60:
            headline_core = title_text.split(":")[0]
            summary_text = (
                f"{headline_core}. "
                f"The report outlines recent developments and key facts "
                f"as reported by {article.get('source') or 'the news outlet'}."
            )

        story.append(
            Paragraph(f"<b>{idx}. {escape(title_text)}</b>", styles["Heading2"])
        )
        story.append(Spacer(1, 10))

        img_path = download_image(article.get("image"))
        if img_path and os.path.exists(img_path):
            try:
                story.append(Image(img_path, width=5 * inch, height=3 * inch))
                story.append(Spacer(1, 12))
                temp_images.append(img_path)
            except:
                pass

        story.append(
            Paragraph(escape(summary_text), styles["BodyText"])
        )
        story.append(Spacer(1, 25))

    doc.build(story)

    for img in temp_images:
        try:
            os.remove(img)
        except:
            pass

    if os.path.getsize(path) < 1000:
        raise HTTPException(500, "PDF generation failed")

    return FileResponse(
        path,
        media_type="application/pdf",
        filename="today_newspaper.pdf"
    )

# ---------------- EXPLAIN ----------------
class ExplainRequest(BaseModel):
    text: str

@app.post("/explain")
def explain(
    mode: str = Query(..., description="kid | hinglish | bullets"),
    body: ExplainRequest = Body(...)
):
    return {"result": explain_article(body.text, mode)}
