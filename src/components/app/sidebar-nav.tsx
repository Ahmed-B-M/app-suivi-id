
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
import { LayoutDashboard, CreditCard, Settings, ShieldCheck, Scale, BarChartBig, ListChecks, MessageSquareWarning, BarChart, MessagesSquare, CheckSquare, PieChart, TrendingUp, HandPlatter } from "lucide-react";
import { usePendingComments } from "@/hooks/use-pending-comments";
import { usePendingVerbatims } from "@/hooks/use-pending-verbatims";
import { Badge } from "@/components/ui/badge";

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
    href: "/forecast",
    label: "FORECAST",
    icon: <TrendingUp />,
  },
  {
    href: "/assignment",
    label: "Gestion des Tournées",
    icon: <HandPlatter />,
  },
  {
    href: "/quality",
    label: "Qualité",
    icon: <ShieldCheck />,
  },
  {
    href: "/deviation-analysis",
    label: "Analyse des Écarts",
    icon: <Scale />,
  },
   {
    href: "/summary",
    label: "Synthèse",
    icon: <BarChartBig />,
  },
  {
    href: "/details",
    label: "Détails",
    icon: <ListChecks />,
  },
  {
    href: "/comment-management",
    label: "Gestion des Commentaires",
    icon: <MessageSquareWarning />,
    isCommentLink: true,
  },
  {
    href: "/nps-analysis",
    label: "Intégration NPS",
    icon: <BarChart />,
  },
   {
    href: "/verbatim-treatment",
    label: "Traitement Verbatims",
    icon: <CheckSquare />,
    isVerbatimLink: true,
  },
  {
    href: "/verbatims",
    label: "Verbatims NPS",
    icon: <MessagesSquare />,
  },
  {
    href: "/verbatim-analysis",
    label: "Analyse Verbatims",
    icon: <PieChart />,
  },
  {
    href: "/settings",
    label: "Paramètres",
    icon: <Settings />,
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { count: pendingCommentsCount, isLoading: isCommentsLoading } = usePendingComments();
  const { count: pendingVerbatimsCount, isLoading: isVerbatimsLoading } = usePendingVerbatims();

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left">
      <SidebarContent>
        <SidebarMenu>
          {links.map((link) => (
            <SidebarMenuItem key={link.href}>
              <Link href={link.href} className="relative">
                <SidebarMenuButton
                  isActive={pathname === link.href}
                  tooltip={link.label}
                  className="relative"
                >
                  {link.icon}
                  <span>{link.label}</span>
                   {link.isCommentLink && !isCommentsLoading && pendingCommentsCount > 0 && (
                     <Badge variant="secondary" className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center p-1 text-xs">
                       {pendingCommentsCount}
                     </Badge>
                  )}
                  {link.isVerbatimLink && !isVerbatimsLoading && pendingVerbatimsCount > 0 && (
                     <Badge className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center p-1 text-xs" variant="destructive">
                       {pendingVerbatimsCount}
                     </Badge>
                  )}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
