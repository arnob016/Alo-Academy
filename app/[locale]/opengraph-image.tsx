import { ImageResponse } from "next/og";
import { site } from "@/config/site";
import { routing } from "@/i18n/routing";

// English-only text: the OG renderer has no Bengali font bundled.
export const alt = "Alo Academy — SSC, HSC & Admission Coaching in Mirpur, Dhaka";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default function OpengraphImage() {
  const { brand, accent, surface } = site.colors;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: brand,
          color: surface,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          <div
            style={{
              width: "110px",
              height: "110px",
              borderRadius: "55px",
              background: surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: "48px", height: "48px", borderRadius: "24px", background: accent }} />
          </div>
          <div style={{ fontSize: "80px", fontWeight: 700 }}>{site.name.en}</div>
        </div>
        <div style={{ marginTop: "40px", fontSize: "44px", color: accent }}>
          SSC · HSC · University & Medical Admission
        </div>
        <div style={{ marginTop: "16px", fontSize: "34px", opacity: 0.85 }}>
          Small batches · Clear fees · Enroll online with bKash
        </div>
        <div style={{ marginTop: "auto", fontSize: "28px", opacity: 0.7 }}>Mirpur, Dhaka</div>
      </div>
    ),
    size,
  );
}
