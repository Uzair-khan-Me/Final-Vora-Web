export const siteConfig = {
  name: "Final Vora Web",
  shortName: "Final Vora",
  description:
    "Analyze and download authorized public media in available video or audio formats with a secure server-side workflow.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://final-vora-web.onrender.com",
  repository: "https://github.com/Uzair-khan-Me/Final-Vora-Web",
  android:
    "https://github.com/Uzair-khan-Me/Final-Vora/releases/download/Android/Final.Vora.apk",
  developer: "Uzair Khan",
  developerUrl: "https://github.com/Uzair-khan-Me",
} as const;

export const navigation = [
  { href: "/#downloader", label: "Downloader" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/help", label: "Help" },
  { href: "/about", label: "About" },
] as const;
