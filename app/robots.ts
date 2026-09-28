import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/guide", "/guide/insurance", "/guide/*", "/map"],
      disallow: [
        "/notifications",
        "/messages",
        "/messages/*",
        "/posts/new",
        "/posts/*/edit",
        "/profile",
        "/profile/*",
        "/auth"
      ],
    },
    sitemap: SITE_URL + "/sitemap.xml",
  };
}
