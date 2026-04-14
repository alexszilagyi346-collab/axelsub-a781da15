import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const PORT = 5000;

const BOT_UA = /facebookexternalhit|facebot|twitterbot|discordbot|linkedinbot|whatsapp|telegrambot|slackbot|googlebot|bingbot|applebot|embedly|tumblr|vkshare|w3c_validator|ia_archiver|prerender/i;

function isBot(req) {
  return BOT_UA.test(req.headers["user-agent"] || "");
}

async function supabaseFetch(table, id) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=title,description,image_url`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data[0] ?? null;
}

function escape(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function injectOg(html, { title, description, image, url }) {
  const t = escape(title ? `${title} – AxelSub` : "AxelSub - Anime");
  const d = escape(description || "Magyar feliratú animék egy helyen – AxelSub");
  const img = escape(image || "https://axelsub.lovable.app/favicon.png");
  const u = escape(url || "");

  return html
    .replace(/(<title>)[^<]*/i, `$1${t}`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/i, `$1${t}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/i, `$1${d}$2`)
    .replace(/(<meta\s+property="og:image"\s+content=")[^"]*(")/i, `$1${img}$2`)
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/i, `$1${u}$2`)
    .replace(/(<meta\s+property="og:type"\s+content=")[^"]*(")/i, `$1video.other$2`)
    .replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/i, `$1${t}$2`)
    .replace(/(<meta\s+name="twitter:image"\s+content=")[^"]*(")/i, `$1${img}$2`);
}

async function createServer() {
  const app = express();
  const isProd = process.env.NODE_ENV === "production";

  let vite;
  let prodTemplate;

  if (isProd) {
    const distIndex = path.resolve(ROOT, "dist/index.html");
    prodTemplate = fs.readFileSync(distIndex, "utf-8");

    const sirv = (await import("sirv")).default;
    app.use(sirv(path.resolve(ROOT, "dist"), { extensions: [] }));
  } else {
    vite = await createViteServer({
      root: ROOT,
      server: { middlewareMode: true },
      appType: "spa",
    });
  }

  async function getTemplate(req) {
    if (isProd) return prodTemplate;
    const raw = fs.readFileSync(path.resolve(ROOT, "index.html"), "utf-8");
    return vite.transformIndexHtml(req.url, raw);
  }

  async function handleBotRequest(req, res, next, { table, id }) {
    if (!isBot(req)) return next();
    try {
      const record = await supabaseFetch(table, id);
      let html = await getTemplate(req);
      if (record) {
        html = injectOg(html, {
          title: record.title,
          description: record.description,
          image: record.image_url,
          url: `https://${req.headers.host}${req.url}`,
        });
      }
      res.setHeader("Content-Type", "text/html");
      return res.end(html);
    } catch (err) {
      next(err);
    }
  }

  const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const extractId = (slug) => { const m = slug.match(UUID_RE); return m ? m[0] : slug; };

  app.get("/anime/:slug", (req, res, next) =>
    handleBotRequest(req, res, next, { table: "animes", id: extractId(req.params.slug) })
  );

  app.get("/manga/:slug", (req, res, next) =>
    handleBotRequest(req, res, next, { table: "mangas", id: extractId(req.params.slug) })
  );

  if (!isProd) {
    app.use(vite.middlewares);
  } else {
    app.get("*", (req, res) => {
      res.setHeader("Content-Type", "text/html");
      res.end(prodTemplate);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AxelSub SSR server running on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error("Server startup error:", err);
  process.exit(1);
});
