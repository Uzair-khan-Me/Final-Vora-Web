import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Final Vora Web",
    short_name: "Final Vora",
    description: "Analyze and download authorized public media formats.",
    start_url: "/",
    display: "standalone",
    background_color: "#07090f",
    theme_color: "#080a11",
    categories: ["utilities", "multimedia"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
