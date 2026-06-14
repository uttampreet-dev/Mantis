import { SiteNav } from "@/components/site-nav";

export default function GarageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <div className="flex-1">{children}</div>
    </div>
  );
}
