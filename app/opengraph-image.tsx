import { ImageResponse } from "next/og";

export const alt = "Final Vora Web — public media downloader";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, color: "#f7f8ff", background: "radial-gradient(circle at 75% 0%, #32265e 0%, #0b0e18 44%, #07090f 100%)", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 28, fontWeight: 700 }}>
        <div style={{ width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 14, background: "linear-gradient(140deg,#8b5cf6,#337bd1)", color: "white" }}>V</div>
        Final Vora <span style={{ color: "#a78bfa" }}>Web</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ color: "#70ddea", textTransform: "uppercase", letterSpacing: ".14em", fontSize: 19, fontWeight: 700 }}>Public media, handled carefully</div>
        <div style={{ marginTop: 20, maxWidth: 900, fontSize: 76, lineHeight: 1.02, letterSpacing: "-.045em", fontWeight: 760 }}>Your media. Your format.</div>
        <div style={{ marginTop: 25, maxWidth: 830, color: "#a7afc4", fontSize: 27, lineHeight: 1.45 }}>Inspect real formats and download public media you are authorized to save—with clear server-side processing and honest limits.</div>
      </div>
      <div style={{ display: "flex", gap: 26, color: "#8992aa", fontSize: 19 }}><span>No account required</span><span>•</span><span>Short-lived jobs</span><span>•</span><span>Best-effort sources</span></div>
    </div>, size,
  );
}
