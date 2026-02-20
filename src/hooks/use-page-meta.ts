import { useEffect } from "react";

interface PageMeta {
  title: string;
  description: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
}

/**
 * Dynamically updates document <head> meta tags for the current page.
 * Restores original tags on unmount.
 */
export function usePageMeta({ title, description, ogImage, ogType = "website", twitterCard = "summary_large_image" }: PageMeta) {
  useEffect(() => {
    const prevTitle = document.title;

    const setMeta = (attr: "name" | "property", key: string, value: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      const created = !el;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      const prev = el.getAttribute("content") ?? "";
      el.setAttribute("content", value);
      return { el, created, prev };
    };

    const entries = [
      setMeta("name", "description", description),
      setMeta("property", "og:title", title),
      setMeta("property", "og:description", description),
      setMeta("property", "og:type", ogType),
      ...(ogImage ? [setMeta("property", "og:image", ogImage)] : []),
      setMeta("name", "twitter:card", twitterCard),
      setMeta("name", "twitter:title", title),
      setMeta("name", "twitter:description", description),
      ...(ogImage ? [setMeta("name", "twitter:image", ogImage)] : []),
    ];

    document.title = title;

    return () => {
      document.title = prevTitle;
      entries.forEach(({ el, created, prev }) => {
        if (created) {
          el.remove();
        } else {
          el.setAttribute("content", prev);
        }
      });
    };
  }, [title, description, ogImage, ogType, twitterCard]);
}
