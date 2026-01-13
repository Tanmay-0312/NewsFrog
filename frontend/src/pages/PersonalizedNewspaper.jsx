import { useEffect, useState } from "react";

export default function PersonalizedNewspaper() {
  const [paper, setPaper] = useState([]);
  const [msg, setMsg] = useState("");
  const API = import.meta.env.VITE_API_URL;

  // ✅ Local favorites
  const getFavorites = () =>
    JSON.parse(localStorage.getItem("favorites") || "[]");

  // ✅ Local preferences
  const userPrefs =
    JSON.parse(localStorage.getItem("userPrefs")) || {
      india: 0,
      tech: 0,
      sports: 0,
      world: 0
    };

  // ✅ PERSONALIZED LOGIC (Favorites + Pref ranking)
  function buildTodaysNewspaper(sourceNews, prefs) {
    const favorites = getFavorites();
    const picked = [];
    const seen = new Set();

    // 1️⃣ Add favorites first
    favorites.forEach(f => {
      if (!seen.has(f.url)) {
        seen.add(f.url);
        picked.push(f);
      }
    });

    // 2️⃣ Sort categories by user preference
    const sortedCategories = Object.entries(prefs)
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);

    // 3️⃣ Pick top 3 from each preferred category
    sortedCategories.forEach(cat => {
      sourceNews
        .filter(n => n.category === cat)
        .slice(0, 3)
        .forEach(n => {
          if (picked.length < 12 && !seen.has(n.url)) {
            seen.add(n.url);
            picked.push(n);
          }
        });
    });

    // 4️⃣ Fill remaining if less than 12
    for (const n of sourceNews) {
      if (picked.length >= 12) break;
      if (!seen.has(n.url)) {
        seen.add(n.url);
        picked.push(n);
      }
    }

    return picked.slice(0, 12);
  }

  async function generatePaper() {
    try {
      setMsg("🐸 Generating personalized newspaper...");

      const res = await fetch(`${API}/news?limit=200`);
      const data = await res.json();

      const personalized = buildTodaysNewspaper(data, userPrefs);

      setPaper(personalized);
      setMsg("✅ Personalized newspaper ready!");
    } catch (err) {
      console.error(err);
      setMsg("❌ Failed to generate personalized newspaper");
    }
  }

  async function downloadMyNewspaperPDF() {
    try {
      const payload = {
        date: new Date().toDateString(),
        articles: paper.map(a => ({
          title: a.title,
          summary: a.newspaper_summary || a.summary || a.description || "",
          image: a.image || null,
          source: a.source
        }))
      };

      const res = await fetch(`${API}/newspaper/pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("PDF generation failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "Personalized_Newspaper.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setMsg("❌ Failed to download PDF");
    }
  }

  useEffect(() => {
    generatePaper();
  }, []);

  return (
    <div className="app-root">
      {/* HEADER */}
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <h1 style={{ fontSize: 34, marginBottom: 6 }}>
          🪷 Your News Pond
        </h1>
        <p style={{ color: "#9ca3af", fontSize: 14 }}>
          Personalized for you • {new Date().toDateString()}
        </p>
      </div>

      {/* ACTIONS */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 14,
          marginBottom: 30,
          flexWrap: "wrap"
        }}
      >
        <button className="btn-frog" onClick={generatePaper}>
          🧠 Generate Today’s Pond
        </button>

        <button
          className="btn-ai"
          disabled={paper.length === 0}
          onClick={downloadMyNewspaperPDF}
        >
          ⬇️ Download PDF
        </button>
      </div>

      {msg && (
        <p style={{ textAlign: "center", color: "var(--frog-primary)" }}>
          🐸 {msg}
        </p>
      )}

      {/* CONTENT */}
      {paper.length === 0 ? (
        <p style={{ textAlign: "center", color: "#9ca3af" }}>
          🐸 No personalized paper yet. Generate today’s pond!
        </p>
      ) : (
        <div
          style={{
            columnCount: 2,
            columnGap: 24,
            maxWidth: 1000,
            margin: "0 auto"
          }}
        >
          {paper.map((a, i) => (
            <div
              key={i}
              style={{
                breakInside: "avoid",
                background: "#1c1c1c",
                padding: 18,
                borderRadius: 14,
                marginBottom: 20
              }}
            >
              <h3 style={{ marginBottom: 6 }}>{a.title}</h3>
              <p style={{ color: "#9ca3af", fontSize: 12 }}>
                {(a.category || "general").toUpperCase()}
              </p>
              <p style={{ marginTop: 10 }}>
                {a.newspaper_summary || a.summary || a.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
