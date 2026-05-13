/** Échappe une cellule CSV (RFC-style). */
export function csvEscape(value) {
  const s = String(value ?? '')
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Télécharge un fichier CSV UTF-8 (BOM pour Excel). */
export function downloadCsv(filename, headerRow, dataRows) {
  const BOM = '\uFEFF'
  const lines = [headerRow.map(csvEscape).join(';'), ...dataRows.map((row) => row.map(csvEscape).join(';'))]
  const blob = new Blob([BOM + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
