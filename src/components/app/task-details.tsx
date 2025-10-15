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
  // Render nothing if value is null, undefined, or an empty string
  if (value === null || value === undefined || value === "") {
    return null;
  }
  
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="text-base">{value ?? "N/A"}</div>
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
          <DetailItem label="Date de la Tâche" value={formatDateOnly(task.date)} />
          <DetailItem label="Créé le" value={formatDate(task.when)} />
          <DetailItem label="Mis à jour le" value={formatDate(task.updated)} />
          <DetailItem label="Date de clôture" value={formatDate(task.closureDate)} />
        </CardContent>
      </Card>
      
      {/* Dates & Times */}
      <Card>
          <CardHeader><CardTitle>Fenêtre de livraison et arrivée</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DetailItem label="Fenêtre de livraison" value={`${formatTime(task.timeWindow?.start)} - ${formatTime(task.timeWindow?.stop)}`} />
              <DetailItem label="Heure d'arrivée planifiée (flux)" value={formatDate(task.arriveTime)} />
              <DetailItem label="Arrivée réelle" value={formatDate(task.actualTime?.arrive?.when)} />
              <DetailItem label="Adresse correcte" value={task.actualTime?.arrive?.isCorrectAddress ? 'Oui' : 'Non'} />
              <DetailItem label="Forcé" value={task.actualTime?.arrive?.forced ? 'Oui' : 'Non'} />
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
            <p className="text-sm font-medium text-muted-foreground pt-2">Infos Immeuble</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
                <DetailItem label="Étage" value={task.contact?.buildingInfo?.floor} />
                <DetailItem label="Ascenseur" value={task.contact?.buildingInfo?.hasElevator ? 'Oui' : 'Non'} />
                <DetailItem label="Digicode 1" value={task.contact?.buildingInfo?.digicode1} />
                <DetailItem label="Interphone" value={task.contact?.buildingInfo?.hasInterphone ? 'Oui' : 'Non'} />
                <DetailItem label="Code Interphone" value={task.contact?.buildingInfo?.interphoneCode} />
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
            <DetailItem label="Coordonnées (Lat, Lon)" value={`${task.location?.location?.geometry?.[1]}, ${task.location?.location?.geometry?.[0]}`} />
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
          <DetailItem label="Transporteur" value={task.associatedName}/>
          <DetailItem label="Séquence" value={task.sequence}/>
          <DetailItem label="ID Tournée" value={task.round}/>
        </CardContent>
      </Card>
      
      {/* Execution Details */}
      <Card>
          <CardHeader><CardTitle>Détails d'Exécution</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DetailItem label="Terminé par" value={task.completedBy}/>
              <DetailItem label="Tentatives" value={task.attempts}/>
              <DetailItem label="Livraison sans contact" value={task.execution?.contactless?.forced ? 'Forcé' : (task.execution?.contactless !== undefined ? 'Oui' : 'Non')}/>
              <DetailItem label="Temps de service réel (sec)" value={task.realServiceTime?.serviceTime ? Math.round(task.realServiceTime.serviceTime) : 'N/A'}/>
              <DetailItem label="Confiance du temps de service" value={task.realServiceTime?.confidence}/>
              <DetailItem label="Image de succès" value={task.execution?.successPicture ? <a href={`${task.imagePath}${task.execution?.successPicture}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">Voir l'image</a> : 'N/A'}/>
          </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader><CardTitle>Métadonnées</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {task.metadata && Object.entries(task.metadata).map(([key, value]) => (
                <DetailItem key={key} label={key} value={String(value)} />
            ))}
            <DetailItem label="Tracking ID" value={task.trackingId} />
            <DetailItem label="Task Reference" value={task.taskReference} />
            <DetailItem label="Order ID" value={task.order} />
            <DetailItem label="Flux" value={task.flux} />
            <DetailItem label="Target Flux" value={task.targetFlux} />
            <DetailItem label="Endpoint" value={task.endpoint} />
            <DetailItem label="Announcement ID" value={task.announcement} />
        </CardContent>
      </Card>


      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Articles ({task.items?.length || 0})</CardTitle>
          <CardDescription>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mt-2">
                <span>Volume total: {task.dimensions?.volume?.toFixed(3)} m³</span>
                <span>Poids total: {task.dimensions?.poids?.toFixed(2)} kg</span>
                <span>Nombre de bacs: {task.dimensions?.bac}</span>
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
                <TableHead>Poids (kg)</TableHead>
                <TableHead>Volume (m³)</TableHead>
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
                    <TableCell>{item.dimensions?.poids?.toFixed(2)}</TableCell>
                    <TableCell>{item.dimensions?.volume?.toFixed(3)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={7} className="text-center">Aucun article trouvé.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
