import { useEffect, useState } from "react";

export default function PersonalizedNewspaper() {
  const [paper, setPaper] = useState([]);
  const [msg, setMsg] = useState("");
  const token = localStorage.getItem("token");
  const API = import.meta.env.VITE_API_URL;

  async function generatePaper() {
    const res = await fetch(`${API}/build`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    setMsg(data.msg || "Newspaper generated");
    loadPaper();
  }

  async function loadPaper() {
    const res = await fetch(`${API}/newspaper`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    setPaper(data);
  }

  async function downloadMyNewspaperPDF() {
    const res = await fetch(`${API}/pdf`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        date: new Date().toDateString(),
        articles: paper
      })
    });

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "Personalized_Newspaper.pdf";
    a.click();

    window.URL.revokeObjectURL(url);
  }


  useEffect(() => {
    loadPaper();
  }, []);

  return (
    <div className="app-root">
      {/* 🪷 HEADER */}
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <h1 style={{ fontSize: 34, marginBottom: 6 }}>
          🪷 Your News Pond
        </h1>
        <p style={{ color: "#9ca3af", fontSize: 14 }}>
          Curated for you • {new Date().toDateString()}
        </p>
      </div>

      {/* 🧠 ACTIONS */}
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

      {/* 🪷 CONTENT */}
      {paper.length === 0 ? (
        <p style={{ textAlign: "center", color: "#9ca3af" }}>
          🐸 Your frog brain hasn’t jumped yet.  
          Generate today’s paper!
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
                {a.category.toUpperCase()}
              </p>
              <p style={{ marginTop: 10 }}>{a.summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

}
