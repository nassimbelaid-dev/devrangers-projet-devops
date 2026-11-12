"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { committeeSeats } from "./mock-data"
import { formatDate, mandateStatus, todayIso } from "./utils"
import type { CommitteeMemberRecord } from "./types"

type MemberDetailsProps = {
  member: CommitteeMemberRecord
  members: CommitteeMemberRecord[]
  onClose: () => void
  onEdit: (member: CommitteeMemberRecord) => void
}

export function MemberDetails({ member, members, onClose, onEdit }: MemberDetailsProps) {
  const seatName = committeeSeats.find((seat) => seat.id === member.seatId)?.label ?? "—"
  const colleague = members.find((other) =>
    other.id !== member.id && other.seatId === member.seatId && other.kind !== member.kind &&
    other.mandateStart <= member.mandateEnd && member.mandateStart <= other.mandateEnd
  )
  const status = mandateStatus(member, todayIso())

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{member.name}</DialogTitle>
          <DialogDescription>Informations sur le membre et son mandat.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{member.role}</Badge>
          <Badge variant="outline">{member.kind}</Badge>
          <Badge variant={status === "En cours" ? "default" : "secondary"}>{status}</Badge>
        </div>
        <Tabs defaultValue="identity">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="identity">Coordonnées</TabsTrigger>
            <TabsTrigger value="mandate">Mandat et siège</TabsTrigger>
          </TabsList>
          <TabsContent value="identity" className="space-y-3 pt-4 text-sm">
            <Info label="Nom complet" value={member.name} />
            <Info label="Adresse e-mail" value={member.email} />
            <Info label="Téléphone" value={member.phone || "Non renseigné"} />
            <Info label="Fonction" value={member.role} />
            <Info label="Observations" value={member.notes || "Aucune"} />
          </TabsContent>
          <TabsContent value="mandate" className="space-y-3 pt-4 text-sm">
            <Info label="Siège" value={seatName} />
            <Info label="Qualité" value={member.kind} />
            <Info label="Début du mandat" value={formatDate(member.mandateStart)} />
            <Info label="Fin du mandat" value={formatDate(member.mandateEnd)} />
            <Info label={member.kind === "Titulaire" ? "Suppléant associé" : "Titulaire associé"}
              value={colleague?.name ?? "Aucun membre associé sur cette période"} />
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button onClick={() => onEdit(member)}>Modifier le membre</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b pb-2 sm:grid-cols-[160px_1fr]">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words font-medium">{value}</span>
    </div>
  )
}
