
"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tournee } from "@/lib/types";
import { Badge } from "../ui/badge";
import { getDriverFullName } from "@/lib/grouping";
import { format } from "date-fns";
import { Card, CardContent } from "../ui/card";

const columns: ColumnDef<Tournee>[] = [
  // Identification
  { accessorKey: "id", header: "ID Interne" },
  { accessorKey: "nom", header: "Nom" },
  { accessorKey: "statut", header: "Statut", cell: ({row}) => <Badge variant={row.getValue("statut") === "COMPLETED" ? "default" : "secondary"}>{row.getValue("statut")}</Badge>},
  { accessorKey: "activite", header: "Activité" },
  { accessorKey: "date", header: "Date", cell: ({row}) => row.getValue("date") ? format(new Date(row.getValue("date") as string), 'PP') : 'N/A'},
  { accessorKey: "hubId", header: "Hub (ID)" },
  { accessorKey: "nomHub", header: "Nom du Hub" },

  // Chauffeur & Véhicule
  { accessorKey: "associeNom", header: "Associé (Nom)" },
  { accessorKey: "emailChauffeur", header: "Email Chauffeur" },
  { accessorFn: row => getDriverFullName(row), header: "Nom Complet Chauffeur" },
  { accessorKey: "immatriculation", header: "Immatriculation" },
  { accessorKey: "nomVehicule", header: "Nom Véhicule" },
  { accessorKey: "energie", header: "Energie" },

  // Totaux
  { accessorKey: "bacsSurg", header: "Bacs SURG" },
  { accessorKey: "bacsFrais", header: "Bacs FRAIS" },
  { accessorKey: "bacsSec", header: "Bacs SEC" },
  { accessorKey: "bacsPoisson", header: "Bacs POISSON" },
  { accessorKey: "bacsBoucherie", header: "Bacs BOUCHERIE" },
  { accessorKey: "totalSecFrais", header: "Total SEC+FRAIS" },
  { accessorKey: "nombreDeBacs", header: "Nombre de Bacs" },
  { accessorKey: "poidsTournee", header: "Poids Tournée (planifié)", cell: ({row}) => `${row.getValue("poidsTournee") ?? 'N/A'} kg` },
  { accessorKey: "poidsReel", header: "Poids Réel (calculé)", cell: ({row}) => `${row.getValue("poidsReel") ?? 'N/A'} kg` },
  { accessorKey: "volumeTournee", header: "Volume Tournée" },
  { accessorKey: "nbCommandes", header: "Nb Commandes" },
  { accessorKey: "commandesTerminees", header: "Commandes Terminées" },

  // Horaires
  { accessorKey: "heureDepart", header: "Heure Départ", cell: ({row}) => row.getValue("heureDepart") ? format(new Date(row.getValue("heureDepart") as string), 'p') : 'N/A' },
  { accessorKey: "heureFin", header: "Heure Fin", cell: ({row}) => row.getValue("heureFin") ? format(new Date(row.getValue("heureFin") as string), 'p') : 'N/A' },
  { accessorKey: "heureFinReelle", header: "Heure Fin Réelle", cell: ({row}) => row.getValue("heureFinReelle") ? format(new Date(row.getValue("heureFinReelle") as string), 'p') : 'N/A' },
  { accessorKey: "demarreeReel", header: "Démarrée (Réel)", cell: ({row}) => row.getValue("demarreeReel") ? format(new Date(row.getValue("demarreeReel") as string), 'p') : 'N/A' },

  // Métriques
  { accessorKey: "dureeReel", header: "Durée Réelle (ms)" },
  { accessorKey: "distanceTotale", header: "Distance Totale (m)" },
  { accessorKey: "coutTotal", header: "Coût Total" },
];

export function DetailsRoundsTable({ data }: { data: Tournee[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    activite: false,
    hubId: false,
    associeNom: false,
    emailChauffeur: false,
    immatriculation: false,
    nomVehicule: false,
    energie: false,
    bacsSurg: false,
    bacsFrais: false,
    bacsSec: false,
    bacsPoisson: false,
    bacsBoucherie: false,
    totalSecFrais: false,
    volumeTournee: false,
    nbCommandes: false,
    commandesTerminees: false,
    lieuDepart: false,
    heureFin: false,
    heureFinReelle: false,
    demarreeReel: false,
    prepareeReel: false,
    tempsPreparationReel: false,
    dureeReel: false,
    tempsTotal: false,
    tempsTrajetTotal: false,
    tempsServiceCmdTotal: false,
    tempsPauseTotal: false,
    tempsAttenteTotal: false,
    tempsDeRetard: false,
    dateDuRetard: false,
    tempsViolationTotal: false,
    coutParTemps: false,
    flux: false,
    tempSurgChargement: false,
    tempFraisChargement: false,
    tempFraisFin: false,
    tempSurgFin: false,
    codePostalMaitre: false,
    arrets: false,
    tempsAccelerationVehicule: false,
    pausesVehicule: false,
    capaciteBacs: false,
    capacitePoids: false,
    dimVehiculeVolume: false,
    distanceMaxVehicule: false,
    dureeMaxVehicule: false,
    commandesMaxVehicule: false,
    misAJourLe: false,
    valide: false,
  });
  const [globalFilter, setGlobalFilter] = React.useState("");

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
  });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center py-4">
          <Input
            placeholder="Rechercher..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="max-w-sm"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Colonnes <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-96 overflow-y-auto">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} style={{minWidth: 150}}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    Aucun résultat.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} ligne(s) trouvée(s).
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Suivant
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

    