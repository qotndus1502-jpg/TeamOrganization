import Navbar from "@/components/Navbar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border/50 shadow-xs">
        <div className="px-6 md:px-12">
          <Navbar />
        </div>
      </nav>
      <main className="pt-16">
        {children}
      </main>
    </>
  );
}
