import { Navigate } from "react-router-dom";
import { getUserRole } from "../utils/auth";

export default function BloggerRoute({ children }) {
  const role = getUserRole();

  // 🔒 Not logged in or not a blogger
  if (role !== "blogger") {
    return <Navigate to="/" replace />;
  }

  // ✅ Blogger allowed
  return children;
}
