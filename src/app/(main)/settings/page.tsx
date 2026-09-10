import { Suspense } from "react";
import { SettingsScreen } from "@/components/SettingsScreen";

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="px-5 py-10 text-center text-muted">Loading…</div>}>
      <SettingsScreen />
    </Suspense>
  );
}
