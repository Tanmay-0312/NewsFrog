import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_URL;


  // 🔒 Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/");
    }
  }, [navigate]);

  const handleLogin = async () => {
    const formData = new URLSearchParams();
    formData.append("username", email);   // ⚠️ MUST be username
    formData.append("password", password);

    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      alert("Login failed");
      return;
    }

  // ✅ OAuth2 returns access_token
    localStorage.setItem("token", data.access_token);
    navigate("/");
  };


  return (
    <div className="auth-page">
      <div className="auth-box">
        <h2>News Frog</h2>
        <p style={{ textAlign: "center", marginBottom: 20, color: "#aaa" }}>
          Sign in to continue
        </p>

        {/* 🔧 FORM WRAPPER FOR ALIGNMENT */}
        <div className="auth-form">
          <input
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          <button onClick={handleLogin}>Login</button>
        </div>

        <p style={{ marginTop: 10 }}>
          Don’t have an account?{" "}
          <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
