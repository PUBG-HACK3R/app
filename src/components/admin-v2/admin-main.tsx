"use client";

import { useState } from "react";
import { AdminLayout } from "./admin-layout";
import { AdminDashboard } from "./admin-dashboard";
import { UserManagement } from "./user-management";
import { PlanManagement } from "./plan-management";
import { WithdrawalManagement } from "./withdrawal-management";
import { AdminTools } from "./admin-tools";

export function AdminMain() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <AdminDashboard />;
      case "users":
        return <UserManagement />;
      case "plans":
        return <PlanManagement />;
      case "withdrawals":
        return <WithdrawalManagement />;
      case "tools":
        return <AdminTools />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </AdminLayout>
  );
}
