const THEME_KEY = "notchlet-docs-theme";
const root = document.documentElement;
const themeToggle = document.getElementById("theme-toggle");
const navToggle = document.getElementById("nav-toggle");

const SVG_NS = "http://www.w3.org/2000/svg";

function themeIcon(name) {
  const svg = document.createElementNS(SVG_NS, "svg");
  const attrs = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "1.8",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true"
  };
  for (const [key, value] of Object.entries(attrs)) svg.setAttribute(key, value);
  const add = (tag, shape) => {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(shape)) node.setAttribute(key, value);
    svg.append(node);
  };
  if (name === "sun") {
    add("circle", { cx: "12", cy: "12", r: "4" });
    add("path", { d: "M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" });
  } else {
    add("path", { d: "M21 12.79A8.5 8.5 0 1 1 11.21 3 6.6 6.6 0 0 0 21 12.79Z" });
  }
  return svg;
}

function preferredTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme, persist) {
  root.dataset.theme = theme;
  if (persist) localStorage.setItem(THEME_KEY, theme);
  if (themeToggle) {
    const next = theme === "dark" ? "light" : "dark";
    themeToggle.replaceChildren(themeIcon(theme === "dark" ? "sun" : "moon"));
    themeToggle.setAttribute("aria-label", `Switch to ${next} theme`);
    themeToggle.title = `Switch to ${next} theme`;
  }
}

try {
  applyTheme(preferredTheme(), false);
} catch {
  applyTheme("light", false);
}

themeToggle?.addEventListener("click", () => {
  applyTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
});

navToggle?.addEventListener("click", () => {
  const open = document.body.classList.toggle("nav-open");
  navToggle.setAttribute("aria-expanded", String(open));
});

document.addEventListener("click", (event) => {
  if (!document.body.classList.contains("nav-open")) return;
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;
  if (sidebar.contains(event.target) || navToggle?.contains(event.target)) return;
  document.body.classList.remove("nav-open");
  navToggle?.setAttribute("aria-expanded", "false");
});

const here = location.pathname.split("/").pop() || "index.html";
document.querySelectorAll(".nav a").forEach((link) => {
  const target = link.getAttribute("href") ?? "";
  if (target === here || (here === "" && target === "index.html")) {
    link.classList.add("active");
    link.setAttribute("aria-current", "page");
  }
});

const toc = document.getElementById("toc");
const headings = document.querySelectorAll(".doc h2[id], .doc h3[id]");
const activeLink = document.querySelector(".nav a.active");
if (toc && headings.length > 1) {
  const title = document.createElement("h2");
  title.textContent = "On this page";
  const list = document.createElement("ol");
  headings.forEach((heading) => {
    const item = document.createElement("li");
    item.className = heading.tagName === "H3" ? "depth-3" : "depth-2";
    const link = document.createElement("a");
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent;
    item.append(link);
    list.append(item);
  });
  toc.append(title, list);

  const activeItem = activeLink?.closest("li");
  if (activeLink && activeItem) {
    activeItem.append(toc);
    activeItem.classList.add("toc-open");
    activeLink.setAttribute("aria-controls", "toc");
    activeLink.setAttribute("aria-expanded", "true");
    activeLink.addEventListener("click", (event) => {
      event.preventDefault();
      const open = activeItem.classList.toggle("toc-open");
      activeLink.setAttribute("aria-expanded", String(open));
    });
    toc.addEventListener("click", (event) => {
      if (event.target.closest("a")) document.body.classList.remove("nav-open");
    });
  }
}

document.querySelectorAll("pre").forEach((block) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "copy-btn";
  button.textContent = "Copy";
  button.addEventListener("click", async () => {
    const text = block.querySelector("code")?.innerText ?? block.innerText;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Copied";
    } catch {
      button.textContent = "Failed";
    }
    setTimeout(() => {
      button.textContent = "Copy";
    }, 1400);
  });
  block.append(button);
});

const search = document.getElementById("nav-search");
const empty = document.querySelector(".search-empty");
if (search) {
  search.addEventListener("input", () => {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    document.querySelectorAll(".nav-group").forEach((group) => {
      let groupVisible = 0;
      group.querySelectorAll(":scope > ul > li > a").forEach((link) => {
        const matches = !query || link.textContent.toLowerCase().includes(query);
        link.hidden = !matches;
        if (matches) groupVisible += 1;
      });
      group.classList.toggle("is-empty", groupVisible === 0);
      visible += groupVisible;
    });
    empty?.classList.toggle("visible", visible === 0);
  });
}
