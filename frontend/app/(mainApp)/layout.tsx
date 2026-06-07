"use client";
import Header from "@/components/Header";
import { useAuth } from "../auth-provider";
import Button from "@/components/Button";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, toggleAdmin } = useAuth()

  return (
    <div className="min-h-screen flex flex-col">
        <Header />
        <Button className="absolute top-0" onClick={toggleAdmin}>
          Toggle Admin View
        </Button>
        <main className="w-full flex items-center justify-baseline pt-[27vh]">
            {children}
        </main>

    </div>
  );
}