const API_BASE = process.env.REACT_APP_API_BASE_URL || "";
const API_URL = `${API_BASE}/api/candidates`;

const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Import candidates in batch via file upload (Excel/CSV)
export async function importCandidates(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE}/api/candidates/import`, {
    method: "POST",
    body: formData,
    headers: { ...authHeader() },
  });
  if (!response.ok) {
    throw new Error("Failed to import candidates");
  }
  return response.json();
}

// Batch add candidates
export const addCandidatesBatch = async (candidates) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(candidates),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to add candidates batch");
  }
  return await response.json();
};

export const addCandidate = async (candidate) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(candidate),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to add candidate");
  }
  return await response.json();
};

export const getCandidates = async () => {
  const response = await fetch(API_URL, { headers: { ...authHeader() } });
  if (!response.ok) {
    throw new Error("Failed to fetch candidates");
  }
  return await response.json();
};
