import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user"); // 👈 NEW
  const navigate = useNavigate();

  // 🔒 Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/");
    }
  }, [navigate]);

  async function handleSignup() {
    const res = await fetch("http://127.0.0.1:8000/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        role   // 👈 SEND ROLE
      })
    });

    if (res.ok) navigate("/login");
    else alert("Signup failed");
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <h2>News Frog</h2>
        <p style={{ textAlign: "center", marginBottom: 20, color: "#aaa" }}>
          Create an account to continue
        </p>

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

          {/* 🧠 ROLE SELECTOR */}
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="auth-select"
          >
            <option value="user">Reader</option>
            <option value="blogger">Blogger (Write Articles)</option>
          </select>

          <button onClick={handleSignup}>Create Account</button>
        </div>

        <p style={{ marginTop: 10 }}>
          Already have an account?{" "}
          <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
