
import { useState } from "react";
import { MainLayout } from "@/components/MainLayout";
import { useAlerts } from "@/hooks/useAlerts";
import { AlertsHeader } from "@/components/alerts/AlertsHeader";
import { AlertsFilter } from "@/components/alerts/AlertsFilter";
import { AlertsTable } from "@/components/alerts/AlertsTable";
import { SmsAlertSettings } from "@/components/alerts/SmsAlertSettings";
import { Button } from "@/components/ui/button";

export default function AlertsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [activeSection, setActiveSection] = useState("alerts"); // "alerts" or "settings"
  const { alerts, isLoading, markAsRead } = useAlerts();
  
  const filteredAlerts = alerts.filter(alert => {
    if (activeTab === "all") return true;
    return alert.type.includes(activeTab);
  });

  const newAlertsCount = alerts.filter(alert => alert.status === "new").length;

  const handleMarkAllRead = async () => {
    for (const alert of alerts.filter(a => a.status === 'new')) {
      await markAsRead(alert.id);
    }
  };

  return (
    <MainLayout title="Alerts">
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold tracking-tight">Alerts Management</h2>
          <div className="flex space-x-2">
            <Button
              variant={activeSection === "alerts" ? "default" : "outline"}
              onClick={() => setActiveSection("alerts")}
            >
              View Alerts
            </Button>
            <Button 
              variant={activeSection === "settings" ? "default" : "outline"}
              onClick={() => setActiveSection("settings")}
            >
              SMS Settings
            </Button>
          </div>
        </div>
        
        {activeSection === "alerts" ? (
          <>
            <AlertsHeader 
              newAlertsCount={newAlertsCount} 
              onMarkAllRead={handleMarkAllRead} 
            />
            
            <AlertsFilter 
              activeTab={activeTab} 
              onTabChange={setActiveTab} 
            />
            
            <AlertsTable 
              alerts={filteredAlerts}
              isLoading={isLoading}
              onMarkAsRead={markAsRead}
            />
          </>
        ) : (
          <SmsAlertSettings />
        )}
      </div>
    </MainLayout>
  );
}
