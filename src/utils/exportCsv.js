export function escapeCsvValue(value, delimiter = ';') {
  if (value === null || value === undefined) return '';
  const str = String(value);
  const needsQuotes =
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r') ||
    str.includes(delimiter);

  if (!needsQuotes) return str;

  // CSV escaping: double quotes are escaped by doubling them
  return `"${str.replaceAll('"', '""')}"`;
}

export function buildCsvLine(cells, delimiter = ';') {
  if (!Array.isArray(cells) || cells.length === 0) return '';
  return cells.map((cell) => escapeCsvValue(cell, delimiter)).join(delimiter);
}

export function buildCsvContent(lines, delimiter = ';') {
  if (!Array.isArray(lines)) return '';
  return lines.map((line) => buildCsvLine(line, delimiter)).join('\n');
}

export function downloadCsv({ filename, lines, delimiter = ';', includeBom = true } = {}) {
  if (!filename) throw new Error('Nome do arquivo é obrigatório');

  const csvContent = buildCsvContent(lines, delimiter);
  const bom = includeBom ? '\uFEFF' : '';

  const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
