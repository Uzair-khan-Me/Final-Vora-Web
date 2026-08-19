import { PlatformPage, type PlatformContent } from "@/components/PlatformPage";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: 'Facebook Video Downloader for Public Posts and Reels',
  description: 'Analyze a public Facebook video or Reel link and understand audience, group, login, region, live-video, and format limitations.',
  path: "/facebook-video-downloader",
});

const content: PlatformContent = {
  name: "Facebook",
  slug: "facebook-video-downloader",
  kicker: "Public videos and Reels",
  title: "Analyze an individual public Facebook video",
  intro: "Copy the link from a public video post or Reel. Final Vora Web checks only the public server-visible media and does not use your Facebook account session.",
  supported: "Individual public video-post, watch, and Reel URLs are the intended links. The post's audience must be Public; links inside private groups or limited audiences remain inaccessible.",
  copySteps: ["Open the individual video or Reel and verify the audience icon says Public.", "Use Share or the post menu, then choose Copy link.", "Paste the complete facebook.com or fb.watch link above and choose from the formats actually returned."],
  limitations: ["Friends-only, private-group, and age-limited posts require account access.", "fb.watch short links depend on a successful public redirect.", "Ended live broadcasts may need time before a stable replay file appears.", "Facebook can vary formats by browser, region, and authentication state.", "Deleted posts or posts with changed audiences become unavailable.", "Higher quality may require temporary video/audio merging."],
  responsibility: "Respect the post's audience and the creator's rights. A Public audience does not waive copyright. Save only media you own, public-domain work, or content you are authorized to download.",
  faqs: [
    { question: "Why does a video visible in my feed fail here?", answer: "Your feed is authenticated and personalized. The server has no access to your account, friends, or groups, so a post must be publicly visible without signing in." },
    { question: "Do fb.watch links work?", answer: "They can work when the short link still redirects to a public individual video. Copying the full video-post link can be more reliable if the short redirect fails." },
    { question: "Can I download a live broadcast?", answer: "Not while it is live. After the broadcast ends, an individual public replay may work once Facebook exposes a stable format." },
  ],
};

export default function FacebookPage() { return <PlatformPage content={content} />; }
