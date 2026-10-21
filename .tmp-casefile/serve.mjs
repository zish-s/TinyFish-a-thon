import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), '.tmp-casefile');
http
  .createServer((req, res) => {
    const name = path.basename(req.url.split('?')[0]);
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) {
      res.writeHead(404);
      res.end('no');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/pdf' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(4321, () => console.log('static on 4321'));
