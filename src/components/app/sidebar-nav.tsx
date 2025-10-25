
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { LayoutDashboard, CreditCard, Settings, ShieldCheck, Scale, BarChartBig, ListChecks, MessageSquareWarning, BarChart, MessagesSquare, CheckSquare, PieChart, TrendingUp, HandPlatter, Users, LogOut } from "lucide-react";
import { usePendingComments } from "@/hooks/use-pending-comments";
import { usePendingVerbatims } from "@/hooks/use-pending-verbatims";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Logo from '@/app/id-360.png';
import { useAuth } from "@/firebase";

const links = [
  // --- Vues d'Ensemble ---
  {
    href: "/",
    label: "Tableau de Bord",
    icon: <LayoutDashboard />,
  },
  {
    href: "/summary",
    label: "Synthèse",
    icon: <BarChartBig />,
  },
  {
    href: "/forecast",
    label: "FORECAST",
    icon: <TrendingUp />,
  },
  // --- Analyse & Opérations ---
  {
    href: "/deviation-analysis",
    label: "Analyse des Écarts",
    icon: <Scale />,
  },
  {
    href: "/details",
    label: "Détails",
    icon: <ListChecks />,
  },
  {
    href: "/assignment",
    label: "Gestion des Tournées",
    icon: <HandPlatter />,
  },
  {
    href: "/billing",
    label: "Facturation",
    icon: <CreditCard />,
  },
  // --- Qualité & Retours Clients ---
  {
    href: "/quality",
    label: "Qualité",
    icon: <ShieldCheck />,
  },
   {
    href: "/driver-feedback",
    label: "Suivi Livreurs",
    icon: <Users />,
    isDriverFeedbackLink: true, // Specific flag for this link
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
  // --- Configuration ---
  {
    href: "/settings",
    label: "Paramètres & Export",
    icon: <Settings />,
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  const auth = useAuth();
  const { count: pendingCommentsCount, isLoading: isCommentsLoading } = usePendingComments();
  const { count: pendingVerbatimsCount, isLoading: isVerbatimsLoading } = usePendingVerbatims();

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left" className="h-screen sticky top-0 z-40">
       <SidebarHeader>
          <Link href="/" className="flex items-center gap-2 px-2">
            <span className="font-bold text-lg text-primary">ID 360</span>
          </Link>
      </SidebarHeader>
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
                  {link.isDriverFeedbackLink && !isVerbatimsLoading && pendingVerbatimsCount > 0 && (
                     <Badge className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center p-1 text-xs" variant="destructive">
                       {pendingVerbatimsCount}
                     </Badge>
                  )}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
            <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => auth.signOut()}
                  tooltip="Déconnexion"
                  className="relative mt-4"
                >
                  <LogOut />
                  <span>Déconnexion</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
