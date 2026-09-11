"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconArchive, IconHome, IconSettings } from "@/components/Icons";

const TABS = [
  { href: "/", label: "Home", icon: IconHome },
  { href: "/archive", label: "Archive", icon: IconArchive },
  { href: "/settings", label: "Settings", icon: IconSettings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = pathname.startsWith("/d/");

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[430px] flex-col bg-paper print:max-w-none">
      <div className={`flex flex-1 flex-col ${hideNav ? "" : "pb-[76px]"} print:pb-0`}>{children}</div>
      {!hideNav ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-card/95 backdrop-blur-md print:hidden">
          <div className="mx-auto flex max-w-[430px] items-stretch justify-around px-6 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-2">
            {TABS.map((tab) => {
              const active =
                tab.href === "/"
                  ? pathname === "/"
                  : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex min-w-[72px] flex-col items-center gap-1 px-2 py-1 text-[11px] font-medium ${
                    active ? "text-accent" : "text-muted"
                  }`}
                >
                  <Icon size={22} />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
