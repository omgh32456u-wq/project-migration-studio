import { createFileRoute } from "@tanstack/react-router";
import { SettingsScreen } from "@/components/settings/settings-screen";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Mizano" },
      { name: "description", content: "Set your profile, daily targets, reminders, language and theme, and back up your data." },
      { property: "og:title", content: "Settings · Mizano" },
      { property: "og:description", content: "Set your profile, daily targets, reminders, language and theme, and back up your data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsScreen,
});
