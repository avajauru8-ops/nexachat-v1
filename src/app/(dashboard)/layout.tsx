import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarWrapper } from "@/components/layout/SidebarWrapper";
import { Topbar } from "@/components/layout/Topbar";
import { GlobalAlertModal } from "@/components/common/GlobalAlertModal";
import { MenuGuard } from "@/components/layout/MenuGuard";
import { Suspense } from "react";
import { SidebarProvider } from "@/contexts/SidebarContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-dashboard-mesh font-sans">
        <Suspense fallback={null}>
          <GlobalAlertModal />
        </Suspense>
        <SidebarWrapper>
          <Sidebar />
        </SidebarWrapper>
        <div className="flex-1 md:ml-64 flex flex-col h-screen overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
            <MenuGuard>{children}</MenuGuard>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
