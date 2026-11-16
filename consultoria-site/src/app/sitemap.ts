import type { MetadataRoute } from "next";
import { brand } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: brand.url, lastModified: new Date(), changeFrequency: "monthly", priority: 1 }];
}
