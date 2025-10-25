
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
    if (!isUserLoading) {
      if (!user && pathname !== '/login') {
        router.replace('/login');
      } else if (user && pathname === '/login') {
        router.replace('/');
      }
    }
  }, [user, isUserLoading, pathname, router]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && pathname !== '/login') {
     return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if(user && pathname === '/login') {
     return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
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
