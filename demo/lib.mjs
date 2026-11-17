// Shared by bench.mjs, tsc-log.mjs and watch.mjs
// Parses --extendedDiagnostics. `tsc -b` prints one block per project (+ "Aggregate ..." lines):
// we sum the counters over the project blocks, take the max for memory, and skip the Aggregate lines.
export function parseDiagnostics(out) {
  const r = { files: 0, nodes: 0, symbols: 0, types: 0, checkMs: 0, memKB: 0 };
  for (const line of out.split('\n')) {
    if (line.startsWith('Aggregate')) continue;
    let m;
    if ((m = line.match(/^Files:\s+(\d+)/))) r.files += +m[1];
    else if ((m = line.match(/^Identifiers:\s+(\d+)/))) r.nodes += +m[1];      // "AST nodes" (the iceberg)
    else if ((m = line.match(/^Symbols:\s+(\d+)/))) r.symbols += +m[1];
    else if ((m = line.match(/^Types:\s+(\d+)/))) r.types += +m[1];
    else if ((m = line.match(/^Check time:\s+([\d.]+)s/))) r.checkMs += +m[1] * 1000;
    else if ((m = line.match(/^Memory used:\s+(\d+)K/))) r.memKB = Math.max(r.memKB, +m[1]);
  }
  r.checkMs = Math.round(r.checkMs);
  return r;
}
export const fmtMs = (ms) => (ms >= 1000 ? (ms / 1000).toFixed(2) + ' s' : Math.round(ms) + ' ms');
export const fmtN = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n));

// Clear the terminal (screen + scrollback) so every step starts on a blank screen. Only on a real terminal; NOCLEAR=1 disables.
export const clearScreen = () => { if (process.stdout.isTTY && !process.env.NOCLEAR) process.stdout.write('\x1b[2J\x1b[3J\x1b[H'); };
