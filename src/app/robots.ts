import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/settings", "/notifications", "/login", "/register", "/wp-admin", "/sysadmin", "/administrator"],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
