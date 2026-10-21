import fs from "node:fs";
import zlib from "node:zlib";
const buf = fs.readFileSync(".tmp-casefile/casefile.pdf");
let idx = 0, n = 0;
while (true) {
  const s = buf.indexOf("stream", idx);
  if (s === -1) break;
  let p = s + 6;
  if (buf[p] === 0x0d) p += 1;
  if (buf[p] === 0x0a) p += 1;
  const e = buf.indexOf("endstream", p);
  if (e === -1) break;
  const raw = buf.subarray(p, e);
  let text = null;
  try { text = zlib.inflateSync(raw).toString("latin1"); } catch {}
  if (text) { n += 1; if (n <= 2) console.log("---- stream", n, "len", text.length, "\n", text.slice(0, 1500)); }
  idx = e + 9;
}
console.log("streams inflated:", n);
