"use client"

import { useDemoData } from "@/lib/demo-store"

import { Download, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import type { AgendaProposal } from "./types"
import { downloadAttachment, formatAgendaDate, memberLabel } from "./utils"

interface Props {
  item: AgendaProposal | null
  onOpenChange: (open: boolean) => void
}

export function AgendaDetails({ item, onOpenChange }: Props) {
  const { meetings, members } = useDemoData()
  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {item && <>
          <DialogHeader className="space-y-3">
            <Badge variant={item.status === "Rejeté" ? "destructive" : "secondary"} className="w-fit">
              {item.status}
            </Badge>
            <DialogTitle className="text-xl leading-snug">{item.title}</DialogTitle>
            <DialogDescription>
              {meetings.find((meeting) => meeting.id === item.meetingId)?.title ?? "Réunion"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-7 pt-5">
            <div className="grid gap-5 border-b pb-6 text-sm sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Auteur</p><p className="mt-1 font-medium">{memberLabel(item.proposedById, members)}</p></div>
              <div><p className="text-xs text-muted-foreground">Proposé le</p><p className="mt-1 font-medium">{formatAgendaDate(item.createdAt)}</p></div>
              {item.status === "Validé" && <div><p className="text-xs text-muted-foreground">Position</p><p className="mt-1 font-medium">Point n° {(item.order ?? 0) + 1}</p></div>}
              {item.reviewedById && <div><p className="text-xs text-muted-foreground">Examiné par</p><p className="mt-1 font-medium">{memberLabel(item.reviewedById, members)}</p></div>}
            </div>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Description</h3>
              <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                {item.description || "Aucune description renseignée."}
              </p>
            </section>
            {item.reviewNote && <section className="space-y-2 rounded-lg bg-muted/50 p-4">
              <h3 className="text-sm font-semibold">Motif du rejet</h3>
              <p className="whitespace-pre-wrap text-sm leading-6">{item.reviewNote}</p>
            </section>}
            <section className="space-y-3 border-t pt-6">
              <h3 className="text-sm font-semibold">Pièces jointes ({item.attachments.length})</h3>
              {item.attachments.length === 0 && <p className="text-sm text-muted-foreground">Aucune pièce jointe.</p>}
              <div className="divide-y">
                {item.attachments.map((attachment) => <div key={attachment.id} className="flex items-center gap-3 py-3">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm">{attachment.name}</span>
                  {attachment.file ? <Button variant="outline" size="sm" onClick={() => downloadAttachment(attachment.file!)}>
                    <Download className="mr-2 size-4" /> Télécharger
                  </Button> : <span className="text-xs text-muted-foreground">Exemple fictif</span>}
                </div>)}
              </div>
            </section>
          </div>
        </>}
      </DialogContent>
    </Dialog>
  )
}
