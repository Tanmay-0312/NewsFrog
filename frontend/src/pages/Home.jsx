import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUserRole } from "../utils/auth"; 
import InfiniteScroll from "react-infinite-scroll-component";
import Masonry from "react-masonry-css";



export default function Home() {
  const navigate = useNavigate();
  const role = getUserRole(); // "user" | "blogger" | null


  useEffect(() => {
    const t = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 300);
    return () => clearTimeout(t);
  }, []);
  

  const [news, setNews] = useState([]);
  const [display, setDisplay] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [showingFavorites, setShowingFavorites] = useState(false);

  const [isFetching, setIsFetching] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSummarized, setIsSummarized] = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  const [explainText, setExplainText] = useState("");
  const [explainResult, setExplainResult] = useState("");
  const [isExplaining, setIsExplaining] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const recognitionRef = useRef(null);
  const [currentArticle, setCurrentArticle] = useState(null);
  const [resumeAfterExplain, setResumeAfterExplain] = useState(false);
  const [speechMode, setSpeechMode] = useState(null);
  const headlineIndexRef = useRef(0);
  const interruptForExplainRef = useRef(false);
  const speechModeRef = useRef(null);
  const [todaysPaper, setTodaysPaper] = useState([]);
  const [toast, setToast] = useState(null);


  
  


  const [userPrefs, setUserPrefs] = useState(
    JSON.parse(localStorage.getItem("userPrefs")) || {
      india: 0,
      tech: 0,
      sports: 0,
      world: 0
    }
  );


  /* ---------------- FAVORITES ---------------- */

  const getFavorites = () =>
    JSON.parse(localStorage.getItem("favorites") || "[]");

  const isFavorite = (item) =>
    getFavorites().some(x => x.url === item.url);

  const addFavorite = (item) => {
    if (isFavorite(item)) return;

    trackInteraction(item, 5);


    const saved = getFavorites();
    localStorage.setItem("favorites", JSON.stringify([...saved, item]));
    showToast("Saved to your lily pad ⭐");
  };


  const removeFavorite = (item) => {
    const saved = getFavorites().filter(x => x.url !== item.url);
    localStorage.setItem("favorites", JSON.stringify(saved));
    if (showingFavorites) {
      setNews(saved);
      setDisplay(saved.slice(0, 10));
    }
  };

  const openFavorites = () => {
    const saved = getFavorites();
    setNews(saved);
    setDisplay(saved.slice(0, 10));
    setHasMore(false);
    setShowingFavorites(true);
  };

   useEffect(() => {
      if (news.length > 0) {
        setTodaysPaper(buildTodaysNewspaper(news, userPrefs));
      }
    }, [userPrefs]);  

    useEffect(() => {
      const handler = () => {
        unlockSpeech();
        window.removeEventListener("click", handler);
      };

      window.addEventListener("click", handler);
      return () => window.removeEventListener("click", handler);
    }, []);


  /* ---------------- FETCH / SUMMARIZE ---------------- */

  async function fetchArticles() {
    setIsFetching(true);
    await fetch("http://localhost:8000/fetch", { method: "POST" });

    setNews([]);
    setDisplay([]);
    setIsSummarized(false);
    setShowingFavorites(false);
    setHasMore(true);

    setIsFetching(false);
    showToast("Hopped out to fetch fresh news 🐸");
  }

  async function summarizeNews() {
    setIsSummarizing(true);
    showToast("Hopping through today’s news 🧠", "ai");
    await fetch("http://localhost:8000/summarize", { method: "POST" });
    pollSummarizedNews();
  }

  async function pollSummarizedNews() {
    const interval = setInterval(async () => {
      const r = await fetch("http://localhost:8000/news?limit=200");
      const data = await r.json();

      if (data.length) {
        setNews(data);
        setTodaysPaper(buildTodaysNewspaper(data, userPrefs));
        setDisplay(data.slice(0, 10));
        setHasMore(data.length > 10);
        setIsSummarized(true);
        setIsSummarizing(false);
        showToast("Your news is ready 🪷");
        clearInterval(interval);
      }
    }, 2000);
  }
  
  async function loadCategory(cat) {
    if (!isSummarized) return;

    const r = await fetch(
      `http://localhost:8000/news/category?category=${cat}`
    );
    const data = await r.json();

    setNews(data);
    setDisplay(data.slice(0, 10));
    setHasMore(data.length > 10);
    setShowingFavorites(false);
  }

  async function runExplain(text, mode) {
    if (!text || text.trim().length < 10) {
      setExplainResult("⚠️ Not enough content to explain.");
      return;
    }

    setIsExplaining(true);
    setExplainResult("");

    try {
      const r = await fetch(
        `http://localhost:8000/explain?mode=${mode}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text })
        }
      );

      if (!r.ok) throw new Error("Explain failed");

      const data = await r.json();
      setExplainResult(data.result);
    } catch {
      setExplainResult("⚠️ Could not explain article.");
    }

    setIsExplaining(false);
  }


  async function recordAndSendVoice() {
    try {
    // 1. Ask for mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // 2. Record audio
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = e => chunks.push(e.data);

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });

        const formData = new FormData();
        formData.append("audio", blob);

      // 3. Send to Whisper backend
        const res = await fetch("http://localhost:8000/voice", {
          method: "POST",
          body: formData
        });

        const data = await res.json();
        console.log("🗣️ Whisper heard:", data.text);

      // 4. Handle commands
        handleVoiceCommand(data.text);

        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();

    // 3–4 seconds is perfect
      setTimeout(() => {
        mediaRecorder.stop();
      }, 4000);

    } catch (err) {
      console.error("Mic error:", err);
    }
  }

  async function explainAndRead(article) {
    trackInteraction(article, 3);

    updatePreference(article.category, 3);
    if (!article) return;

    
    setSpeechMode("explanation");
    speechModeRef.current = "explanation";


  // Optional feedback
    speechSynthesis.speak(
      new SpeechSynthesisUtterance("Explaining this article.")
    );

    try {
      const r = await fetch(
        "http://localhost:8000/explain?mode=long",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: article.summary || article.content

          })
        }
      );

      const data = await r.json();

      const explanation = data.result;

    // Read it aloud
      const utter = new SpeechSynthesisUtterance(explanation);
      utter.rate = 0.95;
      utter.pitch = 1;

      utter.onend = () => {
        if (resumeAfterExplain) {
          setResumeAfterExplain(false);
          setSpeechMode("headlines");
          speechModeRef.current = "headlines";
          readHeadlines(headlineIndexRef.current + 1);
 // 🔁 resume headlines
        } else {
          setSpeechMode(null);
          speechModeRef.current = null;
        }
      };

      speechSynthesis.speak(utter);


    } catch (e) {
      speechSynthesis.speak(
        new SpeechSynthesisUtterance("Sorry, I could not explain this article.")
      );
    }
  }

  async function downloadNewspaperPDF() {
    if (todaysPaper.length === 0) {
      showToast("🐸 Your frog brain hasn’t jumped yet. Generate today’s paper!");
      return;
    }

    const payload = {
      date: new Date().toDateString(),
      articles: todaysPaper.map(a => ({
        title: a.title,
        summary: a.summary,
        image: a.image || null
      }))
    };

    const res = await fetch("http://localhost:8000/newspaper/pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const blob = await res.blob();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Todays_Newspaper.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  }

  /* ---------------- CATEGORY COUNTS ---------------- */

  const countByCategory = (cat) =>
    news.filter(n => n.category === cat).length;

  /* ---------------- INFINITE SCROLL ---------------- */
  function showToast(message, type = "frog") {
    setToast({ message, type });

    setTimeout(() => {
      setToast(null);
    }, 2500);
  }

  function loadMore() {
    if (display.length >= news.length) {
      setHasMore(false);
      return;
    }
    setDisplay([...display, ...news.slice(display.length, display.length + 6)]);
  }

  function readHeadlines(startIndex = 0) {
    
    setSpeechMode("headlines");
    speechModeRef.current = "headlines";

    const headlines = news.slice(0, 10);
    if (!headlines.length) return;

    headlineIndexRef.current = startIndex;

    if (startIndex === 0) {
      speechSynthesis.speak(
        new SpeechSynthesisUtterance("Here are today's top headlines.")
      );
    }

    for (let i = startIndex; i < headlines.length; i++) {
      if (speechModeRef.current !== "headlines") break;

      const n = headlines[i];

      const u = new SpeechSynthesisUtterance(
        `Headline ${i + 1}. ${n.title}`
      );

      u.onstart = () => {
        setCurrentArticle(n);
        headlineIndexRef.current = i;
      };

      u.onend = () => {
        if (interruptForExplainRef.current) {
          interruptForExplainRef.current = false;
          explainAndRead(n);
          return;
        }
      };

      speechSynthesis.speak(u);
    }
  }


  function stopReading() {
    window.speechSynthesis.cancel();
  }

  function pauseReading() {
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
    }
  }

  function resumeReading() {
    if (speechSynthesis.paused) {
      speechSynthesis.resume();
    }
  }
  function trackInteraction(article, weight = 1) {
    if (!article || !article.category) return;

    console.log("📡 Tracking:", article.category, weight);

    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("❌ No token found");
      return;
    }

    fetch(`http://127.0.0.1:8000/track?category=${article.category}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).catch(err => console.error("❌ Track failed", err));
  }




  function startVoiceCommand() {
    return;
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Voice recognition not supported in this browser");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

  // 🔁 Create only once
    if (!recognitionRef.current) {
      const recog = new SpeechRecognition();

      recog.lang = "en-IN";
      recog.continuous = true;        // 🔥 VERY IMPORTANT
      recog.interimResults = false;

      recog.onstart = () => {
        console.log("🎙️ Voice recognition started");
        setIsListening(true);
      };

      recog.onaudiostart = () => {
        console.log("🔊 Audio detected");
      };

      recog.onspeechstart = () => {
        console.log("🗣️ Speech detected");
      };

      recog.onresult = (event) => {
        const last =
          event.results[event.results.length - 1][0].transcript
            .toLowerCase()
            .trim();

        console.log("🗣️ Command:", last);

        if (
          last.includes("read") ||
          last.includes("start") ||
          last.includes("headlines")
        ) {
          readHeadlines();
        }

        if (
          last.includes("stop")
        ) {
          stopReading();
        }
      };

      recog.onerror = (e) => {
        console.error("❌ Voice error:", e);
        setIsListening(false);
      };

      recog.onend = () => {
        console.log("🛑 Recognition ended");
        setIsListening(false);
      };

      recognitionRef.current = recog;
      setRecognition(recog); // keeping your state intact
    }
    
    if (!isListening) {
      recognitionRef.current.start();
    }

  }
  function unlockSpeech() {
    const utter = new SpeechSynthesisUtterance(" ");
    speechSynthesis.speak(utter);
  }

  function handleVoiceCommand(text) {
    if (!text) return;

    const cmd = text.toLowerCase();

    if (cmd.includes("read newspaper")) {
      showToast("Reading your News Pond aloud 🐸");
      speechSynthesis.cancel();
      todaysPaper.forEach((a, i) => {
        const u = new SpeechSynthesisUtterance(
          `Article ${i + 1}. ${a.title}`
        );
        speechSynthesis.speak(u);
      });
      return;
    }

    if (cmd.includes("pause")) {
      pauseReading();
      return;
    }

    if (
      cmd.includes("resume") ||
      cmd.includes("continue") ||
      cmd.includes("play")
    ) {
      resumeReading();
      return;
    }

    if (cmd.includes("read")) {
      readHeadlines();
    }

    if (cmd.includes("stop")) {
      stopReading();
    }

    if (cmd.includes("tech")) {
      loadCategory("tech");
    }

    if (cmd.includes("sports")) {
      loadCategory("sports");
    }

    if (cmd.includes("india")) {
      loadCategory("india");
    }

    if (cmd.includes("world")) {
      loadCategory("world");
    }
    if (
      cmd.includes("explain") ||
      cmd.includes("explain this") ||
      cmd.includes("explain article")
    ) {
      if (speechMode === "headlines") {
        interruptForExplainRef.current = true;
        setResumeAfterExplain(true);

    // 🔥 stop headline immediately
        speechSynthesis.cancel();
        setTimeout(()=>{
          explainAndRead(currentArticle);
        }, 150);

    
      } else {
    // If not in headlines, just explain
        explainAndRead(currentArticle);
      }
    }

  }
  


  async function updatePreference(category, weight = 1) {
  // 🔑 Update backend
  const token = localStorage.getItem("token");

  if (token) {
    try {
      await fetch("http://127.0.0.1:8000/track?category=" + category, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch (e) {
      console.error("Failed to track preference", e);
    }
  }

  // 🧠 Keep local UI state (instant feedback)
  setUserPrefs(prev => {
    const updated = {
      ...prev,
      [category]: (prev[category] || 0) + weight
    };
    localStorage.setItem("userPrefs", JSON.stringify(updated));
    return updated;
  });
}



  function buildTodaysNewspaper(sourceNews, userPrefs) {
    const favorites = getFavorites();
    const picked = [];
    const seen = new Set();

  // 1️⃣ Always include favorites first (STRONGEST SIGNAL)
    favorites.forEach(f => {
      if (!seen.has(f.url)) {
        seen.add(f.url);
        picked.push(f);
      }
    });

  // 2️⃣ Add articles based on preference ranking
    const sortedCategories = Object.entries(userPrefs)
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);

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

  // 3️⃣ Fallback fill (if still short)
    for (const n of sourceNews) {
      if (picked.length >= 12) break;
      if (!seen.has(n.url)) {
        seen.add(n.url);
        picked.push(n);
      }
    }

    return picked.slice(0, 12);
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="app-root">


      {/* LOADING OVERLAY */}
      {(isFetching || isSummarizing) && (
        <div style={overlayStyle}>
          <div style={spinnerStyle}></div>
          <p style={{ color: "#aaa", marginTop: 10 }}>
            {isFetching ? "Fetching news..." : "Summarizing articles..."}
          </p>
        </div>
      )}

      {/* ================= NAV BAR ================= */}
      <div className="nav-bar">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12
          }}
        >
          <span style={{ fontSize: 36 }}>🐸</span>

        <div>
          <h1
            style={{
              fontSize: 28,
              margin: 0,
              fontWeight: 700,
              letterSpacing: "0.5px",
              textShadow: "0 0 12px rgba(130,100,255,0.3)"

            }}
          >
            NewsFrog
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "#aaa"
            }}
          >
            News that learns you.
          </p>
        </div>
      </div>
        <button onClick={() => navigate("/articles")}>
          📰 Published Articles
        </button>

        <button className="btn-fav" onClick={openFavorites}>
          ⭐ Favorites
        </button>

        <button className="btn-frog" onClick={() => navigate("/newspaper")}>
          🧠 Personalized Newspaper
        </button>

        <button
          className="btn-danger"
          onClick={() => {
            showToast("See you soon 👋");
            setTimeout(() => {
              localStorage.removeItem("token");
              window.location.href = "/login";
            }, 800);
          }}

        >
          🚪 Logout
        </button>
      </div>

      {/* ================= PRIMARY ACTIONS ================= */}
      <div className="primary-actions">
        <button onClick={fetchArticles}>
          Fetch
        </button>

        <button className="btn-ai glow" onClick={summarizeNews}>
          Summarize
        </button>
      </div>


      {/* ================= CATEGORY FILTERS ================= */}
      <div className="categories">
        <button className="pill" onClick={() => loadCategory("india")}>India</button>
        <button className="pill" onClick={() => loadCategory("tech")}>Tech</button>
        <button className="pill" onClick={() => loadCategory("sports")}>Sports</button>
        <button className="pill" onClick={() => loadCategory("world")}>World</button>
      </div>

      {/* ================= MEDIA CONTROLS ================= */}
      <div className="media-controls">
        <button onClick={recordAndSendVoice}>🎤</button>
        <button
          onClick={() => {
            unlockSpeech();
            readHeadlines();
          }}
        >
          🔊
        </button>
        <button onClick={() => { unlockSpeech(); pauseReading(); }}>⏸</button>
        <button onClick={() => { unlockSpeech(); resumeReading(); }}>▶</button>
        <button onClick={() => { unlockSpeech(); stopReading(); }}>⏹</button>

      </div>

      


      


      {isListening && (
        <p
        style={{
        color: "#0f0",
        textAlign: "center",
        marginTop: 8,
        fontSize: 14
      }}
    >
      🎙️ Listening... say "start" or "stop"
    </p>
  )}


      <input
        placeholder="🔍 Search..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={searchStyle}
      />

      


      <InfiniteScroll
        dataLength={display.length}
        next={loadMore}
        hasMore={hasMore}
        loader={null}
      >
        <Masonry
          breakpointCols={{ default: 3, 900: 2, 600: 1 }}
          className="masonry-grid"
          columnClassName="masonry-grid_column"
        >

          {display
            .filter(n => n.title.toLowerCase().includes(search.toLowerCase()))
            .map((n, i) => (
              <a key={i} href={n.url} target="_blank" rel="noreferrer" style={cardStyle} onClick={() => trackInteraction(n, 2)}>
                {n.image && (
                  <img
                    src={n.image}
                    alt=""
                    style={imgStyle}
                    onLoad={() => window.dispatchEvent(new Event("resize"))} // 🔧 FIX
                  />
                )}

                <h3>{n.title}</h3>


                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <button onClick={e => {
                      e.preventDefault();
                      setExplainText(n.summary || n.content || n.description || n.title);
                      setShowExplain(true);
                      trackInteraction(n, 2);
                      runExplain(n.summary || n.content, "kid");

                    }}>👶</button>

                    <button
                      onClick={e => {
                        e.preventDefault();
                          explainAndRead(n);
                      }}
                    >
                      🧠🔊
                    </button>


                  <button onClick={e => {
                    e.preventDefault();
                    setExplainText(n.summary || n.content || n.description || n.title);
                    setShowExplain(true);
                    trackInteraction(n, 2);
                    runExplain(n.summary || n.content, "hinglish");
                  }}>🇮🇳</button>

                  <button onClick={e => {
                    e.preventDefault();
                    setExplainText(n.summary || n.content || n.description || n.title);
                    setShowExplain(true);
                    trackInteraction(n, 2);
                    runExplain(n.summary || n.content, "bullets");
                  }}>•</button>
                </div>


                <button onClick={e => {
                  e.preventDefault();
                  isFavorite(n) ? removeFavorite(n) : addFavorite(n);
                }}>
                  {isFavorite(n) ? "❌" : "⭐"}
                </button>

                <p>{n.summary || n.content || n.description || n.title}</p>

              </a>
            ))}
        </Masonry>
      </InfiniteScroll>
      {/* 🧠 EXPLAIN MODAL */}
      {showExplain && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <h3>🧠 AI Explanation</h3>

            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button onClick={() => runExplain(explainText, "kid")}>👶 Kid</button>
              <button
                onClick={e => {
                  e.preventDefault();
                  explainAndRead({
                    summary: explainText
                  });
                }}
              >
                🧠🔊
              </button>


              <button onClick={() => runExplain(explainText, "hinglish")}>🇮🇳 Hinglish</button>
              <button onClick={() => runExplain(explainText, "bullets")}>• Bullets</button>
            </div>

            {isExplaining ? (
              <p style={{ color: "#aaa" }}>⏳ Thinking...</p>
            ) : (
              <p style={{ whiteSpace: "pre-wrap" }}>{explainResult}</p>
            )}

            <button
              style={{ marginTop: 12 }}
              onClick={() => setShowExplain(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            padding: "14px 20px",
            borderRadius: 14,
            background:
              toast.type === "ai"
                ? "linear-gradient(135deg, #8b7bff, #6f5bff)"
                : "linear-gradient(135deg, #6ee7b7, #34d399)",
            color: toast.type === "ai" ? "white" : "#042f2e",
            fontWeight: 600,
            boxShadow:
              toast.type === "ai"
                ? "0 0 20px rgba(139,123,255,0.5)"
                : "0 0 20px rgba(110,231,183,0.5)",
            animation: "fadeUp 0.3s ease",
            zIndex: 9999
          }}
        >
          🐸 {toast.message}
        </div>
      )}


    </div>
  );
}

