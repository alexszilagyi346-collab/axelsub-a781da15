import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET",
};

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const animeId = url.searchParams.get("id");

  if (!animeId) {
    return new Response("Missing id", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: anime } = await supabase
    .from("animes")
    .select("title, description, image_url, genre, year")
    .eq("id", animeId)
    .single();

  if (!anime) {
    return new Response("Not found", { status: 404 });
  }

  const siteUrl = Deno.env.get("SITE_URL") || "https://axelsub.lovable.app";
  const title = anime.title || "AxelSub";
  const description = anime.description?.substring(0, 160) || `${title} - Nézd meg az AxelSub-on!`;
  const image = anime.image_url || `${siteUrl}/favicon.png`;
  const pageUrl = `${siteUrl}/anime/${animeId}`;

  const html = `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8" />
  <meta property="og:type" content="video.other" />
  <meta property="og:title" content="${escapeHtml(title)} - AxelSub" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:site_name" content="AxelSub" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)} - AxelSub" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(pageUrl)}" />
  <title>${escapeHtml(title)} - AxelSub</title>
</head>
<body>
  <p>Átirányítás... <a href="${escapeHtml(pageUrl)}">${escapeHtml(title)}</a></p>
</body>
</html>`;

  return new Response(html, {
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
