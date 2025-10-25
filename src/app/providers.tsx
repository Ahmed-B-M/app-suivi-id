
"use client";

import { usePathname, useRouter } from 'next/navigation';
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { FilterProvider } from "@/context/filter-context";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { AppHeader } from "./header";
import { SidebarInset } from "../ui/sidebar/index";
import { useUser } from '@/firebase';
import { ReactNode, useEffect } from 'react';
import { Loader2 } from 'lucide-react';


function AuthGuard({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) {
      return; // Ne faites rien tant que l'état de l'utilisateur n'est pas connu
    }

    const isLoginPage = pathname === '/login';

    if (!user && !isLoginPage) {
      // Si l'utilisateur n'est pas connecté et n'est pas sur la page de connexion, redirigez-le
      router.replace('/login');
    } else if (user && isLoginPage) {
      // Si l'utilisateur est connecté et essaie d'accéder à la page de connexion, redirigez-le vers l'accueil
      router.replace('/');
    }
  }, [user, isUserLoading, pathname, router]);

  // Affiche un loader global tant que l'authentification est en cours
  if (isUserLoading) {
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
  
  // Si l'utilisateur est connecté, affichez le contenu de l'application
  if (user && pathname !== '/login') {
     return <>{children}</>;
  }

  // Dans les autres cas (comme le temps de la redirection), affichez le loader
  return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
  );
}


export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  return (
    <FirebaseClientProvider>
      <AuthGuard>
          {pathname === '/login' ? (
              children
          ) : (
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
          )}
      </AuthGuard>
    </FirebaseClientProvider>
  );
}
