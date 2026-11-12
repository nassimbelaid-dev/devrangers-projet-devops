"use client"

import { AlertCircle, CheckCircle2, ChevronDown, CircleHelp, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { CommitteeMemberRecord } from "@/features/members/types"
import type { BallotSession, BallotSummary } from "./types"
import { outcomeLabel } from "./utils"

interface Props {
  ballot: BallotSession
  summary: BallotSummary
  members: CommitteeMemberRecord[]
}

export function ResultsPanel({ ballot, summary, members }: Props) {
  const { pour, contre, abstention, votesCast } = summary
  const percentage = (value: number) => votesCast ? Math.round(value * 100 / votesCast) : 0
  const memberName = (id: string) => members.find((member) => member.id === id)?.name ?? "Membre inconnu"
  const ResultIcon = ballot.state === "Ouvert" ? CircleHelp
    : summary.outcome === "Adoptée" ? CheckCircle2
      : summary.outcome === "Rejetée" ? XCircle : AlertCircle

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Résultat du scrutin</h3>
        <p className="text-sm text-muted-foreground">Répartition des bulletins et état de la décision.</p>
      </div>

      <section className="flex flex-col gap-5 rounded-2xl border bg-card p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-8" aria-label="Issue du scrutin">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted">
          <ResultIcon className="size-5 text-foreground" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{ballot.state === "Ouvert" ? "En attente de clôture" : "Décision finale (simulation)"}</p>
          <p className="text-xl font-semibold tracking-tight">{outcomeLabel(summary.outcome)}</p>
          <p className="text-sm leading-6 text-muted-foreground">
            {ballot.state === "Ouvert"
              ? "Le décompte est provisoire tant que le scrutin reste ouvert."
              : summary.outcome === "Quorum non atteint"
                ? "Le nombre de sièges représentés ne permet pas de valider la décision."
                : summary.outcome === "Adoptée"
                  ? "Les voix Pour dépassent les voix Contre."
                  : "Les voix Pour ne dépassent pas les voix Contre."}
          </p>
        </div>
      </section>

      {/* Une seule surface pour les trois votes : pas de trois cartes imbriquées. */}
      <section className="space-y-6" aria-label="Répartition des voix">
        <div className="grid grid-cols-3 divide-x rounded-xl border bg-card py-6">
          <ResultMetric label="Pour" count={pour} />
          <ResultMetric label="Contre" count={contre} />
          <ResultMetric label="Abstention" count={abstention} />
        </div>
        <div className="space-y-5 rounded-2xl border bg-card px-6 py-7 sm:px-8 sm:py-8">
          <h4 className="text-sm font-semibold">Répartition des bulletins</h4>
          <VoteBar label="Pour" count={pour} percent={percentage(pour)} color="bg-emerald-500" />
          <VoteBar label="Contre" count={contre} percent={percentage(contre)} color="bg-rose-500" />
          <VoteBar label="Abstention" count={abstention} percent={percentage(abstention)} color="bg-amber-500" />
          <p className="pt-2 text-xs text-muted-foreground">{votesCast} bulletins enregistrés · {summary.uncastCount} siège(s) représenté(s) sans bulletin</p>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="quorum-summary-heading">
        <h4 id="quorum-summary-heading" className="text-sm font-semibold">Participation et quorum</h4>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border bg-card p-6 sm:p-7">
          <span className="text-2xl font-semibold tracking-tight">{summary.participationPercent} %</span>
          <div className="flex-1 text-sm leading-6 text-muted-foreground">
            {summary.representedSeatCount} sièges représentés sur {summary.activeSeatCount} · Seuil requis : {summary.quorumMinSeats} sièges ({ballot.quorumPercent} %)
          </div>
          <Badge variant={summary.quorumReached ? "secondary" : "outline"}>
            {summary.quorumReached ? "Quorum atteint" : "Quorum non atteint"}
          </Badge>
        </div>
      </section>

      <details className="group overflow-hidden rounded-xl border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-sm font-medium hover:bg-muted/30 [&::-webkit-details-marker]:hidden sm:px-8">
          Détail des voix par siège
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="overflow-x-auto border-t px-2 pb-3 sm:px-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Siège</TableHead><TableHead>Représentant</TableHead><TableHead>Qualité</TableHead><TableHead>Vote</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.seats.map((seat) => {
                const vote = ballot.votes[seat.seatId]
                const validVote = vote?.memberId === seat.representativeId ? vote : null
                return (
                  <TableRow key={seat.seatId}>
                    <TableCell className="font-medium">{seat.seatLabel}</TableCell>
                    <TableCell>{seat.representativeId ? memberName(seat.representativeId) : "—"}</TableCell>
                    <TableCell>{seat.representativeKind ?? "—"}</TableCell>
                    <TableCell>{validVote ? (
                      <Badge variant="outline" className="font-normal">
                        {validVote.choice === "pour" ? "Pour" : validVote.choice === "contre" ? "Contre" : "Abstention"}
                      </Badge>
                    ) : <span className="text-muted-foreground">{seat.representativeId ? "Non voté" : "Absent"}</span>}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </details>

      <p className="text-xs leading-6 text-muted-foreground">
        Règles de démonstration : quorum sur les sièges représentés et majorité simple (Pour &gt; Contre).
        Les abstentions comptent pour le quorum, pas pour la majorité. Le règlement réel devra être vérifié avant tout usage officiel.
      </p>
    </div>
  )
}

function ResultMetric({ label, count }: { label: string; count: number }) {
  return <div className="space-y-2 px-3 text-center sm:px-6"><p className="text-xs text-muted-foreground sm:text-sm">{label}</p><p className="text-2xl font-semibold sm:text-3xl">{count}</p></div>
}

function VoteBar({ label, count, percent, color }: { label: string; count: number; percent: number; color: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span>{label}</span><span className="font-medium tabular-nums">{count} <span className="font-normal text-muted-foreground">· {percent} %</span></span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
