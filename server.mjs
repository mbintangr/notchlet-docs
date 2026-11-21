import { createServer as createHttpServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

const HEALTH = JSON.stringify({
  status: "ok",
  service: "notchlet-docs",
  version: "1.0.0"
});

function send(res, status, headers, body, method) {
  res.writeHead(status, headers);
  res.end(method === "HEAD" ? undefined : body);
}

function notFound(res, method) {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Page not found · Notchlet Docs</title>
<link rel="stylesheet" href="/styles.css"></head>
<body class="error-page"><main>
<h1>404</h1>
<p>That page does not exist. Start from the <a href="/">overview</a>.</p>
</main></body></html>`;
  send(res, 404, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }, html, method);
}

export function createAppServer(root = ROOT) {
  return createHttpServer(async (req, res) => {
    const method = req.method ?? "GET";
    if (method !== "GET" && method !== "HEAD") {
      send(res, 405, { "content-type": "text/plain; charset=utf-8", allow: "GET, HEAD" }, "Method not allowed\n", method);
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
    } catch {
      send(res, 400, { "content-type": "text/plain; charset=utf-8" }, "Bad request\n", method);
      return;
    }

    if (pathname === "/health") {
      send(res, 200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }, HEALTH, method);
      return;
    }

    let relative = pathname;
    if (relative.endsWith("/")) relative += "index.html";
    if (path.extname(relative) === "") relative += ".html";

    const resolved = path.resolve(root, "." + relative);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      send(res, 403, { "content-type": "text/plain; charset=utf-8" }, "Forbidden\n", method);
      return;
    }

    try {
      const data = await readFile(resolved);
      const type = MIME[path.extname(resolved).toLowerCase()] ?? "application/octet-stream";
      send(res, 200, { "content-type": type, "cache-control": "no-store" }, data, method);
    } catch {
      notFound(res, method);
    }
  });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const port = Number(process.env.PORT ?? 4173);
  const host = process.env.HOST ?? "127.0.0.1";
  const server = createAppServer();
  server.listen(port, host, () => {
    const address = server.address();
    console.log(`notchlet-docs listening on http://${host}:${address.port}`);
  });
  const stop = () => server.close(() => process.exit(0));
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
