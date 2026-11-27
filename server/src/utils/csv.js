/**
 * Safe CSV cell serializer with OWASP CWE-1236 Formula Injection neutralization.
 *
 * Spreadsheet applications (Excel, LibreOffice Calc, Google Sheets) interpret cells
 * starting with '=', '+', '-', '@', Tab (\t), or CR (\r) — even when wrapped in double
 * quotes or preceded by whitespace — as executable formulas / DDE commands.
 *
 * Prefixing dangerous string values with a single quote (') forces spreadsheet engines
 * to treat the cell strictly as plain text while preserving numeric types untouched.
 */
const FORMULA_TRIGGER_REGEX = /^(?:[\t\r]|[\t\r\n ]*[=+\-@])/;

export const sanitizeCsvString = (raw) => {
  if (FORMULA_TRIGGER_REGEX.test(raw)) {
    return `'${raw}`;
  }
  return raw;
};

export const escapeCsvValue = (value) => {
  if (value === null || value === undefined) {
    return '""';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return `"${String(value)}"`;
  }

  const str = sanitizeCsvString(String(value));
  return `"${str.replace(/"/g, '""')}"`;
};
