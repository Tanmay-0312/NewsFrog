import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import ProtectedRoute from "./ProtectedRoute";
import "./App.css"; // ✅ KEEP ONLY HERE
import BloggerRoute from "./routes/BloggerRoute";
import WriteArticle from "./pages/WriteArticle";
import PublishedArticles from "./pages/PublishedArticles";
import PersonalizedNewspaper from "./pages/PersonalizedNewspaper";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* 🔒 PROTECTED HOME */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        <Route
          path="/blogger/write"
          element={
            <BloggerRoute>
              <WriteArticle />
            </BloggerRoute>
          }
        />
        <Route
          path="/newspaper"
          element={
            <ProtectedRoute>
              <PersonalizedNewspaper />
            </ProtectedRoute>
          }
        />


        <Route
          path="/articles"
          element={
            <ProtectedRoute>
              <PublishedArticles />
            </ProtectedRoute>
          }
        />



      </Routes>
    </BrowserRouter>
  );
}
