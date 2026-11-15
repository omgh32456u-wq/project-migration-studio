import { createFileRoute } from "@tanstack/react-router";
import { MizoScreen } from "@/components/mizo/mizo-screen";

export const Route = createFileRoute("/mizo")({
  head: () => ({
    meta: [
      { title: "Mizo · Mizano" },
      { name: "description", content: "Mizo, the Mizano nutrition assistant for account holders. Coming soon." },
      { property: "og:title", content: "Mizo · Mizano" },
      { property: "og:description", content: "Mizo, the Mizano nutrition assistant for account holders. Coming soon." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MizoScreen,
});
