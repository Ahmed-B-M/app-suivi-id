import { Layers, Database } from "lucide-react";
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
      </div>
    </header>
  );
}
