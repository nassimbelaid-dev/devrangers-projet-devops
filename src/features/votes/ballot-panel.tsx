"use client"

import { ChevronDown, Info } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import type { CommitteeMemberRecord } from "@/features/members/types"
import type { BallotSession, BallotSummary, VoteChoice } from "./types"

const voteChoices: { value: VoteChoice; label: string }[] = [
  { value: "pour", label: "Pour" },
  { value: "contre", label: "Contre" },
  { value: "abstention", label: "Abstention" },
]

interface Props {
  ballot: BallotSession
  summary: BallotSummary
  members: CommitteeMemberRecord[]
  onTogglePresence: (memberId: string, present: boolean) => void
  onVote: (seatId: string, memberId: string, choice: VoteChoice | null) => void
}

export function BallotPanel({ ballot, summary, members, onTogglePresence, onVote }: Props) {
  const locked = ballot.state === "Clôturé"
  const membersById = new Map(members.map((member) => [member.id, member]))
  const present = new Set(ballot.presentMemberIds)

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Votes par siège</h3>
          <p className="text-sm leading-6 text-muted-foreground">Chaque siège dispose d'une seule voix. Gérez les présences uniquement si nécessaire.</p>
        </div>
        <p className="text-xs text-muted-foreground">{summary.votesCast} / {summary.representedSeatCount} bulletin(s) enregistré(s)</p>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        {summary.seats.map((seat, index) => {
          const representative = seat.representativeId ? membersById.get(seat.representativeId) : undefined
          const currentVote = ballot.votes[seat.seatId]
          const selected = currentVote?.memberId === seat.representativeId ? currentVote.choice : null
          const titular = seat.titularId ? membersById.get(seat.titularId) : undefined
          const substitute = seat.substituteId ? membersById.get(seat.substituteId) : undefined

          return (
            <div key={seat.seatId} className={index > 0 ? "border-t" : ""}>
              <div className="flex flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground">{seat.seatLabel}</p>
                  <p className="text-base font-semibold">{representative?.name ?? "Aucun représentant présent"}</p>
                  <p className="text-xs text-muted-foreground">
                    {representative
                      ? `${seat.representativeKind} habilité à voter`
                      : "Activez la présence d'un titulaire ou suppléant pour voter"}
                  </p>
                </div>
                <div className="shrink-0 space-y-2">
                  <p className="text-xs text-muted-foreground lg:text-right">Choix du vote</p>
                  <div className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border bg-muted/30 p-1" role="group" aria-label={`Vote du siège ${seat.seatLabel}`}>
                    {voteChoices.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        disabled={locked || !seat.representativeId}
                        aria-pressed={selected === value}
                        onClick={() => {
                          if (!seat.representativeId) return
                          onVote(seat.seatId, seat.representativeId, selected === value ? null : value)
                        }}
                        className={`min-w-[78px] rounded-lg px-3 py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[92px] sm:text-sm ${
                          selected === value ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {selected && <p className="text-xs text-muted-foreground lg:text-right">Vote enregistré : {voteChoices.find((item) => item.value === selected)?.label}</p>}
                </div>
              </div>

              <details className="group border-t border-border/50 bg-muted/10 px-5 py-4 sm:px-7">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                  <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
                  Gérer les présences
                </summary>
                <div className="mt-5 grid gap-6 pb-2 sm:grid-cols-2">
                  <PresenceField label="Titulaire" member={titular} present={Boolean(titular && present.has(titular.id))} disabled={locked} onTogglePresence={onTogglePresence} />
                  <PresenceField label="Suppléant" member={substitute} present={Boolean(substitute && present.has(substitute.id))} disabled={locked} onTogglePresence={onTogglePresence} />
                </div>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">Si les deux sont présents, le titulaire garde la priorité. Changer de représentant efface le vote précédent du siège.</p>
              </details>
            </div>
          )
        })}
        {summary.activeSeatCount === 0 && (
          <p className="px-6 py-14 text-center text-sm text-muted-foreground">Aucun siège actif pour la date de cette réunion.</p>
        )}
      </div>

      <p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground">
        <Info className="mt-1 size-3.5 shrink-0" />
        {locked
          ? "Le scrutin est clôturé. Rouvrez la simulation pour modifier les présences ou les votes."
          : "Simulation locale : les choix et les présences ne sont pas enregistrés après actualisation de la page."}
      </p>
    </div>
  )
}

function PresenceField({ label, member, present, disabled, onTogglePresence }: {
  label: string
  member?: CommitteeMemberRecord
  present: boolean
  disabled: boolean
  onTogglePresence: (memberId: string, present: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{member?.name ?? "Non désigné"}</p>
      </div>
      {member ? (
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs">
          <Checkbox
            aria-label={`Présence de ${member.name}`}
            checked={present}
            disabled={disabled}
            onCheckedChange={(checked) => onTogglePresence(member.id, checked === true)}
          />
          Présent
        </label>
      ) : <span className="text-xs text-muted-foreground">Vacant</span>}
    </div>
  )
}
