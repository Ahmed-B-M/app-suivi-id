
"use client";

import { FirebaseClientProvider } from "@/firebase/client-provider";
import { FilterProvider } from "@/context/filter-context";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { AppHeader } from "./header";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <FilterProvider>
        <SidebarProvider>
          <div className="flex">
            <SidebarNav />
            <div className="flex-1 flex flex-col">
              <AppHeader />
              <main className="flex-1">
                {children}
              </main>
               <footer className="py-6 border-t mt-8">
                <div className="container text-center text-sm text-muted-foreground">
                  ID-pilote
                </div>
              </footer>
            </div>
          </div>
        </SidebarProvider>
      </FilterProvider>
    </FirebaseClientProvider>
  );
}
