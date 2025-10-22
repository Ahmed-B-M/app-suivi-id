
import type { Metadata } from "next";
import Script from 'next/script';
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { AppHeader } from "@/components/app/header";
import { FilterProvider } from "@/context/filter-context";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/app/sidebar-nav";

export const metadata: Metadata = {
  title: "ID-pilote",
  description: "Tableau de bord pour le suivi des opérations Urbantz.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Code+Pro&display=swap"
          rel="stylesheet"
        />
        <Script 
          src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className={cn("font-body antialiased min-h-screen bg-background")}>
        <FirebaseClientProvider>
          <FilterProvider>
            <SidebarProvider>
                <SidebarNav />
                <SidebarInset>
                  <AppHeader />
                  <main className="flex-1">
                    {children}
                  </main>
                  <Toaster />
                   <footer className="py-6 border-t mt-8">
                    <div className="container text-center text-sm text-muted-foreground">
                      ID-pilote
                    </div>
                  </footer>
                </SidebarInset>
            </SidebarProvider>
          </FilterProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
