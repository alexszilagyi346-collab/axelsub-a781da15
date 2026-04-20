import { sendEmail, setCors } from "./_helpers.js";

export default async function handler(req, res) {
  setCors(res, req);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const { to, subject, htmlContent } = req.body;
    if (!to || !subject || !htmlContent)
      return res.status(400).json({ ok: false, error: "Hiányzó adatok" });
    await sendEmail({ to, subject, html: htmlContent });
    res.json({ ok: true });
  } catch (err) {
    console.error("send-custom-email error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
}
