import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 38, color: "white", background: "linear-gradient(145deg,#14182a,#080a11)", fontSize: 92, fontWeight: 800 }}>
      <span style={{ color: "#a78bfa" }}>V</span><span style={{ color: "#48d9ec", fontSize: 48, marginLeft: -10 }}>▶</span>
    </div>, size,
  );
}
