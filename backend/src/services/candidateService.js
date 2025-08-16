const XLSX = require("xlsx");
const db = require("../database");
const Candidate = db.Candidate;

// Download candidate Excel template
async function downloadCandidateTemplate() {
  const workbook = XLSX.utils.book_new();
  // 📝 FIX: Exclude 'candidateId' from the template as it's auto-incremented
  const headers = [["name", "email", "phone", "typology"]];
  const worksheet = XLSX.utils.aoa_to_sheet(headers);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Candidates");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return buffer;
}

// Import candidates from Excel
async function importCandidatesFromExcel(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  let errorDetails = [];
  if (!data || data.length < 2) {
    errorDetails.push("Excel file is empty or contains no data rows.");
    return { importedCount: 0, failedRows: [], errorDetails };
  }
  const headers = data[0];
  const normalizedHeaders = headers.map((h) =>
    String(h || "")
      .toLowerCase()
      .trim()
  );
  const headerIndex = new Map();
  normalizedHeaders.forEach((h, idx) => headerIndex.set(h, idx));
  const rows = data.slice(1);
  const requiredHeaders = ["name", "email", "phone", "typology"];
  const missingHeaders = requiredHeaders.filter((h) => !headerIndex.has(h));
  if (missingHeaders.length > 0) {
    errorDetails.push(`Missing required headers: ${missingHeaders.join(", ")}`);
  }
  const normalizeTypology = (val) => {
    if (val === undefined || val === null) return val;
    const raw = String(val).trim();
    if (!raw) return "";
    const upper = raw.toUpperCase();
    if (["1BR", "2BR", "3BR"].includes(upper)) return upper;
    const lower = raw.toLowerCase();
    if (["studio", "shop"].includes(lower)) return lower;
    return raw; // leave as-is, will be validated later
  };
  const allowedTypologies = new Set(["studio", "shop", "1BR", "2BR", "3BR"]);
  let importedCount = 0;
  let failedRows = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Skip completely empty rows
    if (
      !row ||
      row.every(
        (cell) =>
          cell === null || cell === undefined || String(cell).trim() === ""
      )
    ) {
      continue;
    }
    const candidate = {};
    // Map row values by normalized header keys
    for (const [key, idx] of headerIndex.entries()) {
      candidate[key] = row[idx];
    }
    const rowErrors = [];
    // Coerce values
    candidate.name = candidate.name ? String(candidate.name).trim() : "";
    candidate.email = candidate.email ? String(candidate.email).trim() : "";
    candidate.phone =
      candidate.phone !== undefined && candidate.phone !== null
        ? String(candidate.phone).trim()
        : "";
    candidate.typology = normalizeTypology(candidate.typology);

    if (!candidate.name) {
      rowErrors.push("Name is required.");
    }
    if (candidate.typology && !allowedTypologies.has(candidate.typology)) {
      rowErrors.push(`Invalid typology: ${candidate.typology}`);
    }
    // Add more field checks as needed
    if (rowErrors.length > 0) {
      failedRows.push({ row: i + 2, errors: rowErrors, rowData: row });
      continue;
    }
    try {
      await Candidate.create({
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        typology: candidate.typology,
      });
      importedCount++;
    } catch (err) {
      failedRows.push({ row: i + 2, errors: [err.message], rowData: row });
    }
  }
  if (
    importedCount === 0 &&
    (failedRows.length > 0 || errorDetails.length > 0)
  ) {
    errorDetails.push(
      "No valid candidates found in file. See failedRows for details."
    );
  }
  return { importedCount, failedRows, errorDetails };
}

module.exports = {
  downloadCandidateTemplate,
  importCandidatesFromExcel,
};
