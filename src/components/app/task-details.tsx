"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface DetailItemProps {
  label: string;
  value: React.ReactNode;
}

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="text-base font-semibold">{value ?? "N/A"}</div>
    </div>
  );
}

const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
        return new Date(dateString).toLocaleString('fr-FR');
    } catch (e) {
        return "Date invalide";
    }
}

const formatTime = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
        return new Date(dateString).toLocaleTimeString('fr-FR');
    } catch (e) {
        return "Heure invalide";
    }
}

const formatDateOnly = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
        return new Date(dateString).toLocaleDateString('fr-FR');
    } catch (e) {
        return "Date invalide";
    }
}


export function TaskDetails({ task }: { task: any }) {
  if (!task) return null;

  return (
    <div className="space-y-6">
      {/* General Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informations Générales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <DetailItem label="ID Tâche" value={task.taskId} />
          <DetailItem label="Statut" value={<Badge variant={task.progress === 'COMPLETED' ? 'default' : 'secondary'}>{task.progress}</Badge>} />
          <DetailItem label="Type" value={task.type} />
          <DetailItem label="Client" value={task.client} />
          <DetailItem label="Hub" value={task.hubName} />
          <DetailItem label="Date de la Tâche" value={formatDateOnly(task.date)} />
          <DetailItem label="Fenêtre de livraison" value={`${formatTime(task.timeWindow?.start)} - ${formatTime(task.timeWindow?.stop)}`} />
          <DetailItem label="Arrivée réelle" value={formatDate(task.actualTime?.arrive?.when)} />
          <DetailItem label="Date de clôture" value={formatDate(task.closureDate)} />
        </CardContent>
      </Card>

      {/* Contact & Location */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Client et Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailItem label="Nom" value={task.contact?.person} />
            <DetailItem label="Téléphone" value={task.contact?.phone} />
            <DetailItem label="Email" value={task.contact?.email} />
            <Separator />
            <p className="text-sm font-medium text-muted-foreground">Infos Immeuble</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
                <p>Étage: {task.contact?.buildingInfo?.floor ?? 'N/A'}</p>
                <p>Ascenseur: {task.contact?.buildingInfo?.hasElevator ? 'Oui' : 'Non'}</p>
                <p>Digicode 1: {task.contact?.buildingInfo?.digicode1 ?? 'N/A'}</p>
                <p>Interphone: {task.contact?.buildingInfo?.hasInterphone ? 'Oui' : 'Non'}</p>
                <p>Code Interphone: {task.contact?.buildingInfo?.interphoneCode ?? 'N/A'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Adresse de Livraison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailItem label="Adresse" value={task.location?.address} />
            <DetailItem label="Instructions" value={task.instructions} />
          </CardContent>
        </Card>
      </div>
      
       {/* Driver and Round */}
       <Card>
        <CardHeader>
          <CardTitle>Tournée et Chauffeur</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <DetailItem label="Nom de la tournée" value={task.roundName}/>
          <DetailItem label="Nom du chauffeur" value={`${task.driver?.firstName ?? ''} ${task.driver?.lastName ?? ''}`.trim() || "N/A"}/>
          <DetailItem label="ID Externe Chauffeur" value={task.driver?.externalId}/>
          <DetailItem label="Séquence" value={task.sequence}/>
        </CardContent>
      </Card>


      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Articles ({task.items?.length || 0})</CardTitle>
          <CardDescription>Liste des articles inclus dans cette tâche.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Code-barres</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {task.items?.length > 0 ? (
                task.items.map((item: any) => (
                  <TableRow key={item._id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="font-mono text-xs">{item.barcode}</TableCell>
                    <TableCell><Badge variant="outline">{item.type}</Badge></TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell><Badge variant={item.status === 'DELIVERED' ? 'secondary' : 'destructive'}>{item.status}</Badge></TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center">Aucun article trouvé.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
