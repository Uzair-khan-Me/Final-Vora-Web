export const siteConfig = {
  name: "Final Vora Web",
  shortName: "Final Vora",
  description:
    "Analyze and download authorized public media in available video or audio formats with a secure server-side workflow.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://final-vora-web.onrender.com",
  repository: "https://github.com/Uzair-khan-Me/Final-Vora-Web",
  android:
    "https://github.com/Uzair-khan-Me/Final-Vora/releases/download/Android/Final.Vora.apk",
  developer: "Uzair Ali",
  developerUrl: "https://github.com/Uzair-khan-Me",
  developerTitle: "Developer of Final Vora Web",
  developerBio:
    "Uzair Ali is a developer and SEO specialist who builds practical, privacy-conscious software and search-friendly websites. Final Vora Web reflects that focus — useful tools that respect the user and keep control where it belongs: with them.",
  developerPortfolio: "https://uzairali-18.github.io/Portfolio/",
  developerEmail: "uzairali10005@gmail.com",
  developerPortrait: "https://final-vora.vercel.app/images/uzair-ali.jpg",
} as const;

export const navigation = [
  { href: "/#downloader", label: "Downloader" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#developer", label: "Developer" },
  { href: "/help", label: "Help" },
  { href: "/about", label: "About" },
] as const;
