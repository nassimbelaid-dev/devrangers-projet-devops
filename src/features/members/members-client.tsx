"use client"

import { useMemo, useState } from "react"
import { useDemoCollection } from "@/lib/demo-store"
import { Eye, Pencil, Plus, Search, Trash2, Users, UserCheck, UserRoundPlus, CalendarClock } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

import { MemberDetails } from "./member-details"
import { MemberForm } from "./member-form"
import { committeeSeats } from "./mock-data"
import { SeatsPanel } from "./seats-panel"
import { MEMBER_ROLES } from "./types"
import type { CommitteeMemberRecord, MandateStatus, MemberRole } from "./types"
import { formatDate, mandateStatus, todayIso, validateMemberSeat } from "./utils"

type RoleFilter = "Tous les rôles" | MemberRole
type StatusFilter = "Tous les mandats" | MandateStatus
type PageView = "members" | "seats"

function StatusBadge({ status }: { status: MandateStatus }) {
  if (status === "En cours") return <Badge>En cours</Badge>
  if (status === "À venir") return <Badge variant="outline">À venir</Badge>
  return <Badge variant="secondary">Terminé</Badge>
}

export function MembersClient() {
  const [members, setMembers] = useDemoCollection("members")
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("Tous les rôles")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Tous les mandats")
  const [view, setView] = useState<PageView>("members")
  const [formOpen, setFormOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<CommitteeMemberRecord | null>(null)
  const [formVersion, setFormVersion] = useState(0)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const today = todayIso()
  const selected = members.find((member) => member.id === detailId) ?? null
  const toDelete = members.find((member) => member.id === deleteId) ?? null

  const filteredMembers = useMemo(() => members.filter((member) => {
    const needle = search.trim().toLocaleLowerCase("fr")
    const haystack = `${member.name} ${member.email} ${member.role} ${member.phone}`.toLocaleLowerCase("fr")
    return (!needle || haystack.includes(needle)) &&
      (roleFilter === "Tous les rôles" || member.role === roleFilter) &&
      (statusFilter === "Tous les mandats" || mandateStatus(member, today) === statusFilter)
  }).sort((a, b) => a.name.localeCompare(b.name, "fr")), [members, roleFilter, search, statusFilter, today])

  const active = members.filter((member) => mandateStatus(member, today) === "En cours")
  const substitutes = active.filter((member) => member.kind === "Suppléant").length
  const expiring = active.filter((member) => {
    const remaining = new Date(`${member.mandateEnd}T12:00:00Z`).getTime() - new Date(`${today}T12:00:00Z`).getTime()
    return remaining >= 0 && remaining <= 90 * 24 * 60 * 60 * 1000
  }).length

  function openCreate() {
    setDetailId(null)
    setEditingMember(null)
    setFormVersion((value) => value + 1)
    setFormOpen(true)
  }

  function openEdit(member: CommitteeMemberRecord) {
    setDetailId(null)
    setEditingMember(member)
    setFormVersion((value) => value + 1)
    setFormOpen(true)
  }

  function saveMember(member: CommitteeMemberRecord): string | null {
    const conflict = validateMemberSeat(member, members)
    if (conflict) return conflict
    const duplicatedEmail = members.some((other) =>
      other.id !== member.id && other.email.toLowerCase() === member.email.toLowerCase()
    )
    if (duplicatedEmail) return "Cette adresse e-mail est déjà utilisée par un autre membre."
    setMembers((current) => current.some((item) => item.id === member.id)
      ? current.map((item) => item.id === member.id ? member : item)
      : [...current, member]
    )
    return null
  }

  function confirmDelete() {
    if (!deleteId) return
    setMembers((current) => current.filter((member) => member.id !== deleteId))
    setDeleteId(null)
    setDetailId(null)
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Membres et mandats</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gérez l'annuaire, les fonctions, les périodes de mandat et les suppléants du comité scientifique.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" /> Ajouter un membre
        </Button>
      </div>

      

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total des membres" value={members.length} icon={Users} />
        <StatCard title="Mandats en cours" value={active.length} icon={UserCheck} />
        <StatCard title="Suppléants actifs" value={substitutes} icon={UserRoundPlus} />
        <StatCard title="Mandats à échéance (90 j)" value={expiring} icon={CalendarClock} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={view === "members" ? "default" : "outline"} onClick={() => setView("members")}>
          Annuaire des membres
        </Button>
        <Button variant={view === "seats" ? "default" : "outline"} onClick={() => setView("seats")}>
          Sièges et suppléances
        </Button>
      </div>

      {view === "members" ? (
        <Card>
          <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-semibold">Annuaire du comité</h2>
              <p className="text-sm text-muted-foreground">{filteredMembers.length} membre(s) affiché(s)</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input className="pl-9" aria-label="Rechercher un membre" placeholder="Nom, e-mail, fonction..."
                  value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as RoleFilter)}>
                <SelectTrigger className="sm:w-48" aria-label="Filtrer par rôle"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tous les rôles">Tous les rôles</SelectItem>
                  {MEMBER_ROLES.map((role) => <SelectItem value={role} key={role}>{role}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger className="sm:w-44" aria-label="Filtrer par mandat"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["Tous les mandats", "En cours", "À venir", "Terminé"] as const).map((status) =>
                    <SelectItem value={status} key={status}>{status}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Membre</TableHead>
                <TableHead>Fonction</TableHead>
                <TableHead>Siège / qualité</TableHead>
                <TableHead>Mandat</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    Aucun membre ne correspond à ces critères.
                  </TableCell></TableRow>
                ) : filteredMembers.map((member) => {
                  const seatLabel = committeeSeats.find((seat) => seat.id === member.seatId)?.label ?? "—"
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </TableCell>
                      <TableCell>{member.role}</TableCell>
                      <TableCell>
                        <p>{seatLabel}</p>
                        <p className="text-xs text-muted-foreground">{member.kind}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDate(member.mandateStart)} — {formatDate(member.mandateEnd)}
                      </TableCell>
                      <TableCell><StatusBadge status={mandateStatus(member, today)} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" aria-label={`Voir ${member.name}`}
                            title="Voir la fiche" onClick={() => setDetailId(member.id)}><Eye className="size-4" /></Button>
                          <Button size="icon" variant="ghost" aria-label={`Modifier ${member.name}`}
                            title="Modifier" onClick={() => openEdit(member)}><Pencil className="size-4" /></Button>
                          <Button size="icon" variant="ghost" aria-label={`Supprimer ${member.name}`}
                            title="Supprimer" onClick={() => setDeleteId(member.id)}><Trash2 className="size-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : <SeatsPanel members={members} />}

      {formOpen && (
        <MemberForm key={formVersion} open={formOpen} initialMember={editingMember}
          onOpenChange={setFormOpen} onSave={saveMember} />
      )}
      {selected && <MemberDetails member={selected} members={members}
        onClose={() => setDetailId(null)} onEdit={openEdit} />}

      <Dialog open={Boolean(toDelete)} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce membre ?</DialogTitle>
            <DialogDescription>
              {toDelete?.name} sera retiré de l'annuaire, à condition de ne pas être référencé par une réunion, un scrutin ou une action.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Annuler</Button>
            <Button variant="destructive" onClick={confirmDelete}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ title, value, icon: Icon }: {
  title: string
  value: number
  icon: LucideIcon
}) {
  return (
    <Card><CardContent className="flex items-center gap-3 p-5">
      <Icon className="size-8 shrink-0 text-muted-foreground" />
      <div><p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-semibold">{value}</p></div>
    </CardContent></Card>
  )
}
