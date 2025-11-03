
"use client";

import { usePathname, useRouter } from 'next/navigation';
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { FilterProvider } from "@/context/filter-context";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { AppHeader } from "./header";
import { SidebarInset } from "../ui/sidebar/index";
import { useUser } from '@/firebase';
import { ReactNode, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import type { Role } from '@/lib/roles';
import { hasAccess } from '@/lib/roles';


function AuthGuard({ children }: { children: ReactNode }) {
  const { user, isUserLoading, userProfile } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  const userRole: Role = useMemo(() => (userProfile?.role as Role) || 'viewer', [userProfile]);

  useEffect(() => {
    if (isUserLoading) {
      return; 
    }

    const isLoginPage = pathname === '/login';

    if (!user && !isLoginPage) {
      router.replace('/login');
    } else if (user && isLoginPage) {
      router.replace('/');
    } else if (user && !isLoginPage) {
      // Check for role-based access
      if (!hasAccess(userRole, pathname)) {
         router.replace('/'); // Redirect to a default/dashboard page
      }
    }
  }, [user, isUserLoading, pathname, router, userRole]);

  // Affiche un loader global tant que l'authentification est en cours
  if (isUserLoading || (user && !hasAccess(userRole, pathname) && pathname !== '/login')) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si l'utilisateur n'est pas connecté mais est sur la page de connexion, affichez la page
  if (!user && pathname === '/login') {
    return <>{children}</>;
  }
  
  // Si l'utilisateur est connecté et a accès, affichez le contenu de l'application
  if (user && pathname !== '/login' && hasAccess(userRole, pathname)) {
     return <>{children}</>;
  }

  // Dans les autres cas (comme le temps de la redirection), affichez le loader
  return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <FilterProvider>
      <SidebarProvider>
        <div className="relative flex min-h-screen">
          <SidebarNav />
          <SidebarInset>
            <AppHeader />
            <main className="flex-1 overflow-y-auto">
              <div className="container py-8">
                {children}
              </div>
            </main>
            <footer className="py-6 border-t bg-background">
              <div className="container text-center text-sm text-muted-foreground">
                ID 360
              </div>
            </footer>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </FilterProvider>
  );
}


export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <AuthGuard>
        <AppLayout>{children}</AppLayout>
      </AuthGuard>
    </FirebaseClientProvider>
  );
}
