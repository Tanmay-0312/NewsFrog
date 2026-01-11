import json
import requests
import feedparser
from typing import List

import os
from dotenv import load_dotenv

load_dotenv()  # loads .env

GNEWS_KEY = os.getenv("GNEWS_KEY")
NEWSAPI_KEY = os.getenv("NEWSAPI_KEY")
NEWSDATA_KEY = os.getenv("NEWSDATA_KEY")


# -----------------------------
# NEWSAPI
# -----------------------------
def fetch_newsapi() -> List[dict]:
    if not NEWSAPI_KEY:
        return []

    url = f"https://newsapi.org/v2/top-headlines?language=en&apiKey={NEWSAPI_KEY}&pageSize=50"

    try:
        r = requests.get(url, timeout=15)
        data = r.json().get("articles", [])
    except:
        return []

    out = []
    for n in data:
        out.append({
            "source": "NewsAPI",
            "title": n.get("title"),
            "content": n.get("description") or n.get("content"),
            "url": n.get("url"),
            "image": n.get("urlToImage"),
            "date": n.get("publishedAt"),
            "category": "general"
        })
    return out


# -----------------------------
# GNEWS
# -----------------------------
def fetch_gnews() -> List[dict]:
    if not GNEWS_KEY:
        return []

    url = f"https://gnews.io/api/v4/top-headlines?country=in&lang=en&max=50&apikey={GNEWS_KEY}"

    try:
        r = requests.get(url, timeout=15)
        data = r.json().get("articles", [])
    except:
        return []

    out = []
    for n in data:
        out.append({
            "source": "GNews",
            "title": n.get("title"),
            "content": n.get("description"),
            "url": n.get("url"),
            "image": n.get("image"),
            "date": n.get("publishedAt"),
            "category": "general"
        })
    return out


# -----------------------------
# NEWSDATA
# -----------------------------
def fetch_newsdata() -> List[dict]:
    if not NEWSDATA_KEY:
        return []

    url = f"https://newsdata.io/api/1/news?apikey={NEWSDATA_KEY}&country=in&language=en"

    try:
        r = requests.get(url, timeout=15)
        data = r.json().get("results", [])
    except:
        return []

    out = []
    for n in data:
        # skip if not dictionary
        if not isinstance(n, dict):
            continue

        out.append({
            "source": "NewsData",
            "title": n.get("title"),
            "content": n.get("content") or n.get("description"),
            "url": n.get("link"),
            "image": n.get("image_url"),
            "date": n.get("pubDate"),
            "category": (n.get("category") or ["general"])[0]
        })

    return out



# -----------------------------
# REDDIT helper
# -----------------------------
def fetch_reddit(subreddit) -> List[dict]:
    feed = feedparser.parse(f"https://www.reddit.com/r/{subreddit}/.rss")

    out = []
    for e in feed.entries[:25]:
        out.append({
            "source": f"Reddit-{subreddit}",
            "title": e.get("title"),
            "content": e.get("summary"),
            "url": e.get("link"),
            "image": None,
            "date": e.get("published"),
            "category": subreddit
        })
    return out


# -----------------------------
# RSS helper
# -----------------------------
def fetch_rss(url, category="general") -> List[dict]:
    feed = feedparser.parse(url)

    out = []
    for e in feed.entries[:30]:
        out.append({
            "source": "RSS",
            "title": e.get("title"),
            "content": e.get("summary"),
            "url": e.get("link"),
            "image": None,
            "date": e.get("published"),
            "category": category
        })
    return out


# -----------------------------
# main collector
# -----------------------------
def fetch_all_sources() -> List[dict]:

    articles = []
    seen = set()

    # --- helper to add + dedupe ---
    def add(items):
        for a in items:
            url = a.get("url") or a.get("title")
            if not url:
                continue
            key = url.strip().lower()
            if key in seen:
                continue
            seen.add(key)
            articles.append(a)

    # --- API sources (dedupe) ---
    add(fetch_newsapi())
    add(fetch_gnews())
    add(fetch_newsdata())

    # --- Reddit (unique URLs anyway, still deduped) ---
    REDDIT_SUBS = ["india", "worldnews", "technology", "sports"]
    for sub in REDDIT_SUBS:
        add(fetch_reddit(sub))

    # --- RSS feeds ---
    RSS_FEEDS = [
        ("https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms", "india"),
        ("https://www.hindustantimes.com/rss/topnews/rssfeed.xml", "india"),
        ("http://feeds.reuters.com/reuters/worldnews", "world"),
        ("http://feeds.bbci.co.uk/news/world/rss.xml", "world"),
    ]

    for url, cat in RSS_FEEDS:
        add(fetch_rss(url, cat))
    print("TOTAL RETURNING:", len(articles))
    print("Added", len(fetch_newsapi()), "from NewsAPI")
    print("Added", len(fetch_gnews()), "from GNews")
    print("Added", len(fetch_newsdata()), "from NewsData")
    print("Added", len(fetch_reddit('india')), "from Reddit India")
    print("Added", len(fetch_reddit('worldnews')), "from Reddit World")
    print("Added", len(fetch_reddit('technology')), "from Reddit Tech")
    print("Added", len(fetch_reddit('sports')), "from Reddit Sports")

    return articles

if __name__ == "__main__":
    print("newsapi:", len(fetch_newsapi()))
    print("gnews:", len(fetch_gnews()))
    print("newsdata:", len(fetch_newsdata()))
    print("reddit india:", len(fetch_reddit("india")))
    print("reddit world:", len(fetch_reddit("worldnews")))
    print("reddit tech:", len(fetch_reddit("technology")))
    print("reddit sports:", len(fetch_reddit("sports")))
