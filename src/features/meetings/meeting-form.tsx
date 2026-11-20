"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

import { useDemoData } from "@/lib/demo-store"
import { useUiText } from "@/features/ui-text"
import type { AgendaItem, AgendaStatus, Meeting, MeetingStatus } from "./types"

type MeetingFormProps = {
  open: boolean
  initialMeeting: Meeting | null
  onOpenChange: (open: boolean) => void
  onSave: (meeting: Meeting) => void
}

const statuses: MeetingStatus[] = ["Planifiée", "En cours", "Clôturée", "PV signé", "Annulée"]
const agendaStatuses: AgendaStatus[] = ["Proposé", "Validé", "Rejeté"]

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
  const [agendaTitle, setAgendaTitle] = useState("")
  const [agendaAuthor, setAgendaAuthor] = useState(committeeMembers[0].id)
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

  function addAgendaItem() {
    const title = agendaTitle.trim()
    if (!title) return

    const item: AgendaItem = {
      id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      proposedById: agendaAuthor,
      status: "Proposé",
    }
    update("agenda", [...form.agenda, item])
    setAgendaTitle("")
  }

  function changeAgendaTitle(id: string, title: string) {
    update(
      "agenda",
      form.agenda.map((item) => item.id === id ? { ...item, title } : item)
    )
  }

  function changeAgendaStatus(id: string, status: AgendaStatus) {
    update(
      "agenda",
      form.agenda.map((item) => item.id === id ? { ...item, status } : item)
    )
  }

  function removeAgendaItem(id: string) {
    update("agenda", form.agenda.filter((item) => item.id !== id))
  }

  function moveAgendaItem(index: number, direction: -1 | 1) {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= form.agenda.length) return
    const copy = [...form.agenda]
    const tmp = copy[index]
    copy[index] = copy[newIndex]
    copy[newIndex] = tmp
    update("agenda", copy)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.title.trim() || !form.date || !form.startTime || !form.endTime || !form.location.trim()) {
      setError(t("Renseigne le titre, la date, les horaires et la salle."))
      return
    }
    if (form.endTime <= form.startTime) {
      setError(t("L'heure de fin doit être postérieure à l'heure de début."))
      return
    }
    if (form.agenda.some((item) => !item.title.trim())) {
      setError(t("Les points de l'ordre du jour ne peuvent pas être vides."))
      return
    }
    onSave({ ...form, title: form.title.trim(), location: form.location.trim() })
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
            {t("Informations, participants et ordre du jour.")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Tabs defaultValue="general">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">{t("Informations")}</TabsTrigger>
              <TabsTrigger value="participants">{t("Participants")} ({form.participantIds.length})</TabsTrigger>
              <TabsTrigger value="agenda">{t("Ordre du jour")} ({form.agenda.length})</TabsTrigger>
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
                  <Input id="meeting-date" type="date" value={form.date}
                    onChange={(e) => update("date", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting-start">{t("Début *")}</Label>
                  <Input id="meeting-start" type="time" value={form.startTime}
                    onChange={(e) => update("startTime", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting-end">{t("Fin *")}</Label>
                  <Input id="meeting-end" type="time" value={form.endTime}
                    onChange={(e) => update("endTime", e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="meeting-location">{t("Salle / lieu *")}</Label>
                  <Input id="meeting-location" value={form.location}
                    onChange={(e) => update("location", e.target.value)}
                    placeholder={t("Ex. Salle B12")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("Statut")}</Label>
                  <Select value={form.status} disabled={form.status === "PV signé"}
                    onValueChange={(value) => update("status", value as MeetingStatus)}>
                    <SelectTrigger><SelectValue placeholder={t("Statut")} /></SelectTrigger>
                    <SelectContent>
                      {statuses.filter((status) => status !== "PV signé" || form.status === "PV signé").map((status) => (
                        <SelectItem key={status} value={status}>{t(status)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meeting-description">{t("Description")}</Label>
                <Textarea id="meeting-description" rows={3} value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder={t("Objectifs et contexte de la réunion")} />
              </div>
            </TabsContent>

            <TabsContent value="participants" className="space-y-3 pt-3">
              <p className="text-sm text-muted-foreground">
                {t("Sélectionne les membres invités à cette réunion.")}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {committeeMembers.map((member) => (
                  <label key={member.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/40">
                    <Checkbox
                      checked={form.participantIds.includes(member.id)}
                      onCheckedChange={(checked) => toggleParticipant(member.id, checked === true)}
                    />
                    <span className="flex flex-col text-sm">
                      <span className="font-medium">{member.name}</span>
                      <span className="text-xs text-muted-foreground">{member.role}</span>
                    </span>
                  </label>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="agenda" className="space-y-4 pt-3">
              <p className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-100">{t("L'ordre du jour se gère dans le module collaboratif afin de préserver les propositions, les validations et l'ordre décidés par le président.")}</p>
              <fieldset disabled className="pointer-events-none space-y-4 opacity-60" aria-disabled="true">
              <p className="text-sm text-muted-foreground">
                {t("Ajoute les points à discuter, choisis leur auteur et leur état de validation.")}
              </p>
              <div className="space-y-3 rounded-lg border p-3">
                <Label htmlFor="agenda-title">{t("Nouveau point à l'ordre du jour")}</Label>
                <Input id="agenda-title" value={agendaTitle}
                  onChange={(e) => setAgendaTitle(e.target.value)}
                  placeholder={t("Ex. Présentation des dossiers pédagogiques")} />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select value={agendaAuthor} onValueChange={setAgendaAuthor}>
                    <SelectTrigger className="sm:flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {committeeMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="secondary" onClick={addAgendaItem}>
                    <Plus className="mr-2 size-4" /> {t("Ajouter le point")}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {form.agenda.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                    {t("Aucun point ajouté.")}
                  </p>
                ) : form.agenda.map((item, index) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Label htmlFor={`agenda-item-${item.id}`}>{t("Point {number}", { number: index + 1 })}</Label>
                        <Input id={`agenda-item-${item.id}`} value={item.title}
                          onChange={(e) => changeAgendaTitle(item.id, e.target.value)} />
                        <p className="text-xs text-muted-foreground">
                          {t("Proposé par {name}", { name: committeeMembers.find((member) => member.id === item.proposedById)?.name ?? t("Membre") })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button type="button" size="icon" variant="ghost" aria-label={t("Monter")}
                          disabled={index === 0} onClick={() => moveAgendaItem(index, -1)}>
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" aria-label={t("Descendre")}
                          disabled={index === form.agenda.length - 1}
                          onClick={() => moveAgendaItem(index, 1)}>
                          <ArrowDown className="size-4" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" aria-label={t("Supprimer")}
                          onClick={() => removeAgendaItem(item.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 max-w-44">
                      <Select value={item.status}
                        onValueChange={(value) => changeAgendaStatus(item.id, value as AgendaStatus)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {agendaStatuses.map((status) => (
                            <SelectItem key={status} value={status}>{t(status)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
              </fieldset>
            </TabsContent>
          </Tabs>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Annuler")}
            </Button>
            <Button type="submit">
              {t(initialMeeting ? "Enregistrer les modifications" : "Créer la réunion")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
