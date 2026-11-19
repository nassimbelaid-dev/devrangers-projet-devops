"use client"

import { CalendarDays, Clock3, MapPin, Pencil, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDemoData } from "@/lib/demo-store"
import { useUiText } from "@/features/ui-text"
import type { Meeting } from "./types"

interface MeetingDetailsProps {
  meeting: Meeting | null
  onClose: () => void
  onEdit: (meeting: Meeting) => void
}

function readableDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`))
}

export function MeetingDetails({ meeting, onClose, onEdit }: MeetingDetailsProps) {
  const t = useUiText()
  const { members: committeeMembers } = useDemoData()
  if (!meeting) return null

  const participants = committeeMembers.filter((member) =>
    meeting.participantIds.includes(member.id)
  )

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto w-[calc(100vw-2rem)] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{meeting.title}</DialogTitle>
          <DialogDescription>{t("Informations et participants de la réunion.")}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="infos">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="infos">{t("Informations")}</TabsTrigger>
            <TabsTrigger value="participants">{t("Participants")} ({participants.length})</TabsTrigger>
            <TabsTrigger value="agenda">{t("Ordre du jour")} ({meeting.agenda.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="infos" className="space-y-3 pt-3 text-sm">
            <Badge variant="secondary">{t(meeting.status)}</Badge>
            <p className="flex items-center gap-2"><CalendarDays className="size-4 text-muted-foreground" />{readableDate(meeting.date)}</p>
            <p className="flex items-center gap-2"><Clock3 className="size-4 text-muted-foreground" />{meeting.startTime} – {meeting.endTime}</p>
            <p className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" />{meeting.location}</p>
            <p className="flex items-center gap-2"><Users className="size-4 text-muted-foreground" />{t("{count} membre(s) invité(s)", { count: participants.length })}</p>
            <div className="rounded-lg bg-muted/40 p-3">
              {meeting.description || t("Aucune description renseignée.")}
            </div>
          </TabsContent>

          <TabsContent value="participants" className="space-y-2 pt-3">
            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("Aucun participant sélectionné.")}</p>
            ) : participants.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-lg border p-3">
                <span className="font-medium text-sm">{member.name}</span>
                <span className="text-xs text-muted-foreground">{member.role}</span>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="agenda" className="space-y-2 pt-3">
            {meeting.agenda.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("Aucun point à l'ordre du jour.")}</p>
            ) : meeting.agenda.map((item, index) => (
              <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{index + 1}. {item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("Proposé par {name}", { name: committeeMembers.find((member) => member.id === item.proposedById)?.name ?? t("Membre") })}
                  </p>
                </div>
                <Badge variant="outline">{t(item.status)}</Badge>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("Fermer")}</Button>
          <Button onClick={() => onEdit(meeting)}>
            <Pencil className="mr-2 size-4" /> {t("Modifier")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
