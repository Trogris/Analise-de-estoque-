import type { MetadataRoute } from "next";
import { brand } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${brand.url}/sitemap.xml` };
}
