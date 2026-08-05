
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Link } from "react-router-dom";
import { LayoutDashboard, CreditCard, PackageOpen, BellRing, MessageSquare, LogOut, ListCheck, Cog, GraduationCap, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function AppSidebar() {
  const {
    logout
  } = useAuth();

  // Define sidebar menu items with their routes and icons
  const menuItems = [{
    title: "Dashboard",
    icon: LayoutDashboard,
    url: "/dashboard"
  }, {
    title: "Inventory",
    icon: PackageOpen,
    url: "/vouchers"
  }, {
    title: "Voucher Types",
    icon: ListCheck,
    url: "/list"
  }, {
    title: "Transactions",
    icon: CreditCard,
    url: "/transactions"
  }, {
    title: "University Data",
    icon: GraduationCap,
    url: "/university-data"
  }, {
    title: "Alerts",
    icon: BellRing,
    url: "/alerts"
  }, {
    title: "Bulk Messages",
    icon: MessageSquare,
    url: "/bulk-messages"
  }, {
    title: "Affiliates Control Panel",
    icon: Users,
    url: "/affiliates-control-panel"
  }, {
    title: "Settings",
    icon: Cog,
    url: "/settings"
  }];
  
  return <Sidebar>
      {/* App header with logo instead of text */}
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-center p-2 rounded">
          <img 
            src="/lovable-uploads/3e30527e-5d09-498a-ab6d-ca9fff804d16.png" 
            alt="MOVA consult" 
            className="w-auto h-14 object-contain"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Map through menu items to create navigation links */}
              {menuItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link to={item.url} className="flex items-center">
                      <item.icon className="mr-2 h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {/* Sidebar footer with logout button */}
      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button className="flex w-full items-center text-sidebar-foreground/70 hover:text-sidebar-foreground" onClick={logout}>
                <LogOut className="mr-2 h-5 w-5" />
                <span>Logout</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>;
}
