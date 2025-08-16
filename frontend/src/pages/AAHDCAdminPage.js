// frontend/src/pages/AAHDCAdminPage.js
import React, { useState, useEffect } from "react";
import { getUnits } from "../services/unitService";
import {
  runAllocation,
  getAllocatedUnits,
} from "../services/allocationService";
import {
  downloadExcelReport,
  downloadPdfReport,
} from "../services/reportService";

function AAHDCAdminPage() {
  // const [units, setUnits] = useState([]);
  // Allocated units now displayed from allocated snapshot endpoint
  const [unallocatedUnits, setUnallocatedUnits] = useState([]);
  const [allocatedSnapshot, setAllocatedSnapshot] = useState([]); // from /api/allocation/allocated
  const [selectedMethod, setSelectedMethod] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Pagination state
  const [unallocatedPage, setUnallocatedPage] = useState(1);
  const [allocatedPage, setAllocatedPage] = useState(1);
  const PAGE_SIZE = 10;
  const allocatedCount = allocatedSnapshot.length;
  const unallocatedCount = unallocatedUnits.length;

  // const fetchUnits = async () => {
  //   setLoading(true);
  //   try {
  //     const allUnits = await getUnits();
  //     setUnits(allUnits);
  //     setAllocatedUnits(allUnits.filter((u) => u.allocated));
  //     setUnallocatedUnits(allUnits.filter((u) => !u.allocated));
  //   } catch (err) {
  //     setError(err.message || "Failed to fetch units.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const allUnits = await getUnits();
      // Defensive: filter out units missing required fields
      const validUnits = Array.isArray(allUnits)
        ? allUnits.filter(
            (u) =>
              u &&
              typeof u.unitId !== "undefined" &&
              typeof u.allocated !== "undefined"
          )
        : [];
      // allocated units list comes from allocated snapshot endpoint
      setUnallocatedUnits(validUnits.filter((u) => u.allocated === false));
      setUnallocatedPage(1); // Reset to first page on data reload
      setAllocatedPage(1);
    } catch (err) {
      setError(err.message || "Failed to fetch units.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
    fetchAllocated();
  }, []);

  // const handleRunAllocation = async () => {
  //   setMessage("");
  //   setError("");
  //   setLoading(true);
  //   try {
  //     const response = await runAllocation(selectedMethod);
  //     setMessage(response.message);
  //     if (response.complianceIssues && response.complianceIssues.length > 0) {
  //       setError(
  //         "Compliance issues detected after allocation: " +
  //           response.complianceIssues.join(", ")
  //       );
  //     }
  //     fetchUnits(); // Refresh unit data
  //   } catch (err) {
  //     setError(err.message || "Failed to run allocation.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  const handleRunAllocation = async () => {
    setMessage("");
    setError("");
    setLoading(true);
    try {
      const response = await runAllocation(selectedMethod);
      setMessage(response.message);
      if (response.complianceIssues && response.complianceIssues.length > 0) {
        setError(
          "Compliance issues detected after allocation: " +
            response.complianceIssues.join(", ")
        );
      }
    } catch (err) {
      try {
        // Try parsing the error message as JSON for detailed issues
        const errorData = JSON.parse(err.message);
        if (errorData.issues) {
          setError(
            "Pre-allocation compliance failed: " + errorData.issues.join(", ")
          );
        } else {
          setError(err.message || "Failed to run allocation.");
        }
      } catch {
        setError(err.message || "Failed to run allocation.");
      }
    } finally {
      setLoading(false);
      fetchUnits();
      // Refresh allocated snapshot (includes candidate info if present)
      fetchAllocated();
    }
  };

  const fetchAllocated = async () => {
    try {
      const data = await getAllocatedUnits();
      setAllocatedSnapshot(Array.isArray(data) ? data : []);
    } catch (e) {
      // non-fatal for page
    }
  };

  const handleDownloadExcel = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await downloadExcelReport();
      setMessage("Excel report downloaded successfully.");
    } catch (err) {
      setError(err.message || "Failed to download Excel report.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await downloadPdfReport();
      setMessage("PDF report downloaded successfully.");
    } catch (err) {
      setError(err.message || "Failed to download PDF report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-card">
      <h2>AAHDC Admin Portal</h2>

      {/* Stats and quick actions */}
      <div className="stats">
        <div className="stat">
          <div className="stat-label">Unallocated</div>
          <div className="stat-value">{unallocatedCount}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Allocated</div>
          <div className="stat-value">{allocatedCount}</div>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => {
            fetchUnits();
            fetchAllocated();
          }}
          disabled={loading}
        >
          <span className="btn-icon">🔄</span> Refresh
        </button>
      </div>

      {loading && <p className="tip">Loading...</p>}
      {message && <p className="message-success">{message}</p>}
      {error && <p className="message-error">{error}</p>}

      {/* Unallocated units */}
      <section style={{ marginBottom: 20 }}>
        <div className="section-header">
          <h3>Unallocated Units ({unallocatedCount})</h3>
        </div>
        {unallocatedCount > 0 ? (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Unit ID</th>
                    <th>Typology</th>
                    <th>Gross Area</th>
                    <th>Floor</th>
                    <th>Block</th>
                  </tr>
                </thead>
                <tbody>
                  {unallocatedUnits
                    .slice(
                      (unallocatedPage - 1) * PAGE_SIZE,
                      unallocatedPage * PAGE_SIZE
                    )
                    .map((unit) => (
                      <tr key={unit.unitId}>
                        <td>{unit.unitId}</td>
                        <td>{unit.typology || "-"}</td>
                        <td>
                          {unit.grossArea
                            ? Number(unit.grossArea).toFixed(2)
                            : "-"}
                        </td>
                        <td>{unit.floorNumber || "-"}</td>
                        <td>{unit.blockName || "-"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 10,
                gap: 10,
              }}
            >
              <button
                className="btn btn-outline"
                onClick={() => setUnallocatedPage((p) => Math.max(1, p - 1))}
                disabled={unallocatedPage === 1}
              >
                ← Previous
              </button>
              <span className="tip">
                Page {unallocatedPage} of{" "}
                {Math.ceil(unallocatedCount / PAGE_SIZE)}
              </span>
              <button
                className="btn btn-outline"
                onClick={() =>
                  setUnallocatedPage((p) =>
                    p < Math.ceil(unallocatedCount / PAGE_SIZE) ? p + 1 : p
                  )
                }
                disabled={
                  unallocatedPage >= Math.ceil(unallocatedCount / PAGE_SIZE)
                }
              >
                Next →
              </button>
            </div>
          </>
        ) : (
          <p className="tip">
            No unallocated units to display. Please submit units via the
            Developer Portal.
          </p>
        )}
      </section>

      {/* Run allocation */}
      <section style={{ marginBottom: 20 }}>
        <div className="section-header">
          <h3>Run Allocation</h3>
        </div>
        <div className="form-grid" style={{ alignItems: "end" }}>
          <div className="form-field">
            <label>Distribution Method</label>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
            >
              <option value="">-- Select Method --</option>
              <option value="Full Lottery">
                Full Lottery (Houses + Shops)
              </option>
              <option value="Hybrid Lottery">
                Hybrid Lottery (Houses) + Negotiation (Shops)
              </option>
              <option value="Block-by-Block Assignment">
                Block-by-Block Assignment
              </option>
              <option value="Lottery Based on Floor Number">
                Lottery Based on Floor Number
              </option>
              <option value="Assign Candidates by Typology">
                Assign Candidates by Typology (match candidates to units)
              </option>
            </select>
          </div>
          <div className="form-actions">
            <button
              className="btn btn-primary"
              onClick={handleRunAllocation}
              disabled={!selectedMethod || loading || unallocatedCount === 0}
            >
              <span className="btn-icon">🎲</span> Run Allocation
            </button>
          </div>
        </div>
      </section>

      {/* Allocated snapshot */}
      <section style={{ marginBottom: 20 }}>
        <div className="section-header">
          <h3>Allocated Units ({allocatedCount})</h3>
          <div>
            <button
              className="btn btn-outline"
              onClick={fetchAllocated}
              disabled={loading}
            >
              <span className="btn-icon">🔁</span> Refresh Allocated
            </button>
          </div>
        </div>
        {allocatedCount > 0 ? (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Unit ID</th>
                    <th>Typology</th>
                    <th>Gross Area</th>
                    <th>Floor</th>
                    <th>Block</th>
                    <th>Owner / Candidate</th>
                    <th>Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {allocatedSnapshot
                    .slice(
                      (allocatedPage - 1) * PAGE_SIZE,
                      allocatedPage * PAGE_SIZE
                    )
                    .map((row) => (
                      <tr key={row.unitId}>
                        <td>{row.unitId}</td>
                        <td>{row.typology || "-"}</td>
                        <td>
                          {row.grossArea
                            ? Number(row.grossArea).toFixed(2)
                            : "-"}
                        </td>
                        <td>{row.floorNumber || "-"}</td>
                        <td>{row.blockName || "-"}</td>
                        <td
                          style={{
                            fontWeight: "bold",
                            color:
                              row.owner === "AAHDC" ? "#27ae60" : "#2980b9",
                          }}
                        >
                          {row.owner || row.candidateName || "-"}
                        </td>
                        <td>{row.candidatePhone || "-"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 10,
                gap: 10,
              }}
            >
              <button
                className="btn btn-outline"
                onClick={() => setAllocatedPage((p) => Math.max(1, p - 1))}
                disabled={allocatedPage === 1}
              >
                ← Previous
              </button>
              <span className="tip">
                Page {allocatedPage} of {Math.ceil(allocatedCount / PAGE_SIZE)}
              </span>
              <button
                className="btn btn-outline"
                onClick={() =>
                  setAllocatedPage((p) =>
                    p < Math.ceil(allocatedCount / PAGE_SIZE) ? p + 1 : p
                  )
                }
                disabled={
                  allocatedPage >= Math.ceil(allocatedCount / PAGE_SIZE)
                }
              >
                Next →
              </button>
            </div>
          </>
        ) : (
          <p className="tip">
            No units have been allocated yet. Run an allocation method above.
          </p>
        )}
      </section>

      {/* Reports */}
      <section>
        <div className="section-header">
          <h3>Reports</h3>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
          <button
            className="btn btn-primary"
            onClick={handleDownloadExcel}
            disabled={loading || allocatedCount === 0}
          >
            <span className="btn-icon">📊</span> Excel Report
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleDownloadPdf}
            disabled={loading || allocatedCount === 0}
          >
            <span className="btn-icon">📄</span> PDF Report
          </button>
        </div>
      </section>
    </div>
  );
}

export default AAHDCAdminPage;
