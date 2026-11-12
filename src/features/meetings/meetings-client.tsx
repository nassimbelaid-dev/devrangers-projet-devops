"use client"

import { useMemo, useState } from "react"
import { useDemoCollection } from "@/lib/demo-store"
import { CalendarDays, CheckCircle2, Eye, Pencil, Plus, Search, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

import { MeetingCalendar } from "./meeting-calendar"
import { MeetingDetails } from "./meeting-details"
import { MeetingForm } from "./meeting-form"
import type { Meeting, MeetingStatus } from "./types"

const statuses = ["Toutes", "Planifiée", "Terminée", "Annulée"] as const
type StatusFilter = (typeof statuses)[number]

function readableDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`))
}

function statusBadge(status: MeetingStatus) {
  if (status === "Annulée") return <Badge variant="destructive">Annulée</Badge>
  if (status === "Terminée") return <Badge variant="secondary">Terminée</Badge>
  return <Badge variant="outline">Planifiée</Badge>
}

export function MeetingsClient() {
  const [meetings, setMeetings] = useDemoCollection("meetings")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<StatusFilter>("Toutes")
  const [formOpen, setFormOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formVersion, setFormVersion] = useState(0)
  const [view, setView] = useState<"list" | "calendar">("list")

  const selected = meetings.find((meeting) => meeting.id === selectedId) ?? null
  const filteredMeetings = useMemo(() =>
    meetings
      .filter((meeting) => {
        const query = search.trim().toLocaleLowerCase("fr")
        const text = `${meeting.title} ${meeting.location} ${meeting.description}`.toLocaleLowerCase("fr")
        return (!query || text.includes(query)) && (filter === "Toutes" || meeting.status === filter)
      })
      .sort((a, b) => (`${b.date}T${b.startTime}`).localeCompare(`${a.date}T${a.startTime}`)),
    [meetings, search, filter]
  )

  function openCreate() {
    setSelectedId(null)
    setEditingMeeting(null)
    setFormVersion((value) => value + 1)
    setFormOpen(true)
  }

  function openEdit(meeting: Meeting) {
    setSelectedId(null)
    setEditingMeeting(meeting)
    setFormVersion((value) => value + 1)
    setFormOpen(true)
  }

  function saveMeeting(meeting: Meeting) {
    setMeetings((current) => {
      const exists = current.some((item) => item.id === meeting.id)
      return exists
        ? current.map((item) => item.id === meeting.id ? meeting : item)
        : [meeting, ...current]
    })
  }

  const planned = meetings.filter((m) => m.status === "Planifiée").length
  const finished = meetings.filter((m) => m.status === "Terminée").length

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gestion des réunions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Planifiez les réunions du comité, sélectionnez les participants et préparez les ordres du jour.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" /> Nouvelle réunion
        </Button>
      </div>

      <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Démonstration frontend : les changements restent en mémoire et seront perdus après actualisation.
        Aucun appel API et aucune sauvegarde en base de données.
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="flex items-center gap-4 p-5">
          <CalendarDays className="size-8 text-muted-foreground" />
          <div><p className="text-sm text-muted-foreground">Total réunions</p>
            <p className="text-2xl font-bold">{meetings.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5">
          <Users className="size-8 text-muted-foreground" />
          <div><p className="text-sm text-muted-foreground">Planifiées</p>
            <p className="text-2xl font-bold">{planned}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-4 p-5">
          <CheckCircle2 className="size-8 text-muted-foreground" />
          <div><p className="text-sm text-muted-foreground">Terminées</p>
            <p className="text-2xl font-bold">{finished}</p></div>
        </CardContent></Card>
      </div>

      <Card>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button variant={view === "list" ? "default" : "outline"} size="sm"
              onClick={() => setView("list")}>Liste</Button>
            <Button variant={view === "calendar" ? "default" : "outline"} size="sm"
              onClick={() => setView("calendar")}>Calendrier</Button>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Rechercher une réunion..."
                aria-label="Rechercher une réunion" value={search}
                onChange={(event) => setSearch(event.target.value)} />
            </div>
            <Select value={filter} onValueChange={(value) => setFilter(value as StatusFilter)}>
              <SelectTrigger className="sm:w-40"><SelectValue placeholder="Filtrer par statut" /></SelectTrigger>
              <SelectContent>{statuses.map((status) => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}</SelectContent>
            </Select>
          </div>
        </div>
        {view === "list" ? <>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Réunion</TableHead>
            <TableHead>Date et heure</TableHead>
            <TableHead>Salle</TableHead>
            <TableHead>Participants</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filteredMeetings.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                Aucune réunion ne correspond aux filtres.
              </TableCell></TableRow>
            ) : filteredMeetings.map((meeting) => (
              <TableRow key={meeting.id}>
                <TableCell className="min-w-48 font-medium">{meeting.title}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {readableDate(meeting.date)}<br />
                  <span className="text-xs text-muted-foreground">
                    {meeting.startTime} – {meeting.endTime}
                  </span>
                </TableCell>
                <TableCell className="min-w-36">{meeting.location}</TableCell>
                <TableCell>{meeting.participantIds.length}</TableCell>
                <TableCell>{statusBadge(meeting.status)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedId(meeting.id)}>
                      <Eye className="mr-1 size-4" /> Détails
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(meeting)}>
                      <Pencil className="mr-1 size-4" /> Modifier
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="p-4 text-xs text-muted-foreground">
          {filteredMeetings.length} réunion(s) affichée(s) sur {meetings.length}.
        </p>
        </> : <MeetingCalendar meetings={filteredMeetings}
          onSelectMeeting={(id) => setSelectedId(id)} />}
      </Card>

      <MeetingForm
        key={formVersion}
        open={formOpen}
        initialMeeting={editingMeeting}
        onOpenChange={setFormOpen}
        onSave={saveMeeting}
      />
      <MeetingDetails meeting={selected} onClose={() => setSelectedId(null)} onEdit={openEdit} />
    </div>
  )
}
