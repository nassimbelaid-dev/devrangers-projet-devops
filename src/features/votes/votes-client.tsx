"use client"

import { useMemo, useState } from "react"
import { useDemoCollection, useDemoData } from "@/lib/demo-store"
import { CalendarDays, LockKeyhole, LockOpen, Plus, RotateCcw, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { committeeSeats } from "@/features/members/mock-data"
import type { DecisionRecord } from "@/features/decisions/types"
import { BallotPanel } from "./ballot-panel"
import { CreateBallotDialog } from "./create-ballot-dialog"
import { ResultsPanel } from "./results-panel"
import type { BallotSession, VoteChoice } from "./types"
import { calculateBallot, removeStaleVotes, seatRepresentations } from "./utils"

const readableDate = (date: string) => date
  ? new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
  : "Date non définie"

export function VotesClient() {
  const { meetings, members, decisions } = useDemoData()
  const decisionById = (id: string): DecisionRecord | undefined => decisions.find((item) => item.id === id)
  const meetingById = (id: string) => meetings.find((item) => item.id === id)
  const meetingDateFor = (decisionId: string) => meetingById(decisionById(decisionId)?.meetingId ?? "")?.date ?? ""
  const [ballots, setBallots] = useDemoCollection("ballots")
  const [selectedId, setSelectedId] = useState("")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [createOpen, setCreateOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [tab, setTab] = useState("vote")

  const selected = ballots.find((item) => item.id === selectedId) ?? ballots[0]
  const decision = selected ? decisionById(selected.decisionId) : undefined
  const meeting = decision ? meetingById(decision.meetingId) : undefined
  const summary = selected ? calculateBallot(selected, members, committeeSeats, meeting?.date ?? "") : null

  const availableDecisions = decisions.filter((item) => !ballots.some((ballot) => ballot.decisionId === item.id))
  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr")
    return ballots.filter((ballot) => {
      if (filter !== "all" && ballot.state !== filter) return false
      const linked = decisionById(ballot.decisionId)
      const haystack = `${linked?.reference ?? ""} ${linked?.title ?? ""}`.toLocaleLowerCase("fr")
      return !query || haystack.includes(query)
    })
  }, [ballots, search, filter, decisions])

  const adoptedCount = ballots.filter((ballot) => calculateBallot(ballot, members, committeeSeats, meetingDateFor(ballot.decisionId)).outcome === "Adoptée").length
  const openCount = ballots.filter((ballot) => ballot.state === "Ouvert").length

  function updateSelected(updater: (ballot: BallotSession) => BallotSession) {
    if (!selected) return
    setBallots((current) => current.map((ballot) => ballot.id === selected.id ? updater(ballot) : ballot))
  }

  function changePresence(memberId: string, isPresent: boolean) {
    updateSelected((ballot) => {
      if (ballot.state === "Clôturé") return ballot
      const newPresence = isPresent
        ? Array.from(new Set([...ballot.presentMemberIds, memberId]))
        : ballot.presentMemberIds.filter((id) => id !== memberId)
      const seats = seatRepresentations(members, committeeSeats, meetingDateFor(ballot.decisionId), newPresence)
      return { ...ballot, presentMemberIds: newPresence, votes: removeStaleVotes(ballot.votes, seats) }
    })
  }

  function changeVote(seatId: string, memberId: string, choice: VoteChoice | null) {
    updateSelected((ballot) => {
      if (ballot.state === "Clôturé") return ballot
      const seats = seatRepresentations(members, committeeSeats, meetingDateFor(ballot.decisionId), ballot.presentMemberIds)
      if (!seats.some((seat) => seat.seatId === seatId && seat.representativeId === memberId)) return ballot
      const votes = { ...ballot.votes }
      if (choice === null) delete votes[seatId]
      else votes[seatId] = { seatId, memberId, choice }
      return { ...ballot, votes }
    })
  }

  function createBallot(decisionId: string) {
    if (!availableDecisions.some((item) => item.id === decisionId)) return
    const id = `vote-${Date.now()}`
    const newBallot: BallotSession = {
      id, decisionId, state: "Ouvert", quorumPercent: 60,
      presentMemberIds: [], votes: {},
    }
    setBallots((current) => [newBallot, ...current])
    setSelectedId(id)
    setSearch("")
    setFilter("all")
    setTab("vote")
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-12 pb-16 sm:space-y-14">
      {/* Header : une seule action principale, aucune carte décorative. */}
      <header className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
        <div className="max-w-2xl space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">Votes et résultats</h1>
          <p className="text-sm leading-7 text-muted-foreground sm:text-base">
            Organisez les scrutins et consultez leurs résultats.
          </p>
          
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus className="mr-2 size-4" /> Nouveau scrutin
        </Button>
      </header>

      {/* Chiffres utiles, présentés sans succession de cartes. */}
      <section aria-label="Aperçu des scrutins" className="grid grid-cols-3 divide-x rounded-xl border bg-card py-6 sm:py-8">
        <SmallMetric label="Total" value={ballots.length} />
        <SmallMetric label="En cours" value={openCount} />
        <SmallMetric label="Adoptés" value={adoptedCount} />
      </section>

      {/* Tous les scrutins : grille lisible qui remplace le panneau latéral serré. */}
      <section aria-labelledby="ballots-heading" className="space-y-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="space-y-2">
            <h2 id="ballots-heading" className="text-xl font-semibold tracking-tight">Scrutins</h2>
            <p className="text-sm text-muted-foreground">Sélectionnez une décision pour consulter ou modifier son vote.</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
            <div className="relative min-w-0 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Rechercher un scrutin" placeholder="Rechercher…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger aria-label="Filtrer les scrutins" className="w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="Ouvert">En cours</SelectItem>
                <SelectItem value="Clôturé">Clôturés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((ballot) => {
            const linked = decisionById(ballot.decisionId)
            const active = selected?.id === ballot.id
            return (
              <button
                key={ballot.id}
                type="button"
                aria-pressed={active}
                onClick={() => { setSelectedId(ballot.id); setTab("vote") }}
                className={`min-w-0 rounded-xl border bg-card p-5 text-left transition-colors hover:border-foreground/30 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "border-primary/60 ring-1 ring-primary/20" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium tracking-wide text-muted-foreground">{linked?.reference ?? ballot.id}</span>
                  <Badge variant={ballot.state === "Ouvert" ? "outline" : "secondary"} className="font-normal">{ballot.state}</Badge>
                </div>
                <p className="mt-4 line-clamp-2 min-h-10 text-sm font-medium leading-5">{linked?.title ?? "Décision sans titre"}</p>
                <p className="mt-4 text-xs text-muted-foreground">{readableDate(meetingDateFor(ballot.decisionId))}</p>
              </button>
            )
          })}
          {visible.length === 0 && <p className="col-span-full rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">Aucun scrutin ne correspond à cette recherche.</p>}
        </div>
      </section>

      {selected && summary ? (
        <section aria-labelledby="active-ballot-heading" className="space-y-9 border-t pt-10 sm:pt-12">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
            <div className="max-w-3xl space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Scrutin sélectionné</span>
                <Badge variant={selected.state === "Ouvert" ? "outline" : "secondary"}>{selected.state}</Badge>
                <span className="text-xs text-muted-foreground">{decision?.reference ?? "Décision"}</span>
              </div>
              <h2 id="active-ballot-heading" className="text-2xl font-semibold leading-snug tracking-tight">{decision?.title ?? "Décision inconnue"}</h2>
              {decision?.description && <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{decision.description}</p>}
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4" />{meeting?.title ?? "Réunion inconnue"} · {readableDate(meeting?.date ?? "")}</p>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {selected.state === "Ouvert" ? (
                <>
                  <Button variant="outline" onClick={() => updateSelected((ballot) => ({ ...ballot, votes: {} }))}>
                    <RotateCcw className="mr-2 size-4" /> Effacer les votes
                  </Button>
                  <Button onClick={() => setCloseOpen(true)}><LockKeyhole className="mr-2 size-4" /> Clôturer</Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => updateSelected((ballot) => ({ ...ballot, state: "Ouvert" }))}>
                  <LockOpen className="mr-2 size-4" /> Rouvrir le scrutin
                </Button>
              )}
            </div>
          </div>

          {/* Un seul panneau de quorum au lieu de trois cartes de chiffres. */}
          <div className="rounded-2xl border bg-card px-6 py-7 sm:px-8 sm:py-8">
            <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-center">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-base font-semibold">Quorum de participation</h3>
                  <span className={`text-xs font-medium ${summary.quorumReached ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    {summary.quorumReached ? "● Atteint" : "○ Non atteint"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{summary.representedSeatCount} / {summary.activeSeatCount}</span> sièges représentés
                  <span className="mx-2">·</span>minimum requis : {summary.quorumMinSeats}
                </p>
              </div>
              <div className="space-y-2 lg:text-right">
                <label htmlFor="quorum-percentage" className="block text-xs font-medium text-muted-foreground">Seuil requis</label>
                <Select value={String(selected.quorumPercent)} disabled={selected.state === "Clôturé"} onValueChange={(value) => updateSelected((ballot) => ({ ...ballot, quorumPercent: Number(value) }))}>
                  <SelectTrigger id="quorum-percentage" className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50 % des sièges</SelectItem>
                    <SelectItem value="60">60 % des sièges</SelectItem>
                    <SelectItem value="67">67 % des sièges</SelectItem>
                    <SelectItem value="75">75 % des sièges</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-7 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Participation au quorum" aria-valuenow={summary.participationPercent} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${summary.participationPercent}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
              <span>Participation : {summary.participationPercent} %</span>
              <span>{summary.votesCast} vote(s) enregistré(s)</span>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="space-y-8">
            <TabsList className="h-auto w-full justify-start gap-6 rounded-none border-b bg-transparent p-0 sm:gap-10">
              <TabsTrigger value="vote" className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-4 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                Présences et votes
              </TabsTrigger>
              <TabsTrigger value="resultats" className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-4 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                Résultats
              </TabsTrigger>
            </TabsList>
            <TabsContent value="vote" className="mt-0">
              <BallotPanel ballot={selected} summary={summary} members={members} onTogglePresence={changePresence} onVote={changeVote} />
            </TabsContent>
            <TabsContent value="resultats" className="mt-0">
              <ResultsPanel ballot={selected} summary={summary} members={members} />
            </TabsContent>
          </Tabs>
        </section>
      ) : (
        <div className="rounded-xl border border-dashed px-8 py-16 text-center text-sm text-muted-foreground">Créez un scrutin pour commencer.</div>
      )}

      <CreateBallotDialog open={createOpen} onOpenChange={setCreateOpen} availableDecisions={availableDecisions} onCreate={createBallot} />
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent className="gap-6 p-7 sm:max-w-lg sm:p-8">
          <DialogHeader className="space-y-3">
            <DialogTitle>Clôturer le scrutin ?</DialogTitle>
            <DialogDescription className="leading-6">
              Le résultat sera calculé à partir des présences et des votes enregistrés. Un quorum non atteint empêchera l'adoption. Cette simulation pourra être rouverte.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCloseOpen(false)}>Annuler</Button>
            <Button onClick={() => { updateSelected((ballot) => ({ ...ballot, state: "Clôturé" })); setCloseOpen(false); setTab("resultats") }}>
              <LockKeyhole className="mr-2 size-4" /> Clôturer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SmallMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-2 px-3 text-center sm:px-6">
      <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
      <p className="text-2xl font-semibold tracking-tight sm:text-3xl">{value}</p>
    </div>
  )
}
