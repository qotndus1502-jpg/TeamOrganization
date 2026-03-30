export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="fixed inset-0 top-16" style={{ background: "linear-gradient(160deg, #fafbfe 0%, #f5f7fa 30%, #f0f2f5 60%, #f8f9fc 100%)" }}>{children}</div>;
}
