// frontend/src/services/reportService.js
const API_BASE = process.env.REACT_APP_API_BASE_URL || "";
const API_URL = `${API_BASE}/api/reports`; // Ensure this matches your backend port
const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const downloadExcelReport = async () => {
  try {
    const response = await fetch(`${API_URL}/excel`, {
      headers: { ...authHeader() },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to download Excel report");
    }
    // Create a Blob from the response and trigger download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "allocation_report.xlsx");
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  } catch (error) {
    console.error("Error downloading Excel report:", error);
    throw error;
  }
};

export const downloadPdfReport = async () => {
  try {
    const response = await fetch(`${API_URL}/pdf`, {
      headers: { ...authHeader() },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to download PDF report");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "allocation_report.pdf");
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  } catch (error) {
    console.error("Error downloading PDF report:", error);
    throw error;
  }
};
