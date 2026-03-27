export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="fixed inset-0 top-16 bg-gray-50 border-t border-gray-900">{children}</div>;
}
