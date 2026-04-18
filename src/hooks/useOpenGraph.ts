import { useEffect } from "react";

interface OpenGraphOptions {
  title?: string | null;
  description?: string | null;
  image?: string | null;
  url?: string;
  type?: string;
}

const DEFAULT_TITLE = "AxelSub - Anime";
const DEFAULT_DESCRIPTION = "Magyar feliratú animék egy helyen – AxelSub";
const DEFAULT_IMAGE = "https://axelsub.lovable.app/favicon.png";

function setMeta(property: string, content: string, isName = false) {
  const attr = isName ? "name" : "property";
  let el = document.querySelector(`meta[${attr}="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function useOpenGraph({ title, description, image, url, type = "website" }: OpenGraphOptions) {
  useEffect(() => {
    const resolvedTitle = title ? `${title} – AxelSub` : DEFAULT_TITLE;
    const resolvedDescription = description || DEFAULT_DESCRIPTION;
    const resolvedImage = image || DEFAULT_IMAGE;
    const resolvedUrl = url || window.location.href;

    document.title = resolvedTitle;

    setMeta("og:title", resolvedTitle);
    setMeta("og:description", resolvedDescription);
    setMeta("og:image", resolvedImage);
    setMeta("og:url", resolvedUrl);
    setMeta("og:type", type);
    setMeta("og:site_name", "AxelSub");

    setMeta("twitter:card", "summary_large_image", true);
    setMeta("twitter:title", resolvedTitle, true);
    setMeta("twitter:description", resolvedDescription, true);
    setMeta("twitter:image", resolvedImage, true);

    return () => {
      document.title = DEFAULT_TITLE;
      setMeta("og:title", DEFAULT_TITLE);
      setMeta("og:description", DEFAULT_DESCRIPTION);
      setMeta("og:image", DEFAULT_IMAGE);
      setMeta("og:url", window.location.origin);
      setMeta("twitter:title", DEFAULT_TITLE, true);
      setMeta("twitter:description", DEFAULT_DESCRIPTION, true);
      setMeta("twitter:image", DEFAULT_IMAGE, true);
    };
  }, [title, description, image, url, type]);
}
