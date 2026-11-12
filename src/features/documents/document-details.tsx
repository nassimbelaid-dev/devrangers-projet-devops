"use client"

import { useState } from "react"
import { Download, FileClock, FileText, Pencil, Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CommitteeDocument, DocumentVersion } from "./types"
import { formatDate, meetingLabel } from "./utils"

interface Props {
  document: CommitteeDocument | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
  onDelete: () => void
  onAddVersion: (file: File, note: string) => void
}

export function DocumentDetails({ document: item, open, onOpenChange, onEdit, onDelete, onAddVersion }: Props) {
  const [showUpload, setShowUpload] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  if (!item) return null

  function openVersion(version: DocumentVersion) {
    if (!version.file) return
    const url = URL.createObjectURL(version.file)
    const link = window.document.createElement("a")
    link.href = url
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    link.download = version.filename
    window.document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  function submitVersion() {
    if (!file) return setError("Sélectionnez un fichier.")
    if (file.size > 10 * 1024 * 1024) return setError("Fichier supérieur à 10 Mo.")
    onAddVersion(file, note.trim() || "Nouvelle version")
    setFile(null)
    setNote("")
    setError("")
    setShowUpload(false)
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { onOpenChange(value); if (!value) { setShowUpload(false); setFile(null); setError("") } }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-3 pr-5">
            <span className="text-xs font-medium tracking-wide text-muted-foreground">{item.reference}</span>
            <Badge variant="secondary">{item.status}</Badge>
          </div>
          <DialogTitle className="pt-2 text-xl leading-snug">{item.title}</DialogTitle>
          <DialogDescription>Informations et historique des versions du document.</DialogDescription>
        </DialogHeader>

        <div className="space-y-9 py-4">
          <div className="grid gap-5 text-sm sm:grid-cols-2">
            <div className="space-y-1"><p className="text-xs text-muted-foreground">Type</p><p>{item.type}</p></div>
            <div className="space-y-1"><p className="text-xs text-muted-foreground">Accès simulé</p><p>{item.visibility}</p></div>
            <div className="space-y-1"><p className="text-xs text-muted-foreground">Réunion</p><p>{meetingLabel(item.meetingId)}</p></div>
            <div className="space-y-1"><p className="text-xs text-muted-foreground">Dernière modification</p><p>{formatDate(item.updatedAt)}</p></div>
          </div>
          {item.description && <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{item.description}</p>}

          <section className="space-y-5 border-t pt-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="font-semibold">Historique des versions</h3><p className="mt-1 text-xs text-muted-foreground">Les fichiers fictifs du modèle ne sont pas téléchargeables.</p></div>
              <Button size="sm" variant="outline" onClick={() => setShowUpload((value) => !value)}><Plus className="mr-2 size-4" />Ajouter une version</Button>
            </div>
            {showUpload && (
              <div className="space-y-3 rounded-lg border border-dashed p-5">
                <Label htmlFor="version-file">Nouveau fichier (max. 10 Mo)</Label>
                <Input id="version-file" type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError("") }} />
                <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note de version (facultative)" aria-label="Note de version" />
                {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                <div className="flex gap-2"><Button size="sm" onClick={submitVersion}>Enregistrer la version</Button><Button size="sm" variant="ghost" onClick={() => setShowUpload(false)}>Annuler</Button></div>
              </div>
            )}
            {item.versions.length ? (
              <div className="divide-y rounded-lg border">
                {[...item.versions].reverse().map((version) => (
                  <div key={version.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <FileClock className="mt-1 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 space-y-1">
                        <p className="break-words text-sm font-medium">Version {version.number} · {version.filename}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(version.date)} · {version.author}</p>
                        <p className="text-xs text-muted-foreground">{version.note}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" disabled={!version.file} onClick={() => openVersion(version)} aria-label={`Télécharger ${version.filename}`}><Download className="mr-2 size-4" />{version.file ? "Fichier local" : "Fictif"}</Button>
                  </div>
                ))}
              </div>
            ) : <p className="rounded-lg border border-dashed p-7 text-center text-sm text-muted-foreground"><FileText className="mx-auto mb-3 size-6" />Aucune version de fichier. Ajoutez un document local.</p>}
          </section>
          <div className="flex flex-wrap justify-between gap-3 border-t pt-5">
            <Button variant="destructive" size="sm" onClick={onDelete}><Trash2 className="mr-2 size-4" />Supprimer</Button>
            <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="mr-2 size-4" />Modifier les informations</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
