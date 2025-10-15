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
        return new Date(dateString).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'medium' });
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
          <DetailItem label="ID Interne" value={task._id} />
          <DetailItem label="Statut" value={<Badge variant={task.progress === 'COMPLETED' ? 'default' : 'secondary'}>{task.progress}</Badge>} />
          <DetailItem label="Type" value={task.type} />
          <DetailItem label="Client" value={task.client} />
          <DetailItem label="Plateforme" value={task.platformName} />
          <DetailItem label="Hub" value={task.hubName} />
        </CardContent>
      </Card>
      
      {/* Dates & Times */}
      <Card>
          <CardHeader><CardTitle>Dates et Horaires</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DetailItem label="Date de la Tâche" value={formatDateOnly(task.date)} />
              <DetailItem label="Fenêtre de livraison" value={`${formatTime(task.timeWindow?.start)} - ${formatTime(task.timeWindow?.stop)}`} />
              <DetailItem label="Créé le" value={formatDate(task.when)} />
              <DetailItem label="Mis à jour le" value={formatDate(task.updated)} />
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
            <DetailItem label="Compte" value={task.contact?.account} />
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
            <DetailItem label="Coordonnées" value={`${task.location?.location?.geometry?.[1]}, ${task.location?.location?.geometry?.[0]}`} />
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
          <DetailItem label="Transporteur" value={task.associatedName}/>
        </CardContent>
      </Card>
      
      {/* Execution Details */}
      <Card>
          <CardHeader><CardTitle>Détails d'Exécution</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DetailItem label="Terminé par" value={task.completedBy}/>
              <DetailItem label="Sans contact" value={task.execution?.contactless?.forced ? 'Forcé' : 'Non'}/>
              <DetailItem label="Tentatives" value={task.attempts}/>
              <DetailItem label="Image" value={task.execution?.successPicture ? <a href={`${task.imagePath}${task.execution?.successPicture}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">Voir l'image</a> : 'N/A'}/>
              <DetailItem label="Temps de service réel" value={task.realServiceTime?.serviceTime ? `${Math.round(task.realServiceTime.serviceTime)} sec` : 'N/A'}/>
          </CardContent>
      </Card>


      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Articles ({task.items?.length || 0})</CardTitle>
          <CardDescription>
            <div className="grid grid-cols-3 gap-2 text-sm mt-2">
                <span>Volume total: {task.dimensions?.volume?.toFixed(3)} m³</span>
                <span>Poids total: {task.dimensions?.poids?.toFixed(2)} kg</span>
                <span>Bacs: {task.dimensions?.bac}</span>
            </div>
          </CardDescription>
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
                <TableHead>Poids</TableHead>
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
                    <TableCell>{item.dimensions?.poids?.toFixed(2)} kg</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={6} className="text-center">Aucun article trouvé.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
