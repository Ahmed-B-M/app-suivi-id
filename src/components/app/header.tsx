import { Layers, Database, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="mr-4 flex items-center">
          <Link href="/" className="flex items-center">
            <Layers className="h-6 w-6 mr-3 text-primary" />
            <span className="font-bold text-lg text-primary">
              EXport API Urbantz
            </span>
          </Link>
        </div>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/dashboard" className="flex items-center gap-2">
              <LayoutDashboard />
              Tableau de bord
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/database" className="flex items-center gap-2">
              <Database />
              Base de Données
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
