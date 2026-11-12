"use client"

import { useDemoData } from "@/lib/demo-store"

import { useState } from "react"
import type { FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DOCUMENT_STATUSES, DOCUMENT_TYPES, VISIBILITIES } from "./types"
import type { CommitteeDocument, DocumentStatus, DocumentType, DocumentVisibility } from "./types"
import { makeId, today } from "./utils"

interface Props {
  open: boolean
  initial: CommitteeDocument | null
  reference: string
  onOpenChange: (open: boolean) => void
  onSave: (document: CommitteeDocument) => void
}

export function DocumentForm({ open, initial, reference, onOpenChange, onSave }: Props) {
  const { meetings } = useDemoData()
  const [title, setTitle] = useState(initial?.title ?? "")
  const [type, setType] = useState<DocumentType>(initial?.type ?? "Rapport")
  const [status, setStatus] = useState<DocumentStatus>(initial?.status ?? "Brouillon")
  const [visibility, setVisibility] = useState<DocumentVisibility>(initial?.visibility ?? "Comité")
  const [meetingId, setMeetingId] = useState(initial?.meetingId ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState("")

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) return setError("Le titre du document est obligatoire.")
    if (file && file.size > 10 * 1024 * 1024) return setError("Taille maximale pour cette démonstration : 10 Mo.")
    const date = today()
    const versions = initial ? initial.versions : file ? [{
      id: makeId(), number: 1, date, author: "Utilisateur démo", filename: file.name, note: "Version initiale", file,
    }] : []
    onSave({
      id: initial?.id ?? `doc-${makeId()}`,
      reference: initial?.reference ?? reference,
      title: title.trim(), type, status, visibility, meetingId,
      description: description.trim(),
      updatedAt: date,
      versions,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier le document" : "Ajouter un document"}</DialogTitle>
          <DialogDescription>Informations fictives conservées uniquement pendant cette session.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-6 pt-2">
          <div className="space-y-2">
            <Label htmlFor="document-title">Titre *</Label>
            <Input id="document-title" maxLength={150} value={title} onChange={(event) => { setTitle(event.target.value); setError("") }} placeholder="Ex. Rapport de la commission pédagogique" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="document-type">Type</Label>
              <Select value={type} onValueChange={(value) => setType(value as DocumentType)}>
                <SelectTrigger id="document-type"><SelectValue /></SelectTrigger>
                <SelectContent>{DOCUMENT_TYPES.map((value) => <SelectItem value={value} key={value}>{value}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-status">Statut</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as DocumentStatus)}>
                <SelectTrigger id="document-status"><SelectValue /></SelectTrigger>
                <SelectContent>{DOCUMENT_STATUSES.map((value) => <SelectItem value={value} key={value}>{value}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-visibility">Accès (simulation)</Label>
              <Select value={visibility} onValueChange={(value) => setVisibility(value as DocumentVisibility)}>
                <SelectTrigger id="document-visibility"><SelectValue /></SelectTrigger>
                <SelectContent>{VISIBILITIES.map((value) => <SelectItem value={value} key={value}>{value}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-meeting">Réunion</Label>
              <Select value={meetingId || "aucune"} onValueChange={(value) => setMeetingId(value === "aucune" ? "" : value)}>
                <SelectTrigger id="document-meeting"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aucune">Non rattaché</SelectItem>
                  {meetings.map((meeting) => <SelectItem key={meeting.id} value={meeting.id}>{meeting.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="document-description">Description</Label>
            <Textarea id="document-description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Objet ou résumé du document…" />
          </div>
          {!initial && (
            <div className="space-y-2 border-t pt-5">
              <Label htmlFor="document-file">Fichier local (facultatif)</Label>
              <Input id="document-file" type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
              <p className="text-xs leading-5 text-muted-foreground">Aucun envoi sur un serveur. 10 Mo maximum ; le fichier disparaît après rechargement.</p>
            </div>
          )}
          {initial && <p className="text-xs text-muted-foreground">Pour remplacer le fichier, utilisez « Ajouter une version » dans la fiche du document.</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit">{initial ? "Enregistrer" : "Ajouter le document"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
