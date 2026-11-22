// Independent parser: scan spans, materialize only fields and reported errors.
export function run(input) {
  const text = String(input.text), n = text.length;
  const header = input.header === true, rows = [], errors = [];
  let columns = header ? [] : null;
  let pos = text.charCodeAt(0) === 65279 ? 1 : 0, line = 1, first = true, width = 0;
  while (pos < n) {
    let ch = text.charCodeAt(pos);
    if (ch === 10 || (ch === 13 && text.charCodeAt(pos + 1) === 10)) {
      pos += ch === 13 ? 2 : 1; line++; continue;
    }
    const startLine = line, row = header && first ? null : rows.length, cells = [];
    let content = false, endRecord = false;
    while (!endRecord) {
      let value = '', tail = false, junk = false;
      if (text.charCodeAt(pos) === 34) {
        content = true;
        const opening = pos++, openingLine = line;
        let segment = pos;
        for (;;) {
          const close = text.indexOf('"', pos);
          if (close < 0) {
            errors.push({code:'unterminated_quote',line:startLine,row});
            pos = opening; line = openingLine; value = ''; break;
          }
          // Most quoted spans need no normalization or character copying.
          let p = segment;
          for (; p < close; p++) {
            const c = text.charCodeAt(p);
            if (c === 10) line++;
            else if (c === 13) {
              value += text.slice(segment,p) + '\n';
              if (text.charCodeAt(p+1) === 10) p++;
              line++; segment = p+1;
            }
          }
          value += text.slice(segment,close);
          pos = close+1;
          if (text.charCodeAt(pos) !== 34) {tail = true; break;}
          value += '"'; segment = ++pos;
        }
      }
      let segment = pos;
      for (;;) {
        while (pos < n) {
          ch = text.charCodeAt(pos);
          if (ch === 44 || ch === 10 || ch === 13) break;
          pos++;
        }
        if (pos === n) ch = NaN;
        if (pos === n || ch === 44 || ch === 10 || (ch === 13 && text.charCodeAt(pos+1) === 10)) {
          if (pos > segment) {value += text.slice(segment,pos);content = true;if(tail)junk = true;}
          if (junk) errors.push({code:'quote_junk',line:startLine,row});
          cells.push(value);
          if (ch === 44) {pos++;content = true;}
          else {if(pos<n){pos += ch===13?2:1;line++;}endRecord = true;}
          break;
        }
        if (ch === 13) {
          if(pos>segment){value += text.slice(segment,pos);content = true;if(tail)junk = true;}
          errors.push({code:'stray_cr',line:startLine,row});
          segment = ++pos;
        }
      }
    }
    if (!content) continue;
    if (first) {width = cells.length;first = false;if(header){columns = cells;continue;}}
    if(cells.length<width){errors.push({code:'short_row',line:startLine,row,fields:cells.length});while(cells.length<width)cells.push('');}
    else if(cells.length>width){errors.push({code:'long_row',line:startLine,row,extra:cells.slice(width)});cells.length=width;}
    rows.push(cells);
  }
  return {columns,rows,errors};
}
