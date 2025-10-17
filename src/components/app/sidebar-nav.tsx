
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { LayoutDashboard, CreditCard, Settings } from "lucide-react";

const links = [
  {
    href: "/",
    label: "Tableau de Bord",
    icon: <LayoutDashboard />,
  },
  {
    href: "/billing",
    label: "Facturation",
    icon: <CreditCard />,
  },
  {
    href: "/settings",
    label: "Paramètres",
    icon: <Settings />,
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="none">
      <SidebarContent>
        <SidebarMenu>
          {links.map((link) => (
            <SidebarMenuItem key={link.href}>
              <Link href={link.href}>
                <SidebarMenuButton
                  isActive={pathname === link.href}
                  tooltip={link.label}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
