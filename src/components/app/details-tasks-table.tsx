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
import { ArrowUpDown, ChevronDown, MoreHorizontal, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { getDriverFullName } from "@/lib/grouping";
import { format } from "date-fns";
import { Card, CardContent } from "../ui/card";

const countBacs = (task: Tache) => {
    if (!task.articles) return { secs: 0, frais: 0, surgeles: 0 };
    return task.articles.reduce((acc, article) => {
        if (article.type === 'BAC_SEC') acc.secs++;
        else if (article.type === 'BAC_FRAIS') acc.frais++;
        else if (article.type === 'BAC_SURGELE') acc.surgeles++;
        return acc;
    }, { secs: 0, frais: 0, surgeles: 0 });
};

const columns: ColumnDef<Tache>[] = [
  {
    accessorKey: "date",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
        const date = row.getValue("date");
        return date ? format(new Date(date as string), "dd/MM/yy") : "N/A"
    },
  },
  {
    accessorKey: "nomTournee",
    header: "Tournée",
  },
  {
    id: 'livreur',
    accessorFn: row => getDriverFullName(row),
    header: "Livreur",
  },
  {
    id: "client",
    accessorFn: row => row.contact?.personne,
    header: "Client",
  },
  {
    accessorKey: "progression",
    header: "Progression",
    cell: ({ row }) => (
        <Badge variant={row.getValue("progression") === "COMPLETED" ? "default" : "secondary"}>
            {row.getValue("progression")}
        </Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Statut",
    cell: ({ row }) => <Badge variant="outline">{row.getValue("status")}</Badge>
  },
  {
    id: 'note',
    accessorFn: row => row.metaDonnees?.notationLivreur,
    header: ({ column }) => (
      <div className="text-right">
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Note
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      const rating = row.original.metaDonnees?.notationLivreur;
      if (typeof rating !== 'number') return <div className="text-right text-muted-foreground">N/A</div>;
      return <div className="text-right font-medium flex items-center justify-end gap-1">{rating} <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" /></div>
    },
  },
  {
    id: 'bacsSecs',
    accessorFn: row => countBacs(row).secs,
    header: () => <div className="text-right">Bacs Secs</div>,
    cell: ({ row }) => <div className="text-right font-mono">{countBacs(row.original).secs}</div>,
  },
  {
    id: 'bacsFrais',
    accessorFn: row => countBacs(row).frais,
    header: () => <div className="text-right">Bacs Frais</div>,
    cell: ({ row }) => <div className="text-right font-mono">{countBacs(row.original).frais}</div>,
  },
  {
    id: 'bacsSurgeles',
    accessorFn: row => countBacs(row).surgeles,
    header: () => <div className="text-right">Surgelés</div>,
    cell: ({ row }) => <div className="text-right font-mono">{countBacs(row.original).surgeles}</div>,
  },
];

export function DetailsTasksTable({ data }: { data: Tache[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
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
            placeholder="Rechercher dans toutes les colonnes..."
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
            <DropdownMenuContent align="end">
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
                      <TableHead key={header.id}>
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
