type Cell = { text: string; href?: string; truncate?: true };
type Row = Record<string, Cell | undefined>;
export const tabulate = (rows: Row[]): string => {
  if (rows.length === 0) return '<p>No data</p>';
  const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];

  const headerRow = headers.map(h => `<th>${h}</th>`).join('');
  const bodyRows = rows
    .map(row => {
      const cols = headers
        .map(h => {
          const cell = row[h];
          if (!cell) return '<td>--</td>';
          const { text, href, truncate } = cell;
          const tooLong = truncate && text.length > 8;
          const truncated =
            tooLong ? text.slice(0, 8) + '...' : text;
          const inner = `<code>${truncated}</code>`;
          const link = href ? `<a href="${href}">${inner}</a>` : inner;
          const title = tooLong ? ` title="${text}"` : '';
          return `<td${title}>${link}</td>`;
        })
        .join('');
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
