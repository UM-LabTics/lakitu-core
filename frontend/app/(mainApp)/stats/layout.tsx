import type { ReactNode } from "react";
import AdminButtonGrid from "./StatsButtonGrid";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="w-17/20 xl:w-3/4 h-full flex flex-col items-center min-h-120">
      <div className="flex-1">{children}</div>
      <AdminButtonGrid />
    </div>
  );
}