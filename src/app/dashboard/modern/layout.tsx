import { BottomNavigation } from "@/components/bottom-navigation";

export default function ModernLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-900">
      {children}
      <BottomNavigation />
    </div>
  );
}
