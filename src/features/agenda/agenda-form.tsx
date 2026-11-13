"use client"

import { useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { FileText, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { makeAgendaId } from "./utils"
import type { AgendaAttachment, AgendaProposal } from "./types"

interface Props {
  open: boolean
  initial: AgendaProposal | null
  meetingName: string
  proposerName: string
  onOpenChange: (open: boolean) => void
  onSave: (data: { title: string; description: string; attachments: AgendaAttachment[] }) => void
}

const MAX_SIZE = 10 * 1024 * 1024
const MAX_FILES = 5
const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "png", "jpg", "jpeg", "txt"]

export function AgendaForm({ open, initial, meetingName, proposerName, onOpenChange, onSave }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [attachments, setAttachments] = useState<AgendaAttachment[]>(initial?.attachments ?? [])
  const [error, setError] = useState("")

  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const addedFiles = Array.from(event.target.files ?? [])
    event.target.value = ""
    if (addedFiles.length === 0) return
    if (attachments.length + addedFiles.length > MAX_FILES) {
      setError(`Limite de ${MAX_FILES} pièces jointes par proposition.`)
      return
    }
    const invalid = addedFiles.find((file) =>
      file.size > MAX_SIZE || !ALLOWED_EXTENSIONS.includes(file.name.split(".").pop()?.toLowerCase() ?? "")
    )
    if (invalid) {
      setError(`Fichier refusé : ${invalid.name}. Formats autorisés : PDF, DOC, DOCX, PNG, JPG, TXT ; 10 Mo maximum.`)
      return
    }
    setAttachments((current) => [...current, ...addedFiles.map((file) => ({
      id: makeAgendaId(), name: file.name, size: file.size, file,
    }))])
    setError("")
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) return setError("Le titre du point est obligatoire.")
    if (title.trim().length > 150) return setError("Le titre ne peut pas dépasser 150 caractères.")
    onSave({ title: title.trim(), description: description.trim(), attachments })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier ma proposition" : "Proposer un point"}</DialogTitle>
          <DialogDescription>
            La proposition est soumise à validation du président (simulation frontend).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-7 pt-3">
          <div className="grid gap-5 rounded-lg bg-muted/40 px-5 py-4 text-sm sm:grid-cols-2">
            <div><p className="text-xs text-muted-foreground">Réunion</p><p className="mt-1 font-medium">{meetingName}</p></div>
            <div><p className="text-xs text-muted-foreground">Proposé par</p><p className="mt-1 font-medium">{proposerName}</p></div>
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="agenda-title">Intitulé du point *</Label>
            <Input id="agenda-title" value={title} maxLength={150}
              placeholder="Ex. Examen des propositions de sujets de PFE"
              onChange={(event) => { setTitle(event.target.value); setError("") }} />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="agenda-description">Description / justification</Label>
            <Textarea id="agenda-description" rows={4} value={description} maxLength={1800}
              placeholder="Contexte, objectifs et éléments à examiner pendant la réunion…"
              onChange={(event) => setDescription(event.target.value)} />
            <p className="text-xs text-muted-foreground">{description.length} / 1800 caractères</p>
          </div>

          <div className="space-y-4 border-t pt-6">
            <div>
              <Label htmlFor="agenda-attachments">Pièces jointes (facultatives)</Label>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Jusqu'à 5 fichiers PDF, Word, image ou TXT, 10 Mo chacun. Fichiers conservés seulement dans ce navigateur.
              </p>
            </div>
            <Input id="agenda-attachments" type="file" multiple
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt" onChange={addFiles} />
            {attachments.length > 0 && <div className="divide-y rounded-lg border px-4">
              {attachments.map((attachment) => (
                <div className="flex items-center gap-3 py-3" key={attachment.id}>
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm">{attachment.name}</span>
                  <Button type="button" variant="ghost" size="icon"
                    aria-label={`Retirer ${attachment.name}`} title="Retirer cette pièce jointe"
                    onClick={() => setAttachments((current) => current.filter((file) => file.id !== attachment.id))}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>}
          </div>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit">{initial ? "Enregistrer" : "Soumettre la proposition"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
