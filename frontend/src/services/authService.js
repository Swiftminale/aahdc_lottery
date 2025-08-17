const API_BASE = process.env.REACT_APP_API_BASE_URL || ""; // e.g., https://your-backend.vercel.app
const API_URL = `${API_BASE}/api/auth`;

export async function login(credentials) {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_API_BASE_URL}/api/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      }
    );
    if (!response.ok) {
      console.error(
        "CORS or network error:",
        response.status,
        response.statusText
      );
      throw new Error("Network response was not ok");
    }
    return await response.json();
  } catch (error) {
    console.error("CORS/network error:", error);
    throw error;
  }
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getToken() {
  return localStorage.getItem("token");
}

export function getUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}
