import React, { useState } from "react";
// ...removed XLSX usage; backend handles parsing...
import {
  addCandidate,
  getCandidates,
  importCandidates,
} from "../services/candidateService";

function CandidateForm() {
  const [candidateId, setCandidateId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [typology, setTypology] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [lastImportResult, setLastImportResult] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const typologyOptions = ["Studio", "1BR", "2BR", "3BR", "Shop"];

  const fetchCandidates = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getCandidates();
      setCandidates(data);
      setPage(1);
    } catch (err) {
      setError(err.message || "Failed to fetch candidates");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const candidateData = { name, email, phone, typology };
      if (candidateId) candidateData.candidateId = candidateId;
      await addCandidate(candidateData);
      setMessage("Candidate added successfully");
      setCandidateId("");
      setName("");
      setEmail("");
      setPhone("");
      setTypology("");
      fetchCandidates();
    } catch (err) {
      setError(err.message || "Failed to add candidate");
    } finally {
      setLoading(false);
    }
  };

  // Batch upload handler (use backend to parse & import)
  const handleBatchUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const result = await importCandidates(file);
      const {
        importedCount = 0,
        failedRows = [],
        errorDetails = [],
      } = result || {};
      setLastImportResult(result || null);
      if (importedCount > 0) {
        setMessage(
          `Batch upload complete: ${importedCount} added${
            failedRows.length ? `, ${failedRows.length} failed` : ""
          }.`
        );
      } else if (failedRows.length || errorDetails.length) {
        setError(
          `No valid candidates found. ${
            errorDetails.length ? `Details: ${errorDetails.join("; ")}` : ""
          }`
        );
      } else {
        setMessage("No valid candidates found in file.");
      }
      fetchCandidates();
    } catch (err) {
      setError(err.message || "Failed to import candidates");
    } finally {
      setLoading(false);
    }
  };

  // Download Excel template (from backend)
  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/candidates/template");
      if (!res.ok) throw new Error("Failed to download template");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "candidate_template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message || "Failed to download template");
    }
  };

  React.useEffect(() => {
    fetchCandidates();
  }, []);

  // pagination helpers
  const total = candidates?.length || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = candidates.slice(start, end);

  return (
    <div className="container-card">
      <h2>Add Candidate</h2>
      {/* Stats */}
      <div className="stats">
        <div className="stat">
          <div className="stat-label">Total Candidates</div>
          <div className="stat-value">{candidates?.length || 0}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Assigned</div>
          <div className="stat-value">
            {candidates?.filter((x) => x.assignedUnitId)?.length || 0}
          </div>
        </div>
        <button
          className="btn btn-outline"
          onClick={fetchCandidates}
          disabled={loading}
        >
          <span className="btn-icon">🔄</span> Refresh
        </button>
      </div>

      {/* Messages */}
      {message && (
        <p className="message-success" aria-live="polite">
          {message}
        </p>
      )}
      {error && (
        <p className="message-error" aria-live="assertive">
          {error}
        </p>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="form-grid" aria-busy={loading}>
        <div className="form-field">
          <label>Candidate ID (optional)</label>
          <input
            type="number"
            value={candidateId}
            onChange={(e) => setCandidateId(e.target.value)}
            placeholder="Auto-generated if left blank"
            disabled={loading}
          />
        </div>
        <div className="form-field">
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter full name"
            required
            disabled={loading}
          />
        </div>
        <div className="form-field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            disabled={loading}
          />
        </div>
        <div className="form-field">
          <label>Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g., +251 9xx xxx xxx"
            required
            disabled={loading}
          />
        </div>
        <div className="form-field">
          <label>Typology</label>
          <select
            value={typology}
            onChange={(e) => setTypology(e.target.value)}
            required
            disabled={loading}
          >
            <option value="">Select Typology</option>
            {typologyOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <span className="btn-icon">➕</span>
            {loading ? "Adding..." : "Add Candidate"}
          </button>
        </div>
      </form>

      {/* Upload card */}
      <div className="upload-card">
        <div className="upload-info">
          <div className="upload-title">Batch Upload (Excel/CSV)</div>
          <div className="upload-subtitle">
            Import multiple candidates at once using the template.
          </div>
        </div>
        <div className="upload-actions">
          <label className="btn btn-secondary">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleBatchUpload}
              disabled={loading}
              style={{ display: "none" }}
            />
            <span className="btn-icon">📤</span>
            {loading ? "Uploading..." : "Import File"}
          </label>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleDownloadTemplate}
            disabled={loading}
          >
            <span className="btn-icon">📥</span> Template
          </button>
        </div>
      </div>
      {selectedFileName ? (
        <div className="tip">Selected: {selectedFileName}</div>
      ) : (
        <div className="tip">
          Tip: Download the template to ensure correct headers.
        </div>
      )}

      {/* Import details */}
      {lastImportResult?.failedRows?.length ? (
        <details className="import-details">
          <summary>{lastImportResult.failedRows.length} row(s) failed</summary>
          <ul>
            {lastImportResult.failedRows.slice(0, 50).map((fr, idx) => (
              <li key={idx}>
                Row {fr.row || "?"}: {fr.reason || "Validation error"}
              </li>
            ))}
          </ul>
          {lastImportResult.failedRows.length > 50 && (
            <div className="tip">Showing first 50 errors…</div>
          )}
        </details>
      ) : null}

      {/* Table */}
      <div className="section-header">
        <h3>Candidate List</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="tip">Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value, 10));
              setPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
      {candidates && candidates.length > 0 ? (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Typology</th>
                  <th>Assigned Unit</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((c) => (
                  <tr key={c.candidateId || c.id || c._id}>
                    <td>{c.candidateId || c.id || "-"}</td>
                    <td>{c.name || "-"}</td>
                    <td>{c.email || "-"}</td>
                    <td>{c.phone || "-"}</td>
                    <td>{c.typology || "-"}</td>
                    <td>{c.assignedUnitId || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 10,
              marginTop: 10,
            }}
          >
            <button
              className="btn btn-outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              ← Previous
            </button>
            <span className="tip">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="btn btn-outline"
              onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
              disabled={currentPage >= totalPages}
            >
              Next →
            </button>
          </div>
        </>
      ) : (
        <p className="tip">No candidates found.</p>
      )}
    </div>
  );
}

export default CandidateForm;
