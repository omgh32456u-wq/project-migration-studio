import { createFileRoute } from "@tanstack/react-router";
import { TodayScreen } from "@/components/today/today-screen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mizano — Today" },
      { name: "description", content: "Log today's meals and see calories, protein, carbs and fat at a glance. Private and offline-friendly." },
      { property: "og:title", content: "Mizano — Today" },
      { property: "og:description", content: "Log today's meals and see calories, protein, carbs and fat at a glance. Private and offline-friendly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TodayScreen,
});
