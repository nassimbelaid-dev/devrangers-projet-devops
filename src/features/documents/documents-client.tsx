"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useUiText } from "@/features/ui-text"
import {
  Archive,
  FileText,
  FolderOpen,
  Plus,
  ScrollText,
  Search,
} from "lucide-react"

import type { CommitteeDocument, DocumentType, MeetingMinutes } from "./types"
import { DOCUMENT_TYPES } from "./types"

import {
  runMeetingWorkflow,
  useDemoCollection,
  useDemoData,
} from "@/lib/demo-store"
import { hasPermission, useStaticAuth } from "@/lib/static-auth"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { canViewDocument } from "./access"
import { DocumentDetails } from "./document-details"
import { DocumentForm } from "./document-form"
import { MinutesEditor } from "./minutes-editor"
import { formatDate, makeId, meetingLabel, today } from "./utils"

type View = "library" | "minutes" | "archives"

export function DocumentsClient() {
  const t = useUiText()
  const router = useRouter()
  const pathname = usePathname()
  const { decisions } = useDemoData()
  const [, setDecisions] = useDemoCollection("decisions")
  const { user } = useStaticAuth()
  const canEditDocuments =
    hasPermission(user, "documents", "create") ||
    hasPermission(user, "documents", "edit")
  const canDeleteDocuments = hasPermission(user, "documents", "delete")
  const canArchiveDocuments = hasPermission(user, "documents", "archive")
  const canArchiveMinutes = hasPermission(user, "minutes", "archive")
  const [meetings] = useDemoCollection("meetings")
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
  const [archiveMeeting, setArchiveMeeting] = useState("all")
  const [archiveDate, setArchiveDate] = useState("")
  const [archiveType, setArchiveType] = useState("all")

  useEffect(() => {
    function updateViewFromHash() {
      setView(
        window.location.hash === "#pv"
          ? "minutes"
          : window.location.hash === "#archives"
            ? "archives"
            : "library"
      )
    }
    updateViewFromHash()
    window.addEventListener("hashchange", updateViewFromHash)
    return () => window.removeEventListener("hashchange", updateViewFromHash)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requested = params.get("minutes")
    if (requested && minutes.some((item) => item.id === requested)) {
      setSelectedMinutesId(requested)
      setView("minutes")
    }
  }, [minutes])

  const selectedDocument =
    documents.find(
      (doc) => doc.id === selectedDocId && canViewDocument(user, doc)
    ) ?? null
  const canSeeMinutes = useCallback(
    (pv: MeetingMinutes) =>
      user?.role === "secretary" ||
      user?.role === "president" ||
      pv.status === "Signé" ||
      pv.status === "Archivé",
    [user?.role]
  )
  const selectedMinutes =
    minutes.find((pv) => pv.id === selectedMinutesId && canSeeMinutes(pv)) ??
    minutes.find(canSeeMinutes)
  const canDraftMinutes = user?.role === "secretary"
  const eligibleMeetings = meetings.filter(
    (meeting) =>
      (meeting.status === "En cours" || meeting.status === "Clôturée") &&
      !minutes.some((pv) => pv.meetingId === meeting.id)
  )
  const visibleDocuments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr")
    return documents.filter((doc) => {
      if (!canViewDocument(user, doc)) return false
      const matchesText =
        !query ||
        `${doc.title} ${doc.reference} ${doc.type} ${meetingLabel(doc.meetingId, meetings)}`
          .toLocaleLowerCase("fr")
          .includes(query)
      return (
        doc.status !== "Archivé" &&
        matchesText &&
        (filterType === "all" || doc.type === filterType) &&
        (filterStatus === "all" || doc.status === filterStatus)
      )
    })
  }, [documents, search, filterStatus, filterType, meetings, user])
  const visibleMinutes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr")
    return minutes.filter((pv) => {
      const meeting = meetings.find((item) => item.id === pv.meetingId)
      const linkedDecisions = decisions.filter(
        (item) => item.meetingId === pv.meetingId
      )
      const haystack = [
        pv.reference,
        pv.summary,
        pv.nextSteps,
        pv.secretary,
        pv.president,
        meeting?.title,
        ...linkedDecisions.flatMap((item) => [
          item.reference,
          item.title,
          item.description,
          item.status,
        ]),
      ]
        .join(" ")
        .toLocaleLowerCase("fr")
      return (
        pv.status !== "Archivé" &&
        canSeeMinutes(pv) &&
        (!query || haystack.includes(query))
      )
    })
  }, [minutes, meetings, decisions, search, canSeeMinutes])
  const visibleDecisions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr")
    if (!query) return []
    return decisions.filter((item) =>
      `${item.reference} ${item.title} ${item.description} ${item.status} ${meetings.find((meeting) => meeting.id === item.meetingId)?.title ?? ""}`
        .toLocaleLowerCase("fr")
        .includes(query)
    )
  }, [decisions, meetings, search])
  const archiveItems = [
    ...documents
      .filter(
        (item) => item.status === "Archivé" && canViewDocument(user, item)
      )
      .map((item) => ({
        id: item.id,
        kind: t("Document de séance"),
        title: item.title,
        meetingId: item.meetingId,
        date: item.archivedAt,
        by: item.archivedBy,
        type: item.type,
        action: () => {
          setSelectedDocId(item.id)
          setView("library")
        },
      })),
    ...minutes
      .filter((item) => item.status === "Archivé")
      .map((item) => ({
        id: item.id,
        kind: t("Procès-verbal signé"),
        title: item.reference,
        meetingId: item.meetingId,
        date: item.archivedAt,
        by: item.archivedBy,
        type: "PV",
        action: () => {
          setSelectedMinutesId(item.id)
          setView("minutes")
        },
      })),
    ...decisions
      .filter((item) => item.archivedAt)
      .map((item) => ({
        id: item.id,
        kind: t("Décision"),
        title: `${item.reference} · ${item.title}`,
        meetingId: item.meetingId,
        date: item.archivedAt,
        by: item.archivedBy,
        type: t("Décision"),
        action: () => {
          const locale = pathname.split("/")[1] || "fr"
          router.push(
            `/${locale}/actions?decision=${encodeURIComponent(item.id)}`
          )
        },
      })),
  ]
    .filter(
      (item) =>
        (!archiveMeeting ||
          archiveMeeting === "all" ||
          item.meetingId === archiveMeeting) &&
        (!archiveDate || item.date?.slice(0, 10) === archiveDate) &&
        (archiveType === "all" || item.type === archiveType) &&
        (!search.trim() ||
          `${item.title} ${item.kind} ${meetingLabel(item.meetingId, meetings)}`
            .toLocaleLowerCase()
            .includes(search.trim().toLocaleLowerCase()))
    )
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))

  function saveDocument(next: CommitteeDocument) {
    if (
      !canEditDocuments ||
      (next.status === "Archivé" && !canArchiveDocuments)
    )
      return
    setDocuments((current) =>
      current.some((doc) => doc.id === next.id)
        ? current.map((doc) => (doc.id === next.id ? next : doc))
        : [next, ...current]
    )
  }
  function addVersion(file: File, note: string) {
    if (!canEditDocuments || !selectedDocId) return
    setDocuments((current) =>
      current.map((doc) => {
        if (doc.id !== selectedDocId) return doc
        const number =
          Math.max(0, ...doc.versions.map((version) => version.number)) + 1
        return {
          ...doc,
          updatedAt: today(),
          versions: [
            ...doc.versions,
            {
              id: makeId(),
              number,
              author: "Utilisateur démo",
              date: today(),
              filename: file.name,
              note,
              file,
            },
          ],
        }
      })
    )
  }
  function deleteDocument() {
    if (
      !canDeleteDocuments ||
      !selectedDocument ||
      !window.confirm(
        t("Supprimer « {title} » de cette session ?", {
          title: selectedDocument.title,
        })
      )
    )
      return
    setDocuments((current) =>
      current.filter((doc) => doc.id !== selectedDocument.id)
    )
    setSelectedDocId(null)
  }
  function archiveDocument() {
    if (
      !canArchiveDocuments ||
      !selectedDocument ||
      selectedDocument.status === "Archivé"
    )
      return
    if (!window.confirm(t("Archiver définitivement ce document ?"))) return
    setDocuments((current) =>
      current.map((doc) =>
        doc.id === selectedDocument.id
          ? {
              ...doc,
              status: "Archivé",
              archivedAt: new Date().toISOString(),
              archivedBy: user ? `${user.firstName} ${user.lastName}` : "",
              updatedAt: today(),
            }
          : doc
      )
    )
    setSelectedDocId(null)
  }
  function archiveDecision(id: string) {
    if (!canArchiveDocuments) return
    const decision = decisions.find((item) => item.id === id)
    if (
      !decision ||
      decision.archivedAt ||
      !window.confirm(t("Archiver cette décision ?"))
    )
      return
    setDecisions((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              archivedAt: new Date().toISOString(),
              archivedBy: user ? `${user.firstName} ${user.lastName}` : "",
            }
          : item
      )
    )
  }
  function createMinutes() {
    if (!canDraftMinutes) return
    if (
      !newMeetingId ||
      !eligibleMeetings.some((meeting) => meeting.id === newMeetingId)
    )
      return
    const meeting = meetings.find((item) => item.id === newMeetingId)
    if (!meeting) return
    const id = `pv-${makeId()}`
    const next: MeetingMinutes = {
      id,
      reference: `PV-2026-${String(minutes.length + 1).padStart(3, "0")}`,
      meetingId: newMeetingId,
      status: "Brouillon",
      presentMemberIds: Object.entries(meeting.attendance ?? {})
        .filter(([, present]) => present)
        .map(([memberId]) => memberId),
      summary: "",
      nextSteps: "",
      secretary: "Lina Amrane",
      president: "Karim Haddad",
      version: 1,
      updatedAt: today(),
    }
    setMinutes((current) => [next, ...current])
    setSelectedMinutesId(id)
    setNewMeetingId("")
    setNewMinutesOpen(false)
    setView("minutes")
  }
  function saveMinutes(next: MeetingMinutes) {
    if (canArchiveMinutes && next.status === "Archivé") {
      setMinutes((current) =>
        current.map((item) => (item.id === next.id ? next : item))
      )
      return
    }
    if (
      !canDraftMinutes ||
      next.status !== "Brouillon" ||
      !["En cours", "Clôturée"].includes(
        meetings.find((meeting) => meeting.id === next.meetingId)?.status ?? ""
      )
    )
      return
    const meeting = meetings.find((item) => item.id === next.meetingId)
    const sharedAttendance = meeting?.attendance
      ? Object.entries(meeting.attendance)
          .filter(([, present]) => present)
          .map(([memberId]) => memberId)
      : next.presentMemberIds
    setMinutes((current) =>
      current.map((item) =>
        item.id === next.id
          ? { ...next, presentMemberIds: sharedAttendance }
          : item
      )
    )
  }
  function runMinutesWorkflow(
    action: "submit-minutes" | "return-minutes" | "sign-minutes",
    pv: MeetingMinutes
  ) {
    if (!user) return t("Utilisateur non connecté.")
    const result = runMeetingWorkflow(action, pv.meetingId, user, pv.id)
    return result.error ?? null
  }
  function selectView(next: string) {
    const target = next === "minutes" || next === "archives" ? next : "library"
    setView(target)
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}${target === "minutes" ? "#pv" : target === "archives" ? "#archives" : "#bibliotheque"}`
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 pb-16 sm:space-y-12">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("Documents et procès-verbaux")}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
          {t(
            "Retrouvez les documents du comité et préparez les comptes rendus des réunions dans un espace de travail clair."
          )}
        </p>
      </header>

      <Tabs value={view} onValueChange={selectView} className="space-y-9">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="library">
            <FolderOpen className="mr-2 size-4" />
            {t("Bibliothèque")}
          </TabsTrigger>
          <TabsTrigger value="minutes">
            <ScrollText className="mr-2 size-4" />
            {t("Procès-verbaux")}
          </TabsTrigger>
          <TabsTrigger value="archives">
            <Archive className="mr-2 size-4" />
            {t("Archives")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-10">
          <div className="grid grid-cols-3 divide-x rounded-xl border bg-card py-7">
            <Metric label={t("Documents")} value={documents.length} />
            <Metric
              label={t("Validés")}
              value={documents.filter((doc) => doc.status === "Validé").length}
            />
            <Metric
              label={t("Archivés")}
              value={documents.filter((doc) => doc.status === "Archivé").length}
            />
          </div>
          <section className="space-y-6">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight">
                  {t("Bibliothèque documentaire")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("Classement, versions et rattachement aux réunions.")}
                </p>
              </div>
              {canEditDocuments && (
                <Button
                  onClick={() => {
                    setEditing(null)
                    setFormOpen(true)
                  }}
                >
                  <Plus className="mr-2 size-4" />
                  {t("Ajouter un document")}
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative min-w-0 md:max-w-sm md:flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={t("Rechercher un document…")}
                  aria-label={t("Rechercher un document")}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger
                  aria-label={t("Filtrer par type")}
                  className="w-full md:w-48"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Tous les types")}</SelectItem>
                  {DOCUMENT_TYPES.map((item: DocumentType) => (
                    <SelectItem value={item} key={item}>
                      {t(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger
                  aria-label={t("Filtrer par statut")}
                  className="w-full md:w-40"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Tous les statuts")}</SelectItem>
                  <SelectItem value="Brouillon">{t("Brouillon")}</SelectItem>
                  <SelectItem value="Validé">{t("Validé")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-muted/40 text-xs font-medium text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4 font-medium">{t("Document")}</th>
                      <th className="px-5 py-4 font-medium">{t("Type")}</th>
                      <th className="px-5 py-4 font-medium">{t("Statut")}</th>
                      <th className="px-5 py-4 font-medium">{t("Version")}</th>
                      <th className="px-5 py-4 font-medium">
                        {t("Mise à jour")}
                      </th>
                      <th className="px-6 py-4 text-right font-medium">
                        {t("Action")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {visibleDocuments.map((doc) => (
                      <tr
                        key={doc.id}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-start gap-3">
                            <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="font-medium">{doc.title}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {doc.reference} ·{" "}
                                {meetingLabel(doc.meetingId, meetings)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-5 text-muted-foreground">
                          {t(doc.type)}
                        </td>
                        <td className="px-5 py-5">
                          <Badge
                            variant={
                              doc.status === "Validé" ? "secondary" : "outline"
                            }
                          >
                            {t(doc.status)}
                          </Badge>
                        </td>
                        <td className="px-5 py-5 text-muted-foreground">
                          {doc.versions.length
                            ? `v${Math.max(...doc.versions.map((version) => version.number))}`
                            : "—"}
                        </td>
                        <td className="px-5 py-5 text-muted-foreground">
                          {formatDate(doc.updatedAt)}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedDocId(doc.id)}
                          >
                            {t("Consulter")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!visibleDocuments.length && (
                <div className="py-14 text-center text-sm text-muted-foreground">
                  {t("Aucun document ne correspond à ces critères.")}
                </div>
              )}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="minutes" className="space-y-9">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight">
                {t("Procès-verbaux")}
              </h2>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                {t(
                  "Préparation, relecture et simulation de validation des comptes rendus."
                )}
              </p>
            </div>
            {canDraftMinutes && (
              <Button
                onClick={() => setNewMinutesOpen(true)}
                disabled={!eligibleMeetings.length}
              >
                <Plus className="mr-2 size-4" />
                {t("Nouveau procès-verbal")}
              </Button>
            )}
          </div>
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t("Rechercher dans les PV et décisions…")}
              aria-label={t("Rechercher dans les PV et décisions")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleMinutes.map((pv) => (
              <button
                type="button"
                key={pv.id}
                onClick={() => setSelectedMinutesId(pv.id)}
                aria-pressed={selectedMinutes?.id === pv.id}
                className={`min-w-0 space-y-4 rounded-xl border bg-card p-5 text-left transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedMinutes?.id === pv.id ? "border-primary/60 ring-1 ring-primary/20" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    {pv.reference}
                  </span>
                  <Badge
                    variant={
                      pv.status === "Signé" || pv.status === "Archivé"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {t(pv.status)}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-sm font-semibold leading-6">
                  {meetingLabel(pv.meetingId, meetings)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("Mis à jour le {date} · v{version}", {
                    date: formatDate(pv.updatedAt),
                    version: pv.version,
                  })}
                </p>
              </button>
            ))}
          </div>
          {search.trim() && (
            <section className="space-y-3 border-t pt-6">
              <h3 className="font-semibold">
                {t("Décisions trouvées")} ({visibleDecisions.length})
              </h3>
              {visibleDecisions.length ? (
                visibleDecisions.map((decision) => (
                  <article key={decision.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">
                        {decision.reference} · {decision.title}
                      </p>
                      <Badge variant="outline">{t(decision.status)}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {decision.description}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {
                        meetings.find(
                          (meeting) => meeting.id === decision.meetingId
                        )?.title
                      }
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("Aucune décision correspondante.")}
                </p>
              )}
            </section>
          )}
          {selectedMinutes ? (
            <section className="space-y-7 border-t pt-9">
              <MinutesEditor
                key={selectedMinutes.id}
                minutes={selectedMinutes}
                onSave={saveMinutes}
                onWorkflow={runMinutesWorkflow}
              />
            </section>
          ) : (
            <p className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
              {t("Créez ou recherchez un procès-verbal.")}
            </p>
          )}
        </TabsContent>

        <TabsContent value="archives" className="space-y-7">
          <div>
            <h2 className="text-xl font-semibold">{t("Archives")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t(
                "Consultation des documents, décisions et PV archivés. Les éléments archivés sont en lecture seule."
              )}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={archiveMeeting} onValueChange={setArchiveMeeting}>
              <SelectTrigger aria-label={t("Filtrer par réunion")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("Toutes les réunions")}</SelectItem>
                {meetings.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              aria-label={t("Filtrer par date d’archivage")}
              value={archiveDate}
              onChange={(event) => setArchiveDate(event.target.value)}
            />
            <Select value={archiveType} onValueChange={setArchiveType}>
              <SelectTrigger aria-label={t("Filtrer par type de document")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("Tous les types")}</SelectItem>
                {DOCUMENT_TYPES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(item)}
                  </SelectItem>
                ))}
                <SelectItem value="PV">{t("Procès-verbal")}</SelectItem>
                <SelectItem value={t("Décision")}>{t("Décision")}</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t("Rechercher dans les archives")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-3">
            {archiveItems.map((item) => (
              <article
                key={`${item.kind}-${item.id}`}
                className="flex flex-col justify-between gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:px-5"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{item.kind}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {item.type}
                    </span>
                  </div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {meetingLabel(item.meetingId, meetings)} ·{" "}
                    {item.date ? formatDate(item.date) : "—"} ·{" "}
                    {item.by || t("Responsable inconnu")}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={item.action}>
                  {t("Consulter")}
                </Button>
              </article>
            ))}
            {!documents.some((item) => item.status === "Archivé") &&
              !minutes.some((item) => item.status === "Archivé") &&
              !decisions.some((item) => item.archivedAt) && (
                <p className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
                  {t("Aucune archive pour le moment.")}
                </p>
              )}
          </div>
          {canArchiveDocuments && (
            <section className="space-y-3 border-t pt-6">
              <h3 className="font-semibold">{t("Décisions à archiver")}</h3>
              {decisions
                .filter((item) => !item.archivedAt)
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {item.reference} · {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {meetingLabel(item.meetingId, meetings)} ·{" "}
                        {formatDate(item.date)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => archiveDecision(item.id)}
                    >
                      {t("Archiver")}
                    </Button>
                  </div>
                ))}
            </section>
          )}
        </TabsContent>
      </Tabs>

      {formOpen && (
        <DocumentForm
          key={editing?.id ?? "new"}
          open={formOpen}
          initial={editing}
          reference={`DOC-2026-${String(documents.length + 1).padStart(3, "0")}`}
          onOpenChange={setFormOpen}
          onSave={saveDocument}
        />
      )}
      <DocumentDetails
        document={selectedDocument}
        open={Boolean(selectedDocument)}
        onOpenChange={(value) => {
          if (!value) setSelectedDocId(null)
        }}
        onAddVersion={addVersion}
        onArchive={archiveDocument}
        onEdit={() => {
          if (!canEditDocuments) return
          setEditing(selectedDocument)
          setSelectedDocId(null)
          setFormOpen(true)
        }}
        onDelete={deleteDocument}
        canEdit={canEditDocuments}
        canDelete={canDeleteDocuments}
        canAddVersion={canEditDocuments}
        canArchive={canArchiveDocuments}
      />

      <Dialog open={newMinutesOpen} onOpenChange={setNewMinutesOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Nouveau procès-verbal")}</DialogTitle>
            <DialogDescription>
              {t("Sélectionnez une réunion sans procès-verbal associé.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-5">
            <Label htmlFor="pv-meeting">{t("Réunion *")}</Label>
            <Select value={newMeetingId} onValueChange={setNewMeetingId}>
              <SelectTrigger id="pv-meeting">
                <SelectValue placeholder={t("Choisir une réunion")} />
              </SelectTrigger>
              <SelectContent>
                {eligibleMeetings.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewMinutesOpen(false)}>
              {t("Annuler")}
            </Button>
            <Button disabled={!newMeetingId} onClick={createMinutes}>
              {t("Créer le brouillon")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-2 px-2 text-center">
      <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
      <p className="text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>
    </div>
  )
}
