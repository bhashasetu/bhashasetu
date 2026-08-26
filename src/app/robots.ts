import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/page-metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The Back Office and the API are not content; keeping them out of the
      // index also keeps the login screen off search results.
      disallow: ["/admin", "/api"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
