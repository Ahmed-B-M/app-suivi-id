
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
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { LayoutDashboard, CreditCard, Settings, ShieldCheck, Scale, BarChartBig, ListChecks, MessageSquareWarning, BarChart, MessagesSquare, CheckSquare, PieChart, TrendingUp, HandPlatter, Users, LogOut, User as UserIcon, RefreshCw, Loader2, Bell } from "lucide-react";
import { usePendingComments } from "@/hooks/use-pending-comments";
import { usePendingVerbatims } from "@/hooks/use-pending-verbatims";
import { Badge } from "@/components/ui/badge";
import { useAuth, useUser } from "@/firebase";
import { Skeleton } from "../ui/skeleton";
import type { Role } from "@/lib/roles";
import { hasAccess } from "@/lib/roles";
import { useMemo, useState, useTransition } from "react";
import { runDailySyncAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { clearCollectionCache } from "@/firebase/firestore/use-collection";


const allLinks = [
  // --- Vues d'Ensemble ---
  {
    href: "/dashboard",
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
  {
    href: "/notifications",
    label: "Notifications",
    icon: <Bell />,
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
  const { toast } = useToast();
  const { user, isUserLoading, userProfile } = useUser();
  const { count: pendingCommentsCount, isLoading: isCommentsLoading } = usePendingComments();
  const { count: pendingVerbatimsCount, isLoading: isVerbatimsLoading } = usePendingVerbatims();
  const [isSyncing, startSyncTransition] = useTransition();

  const userRole: Role = useMemo(() => (userProfile?.role as Role) || 'viewer', [userProfile]);

  const visibleLinks = useMemo(() => {
    return allLinks.filter(link => hasAccess(userRole, link.href));
  }, [userRole]);

  const handleSync = () => {
    startSyncTransition(async () => {
      toast({
        title: "Synchronisation 48h lancée",
        description: "La récupération et la sauvegarde des données ont commencé...",
      });
      const result = await runDailySyncAction();
      if (result.success) {
        // Clear local cache to force data refetch
        clearCollectionCache();
        toast({
          title: "Synchronisation terminée !",
          description: "Les données des dernières 48h ont été mises à jour.",
        });
      } else {
        toast({
          title: "Erreur de synchronisation",
          description: result.error || "Une erreur inconnue est survenue.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left" className="h-screen sticky top-0 z-40">
       <SidebarHeader>
          <Link href="/" className="flex items-center gap-2 px-2">
            <span className="font-bold text-lg text-primary">ID 360</span>
          </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {visibleLinks.map((link) => (
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
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="mt-auto">
        <SidebarSeparator />
          <SidebarMenuItem>
             <SidebarMenuButton onClick={handleSync} disabled={isSyncing} tooltip="Synchroniser les données des dernières 48h">
                {isSyncing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                <span>{isSyncing ? 'Synchro...' : 'Synchro 48h'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
         <SidebarMenuItem>
            {isUserLoading ? (
                 <SidebarMenuButton disabled tooltip="Chargement...">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                </SidebarMenuButton>
            ) : user ? (
                 <SidebarMenuButton disabled tooltip={userProfile?.displayName || user.email || "Utilisateur"}>
                    <UserIcon />
                    <span>{userProfile?.displayName || user.email}</span>
                </SidebarMenuButton>
            ) : null}
        </SidebarMenuItem>
         <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => auth.signOut()}
              tooltip="Déconnexion"
              className="relative"
            >
              <LogOut />
              <span>Déconnexion</span>
            </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarFooter>
    </Sidebar>
  );
}
