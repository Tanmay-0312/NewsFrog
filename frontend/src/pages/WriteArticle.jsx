import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function WriteArticle() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("india");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function publishArticle() {
    if (!title || !content) {
      alert("Title and content are required");
      return;
    }

    setLoading(true);

    const token = localStorage.getItem("token");

    const res = await fetch("http://127.0.0.1:8000/blogger/article", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        title,
        category,
        content
      })
    });

    setLoading(false);

    if (res.ok) {
      alert("Article published!");
      navigate("/");
    } else {
      alert("Failed to publish article");
    }
  }

  return (
    <div className="app-root">
      <div style={{ maxWidth: 800, margin: "0 auto", color: "white" }}>
        <h2>✍️ Write Article</h2>

        <input
          placeholder="Article title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={inputStyle}
        />

        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={inputStyle}
        >
          <option value="india">India</option>
          <option value="tech">Tech</option>
          <option value="sports">Sports</option>
          <option value="world">World</option>
        </select>

        <textarea
          placeholder="Write your article here..."
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={10}
          style={{ ...inputStyle, resize: "vertical" }}
        />

        <button
          onClick={publishArticle}
          disabled={loading}
          style={{
            marginTop: 10,
            padding: "12px 18px",
            background: "#4f46e5",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          {loading ? "Publishing..." : "Publish Article"}
        </button>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: 12,
  marginBottom: 14,
  borderRadius: 8,
  border: "1px solid #333",
  background: "#111",
  color: "white"
};
