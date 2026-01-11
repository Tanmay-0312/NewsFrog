from google import genai
import json
import os
import hashlib

# ---------------- CONFIG ----------------
BASE_DIR = os.path.dirname(__file__)
CONFIG_PATH = os.path.join(BASE_DIR, "config.json")
CACHE_PATH = os.path.join(BASE_DIR, "explain_cache.json")

with open(CONFIG_PATH, "r") as f:
    CONFIG = json.load(f)

GEMINI_API_KEY = CONFIG.get("gemini_api_key")

if not GEMINI_API_KEY:
    raise RuntimeError("❌ gemini_api_key missing in config.json")

client = genai.Client(api_key=GEMINI_API_KEY)

# ---------------- CACHE HELPERS ----------------
def load_cache():
    if not os.path.exists(CACHE_PATH):
        return {}
    with open(CACHE_PATH, "r") as f:
        return json.load(f)

def save_cache(cache):
    with open(CACHE_PATH, "w") as f:
        json.dump(cache, f, indent=2)

def make_cache_key(text: str, mode: str) -> str:
    raw = f"{mode}:{text}"
    return hashlib.sha256(raw.encode()).hexdigest()

# ---------------- MAIN EXPLAIN ----------------
def explain_article(text: str, mode: str) -> str:
    if not text or not text.strip():
        return "No content to explain."

    cache = load_cache()
    cache_key = make_cache_key(text, mode)

    # ✅ RETURN FROM CACHE
    if cache_key in cache:
        print("⚡ CACHE HIT:", mode)
        return cache[cache_key]

    print("🧠 GEMINI CALL:", mode)

    if mode == "kid":
        prompt = f"Explain like I am 5 years old:\n{text}"
    elif mode == "hinglish":
        prompt = f"Explain in simple Hinglish (Hindi + English):\n{text}"
    elif mode == "bullets":
        prompt = f"Explain in short bullet points:\n{text}"
    else:
        prompt = text

    try:
        response = client.models.generate_content(
            model="models/gemini-flash-latest",
            contents=prompt
        )

        result = response.text.strip()

        # ✅ SAVE TO CACHE
        cache[cache_key] = result
        save_cache(cache)

        return result

    except Exception as e:
        print("❌ Gemini error:", e)
        return "⚠️ AI explanation failed."


def summarize_for_newspaper(title, content="", source=""):
    prompt = f"""
You are a professional newspaper editor.

Write a concise newspaper-style summary for the following news article.

RULES:
- 2 to 4 complete sentences
- Factual and neutral tone
- No ellipsis (...)
- No phrases like "this article reports"
- No speculation
- No promotional language
- Write as if it appears in a printed newspaper

Headline:
{title}

Source:
{source}

Article Content (may be incomplete):
{content}

Write the final newspaper summary:
"""

    response = client.models.generate_content(
        model="models/gemini-flash-latest",
        contents=prompt
    )

    return response.text.strip()
