// frontend/src/services/allocationService.js
const API_BASE = process.env.REACT_APP_API_BASE_URL || "";
const API_BASE_URL = `${API_BASE}/api/allocation`;
const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function runAllocation(distributionMethod) {
  if (!distributionMethod) {
    throw new Error("Distribution method must be provided");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader(),
      },
      body: JSON.stringify({ distributionMethod }), // <-- key must be distributionMethod
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Allocation request failed (${response.status}): ${
          errorData.message || JSON.stringify(errorData)
        }`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error running allocation:", error);
    throw error;
  }
}

export async function getAllocatedUnits() {
  const res = await fetch(`${API_BASE_URL}/allocated`, {
    headers: { ...authHeader() },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to fetch allocated units: ${err}`);
  }
  return res.json();
}
