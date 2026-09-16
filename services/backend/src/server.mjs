import { createServer as createHttpServer } from "node:http";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { InvalidTree, RevisionConflict, TreeStore } from "./tree-store.mjs";

const JSON_LIMIT = 1_000_000;

export function createTreeServer(store, { corsOrigin = "*" } = {}) {
  return createHttpServer(async (request, response) => {
    setCors(response, corsOrigin);
    if (request.method === "OPTIONS") return send(response, 204);
    if (request.method === "GET" && request.url === "/health") {
      return sendJson(response, 200, { status: "ok" });
    }
    if (request.method === "GET" && request.url === "/tree") {
      return sendJson(response, 200, store.read());
    }
    if (request.method === "PUT" && request.url === "/tree") {
      try {
        const body = await readJson(request);
        const snapshot = await store.replace(body?.expectedRevision, body?.root);
        return sendJson(response, 200, snapshot);
      } catch (error) {
        if (error instanceof RevisionConflict) {
          return sendJson(response, 409, {
            code: "revision_conflict",
            message: error.message,
            currentRevision: error.currentRevision,
          });
        }
        if (error instanceof InvalidTree || error instanceof SyntaxError) {
          return sendJson(response, 422, {
            code: "invalid_tree",
            message: error.message,
          });
        }
        if (error.code === "BODY_TOO_LARGE") {
          return sendJson(response, 413, { code: "payload_too_large", message: error.message });
        }
        console.error(error);
        return sendJson(response, 500, { code: "internal_error", message: "Unexpected server error" });
      }
    }
    return sendJson(response, 404, { code: "not_found", message: "Route not found" });
  });
}

function setCors(response, origin) {
  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Access-Control-Allow-Headers", "content-type");
  response.setHeader("Access-Control-Allow-Methods", "GET,PUT,OPTIONS");
}

function send(response, status) {
  response.writeHead(status);
  response.end();
}

function sendJson(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  response.end(body);
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > JSON_LIMIT) {
      const error = new Error(`Request body exceeds ${JSON_LIMIT} bytes`);
      error.code = "BODY_TOO_LARGE";
      throw error;
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function start() {
  const filePath = resolve(process.env.TREE_DATA_FILE ?? "var/tree.json");
  const store = new TreeStore(filePath);
  await store.load();
  const server = createTreeServer(store, { corsOrigin: process.env.CORS_ORIGIN ?? "*" });
  const host = process.env.HOST ?? "127.0.0.1";
  const port = Number(process.env.PORT ?? 8787);
  server.listen(port, host, () => console.log(`Treeview API listening on http://${host}:${port}`));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  start().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
