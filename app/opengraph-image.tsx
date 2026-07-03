import { ImageResponse } from "next/og";

// Generated locally (Satori), no external service. Auto-wired as og:image and
// twitter:image by Next.
export const alt =
  "BikeFit, a free starting bike fit from your measurements";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#0B0F14",
          color: "#E8EDF4",
        }}
      >
        <div style={{ display: "flex", fontSize: 84, fontWeight: 700 }}>
          <span>Bike</span>
          <span style={{ color: "#3DDC97" }}>Fit</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 40,
            lineHeight: 1.3,
            color: "#8A97A8",
            maxWidth: 900,
          }}
        >
          A professional starting bike fit, from your own measurements. Free,
          local-first, in about ten minutes.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 48,
            fontSize: 28,
            color: "#3DDC97",
          }}
        >
          bikefit
        </div>
      </div>
    ),
    { ...size },
  );
}
