export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function openPrintWindow({ title, bodyHtml, styles = '', printDelayMs = 250 } = {}) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Não foi possível abrir a janela de impressão (popup bloqueado?)');
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHtml(title || 'Relatório - Prescrimed')}</title>
        <meta charset="utf-8" />
        ${styles ? `<style>${styles}</style>` : ''}
      </head>
      <body>
        ${bodyHtml || ''}
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.print();
  }, printDelayMs);

  return printWindow;
}
