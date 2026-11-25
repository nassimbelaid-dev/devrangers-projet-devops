"use client"

import { useUiText } from "@/features/ui-text"

import type { CommitteeMemberRecord } from "./types"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { committeeSeats } from "./mock-data"
import { formatDate, mandateStatus, todayIso } from "./utils"

type MemberDetailsProps = {
  member: CommitteeMemberRecord
  members: CommitteeMemberRecord[]
  onClose: () => void
  onEdit: (member: CommitteeMemberRecord) => void
  canEdit?: boolean
}

export function MemberDetails({
  member,
  members,
  onClose,
  onEdit,
  canEdit = true,
}: MemberDetailsProps) {
  const t = useUiText()
  const seatName =
    committeeSeats.find((seat) => seat.id === member.seatId)?.label ?? "—"
  const colleague = members.find(
    (other) =>
      other.id !== member.id &&
      other.seatId === member.seatId &&
      other.kind !== member.kind &&
      other.mandateStart <= member.mandateEnd &&
      member.mandateStart <= other.mandateEnd
  )
  const status = mandateStatus(member, todayIso())

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{member.name}</DialogTitle>
          <DialogDescription>
            {t("Informations sur le membre et son mandat.")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{t(member.role)}</Badge>
          <Badge variant="outline">{t(member.kind)}</Badge>
          <Badge variant={status === "En cours" ? "default" : "secondary"}>
            {t(status)}
          </Badge>
        </div>
        <Tabs defaultValue="identity">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="identity">{t("Coordonnées")}</TabsTrigger>
            <TabsTrigger value="mandate">{t("Mandat et siège")}</TabsTrigger>
          </TabsList>
          <TabsContent value="identity" className="space-y-3 pt-4 text-sm">
            <Info label={t("Nom complet")} value={member.name} />
            <Info label={t("Adresse e-mail")} value={member.email} />
            <Info
              label={t("Téléphone")}
              value={member.phone || t("Non renseigné")}
            />
            <Info label={t("Fonction")} value={t(member.role)} />
            <Info
              label={t("Observations")}
              value={member.notes || t("Aucune")}
            />
          </TabsContent>
          <TabsContent value="mandate" className="space-y-3 pt-4 text-sm">
            <Info label={t("Siège")} value={seatName} />
            <Info label={t("Qualité")} value={t(member.kind)} />
            <Info
              label={t("Début du mandat")}
              value={formatDate(member.mandateStart)}
            />
            <Info
              label={t("Fin du mandat")}
              value={formatDate(member.mandateEnd)}
            />
            <Info
              label={t(
                member.kind === "Titulaire"
                  ? "Suppléant associé"
                  : "Titulaire associé"
              )}
              value={
                colleague?.name ?? t("Aucun membre associé sur cette période")
              }
            />
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Fermer")}
          </Button>
          {canEdit && (
            <Button onClick={() => onEdit(member)}>
              {t("Modifier le membre")}
            </Button>
          )}
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
