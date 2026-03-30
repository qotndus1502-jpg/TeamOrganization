export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="fixed inset-0 top-16 border-t border-gray-900" style={{ background: "linear-gradient(160deg, #fdfcf9 0%, #faf8f3 30%, #f7f4ee 60%, #fbf9f5 100%)" }}>{children}</div>;
}
