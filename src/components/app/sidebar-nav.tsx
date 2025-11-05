
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
import { LayoutDashboard, CreditCard, Settings, ShieldCheck, Scale, BarChartBig, ListChecks, MessageSquareWarning, BarChart, MessagesSquare, CheckSquare, PieChart, TrendingUp, HandPlatter, Users, LogOut, User as UserIcon, RefreshCw, Loader2, Bell, MessageCircle, UserCog, Download, FileSearch, BarChart2 } from "lucide-react";
import { usePendingComments } from "@/hooks/use-pending-comments";
import { usePendingVerbatims } from "@/hooks/use-pending-verbatims";
import { Badge } from "@/components/ui/badge";
import { useAuth, useUser, useQuery } from "@/firebase";
import { Skeleton } from "../ui/skeleton";
import type { Role } from "@/lib/roles";
import { hasAccess } from "@/lib/roles";
import { useMemo, useTransition } from "react";
import { runSyncAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { useFilters } from "@/context/filter-context";
import { format, subDays } from "date-fns";
import { collection, where } from "firebase/firestore";


const allLinks = [
  // --- Vues d'Ensemble ---
  { href: "/dashboard", label: "Tableau de Bord", icon: <LayoutDashboard /> },
  { href: "/summary", label: "Synthèse Quotidienne", icon: <BarChart2 /> },
  { href: "/forecast", label: "FORECAST", icon: <TrendingUp /> },
  { href: "/notifications", label: "Notifications", icon: <Bell />, isNotificationLink: true },
  { href: "/messaging", label: "Messagerie", icon: <MessageCircle /> },
  
  // --- Opérations & Données ---
  { href: "/details", label: "Explorateur Données", icon: <FileSearch /> },
  { href: "/export", label: "Export Données", icon: <Download /> },
  { href: "/assignment", label: "Gestion des Tournées", icon: <HandPlatter /> },
  
  // --- Qualité & Retours Clients ---
  { href: "/quality", label: "Qualité & Performance", icon: <ShieldCheck /> },
  { href: "/deviation-analysis", label: "Analyse des Écarts", icon: <Scale /> },
  { href: "/driver-feedback", label: "Suivi Livreurs", icon: <Users /> },
  { href: "/comment-management", label: "Gestion Commentaires", icon: <MessageSquareWarning />, isCommentLink: true },
  { href: "/nps-analysis", label: "Analyse NPS", icon: <BarChart /> },
  { href: "/verbatim-treatment", label: "Traitement Verbatims", icon: <CheckSquare />, isVerbatimLink: true },
  { href: "/verbatims", label: "Verbatims Bruts", icon: <MessagesSquare /> },
  { href: "/verbatim-analysis", label: "Analyse Catégories", icon: <PieChart /> },

  // --- Configuration ---
  { href: "/billing", label: "Facturation", icon: <CreditCard /> },
  { href: "/user-management", label: "Gestion Utilisateurs", icon: <UserCog /> },
  { href: "/settings", label: "Paramètres", icon: <Settings /> },
];

export function SidebarNav() {
  const pathname = usePathname();
  const auth = useAuth();
  const { toast } = useToast();
  const { user, isUserLoading, userProfile, firestore } = useUser();
  const { allComments, allProcessedVerbatims, clearAllData } = useFilters();
  
  const { pendingComments } = usePendingComments();
  const { pendingVerbatims } = usePendingVerbatims();

  const notificationsCollection = useMemo(() => firestore ? collection(firestore, 'notifications') : null, [firestore]);
  const { data: unreadNotifications } = useQuery<{id: string}>(notificationsCollection, [where('status', '==', 'unread')], { realtime: true });
  const unreadCount = unreadNotifications.length;

  const pendingCommentsCount = useMemo(() => {
    return allComments.filter(c => c.status === 'à traiter').length;
  }, [allComments]);

  const pendingVerbatimsCount = useMemo(() => {
    return allProcessedVerbatims.filter(v => v.status === 'à traiter').length;
  }, [allProcessedVerbatims]);


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
      
      const to = new Date();
      const from = subDays(to, 1);

      const result = await runSyncAction({
        apiKey: process.env.NEXT_PUBLIC_URBANTZ_API_KEY || "P_q6uTM746JQlmFpewz3ZS0cDV0tT8UEXk",
        from: format(from, 'yyyy-MM-dd'),
        to: format(to, 'yyyy-MM-dd'),
        taskStatus: 'all',
        roundStatus: 'all',
      });
      
      if (result.error) {
         toast({
          title: "Erreur de synchronisation",
          description: result.error || "Une erreur inconnue est survenue.",
          variant: "destructive",
        });
      } else {
        clearAllData(); // Clear context cache
        toast({
          title: "Synchronisation terminée !",
          description: "Les données des dernières 48h ont été mises à jour.",
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
                   {link.isNotificationLink && unreadCount > 0 && (
                     <Badge variant="destructive" className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center p-1 text-xs">
                       {unreadCount > 9 ? '9+' : unreadCount}
                     </Badge>
                   )}
                   {link.isCommentLink && pendingCommentsCount > 0 && (
                     <Badge variant="secondary" className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center p-1 text-xs">
                       {pendingCommentsCount}
                     </Badge>
                  )}
                  {link.isVerbatimLink && pendingVerbatimsCount > 0 && (
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
