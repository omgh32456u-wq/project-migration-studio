import { createFileRoute } from "@tanstack/react-router";
import { ProgressScreen } from "@/components/progress/progress-screen";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress · Mizano" },
      { name: "description", content: "Track your weight and nutrition trends over time with Mizano." },
      { property: "og:title", content: "Progress · Mizano" },
      { property: "og:description", content: "Track your weight and nutrition trends over time with Mizano." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProgressScreen,
});
