
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
import { Tache } from "@/lib/types";
import { Badge } from "../ui/badge";
import { format } from "date-fns";
import { Card, CardContent } from "../ui/card";
import Link from "next/link";
import { getDriverFullName } from "@/lib/grouping";

const columns: ColumnDef<Tache>[] = [
  // Identification
  { accessorKey: "tacheId", header: "ID Tâche", cell: ({ row }) => <Link href={`/task/${row.getValue("tacheId")}`} className="text-blue-600 hover:underline">{row.getValue("tacheId")}</Link> },
  { accessorKey: "idInterne", header: "ID Interne" },
  { accessorKey: "commande", header: "Commande" },
  { accessorKey: "client", header: "Client (ID)" },
  
  // Contenu
  { accessorKey: "bacsSurg", header: "Bacs SURG" },
  { accessorKey: "bacsFrais", header: "Bacs FRAIS" },
  { accessorKey: "bacsSec", header: "Bacs SEC" },
  { accessorKey: "bacsPoisson", header: "Bacs POISSON" },
  { accessorKey: "bacsBoucherie", header: "Bacs BOUCHERIE" },
  { accessorKey: "totalSecFrais", header: "Total SEC + FRAIS" },
  { accessorKey: "nombreDeBacs", header: "Nombre de bacs" },
  { accessorKey: "poidsEnKg", header: "Poids (kg)" },
  { accessorKey: "volumeEnCm3", header: "Volume (cm3)" },
  
  // Planification
  { accessorKey: "date", header: "Date", cell: ({row}) => row.getValue("date") ? format(new Date(row.getValue("date") as string), 'PP') : 'N/A' },
  { accessorKey: "dateInitialeLivraison", header: "Date Initiale Livraison" },
  { accessorKey: "debutCreneauInitial", header: "Début Créneau Initial", cell: ({row}) => row.getValue("debutCreneauInitial") ? format(new Date(row.getValue("debutCreneauInitial") as string), 'p') : 'N/A' },
  { accessorKey: "finCreneauInitial", header: "Fin Créneau Initial", cell: ({row}) => row.getValue("finCreneauInitial") ? format(new Date(row.getValue("finCreneauInitial") as string), 'p') : 'N/A' },
  { accessorKey: "heureArriveeEstimee", header: "Heure Arrivée (Estimée)", cell: ({row}) => row.getValue("heureArriveeEstimee") ? format(new Date(row.getValue("heureArriveeEstimee") as string), 'p') : 'N/A' },
  { accessorKey: "tempsDeServiceEstime", header: "Temps service estimé (min)" },
  
  // Adresse & Instructions
  { accessorKey: "adresse", header: "Adresse" },
  { accessorKey: "ville", header: "Ville" },
  { accessorKey: "codePostal", header: "Code Postal" },
  { accessorKey: "instructions", header: "Instructions" },
  
  // Contact
  { accessorKey: "personneContact", header: "Personne Contact" },
  { accessorKey: "telephoneContact", header: "Téléphone Contact" },
  
  // Réalisation & Statuts
  { accessorKey: "status", header: "Statut", cell: ({row}) => <Badge variant="outline">{row.getValue("status")}</Badge> },
  { accessorKey: "progression", header: "Progression", cell: ({row}) => <Badge variant={row.getValue("progression") === "COMPLETED" ? "default" : "secondary"}>{row.getValue("progression")}</Badge> },
  { accessorKey: "dateCloture", header: "Date de Clôture", cell: ({row}) => row.getValue("dateCloture") ? format(new Date(row.getValue("dateCloture") as string), 'Pp') : 'N/A' },
  { accessorKey: "tentatives", header: "Tentatives" },
  { accessorKey: "terminePar", header: "Terminé Par" },
  
  // Infos Tournée & Chauffeur
  { accessorKey: "nomTournee", header: "Nom Tournée" },
  { accessorKey: "sequence", header: "Séquence" },
  { accessorKey: "nomAssocie", header: "Associé (Nom)" },
  { accessorKey: "nomCompletChauffeur", header: "Nom Complet Chauffeur" },
  { accessorKey: "nomHub", header: "Hub (Nom)" },
  
  // Métadonnées
  { accessorKey: "notationLivreur", header: "Notation Livreur" },
  { accessorKey: "metaCommentaireLivreur", header: "Méta Commentaire Livreur" },

  // --- Champs masqués par défaut ---
  { accessorKey: "id", header: "ID DB" },
  { accessorKey: "referenceTache", header: "Référence Tâche" },
  { accessorKey: "nombreDeBacsMeta", header: "Nombre de Bacs (Méta)" },
  { accessorKey: "margeFenetreHoraire", header: "Marge Fenêtre Horaire" },
  { accessorKey: "type", header: "Type" },
  { accessorKey: "flux", header: "Flux" },
];


export function DetailsTasksTable({ data }: { data: Tache[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
      id: false,
      idInterne: false,
      client: false,
      bacsSurg: false,
      bacsFrais: false,
      bacsSec: false,
      bacsPoisson: false,
      bacsBoucherie: false,
      totalSecFrais: false,
      volumeEnCm3: false,
      dateInitialeLivraison: false,
      tempsDeServiceEstime: false,
      adresse: false,
      instructions: false,
      personneContact: false,
      telephoneContact: false,
      heureArriveeReelle: false,
      surPlaceForce: false,
      surPlaceValide: false,
      tempsDeRetard: false,
      dateDuRetard: false,
      tempsDeServiceReel: false,
      debutTempsService: false,
      finTempsService: false,
      confianceTempsService: false,
      versionTempsService: false,
      horodatagesMinuteur: false,
      sansContactForce: false,
      raisonSansContact: false,
      raisonEchec: false,
      raisonEchecCusto: false,
      nomSignature: false,
      photoSucces: false,
      latitudePosition: false,
      longitudePosition: false,
      type: false,
      flux: false,
      tachesMemeArret: false,
      categories: false,
      codePe: false,
      serviceMeta: false,
      codeEntrepôt: false,
      infosSuiviTransp: false,
      desassocTranspRejetee: false,
      dateMiseAJour: false,
      dateCreation: false,
      referenceTache: false,
      nombreDeBacsMeta: false,
      margeFenetreHoraire: false,
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
                    key={row.original.id}
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
