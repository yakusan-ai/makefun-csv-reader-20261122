// Independent implementation of the competition's written CSV policy.
export function run(input) {
  const source = String(input.text);
  const hasHeader = input.header === true;
  const rows = [], errors = [];
  let columns = hasHeader ? [] : null;
  let first = true, width = 0;
  let cursor = source.startsWith('\uFEFF') ? 1 : 0;
  let physicalLine = 1;
  while (cursor < source.length) {
    // Ignore genuinely empty physical lines before starting a record.
    if (source[cursor] === '\n' || source.slice(cursor, cursor + 2) === '\r\n') {
      cursor += source[cursor] === '\r' ? 2 : 1;
      physicalLine++;
      continue;
    }
    const startLine = physicalLine;
    const rowIndex = hasHeader && first ? null : rows.length;
    const emit = code => errors.push({ code, line: startLine, row: rowIndex });
    const cells = [];
    let value = '', mode = 'start', recordHasContent = false, junk = false;
    let opening = 0, openingLine = 0;
    let done = false;
    while (!done) {
      const c = source[cursor];
      if (mode === 'quoted') {
        if (c === undefined) {
          // Roll back speculative quoted content; re-read after the literal opener.
          cursor = opening + 1;
          physicalLine = openingLine;
          value = '"';
          mode = 'plain';
          emit('unterminated_quote');
          continue;
        }
        if (c === '"') {
          if (source[cursor + 1] === '"') { value += '"'; cursor += 2; }
          else { cursor++; mode = 'tail'; }
        } else if (c === '\r') {
          value += '\n'; physicalLine++;
          cursor += source[cursor + 1] === '\n' ? 2 : 1;
        } else {
          value += c; cursor++;
          if (c === '\n') physicalLine++;
        }
        continue;
      }
      if (mode === 'start' && c === '"') {
        opening = cursor; openingLine = physicalLine;
        recordHasContent = true; mode = 'quoted'; cursor++;
        continue;
      }
      const breakLine = c === '\n' || (c === '\r' && source[cursor + 1] === '\n');
      if (c === undefined || c === ',' || breakLine) {
        if (junk) emit('quote_junk');
        cells.push(value);
        if (c === ',') {
          recordHasContent = true; cursor++; value = ''; mode = 'start'; junk = false;
        } else {
          if (breakLine) { cursor += c === '\r' ? 2 : 1; physicalLine++; }
          done = true;
        }
      } else if (c === '\r') {
        emit('stray_cr'); cursor++;
        // Even a discarded CR prevents a later quote from opening this field.
        if (mode === 'start') mode = 'plain';
      } else {
        value += c; cursor++; recordHasContent = true;
        if (mode === 'tail') junk = true;
        else mode = 'plain';
      }
    }
    // Discard a line made solely of removed CRs, but retain its errors.
    if (!recordHasContent) continue;
    if (first) {
      width = cells.length; first = false;
      if (hasHeader) { columns = cells; continue; }
    }
    if (cells.length < width) {
      errors.push({ code: 'short_row', line: startLine, row: rowIndex, fields: cells.length });
      while (cells.length < width) cells.push('');
    } else if (cells.length > width) {
      errors.push({ code: 'long_row', line: startLine, row: rowIndex, extra: cells.slice(width) });
      cells.length = width;
    }
    rows.push(cells);
  }
  return { columns, rows, errors };
}
