import { createFileRoute } from "@tanstack/react-router";
import { FoodsScreen } from "@/components/foods/foods-screen";

export const Route = createFileRoute("/foods")({
  head: () => ({
    meta: [
      { title: "Foods · Mizano" },
      { name: "description", content: "Browse Egyptian and everyday foods, save favourites, and build your own recipes and meals." },
      { property: "og:title", content: "Foods · Mizano" },
      { property: "og:description", content: "Browse Egyptian and everyday foods, save favourites, and build your own recipes and meals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FoodsScreen,
});
