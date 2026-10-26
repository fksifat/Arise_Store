export function makeCSV(rows: (string | number | null | undefined)[][]) {
  const cell = (value: string | number | null | undefined) => {
    let text = String(value ?? '');
    if (typeof value === 'string' && (/^[=+\-@]/.test(text.trimStart()) || /^[\t\r\n]/.test(text))) text = `'${text}`;
    return `"${text.replaceAll('"','""')}"`;
  };
  return '\ufeff' + rows.map(row=>row.map(cell).join(',')).join('\r\n');
}

export function downloadCSV(filename: string, rows: (string | number | null | undefined)[][]) {
  const url = URL.createObjectURL(new Blob([makeCSV(rows)], {type:'text/csv;charset=utf-8;'}));
  const link = document.createElement('a');link.href=url;link.download=filename;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
