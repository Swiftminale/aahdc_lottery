// frontend/src/App.js
import React, { useState, useEffect } from "react";
import "./App.css";
import DeveloperSubmissionForm from "./components/DeveloperSubmissionForm";
import AAHDCAdminPage from "./pages/AAHDCAdminPage";
import CandidateForm from "./components/CandidateForm";
import Login from "./components/Login";
import { getToken, getUser, logout } from "./services/authService";

function App() {
  const [view, setView] = useState("developer"); // 'developer', 'admin', or 'candidates'
  const [authed, setAuthed] = useState(!!getToken());
  const [user, setUser] = useState(getUser());

  useEffect(() => {
    setAuthed(!!getToken());
    setUser(getUser());
  }, []);

  return (
    <div className="App">
      {authed ? (
        <>
          <header className="App-header">
            <h1>AAHDC Lottery Distribution Platform</h1>
            <nav>
              <button
                onClick={() => setView("developer")}
                className={view === "developer" ? "active" : ""}
              >
                Developer Portal
              </button>
              <button
                onClick={() => setView("admin")}
                className={view === "admin" ? "active" : ""}
              >
                AAHDC Admin
              </button>
              <button
                onClick={() => setView("candidates")}
                className={view === "candidates" ? "active" : ""}
              >
                Candidates
              </button>
              <button
                onClick={() => {
                  logout();
                  setAuthed(false);
                }}
                style={{ marginLeft: 16 }}
              >
                Logout{user ? ` (${user.username})` : ""}
              </button>
            </nav>
          </header>
          <main>
            {view === "developer" ? (
              <DeveloperSubmissionForm />
            ) : view === "admin" ? (
              <AAHDCAdminPage />
            ) : (
              <CandidateForm />
            )}
          </main>
        </>
      ) : (
        <main>
          <Login onSuccess={() => setAuthed(true)} />
        </main>
      )}
    </div>
  );
}

export default App;
