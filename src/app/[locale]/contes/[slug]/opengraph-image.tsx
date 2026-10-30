import { ImageResponse } from "next/og";
import { routing } from "@/i18n/routing";
import { recits, regionById } from "@/lib/data";

export const alt = "Veillée — contes et légendes du Burkina Faso";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => recits.map((r) => ({ locale, slug: r.slug })));
}

const TYPE_LABEL = {
  conte: "Conte",
  fable: "Fable",
  legende: "Légende",
  mythe_fondateur: "Mythe fondateur",
  recit_historique: "Récit historique",
} as const;

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = recits.find((x) => x.slug === slug);
  const region = r?.regionIds.map((id) => regionById.get(id)?.nom).find(Boolean);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#faf3e6",
          color: "#2a1d14",
          borderBottom: "24px solid #b5562b",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 32, fontWeight: 700 }}>
          <div style={{ width: 28, height: 28, borderRadius: 999, background: "#e8a33d" }} />
          Veillée
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 30, color: "#9c4524" }}>
            {`${r ? TYPE_LABEL[r.type] : "Récit"}${region ? ` · ${region}` : ""}`}
          </div>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.1 }}>{r?.titre ?? "Veillée"}</div>
        </div>
        <div style={{ fontSize: 28, color: "#6b5a4a" }}>Contes et légendes du Burkina Faso</div>
      </div>
    ),
    size,
  );
}
