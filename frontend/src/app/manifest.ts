import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MaintainIQ Technician",
    short_name: "MaintainIQ",
    description: "QR-powered maintenance tracking with AI triage for field technicians",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f9fafb",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
