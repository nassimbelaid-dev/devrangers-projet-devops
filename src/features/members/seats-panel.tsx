"use client"

import { useState } from "react"
import { ShieldCheck, ShieldX, Vote } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"

import { committeeSeats, initialMembers } from "./mock-data"
import { mandateStatus, todayIso } from "./utils"
import type { CommitteeMemberRecord } from "./types"

export function SeatsPanel({ members }: { members: CommitteeMemberRecord[] }) {
  const [presentIds, setPresentIds] = useState<Set<string>>(() =>
    new Set(initialMembers.filter((member) => member.id !== "m3").map((member) => member.id))
  )
  const today = todayIso()

  function togglePresence(id: string, present: boolean) {
    setPresentIds((previous) => {
      const next = new Set(previous)
      if (present) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const seatRows = committeeSeats.map((seat) => {
    const active = members.filter((member) =>
      member.seatId === seat.id && mandateStatus(member, today) === "En cours"
    )
    const titular = active.find((member) => member.kind === "Titulaire")
    const substitute = active.find((member) => member.kind === "Suppléant")
    // Priorité absolue au titulaire : jamais deux représentants pour un même siège.
    const eligible = titular && presentIds.has(titular.id)
      ? titular
      : substitute && presentIds.has(substitute.id) ? substitute : null
    return { seat, titular, substitute, eligible }
  })
  const covered = seatRows.filter((row) => row.eligible).length

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card><CardContent className="flex items-center gap-3 p-5">
          <ShieldCheck className="size-8 text-muted-foreground" />
          <div><p className="text-sm text-muted-foreground">Sièges représentés</p>
            <p className="text-2xl font-semibold">{covered} / {committeeSeats.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5">
          <Vote className="size-8 text-muted-foreground" />
          <div><p className="text-sm text-muted-foreground">Représentants éligibles (simulation)</p>
            <p className="text-2xl font-semibold">{covered}</p></div>
        </CardContent></Card>
      </div>

      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <strong className="font-medium text-foreground">Simulation uniquement :</strong> coche ou décoche
        la présence de chaque membre. Le titulaire représente son siège lorsqu'il est présent ;
        sinon, le suppléant présent prend sa place. Un même siège ne peut jamais compter deux
        représentants éligibles. Aucun vote n'est réellement enregistré ou autorisé ici.
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {seatRows.map(({ seat, titular, substitute, eligible }) => (
          <Card key={seat.id}>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{seat.label}</h3>
                {eligible ? <Badge>Représenté</Badge> : <Badge variant="destructive">Non représenté</Badge>}
              </div>

              <div className="space-y-2">
                <PresenceRow label="Titulaire" member={titular} present={Boolean(titular && presentIds.has(titular.id))}
                  onChange={togglePresence} />
                <PresenceRow label="Suppléant" member={substitute} present={Boolean(substitute && presentIds.has(substitute.id))}
                  onChange={togglePresence} />
              </div>

              <div className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2 text-sm">
                {eligible ? <ShieldCheck className="size-4 shrink-0" /> : <ShieldX className="size-4 shrink-0" />}
                <span>
                  {eligible
                    ? <>Représentant éligible : <strong>{eligible.name}</strong> ({eligible.kind.toLowerCase()})</>
                    : "Aucun représentant éligible pour ce siège"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function PresenceRow({ label, member, present, onChange }: {
  label: string
  member: CommitteeMemberRecord | undefined
  present: boolean
  onChange: (memberId: string, present: boolean) => void
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 rounded-md border px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{member?.name ?? "Non désigné"}</p>
      </div>
      {member ? (
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs">
          <Checkbox checked={present} onCheckedChange={(checked) => onChange(member.id, checked === true)}
            aria-label={`Présence de ${member.name}`} />
          Présent
        </label>
      ) : <Badge variant="outline">Vacant</Badge>}
    </div>
  )
}
