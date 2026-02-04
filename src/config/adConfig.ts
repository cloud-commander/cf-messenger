import { getAssetUrl } from "./assets";
import type { AdBanner } from "../types";

export const AD_CONFIG: AdBanner[] = [
  {
    id: "banner_github",
    imageUrl: getAssetUrl("/banners/github_banner.jpeg"),
    linkUrl: "https://github.com/cloud-commander/",
    altText: "Visit my GitHub",
  },
  {
    id: "banner_linkedin",
    imageUrl: getAssetUrl("/banners/linkedin_banner.jpeg"),
    linkUrl: "https://www.linkedin.com/in/georgediavatis",
    altText: "Connect on LinkedIn",
  },
];
