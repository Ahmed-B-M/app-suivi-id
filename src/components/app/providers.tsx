
"use client";

import { FirebaseClientProvider } from "@/firebase/client-provider";
import { FilterProvider } from "@/context/filter-context";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { AppHeader } from "./header";
import { SidebarInset } from "../ui/sidebar/index";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <FilterProvider>
        <SidebarProvider>
          <div className="relative flex min-h-screen">
            <SidebarNav />
            <SidebarInset>
              <AppHeader />
              <main className="flex-1 p-8 pt-6 bg-muted/30 overflow-y-auto">
                {children}
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
    </FirebaseClientProvider>
  );
}
