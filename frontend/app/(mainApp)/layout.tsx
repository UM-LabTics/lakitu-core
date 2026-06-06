import Header from "@/components/Header";


export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
        <Header />
        <main className="w-full flex items-center justify-baseline pt-[27vh]">
            {children}
        </main>

    </div>
  );
}