/* ---------------- STYLES ---------------- */

/* ---------------- STYLES ---------------- */

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 999
};

const spinnerStyle = {
  width: 50,
  height: 50,
  border: "5px solid #333",
  borderTop: "5px solid #fff",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
  willChange: "transform"
};

const searchStyle = {
  width: 300,
  margin: "20px auto",
  display: "block",
  padding: 8,
  borderRadius: 8,
  background: "#222",
  border: "1px solid #444",
  color: "white"
};

const cardStyle = {
  background: "#1c1c1c",
  borderRadius: 12,
  padding: 12,
  marginBottom: 20,
  color: "white",
  textDecoration: "none",

  display: "block",           // 🔧 FIX
  width: "100%",               // 🔧 FIX
  boxSizing: "border-box",     // 🔧 FIX
  overflow: "hidden",          // 🔧 FIX

  transition: "transform 0.2s ease, box-shadow 0.2s ease"
};

const imgStyle = {
  width: "100%",
  height: "auto",              // 🔧 FIX (important)
  maxHeight: 260,              // 🔧 FIX
  objectFit: "cover",
  borderRadius: 10,
  marginBottom: 10
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.8)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000
};

const modalBox = {
  background: "#1c1c1c",
  color: "white",
  padding: 20,
  borderRadius: 12,
  width: "90%",
  maxWidth: 600,
  maxHeight: "80vh",
  overflowY: "auto"
};

const newspaperStyle = {
  columnCount: 3,
  columnGap: "24px",
  padding: 20
};

const newspaperItemStyle = {
  breakInside: "avoid",
  marginBottom: 20,
  background: "#1c1c1c",
  padding: 12,
  borderRadius: 10
};

