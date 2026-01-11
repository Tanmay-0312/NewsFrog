import json
import requests
from bs4 import BeautifulSoup

# -----------------------------
# FETCH FUNCTIONS
# -----------------------------

def fetch_static(url):
    r = requests.get(url, timeout=10, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
    })
    return BeautifulSoup(r.text, "html.parser")



def fetch_dynamic(url):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # run visible to avoid bot block
        context = browser.new_context(user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ))

        page = context.new_page()

        page.goto(url, timeout=60000, wait_until="networkidle")  # wait for JS to finish
        page.wait_for_selector("body")
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")  # load lazy content

        html = page.content()
        browser.close()
        return BeautifulSoup(html, "html.parser")



# -----------------------------
# LINK EXTRACTOR
# -----------------------------

def extract_links(site):
    parser = fetch_dynamic(site["list_url"]) if site["dynamic"] else fetch_static(site["list_url"])

    print("\n===== DEBUG HTML START =====")
    print(parser.prettify()[:800])
    print("===== DEBUG HTML END =====\n")

    links = []

    for tag in parser.select(site["selectors"]["links"]):
        href = tag.get("href")
        if not href:
            continue

        # Convert relative URLs to absolute
        if href.startswith("/"):
            href = site["base_url"] + href

        if href.startswith("http"):
            links.append(href)

    return list(set(links))[:10]  # limit to latest 10 articles


# -----------------------------
# ARTICLE SCRAPER
# -----------------------------

def extract_article(url, site):
    """Extract full text from one article"""
    parser = fetch_dynamic(url) if site["dynamic"] else fetch_static(url)
    paragraphs = parser.select(site["selectors"]["content"])
    text = " ".join(p.get_text(strip=True) for p in paragraphs)

    return {
        "source": site["name"],
        "url": url,
        "text": text
    }


# -----------------------------
# MAIN SCRAPER
# -----------------------------

def run_scraper():
    with open("sources.json", "r") as f:
        sources = json.load(f)

    scraped_data = []

    for site in sources:
        print(f"\n🔍 Scraping {site['name']}...")

        links = extract_links(site)
        print(f"Found {len(links)} links")

        for link in links:
            try:
                article = extract_article(link, site)
                scraped_data.append(article)
                print(f"✔️ Scraped: {link}")
            except Exception as e:
                print(f"❌ Error scraping {link}: {e}")

    return scraped_data


# -----------------------------
# RUN
# -----------------------------

if __name__ == "__main__":
    data = run_scraper()

    # Save to file
    with open("scraped_output.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

    print("\n✅ Scraping Completed! Data saved to scraped_output.json")
