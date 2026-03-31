export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="fixed inset-0 top-16 bg-dashboard-gradient">{children}</div>;
}
