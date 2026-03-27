import Navbar from "@/components/Navbar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
        <div className="px-12">
          <Navbar />
        </div>
      </nav>
      <main className="pt-16">
        {children}
      </main>
    </>
  );
}
