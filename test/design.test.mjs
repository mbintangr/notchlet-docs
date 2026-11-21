import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (name) => readFile(path.join(ROOT, name), "utf8");

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

test("platform light and dark palettes are defined", async () => {
  const css = await read("styles.css");
  for (const token of [
    "--surface-base: #f8fafc",
    "--surface-card: #ffffff",
    "--surface-inset: #f1f5f9",
    "--border: #e2e8f0",
    "--text: #0f172a",
    "--text-secondary: #475569",
    "--primary: #ef4444",
    "--primary-hover: #dc2626",
    "--primary-soft: #fee2e2"
  ]) {
    assert.ok(css.includes(token), `light theme should define ${token}`);
  }
  for (const token of [
    "--surface-base: #0b0f17",
    "--surface-sidebar: #030712",
    "--surface-card: #111827",
    "--surface-inset: #1f2937",
    "--border: #1f2937",
    "--text: #f9fafb"
  ]) {
    assert.ok(css.includes(token), `dark theme should define ${token}`);
  }
  assert.ok(css.includes('[data-theme="dark"]'), "dark theme selector should exist");
});

test("the old indigo and teal identity is gone", async () => {
  const css = await read("styles.css");
  for (const legacy of ["#4f46e5", "#0f9d94", "#e8e7fd", "#2dd4bf"]) {
    assert.ok(!css.includes(legacy), `styles.css should not keep ${legacy}`);
  }
});

test("Space Grotesk is self-hosted rather than fetched at runtime", async () => {
  const css = await read("styles.css");
  assert.match(css, /@font-face\s*{[\s\S]*?font-family: "Space Grotesk"/);
  assert.ok(css.includes('url("assets/fonts/space-grotesk-latin.woff2")'));
  assert.ok(css.includes('--font: "Space Grotesk"'));
  assert.ok(!css.includes("fonts.googleapis.com"), "styles.css should not reference Google Fonts");
  for (const file of ["assets/fonts/space-grotesk-latin.woff2", "assets/fonts/space-grotesk-latin-ext.woff2"]) {
    const data = await readFile(path.join(ROOT, file));
    assert.equal(data.subarray(0, 4).toString("latin1"), "wOF2", `${file} should be a woff2 font`);
    assert.ok(data.length > 5000, `${file} should contain real font data`);
  }
});

test("the docs use the platform brand icon", async () => {
  const logo = await read("assets/logo.svg");
  assert.ok(logo.includes("#EF4444"), "logo should use the platform red");
  assert.match(logo, /viewBox="0 0 360 360"/);
  const info = await stat(path.join(ROOT, "assets/logo.svg"));
  assert.ok(info.size > 3000, "logo should be the platform icon, not a placeholder");
});

test("every page loads the shared platform theme assets", async () => {
  for (const name of PAGES) {
    const html = await read(name);
    assert.match(html, /<link rel="stylesheet" href="styles.css">/, `${name} should load styles.css`);
    assert.match(html, /<link rel="icon" href="assets\/logo.svg"/, `${name} should use the brand favicon`);
    assert.match(html, /<img src="assets\/logo.svg"/, `${name} should show the brand mark`);
    assert.equal((html.match(/id="theme-toggle"/g) ?? []).length, 1, `${name} should have the theme toggle`);
    assert.ok(!html.includes("fonts.googleapis.com"), `${name} should not fetch web fonts`);
  }
});

test("platform chrome idioms are present in the stylesheet", async () => {
  const css = await read("styles.css");
  const idioms = [
    "--header-h: 64px",
    "--sidebar-w: 256px",
    "--radius-xl: 12px",
    "--radius-2xl: 16px",
    "--radius-3xl: 24px",
    "--shadow-2xs:",
    "backdrop-filter: blur(12px)",
    ".nav a.active",
    ".table-wrap",
    "pre .copy-btn",
    "--success-bg:",
    "--warning-bg:",
    "--info-bg:",
    "--danger-bg:"
  ];
  for (const idiom of idioms) {
    assert.ok(css.includes(idiom), `styles.css should include ${idiom}`);
  }
});
