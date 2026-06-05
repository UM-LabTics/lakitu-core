import Header from "@/components/Header";


export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen h-full flex flex-col">
        <Header />
        <main className="w-full flex items-center justify-baseline pt-[30vh]">
            {children}
        </main>

    </div>
  );
}