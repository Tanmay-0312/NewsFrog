def categorize(article: dict) -> str:
    title = (article.get("title") or "").lower()
    source = (article.get("source") or "").lower()

    text = title + " " + source

    sports = ["nfl", "match", "game", "score", "win", "lose", "football", "cricket"]
    tech = ["tech", "robot", "ai", "software", "iphone", "google", "microsoft"]
    india = ["india", "delhi", "mumbai", "bjp", "congress", "rupee"]
    world = ["ukraine", "israel", "gaza", "china", "russia", "global", "un"]

    if any(k in text for k in sports):
        return "sports"
    if any(k in text for k in tech):
        return "tech"
    if any(k in text for k in india):
        return "india"
    if any(k in text for k in world):
        return "world"

    return "general"


def summarize_text(text: str):
    if not text:
        return ""
    return text[:220] + "..."
