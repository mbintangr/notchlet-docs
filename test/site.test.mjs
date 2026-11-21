import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAppServer } from "../server.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PAGES = [
  "index.html",
  "concepts.html",
  "cli.html",
  "mcp.html",
  "platform.html",
  "skills.html",
  "workflow.html",
  "examples.html",
  "reference.html"
];

const MARKERS = {
  "index.html": ["Notchlet", "change new", "verify", "workflow"],
  "concepts.html": ["proposal.json", "revision", "capability"],
  "cli.html": ["--record", "--serve", "change close"],
  "mcp.html": ["NOTCHLET_MCP_TOKEN", "mcp serve", "bounded"],
  "platform.html": ["Epic", "Story", "DONE"],
  "skills.html": ["notchlet-super", "client update", ".opencode/skills"],
  "workflow.html": ["Definition of Ready", "evidence", "T1"],
  "examples.html": ["quick", "standard", "revision"],
  "reference.html": ["revision_conflict", "--capability-impact", "NOTCHLET_MCP_TOKEN"]
};

const cache = new Map();
async function page(name) {
  if (!cache.has(name)) cache.set(name, await readFile(path.join(ROOT, name), "utf8"));
  return cache.get(name);
}

const server = createAppServer(ROOT);
let base;

before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test("every documented page exists and is non-trivial HTML", async () => {
  for (const name of PAGES) {
    const html = await page(name);
    assert.ok(html.length > 2000, `${name} should have substantial content`);
    assert.match(html, /^\s*<!doctype html>/i, `${name} should start with a doctype`);
    assert.match(html, /<meta name="description" content="[^"]+">/, `${name} should have a meta description`);
    assert.match(html, /<html lang="en">/, `${name} should declare a language`);
  }
});

test("each page has exactly one h1 and a unique title", async () => {
  const titles = new Set();
  for (const name of PAGES) {
    const html = await page(name);
    const h1 = html.match(/<h1[ >]/g) ?? [];
    assert.equal(h1.length, 1, `${name} should have exactly one h1`);
    const title = html.match(/<title>([^<]+)<\/title>/);
    assert.ok(title, `${name} should have a title`);
    assert.ok(!titles.has(title[1]), `title "${title[1]}" should be unique`);
    titles.add(title[1]);
  }
});

test("required reference content is present on each page", async () => {
  for (const [name, markers] of Object.entries(MARKERS)) {
    const html = await page(name);
    for (const marker of markers) {
      assert.ok(html.includes(marker), `${name} should mention "${marker}"`);
    }
  }
});

test("every page carries the complete navigation and TOC shell", async () => {
  for (const name of PAGES) {
    const html = await page(name);
    for (const target of PAGES) {
      assert.ok(html.includes(`href="${target}"`), `${name} nav should link ${target}`);
    }
    assert.match(html, /class="toc" id="toc"/, `${name} should have a table of contents aside`);
    assert.doesNotMatch(html, /site-footer/, `${name} should not render a footer`);
    assert.match(html, /class="skip-link"/, `${name} should have a skip link`);
    assert.match(html, /<script src="app.js" defer><\/script>/, `${name} should load app.js`);
    assert.match(html, /<link rel="stylesheet" href="styles.css">/, `${name} should load styles.css`);
  }
});

test("local links and assets resolve to real files", async () => {
  const missing = [];
  for (const name of PAGES) {
    const html = await page(name);
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const ref = match[1];
      if (/^(?:https?:|mailto:|#|javascript:)/.test(ref)) continue;
      const [clean] = ref.split(/[?#]/);
      if (!clean) continue;
      const resolved = path.posix.normalize(clean);
      assert.ok(!resolved.startsWith(".."), `${name} links outside the site: ${ref}`);
      const exists = await stat(path.join(ROOT, resolved)).then(() => true, () => false);
      if (!exists) missing.push(`${name} -> ${ref}`);
    }
  }
  assert.deepEqual(missing, [], `unresolved site references:\n${missing.join("\n")}`);
});

test("pages avoid inline credentials and emoji decoration", async () => {
  for (const name of PAGES) {
    const html = await page(name);
    assert.doesNotMatch(html, /notchlet_(?:mcp|pat)_[A-Za-z0-9_-]{20,}/, `${name} should not embed a token`);
    assert.doesNotMatch(html, /[\u{1F000}-\u{1FAFF}]/u, `${name} should not use emoji`);
  }
});

test("server serves the health endpoint and the overview", async () => {
  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  assert.match(health.headers.get("content-type"), /application\/json/);
  assert.deepEqual(await health.json(), { status: "ok", service: "notchlet-docs", version: "1.0.0" });

  const index = await fetch(`${base}/`);
  assert.equal(index.status, 200);
  assert.match(index.headers.get("content-type"), /text\/html/);
  assert.match(await index.text(), /Notchlet Docs/);
});

test("server maps extensionless paths and HEAD requests", async () => {
  const cli = await fetch(`${base}/cli`);
  assert.equal(cli.status, 200);
  assert.match(cli.headers.get("content-type"), /text\/html/);

  const head = await fetch(`${base}/reference.html`, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");

  const css = await fetch(`${base}/styles.css`);
  assert.equal(css.status, 200);
  assert.match(css.headers.get("content-type"), /text\/css/);
});

test("server returns 404 and rejects traversal and unsupported methods", async () => {
  const missing = await fetch(`${base}/nope`);
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /404/);

  const traversal = await fetch(`${base}/..%2f..%2fpackage.json`);
  assert.ok([403, 404].includes(traversal.status), `traversal should be blocked, got ${traversal.status}`);

  const post = await fetch(`${base}/`, { method: "POST" });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("allow"), "GET, HEAD");
});
