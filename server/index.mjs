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

  app.use(express.json());

  const NOTIFY_EMAILS = ["alexszilagyi26@gmail.com", "davidbotos1998@gmail.com"];

  const formatHuf = (n) =>
    new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);

  async function sendEmail({ to, subject, html }) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY nincs beállítva");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AxelSub Shop <onboarding@resend.dev>",
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }
    return res.json();
  }

  app.post("/api/order-notify", async (req, res) => {
    try {
      const { order, items } = req.body;

      const itemsHtml = (items || []).map(
        (i) => `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #2a2a3a">${i.product_name} × ${i.quantity}${i.custom_note ? ` <em>(${i.custom_note})</em>` : ""}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #2a2a3a;text-align:right">${formatHuf(i.product_price * i.quantity)}</td>
        </tr>`
      ).join("");

      const adminHtml = `
        <div style="font-family:Arial,sans-serif;background:#0d0d1a;color:#e2e8f0;padding:32px;border-radius:12px;max-width:600px">
          <h2 style="color:#a78bfa;margin-top:0">🛍️ Új rendelés érkezett – AxelSub Shop</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
            <tr><td style="padding:4px 0;color:#94a3b8;width:140px">Rendelő neve:</td><td><strong>${order.customer_name}</strong></td></tr>
            <tr><td style="padding:4px 0;color:#94a3b8">Email:</td><td><a href="mailto:${order.customer_email}" style="color:#a78bfa">${order.customer_email}</a></td></tr>
            <tr><td style="padding:4px 0;color:#94a3b8">Telefon:</td><td>${order.customer_phone || "–"}</td></tr>
            <tr><td style="padding:4px 0;color:#94a3b8">Szállítás:</td><td>${order.shipping_method === "post" ? `Postai – ${order.shipping_zip} ${order.shipping_city}, ${order.shipping_address}` : "Személyes átvétel"}</td></tr>
            <tr><td style="padding:4px 0;color:#94a3b8">Fizetés:</td><td>${order.payment_method === "transfer" ? "Banki átutalás" : "Készpénz"}</td></tr>
            ${order.note ? `<tr><td style="padding:4px 0;color:#94a3b8">Megjegyzés:</td><td>${order.note}</td></tr>` : ""}
          </table>
          <h3 style="color:#a78bfa">Rendelt termékek</h3>
          <table style="width:100%;border-collapse:collapse;background:#1a1a2e;border-radius:8px;overflow:hidden">
            ${itemsHtml}
            <tr style="background:#2a2a3a">
              <td style="padding:8px 12px;font-weight:bold">Összesen</td>
              <td style="padding:8px 12px;text-align:right;font-weight:bold;color:#a78bfa">${formatHuf(order.total_price)}</td>
            </tr>
          </table>
        </div>`;

      const shippingLine = order.shipping_method === "post"
        ? `${order.shipping_zip} ${order.shipping_city}, ${order.shipping_address}`
        : "Személyes átvétel";
      const paymentLine = order.payment_method === "transfer" ? "Banki átutalás" : "Készpénz";

      const customerHtml = `
        <div style="font-family:Arial,sans-serif;background:#0d0d1a;color:#e2e8f0;padding:32px;border-radius:12px;max-width:600px;margin:0 auto">
          <h2 style="color:#a78bfa;margin-top:0">Köszönjük a rendelésed! 🎉</h2>
          <p style="margin-bottom:24px">Szia <strong>${order.customer_name}</strong>!<br>Megkaptuk a rendelésedet, és hamarosan felvesszük veled a kapcsolatot.</p>
          <h3 style="color:#a78bfa;margin-bottom:8px">Rendelés részletei</h3>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr><td style="padding:4px 0;color:#94a3b8;width:140px">Szállítás:</td><td>${shippingLine}</td></tr>
            <tr><td style="padding:4px 0;color:#94a3b8">Fizetési mód:</td><td>${paymentLine}</td></tr>
            ${order.note ? `<tr><td style="padding:4px 0;color:#94a3b8">Megjegyzés:</td><td>${order.note}</td></tr>` : ""}
          </table>
          <h3 style="color:#a78bfa;margin-bottom:8px">Rendelt termékek</h3>
          <table style="width:100%;border-collapse:collapse;background:#1a1a2e;border-radius:8px;overflow:hidden;margin-bottom:20px">
            ${itemsHtml}
            <tr style="background:#2a2a3a">
              <td style="padding:8px 12px;font-weight:bold">Összesen</td>
              <td style="padding:8px 12px;text-align:right;font-weight:bold;color:#a78bfa">${formatHuf(order.total_price)}</td>
            </tr>
          </table>
          <p style="color:#94a3b8;font-size:13px;margin-top:24px;border-top:1px solid #2a2a3a;padding-top:16px">
            Ha kérdésed van, keress minket Discord-on vagy a közösségi oldalainkon.<br>
            <strong style="color:#a78bfa">AxelSub</strong> – Magyar anime közösség
          </p>
        </div>`;

      await Promise.all([
        sendEmail({ to: NOTIFY_EMAILS, subject: `🛍️ Új rendelés: ${order.customer_name} – ${formatHuf(order.total_price)}`, html: adminHtml }),
        sendEmail({ to: order.customer_email, subject: `✅ Rendelés visszaigazolás – AxelSub Shop`, html: customerHtml }),
      ]);

      res.json({ ok: true });
    } catch (err) {
      console.error("Email error:", err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

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
