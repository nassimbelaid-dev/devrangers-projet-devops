"use client"

import { useState } from "react"
import { useUiText } from "@/features/ui-text"

import type { FormEvent } from "react"
import type { Meeting } from "./types"

import { useDemoData } from "@/lib/demo-store"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type MeetingFormProps = {
  open: boolean
  initialMeeting: Meeting | null
  onOpenChange: (open: boolean) => void
  onSave: (meeting: Meeting) => string | null
}

function blankMeeting(): Meeting {
  return {
    id: `r-${Date.now()}`,
    title: "",
    date: "",
    startTime: "09:00",
    endTime: "10:00",
    location: "",
    description: "",
    status: "Planifiée",
    participantIds: [],
    agenda: [],
  }
}

export function MeetingForm({
  open,
  initialMeeting,
  onOpenChange,
  onSave,
}: MeetingFormProps) {
  const t = useUiText()
  const { members: committeeMembers } = useDemoData()
  // Le composant est remonté avec une clé différente lors d'une ouverture.
  const [form, setForm] = useState<Meeting>(() =>
    initialMeeting
      ? {
          ...initialMeeting,
          participantIds: [...initialMeeting.participantIds],
          agenda: initialMeeting.agenda.map((item) => ({ ...item })),
        }
      : blankMeeting()
  )
  const [error, setError] = useState("")

  function update<K extends keyof Meeting>(key: K, value: Meeting[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setError("")
  }

  function toggleParticipant(memberId: string, checked: boolean) {
    setForm((current) => ({
      ...current,
      participantIds: checked
        ? Array.from(new Set([...current.participantIds, memberId]))
        : current.participantIds.filter((id) => id !== memberId),
    }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      !form.title.trim() ||
      !form.date ||
      !form.startTime ||
      !form.endTime ||
      !form.location.trim()
    ) {
      setError(t("Renseigne le titre, la date, les horaires et la salle."))
      return
    }
    if (form.endTime <= form.startTime) {
      setError(t("L'heure de fin doit être postérieure à l'heure de début."))
      return
    }
    const issue = onSave({
      ...form,
      title: form.title.trim(),
      location: form.location.trim(),
    })
    if (issue) return setError(t(issue))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto w-[calc(100vw-2rem)] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {t(initialMeeting ? "Modifier la réunion" : "Créer une réunion")}
          </DialogTitle>
          <DialogDescription>
            {t("Informations et participants.")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Tabs defaultValue="general">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">{t("Informations")}</TabsTrigger>
              <TabsTrigger value="participants">
                {t("Participants")} ({form.participantIds.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 pt-3">
              <div className="space-y-2">
                <Label htmlFor="meeting-title">{t("Titre *")}</Label>
                <Input
                  id="meeting-title"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder={t("Ex. Réunion ordinaire du comité")}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="meeting-date">{t("Date *")}</Label>
                  <Input
                    id="meeting-date"
                    type="date"
                    value={form.date}
                    onChange={(e) => update("date", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting-start">{t("Début *")}</Label>
                  <Input
                    id="meeting-start"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => update("startTime", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting-end">{t("Fin *")}</Label>
                  <Input
                    id="meeting-end"
                    type="time"
                    value={form.endTime}
                    onChange={(e) => update("endTime", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="meeting-location">
                    {t("Salle / lieu *")}
                  </Label>
                  <Input
                    id="meeting-location"
                    value={form.location}
                    onChange={(e) => update("location", e.target.value)}
                    placeholder={t("Ex. Salle B12")}
                  />
                </div>
                <div className="space-y-2">
                  {initialMeeting && (
                    <p className="text-sm text-muted-foreground">
                      {t("Statut géré par le workflow de la réunion.")}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meeting-description">{t("Description")}</Label>
                <Textarea
                  id="meeting-description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder={t("Objectifs et contexte de la réunion")}
                />
              </div>
            </TabsContent>

            <TabsContent value="participants" className="space-y-3 pt-3">
              <p className="text-sm text-muted-foreground">
                {t("Sélectionne les membres invités à cette réunion.")}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {committeeMembers.map((member) => (
                  <label
                    key={member.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={form.participantIds.includes(member.id)}
                      onCheckedChange={(checked) =>
                        toggleParticipant(member.id, checked === true)
                      }
                    />
                    <span className="flex flex-col text-sm">
                      <span className="font-medium">{member.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {member.role}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("Annuler")}
            </Button>
            <Button type="submit">
              {t(
                initialMeeting
                  ? "Enregistrer les modifications"
                  : "Créer la réunion"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
