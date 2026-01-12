import { useEffect, useState } from "react";

export default function PublishedArticles() {
  const [articles, setArticles] = useState([]);
  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetch(`${API}/blogger/articles`)

        .then(res => {
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
        })
        .then(data => setArticles(data))
        .catch(err => console.error(err));
    }, []);


  return (
    <div className="app-root">
      <h2 style={{ color: "white", textAlign: "center" }}>
        📰 Published Articles
      </h2>

      <div style={{ maxWidth: 900, margin: "30px auto" }}>
        {articles.length === 0 && (
          <p style={{ color: "#aaa", textAlign: "center" }}>
            No articles published yet.
          </p>
        )}

        {articles.map(a => (
          <div
            key={a.id}
            style={{
              background: "#1c1c1c",
              padding: 20,
              borderRadius: 12,
              marginBottom: 20,
              color: "white"
            }}
          >
            <h3>{a.title}</h3>
            <p style={{ color: "#aaa", fontSize: 14 }}>
              {a.category.toUpperCase()} • {new Date(a.created_at).toDateString()}
            </p>

            <p>{a.summary}</p>

            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: "pointer", color: "#6366f1" }}>
                Read full article
              </summary>
              <p style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>
                {a.content}
              </p>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
