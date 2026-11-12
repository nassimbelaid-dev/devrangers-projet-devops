"use client"

import { useEffect, useMemo, useState } from "react"
import { useDemoCollection, useDemoData } from "@/lib/demo-store"
import { Archive, FileText, FolderOpen, Plus, Search, ScrollText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DocumentDetails } from "./document-details"
import { DocumentForm } from "./document-form"
import { MinutesEditor } from "./minutes-editor"
import { DOCUMENT_TYPES } from "./types"
import type { CommitteeDocument, DocumentType, MeetingMinutes } from "./types"
import { formatDate, makeId, meetingLabel, today } from "./utils"

type View = "library" | "minutes"

export function DocumentsClient() {
  const { meetings } = useDemoData()
  const [view, setView] = useState<View>("library")
  const [documents, setDocuments] = useDemoCollection("documents")
  const [minutes, setMinutes] = useDemoCollection("minutes")
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [selectedMinutesId, setSelectedMinutesId] = useState<string>("")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CommitteeDocument | null>(null)
  const [newMinutesOpen, setNewMinutesOpen] = useState(false)
  const [newMeetingId, setNewMeetingId] = useState("")
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")

  useEffect(() => {
    function updateViewFromHash() { setView(window.location.hash === "#pv" ? "minutes" : "library") }
    updateViewFromHash()
    window.addEventListener("hashchange", updateViewFromHash)
    return () => window.removeEventListener("hashchange", updateViewFromHash)
  }, [])

  const selectedDocument = documents.find((doc) => doc.id === selectedDocId) ?? null
  const selectedMinutes = minutes.find((pv) => pv.id === selectedMinutesId) ?? minutes[0]
  const eligibleMeetings = meetings.filter((meeting) => !minutes.some((pv) => pv.meetingId === meeting.id))
  const visibleDocuments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr")
    return documents.filter((doc) => {
      const matchesText = !query || `${doc.title} ${doc.reference} ${doc.type} ${meetingLabel(doc.meetingId)}`.toLocaleLowerCase("fr").includes(query)
      return matchesText && (filterType === "all" || doc.type === filterType) && (filterStatus === "all" || doc.status === filterStatus)
    })
  }, [documents, search, filterStatus, filterType])

  function saveDocument(next: CommitteeDocument) {
    setDocuments((current) => current.some((doc) => doc.id === next.id)
      ? current.map((doc) => doc.id === next.id ? next : doc)
      : [next, ...current])
  }
  function addVersion(file: File, note: string) {
    if (!selectedDocId) return
    setDocuments((current) => current.map((doc) => {
      if (doc.id !== selectedDocId) return doc
      const number = Math.max(0, ...doc.versions.map((version) => version.number)) + 1
      return { ...doc, updatedAt: today(), versions: [...doc.versions, { id: makeId(), number, author: "Utilisateur démo", date: today(), filename: file.name, note, file }] }
    }))
  }
  function deleteDocument() {
    if (!selectedDocument || !window.confirm(`Supprimer « ${selectedDocument.title} » de cette session ?`)) return
    setDocuments((current) => current.filter((doc) => doc.id !== selectedDocument.id))
    setSelectedDocId(null)
  }
  function createMinutes() {
    if (!newMeetingId || !eligibleMeetings.some((meeting) => meeting.id === newMeetingId)) return
    const meeting = meetings.find((item) => item.id === newMeetingId)
    if (!meeting) return
    const id = `pv-${makeId()}`
    const next: MeetingMinutes = {
      id, reference: `PV-2026-${String(minutes.length + 1).padStart(3, "0")}`,
      meetingId: newMeetingId, status: "Brouillon", presentMemberIds: [], summary: "", nextSteps: "",
      secretary: "Lina Amrane", president: "Karim Haddad", version: 1, updatedAt: today(),
    }
    setMinutes((current) => [next, ...current])
    setSelectedMinutesId(id)
    setNewMeetingId("")
    setNewMinutesOpen(false)
    setView("minutes")
  }
  function selectView(next: string) {
    const target = next === "minutes" ? "minutes" : "library"
    setView(target)
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${target === "minutes" ? "#pv" : "#bibliotheque"}`)
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 pb-16 sm:space-y-12">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Documents et procès-verbaux</h1>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">Retrouvez les documents du comité et préparez les comptes rendus des réunions dans un espace de travail clair.</p>
        
      </header>

      <Tabs value={view} onValueChange={selectView} className="space-y-9">
        <TabsList>
          <TabsTrigger value="library"><FolderOpen className="mr-2 size-4" />Bibliothèque</TabsTrigger>
          <TabsTrigger value="minutes"><ScrollText className="mr-2 size-4" />Procès-verbaux</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-10">
          <div className="grid grid-cols-3 divide-x rounded-xl border bg-card py-7">
            <Metric label="Documents" value={documents.length} />
            <Metric label="Validés" value={documents.filter((doc) => doc.status === "Validé").length} />
            <Metric label="Archivés" value={documents.filter((doc) => doc.status === "Archivé").length} />
          </div>
          <section className="space-y-6">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div className="space-y-2"><h2 className="text-xl font-semibold tracking-tight">Bibliothèque documentaire</h2><p className="text-sm text-muted-foreground">Classement, versions et rattachement aux réunions.</p></div>
              <Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="mr-2 size-4" />Ajouter un document</Button>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative min-w-0 md:max-w-sm md:flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Rechercher un document…" aria-label="Rechercher un document" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger aria-label="Filtrer par type" className="w-full md:w-48"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Tous les types</SelectItem>{DOCUMENT_TYPES.map((item: DocumentType) => <SelectItem value={item} key={item}>{item}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger aria-label="Filtrer par statut" className="w-full md:w-40"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Tous les statuts</SelectItem><SelectItem value="Brouillon">Brouillon</SelectItem><SelectItem value="Validé">Validé</SelectItem><SelectItem value="Archivé">Archivé</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-muted/40 text-xs font-medium text-muted-foreground"><tr><th className="px-6 py-4 font-medium">Document</th><th className="px-5 py-4 font-medium">Type</th><th className="px-5 py-4 font-medium">Statut</th><th className="px-5 py-4 font-medium">Version</th><th className="px-5 py-4 font-medium">Mise à jour</th><th className="px-6 py-4 text-right font-medium">Action</th></tr></thead>
                  <tbody className="divide-y">
                    {visibleDocuments.map((doc) => (
                      <tr key={doc.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-6 py-5"><div className="flex items-start gap-3"><FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="font-medium">{doc.title}</p><p className="mt-1 text-xs text-muted-foreground">{doc.reference} · {meetingLabel(doc.meetingId)}</p></div></div></td>
                        <td className="px-5 py-5 text-muted-foreground">{doc.type}</td>
                        <td className="px-5 py-5"><Badge variant={doc.status === "Validé" ? "secondary" : "outline"}>{doc.status}</Badge></td>
                        <td className="px-5 py-5 text-muted-foreground">{doc.versions.length ? `v${Math.max(...doc.versions.map((version) => version.number))}` : "—"}</td>
                        <td className="px-5 py-5 text-muted-foreground">{formatDate(doc.updatedAt)}</td>
                        <td className="px-6 py-5 text-right"><Button size="sm" variant="ghost" onClick={() => setSelectedDocId(doc.id)}>Consulter</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!visibleDocuments.length && <div className="py-14 text-center text-sm text-muted-foreground">Aucun document ne correspond à ces critères.</div>}
            </div>
            
          </section>
        </TabsContent>

        <TabsContent value="minutes" className="space-y-9">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="space-y-2"><h2 className="text-xl font-semibold tracking-tight">Procès-verbaux</h2><p className="max-w-xl text-sm leading-6 text-muted-foreground">Préparation, relecture et simulation de validation des comptes rendus.</p></div>
            <Button onClick={() => setNewMinutesOpen(true)} disabled={!eligibleMeetings.length}><Plus className="mr-2 size-4" />Nouveau procès-verbal</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {minutes.map((pv) => <button type="button" key={pv.id} onClick={() => setSelectedMinutesId(pv.id)} aria-pressed={selectedMinutes?.id === pv.id} className={`min-w-0 space-y-4 rounded-xl border bg-card p-5 text-left transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedMinutes?.id === pv.id ? "border-primary/60 ring-1 ring-primary/20" : ""}`}>
              <div className="flex items-center justify-between gap-3"><span className="text-xs font-medium text-muted-foreground">{pv.reference}</span><Badge variant={pv.status === "Validé" ? "secondary" : "outline"}>{pv.status}</Badge></div>
              <p className="line-clamp-2 text-sm font-semibold leading-6">{meetingLabel(pv.meetingId)}</p>
              <p className="text-xs text-muted-foreground">Mis à jour le {formatDate(pv.updatedAt)} · v{pv.version}</p>
            </button>)}
          </div>
          {selectedMinutes ? <section className="space-y-7 border-t pt-9"><MinutesEditor key={selectedMinutes.id} minutes={selectedMinutes} onSave={(next) => setMinutes((current) => current.map((item) => item.id === next.id ? next : item))} /></section> : <p className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">Créez un premier procès-verbal.</p>}
        </TabsContent>
      </Tabs>

      {formOpen && <DocumentForm key={editing?.id ?? "new"} open={formOpen} initial={editing} reference={`DOC-2026-${String(documents.length + 1).padStart(3, "0")}`} onOpenChange={setFormOpen} onSave={saveDocument} />}
      <DocumentDetails document={selectedDocument} open={Boolean(selectedDocument)} onOpenChange={(value) => { if (!value) setSelectedDocId(null) }} onAddVersion={addVersion} onEdit={() => { setEditing(selectedDocument); setSelectedDocId(null); setFormOpen(true) }} onDelete={deleteDocument} />

      <Dialog open={newMinutesOpen} onOpenChange={setNewMinutesOpen}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Nouveau procès-verbal</DialogTitle><DialogDescription>Sélectionnez une réunion sans procès-verbal associé.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-5"><Label htmlFor="pv-meeting">Réunion *</Label><Select value={newMeetingId} onValueChange={setNewMeetingId}><SelectTrigger id="pv-meeting"><SelectValue placeholder="Choisir une réunion" /></SelectTrigger><SelectContent>{eligibleMeetings.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}</SelectContent></Select></div>
          <DialogFooter><Button variant="outline" onClick={() => setNewMinutesOpen(false)}>Annuler</Button><Button disabled={!newMeetingId} onClick={createMinutes}>Créer le brouillon</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="space-y-2 px-2 text-center"><p className="text-xs text-muted-foreground sm:text-sm">{label}</p><p className="text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p></div>
}
