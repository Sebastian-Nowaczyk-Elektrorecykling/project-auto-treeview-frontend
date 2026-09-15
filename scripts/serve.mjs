import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const types = { ".css": "text/css", ".html": "text/html", ".mjs": "text/javascript", ".svg": "image/svg+xml" };
const root = new URL("../", import.meta.url).pathname;
const port = Number(process.env.PORT ?? 4173);

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const relative = normalize(pathname === "/" ? "index.html" : pathname.slice(1));
  if (relative.startsWith("..")) {
    response.writeHead(403).end();
    return;
  }
  const path = join(root, relative);
  try {
    const info = await stat(path);
    if (!info.isFile()) throw new Error("Not a file");
    response.writeHead(200, { "content-type": `${types[extname(path)] ?? "application/octet-stream"}; charset=utf-8` });
    createReadStream(path).pipe(response);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(port, "127.0.0.1", () => console.log(`Treeview frontend at http://127.0.0.1:${port}`));
