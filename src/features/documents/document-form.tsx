"use client"

import { useState } from "react"
import { useUiText } from "@/features/ui-text"

import type { FormEvent } from "react"
import type {
  CommitteeDocument,
  DocumentType,
  DocumentVisibility,
} from "./types"
import { DOCUMENT_TYPES, VISIBILITIES } from "./types"

import { useDemoData } from "@/lib/demo-store"
import { useStaticAuth } from "@/lib/static-auth"

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
import { Textarea } from "@/components/ui/textarea"
import { makeId, today } from "./utils"

interface Props {
  open: boolean
  initial: CommitteeDocument | null
  reference: string
  onOpenChange: (open: boolean) => void
  onSave: (document: CommitteeDocument) => string | null
}

export function DocumentForm({
  open,
  initial,
  reference,
  onOpenChange,
  onSave,
}: Props) {
  const t = useUiText()
  const { meetings } = useDemoData()
  const { user } = useStaticAuth()
  const [title, setTitle] = useState(initial?.title ?? "")
  const [type, setType] = useState<DocumentType>(initial?.type ?? "Rapport")
  const status = initial?.status ?? "Brouillon"
  const [visibility, setVisibility] = useState<DocumentVisibility>(
    initial?.visibility ?? "Comité"
  )
  const [meetingId, setMeetingId] = useState(initial?.meetingId ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState("")

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim())
      return setError(t("Le titre du document est obligatoire."))
    if (file && file.size > 10 * 1024 * 1024)
      return setError(t("Taille maximale : 10 Mo."))
    const date = today()
    const versions = initial
      ? initial.versions
      : file
        ? [
            {
              id: makeId(),
              number: 1,
              date,
              author: user ? `${user.firstName} ${user.lastName}` : "",
              filename: file.name,
              note: "Version initiale",
              file,
            },
          ]
        : []
    const issue = onSave({
      id: initial?.id ?? `doc-${makeId()}`,
      reference: initial?.reference ?? reference,
      title: title.trim(),
      type,
      status,
      visibility,
      meetingId,
      description: description.trim(),
      updatedAt: date,
      versions,
    })
    if (issue) return setError(t(issue))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t(initial ? "Modifier le document" : "Ajouter un document")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "Informations fictives conservées uniquement pendant cette session."
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-6 pt-2">
          <div className="space-y-2">
            <Label htmlFor="document-title">{t("Titre *")}</Label>
            <Input
              id="document-title"
              maxLength={150}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
                setError("")
              }}
              placeholder={t("Ex. Rapport de la commission pédagogique")}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="document-type">{t("Type")}</Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as DocumentType)}
              >
                <SelectTrigger id="document-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((value) => (
                    <SelectItem value={value} key={value}>
                      {t(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-visibility">
                {t("Accès (simulation)")}
              </Label>
              <Select
                value={visibility}
                onValueChange={(value) =>
                  setVisibility(value as DocumentVisibility)
                }
              >
                <SelectTrigger id="document-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIBILITIES.map((value) => (
                    <SelectItem value={value} key={value}>
                      {t(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-meeting">{t("Réunion")}</Label>
              <Select
                value={meetingId || "aucune"}
                onValueChange={(value) =>
                  setMeetingId(value === "aucune" ? "" : value)
                }
              >
                <SelectTrigger id="document-meeting">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aucune">{t("Non rattaché")}</SelectItem>
                  {meetings
                    .filter((meeting) => meeting.status !== "Annulée")
                    .map((meeting) => (
                      <SelectItem key={meeting.id} value={meeting.id}>
                        {meeting.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="document-description">{t("Description")}</Label>
            <Textarea
              id="document-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("Objet ou résumé du document…")}
            />
          </div>
          {!initial && (
            <div className="space-y-2 border-t pt-5">
              <Label htmlFor="document-file">
                {t("Fichier local (facultatif)")}
              </Label>
              <Input
                id="document-file"
                type="file"
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                {t("Taille maximale du fichier : 10 Mo.")}
              </p>
            </div>
          )}
          {initial && (
            <p className="text-xs text-muted-foreground">
              {t(
                "Pour remplacer le fichier, utilisez « Ajouter une version » dans la fiche du document."
              )}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("Annuler")}
            </Button>
            <Button type="submit">
              {t(initial ? "Enregistrer" : "Ajouter le document")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
