import { PlatformPage, type PlatformContent } from "@/components/PlatformPage";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: 'Instagram Video Downloader for Public Reels and Posts',
  description: 'Analyze a public Instagram Reel or video post and understand private-account, story, carousel, login, and rights limitations.',
  path: "/instagram-video-downloader",
});

const content: PlatformContent = {
  name: "Instagram",
  slug: "instagram-video-downloader",
  kicker: "Reels and video posts",
  title: "Inspect a public Instagram Reel or video post",
  intro: "Paste the canonical link for an individual public Reel or video post. The server will report whether the media engine can currently see a downloadable public stream.",
  supported: "Public /reel/ and individual /p/ links containing video are the main supported cases. A carousel may not map cleanly to one file, and profiles or saved collections are not accepted as bulk jobs.",
  copySteps: ["Open the public Reel or post and use its three-dot or Share menu.", "Choose Copy link. Confirm the copied URL points to instagram.com/reel/ or /p/.", "Paste it above. Do not include account credentials or a private sharing session."],
  limitations: ["Private-account media remains private even if you personally follow the account.", "Stories can expire and often require an authenticated session.", "Carousel posts can contain several assets; this service is intentionally single-media oriented.", "Instagram may block cloud IPs or require login cookies.", "Music licensing can affect what is available by region.", "Thumbnails load from the source and can expire independently of the media job."],
  responsibility: "Instagram creators retain rights in their Reels and posts. Download only your own media or content whose creator permits saving, and do not use this service to collect private account material.",
  faqs: [
    { question: "Can I download from a private Instagram account I follow?", answer: "No. The server does not share your Instagram session and does not bypass private-account controls. Only links publicly viewable by the server are eligible." },
    { question: "Why did a Story link expire?", answer: "Stories are time-limited and usually tied to an authenticated viewing context. Final Vora Web is designed primarily for stable public Reel and post links." },
    { question: "Does a public link grant permission to repost?", answer: "No. Public visibility and reuse permission are different. Obtain the creator's permission and follow applicable copyright and platform rules." },
  ],
};

export default function InstagramPage() { return <PlatformPage content={content} />; }
