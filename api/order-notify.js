import { sendEmail, formatHuf, setCors } from "./_helpers.js";

const NOTIFY_EMAILS = ["alexszilagyi26@gmail.com", "davidbotos1998@gmail.com"];

export default async function handler(req, res) {
  setCors(res, req);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const { order, items } = req.body;
    if (!order) return res.status(400).json({ ok: false, error: "Hiányzó adatok" });

    const itemsHtml = (items || []).map(
      (i) => `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #2a2a3a">${i.product_name} × ${i.quantity}${i.custom_note ? ` <em>(${i.custom_note})</em>` : ""}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #2a2a3a;text-align:right">${formatHuf(i.product_price * i.quantity)}</td>
      </tr>`
    ).join("");

    const shippingLine = order.shipping_method === "post"
      ? `${order.shipping_zip} ${order.shipping_city}, ${order.shipping_address}`
      : "Személyes átvétel";
    const paymentLine = order.payment_method === "transfer" ? "Banki átutalás" : "Készpénz";

    const adminHtml = `<div style="font-family:Arial,sans-serif;background:#0d0d1a;color:#e2e8f0;padding:32px;border-radius:12px;max-width:600px">
<h2 style="color:#a78bfa;margin-top:0">🛍️ Új rendelés érkezett – AxelSub Shop</h2>
<table style="width:100%;border-collapse:collapse;margin-bottom:16px">
<tr><td style="padding:4px 0;color:#94a3b8;width:140px">Rendelő neve:</td><td><strong>${order.customer_name}</strong></td></tr>
<tr><td style="padding:4px 0;color:#94a3b8">Email:</td><td>${order.customer_email}</td></tr>
<tr><td style="padding:4px 0;color:#94a3b8">Telefon:</td><td>${order.customer_phone || "–"}</td></tr>
<tr><td style="padding:4px 0;color:#94a3b8">Szállítás:</td><td>${shippingLine}</td></tr>
<tr><td style="padding:4px 0;color:#94a3b8">Fizetés:</td><td>${paymentLine}</td></tr>
${order.note ? `<tr><td style="padding:4px 0;color:#94a3b8">Megjegyzés:</td><td>${order.note}</td></tr>` : ""}
</table>
<table style="width:100%;border-collapse:collapse;background:#1a1a2e;border-radius:8px;overflow:hidden">
${itemsHtml}
<tr style="background:#2a2a3a">
<td style="padding:8px 12px;font-weight:bold">Összesen</td>
<td style="padding:8px 12px;text-align:right;font-weight:bold;color:#a78bfa">${formatHuf(order.total_price)}</td>
</tr>
</table></div>`;

    const orderUrl = `https://axelsub.eu/shop/order/${order.id}`;
    const customerHtml = `<div style="font-family:Arial,sans-serif;background:#0d0d1a;color:#e2e8f0;padding:32px;border-radius:12px;max-width:600px;margin:0 auto">
<h2 style="color:#a78bfa;margin-top:0">Köszönjük a rendelésed! 🎉</h2>
<p>Szia <strong>${order.customer_name}</strong>!<br>Megkaptuk a rendelésedet, és hamarosan felvesszük veled a kapcsolatot.</p>
<div style="text-align:center;margin:20px 0">
<a href="${orderUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:50px">🔍 Rendelés megtekintése az oldalon</a>
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px">
<tr><td style="padding:4px 0;color:#94a3b8;width:140px">Szállítás:</td><td>${shippingLine}</td></tr>
<tr><td style="padding:4px 0;color:#94a3b8">Fizetési mód:</td><td>${paymentLine}</td></tr>
${order.note ? `<tr><td style="padding:4px 0;color:#94a3b8">Megjegyzés:</td><td>${order.note}</td></tr>` : ""}
</table>
<table style="width:100%;border-collapse:collapse;background:#1a1a2e;border-radius:8px;overflow:hidden;margin-bottom:20px">
${itemsHtml}
<tr style="background:#2a2a3a">
<td style="padding:8px 12px;font-weight:bold">Összesen</td>
<td style="padding:8px 12px;text-align:right;font-weight:bold;color:#a78bfa">${formatHuf(order.total_price)}</td>
</tr>
</table>
<p style="color:#94a3b8;font-size:13px;margin-top:24px;border-top:1px solid #2a2a3a;padding-top:16px">
Ha kérdésed van, keress minket a közösségi oldalainkon.<br>
<strong style="color:#a78bfa">AxelSub</strong> – Magyar anime közösség
</p></div>`;

    await Promise.all([
      sendEmail({ to: NOTIFY_EMAILS, subject: `🛍️ Új rendelés: ${order.customer_name} – ${formatHuf(order.total_price)}`, html: adminHtml, senderName: "AxelSub Shop" }),
      sendEmail({ to: order.customer_email, subject: `✅ Rendelés visszaigazolás – AxelSub Shop`, html: customerHtml, senderName: "AxelSub Shop" }),
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.error("order-notify error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
}
