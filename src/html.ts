type Row = Record<string, unknown>;
export const tabulate = (rows: Row[]): string => {
  if (rows.length === 0) return '<p>No data</p>';
  const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];

  const headerRow = headers.map(h => `<th>${h}</th>`).join('');
  const bodyRows = rows
    .map(row => {
      const cols = headers.map(h => `<td>${row[h]}</td>`).join('');
      return `<tr>${cols}</tr>`;
    })
    .join('');

  return `
<table border="1" cellpadding="5" cellspacing="0">
  <thead><tr>${headerRow}</tr></thead>
  <tbody>${bodyRows}</tbody>
</table>
`;
};
