"use client"

import { useEffect, useState } from "react"
import { useUiText } from "@/features/ui-text"
import { Archive, CheckCircle2, Download, RotateCcw, Save } from "lucide-react"

import type { MeetingMinutes } from "./types"

import { useDemoData } from "@/lib/demo-store"
import { hasPermission, useStaticAuth } from "@/lib/static-auth"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MinutesPreview } from "./minutes-preview"
import { printMinutes, today } from "./utils"

interface Props {
  minutes: MeetingMinutes
  onSave: (next: MeetingMinutes) => void
  onWorkflow: (
    action: "submit-minutes" | "return-minutes" | "sign-minutes",
    minutes: MeetingMinutes
  ) => string | null
}

export function MinutesEditor({ minutes, onSave, onWorkflow }: Props) {
  const t = useUiText()
  const { user } = useStaticAuth()
  const { meetings, members, decisions, actions, ballots } = useDemoData()
  const [form, setForm] = useState<MeetingMinutes>(() => ({
    ...minutes,
    presentMemberIds: [...minutes.presentMemberIds],
  }))
  const [feedback, setFeedback] = useState("")
  const meeting = meetings.find((item) => item.id === form.meetingId)
  const isLocked = form.status === "Signé" || form.status === "Archivé"
  const recordedPresence =
    form.status === "Brouillon"
      ? meeting?.attendance
      : Object.fromEntries(form.presentMemberIds.map((id) => [id, true]))
  const canDraft = hasPermission(user, "minutes", "edit")
  const canSign = hasPermission(user, "minutes", "approve")
  const canArchive = hasPermission(user, "minutes", "archive")

  useEffect(() => {
    setForm({ ...minutes, presentMemberIds: [...minutes.presentMemberIds] })
  }, [minutes])

  function update<K extends keyof MeetingMinutes>(
    key: K,
    value: MeetingMinutes[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }))
    setFeedback("")
  }
  function save() {
    if (!canDraft || isLocked || form.status !== "Brouillon") return
    const next = { ...form, version: minutes.version + 1, updatedAt: today() }
    onSave(next)
    setFeedback(t("Brouillon enregistré en mémoire pour cette session."))
  }
  function validate() {
    if (!canDraft || form.status !== "Brouillon") return
    const meetingAttendance = meeting
      ? Object.entries(meeting.attendance ?? {})
          .filter(([, present]) => present)
          .map(([id]) => id)
      : form.presentMemberIds
    if (!form.summary.trim() || !meetingAttendance.length) {
      setFeedback(
        t(
          "Ajoutez au moins un membre présent et un compte rendu avant de soumettre le PV."
        )
      )
      return
    }
    const error = onWorkflow("submit-minutes", {
      ...form,
      presentMemberIds: meetingAttendance,
    })
    setFeedback(
      error ? t(error) : t("Le PV est transmis au président pour signature.")
    )
  }
  function sign() {
    if (
      !user ||
      user.role !== "president" ||
      form.status !== "À signer" ||
      !window.confirm(t("Confirmer la signature simulée du PV ?"))
    )
      return
    const error = onWorkflow("sign-minutes", form)
    setFeedback(
      error
        ? t(error)
        : t("Signature simulée enregistrée. Le PV est maintenant verrouillé.")
    )
  }
  function returnForCorrection() {
    if (
      !user ||
      user.role !== "president" ||
      form.status !== "À signer" ||
      !window.confirm(t("Retourner ce PV au secrétaire pour correction ?"))
    )
      return
    const error = onWorkflow("return-minutes", form)
    setFeedback(
      error
        ? t(error)
        : t("Le PV a été retourné au secrétaire pour correction.")
    )
  }
  function archive() {
    if (
      !canArchive ||
      form.status !== "Signé" ||
      !window.confirm(t("Archiver définitivement ce PV signé ?"))
    )
      return
    const next = {
      ...form,
      status: "Archivé" as const,
      archivedAt: new Date().toISOString(),
      archivedBy: user ? `${user.firstName} ${user.lastName}` : "",
      version: minutes.version + 1,
      updatedAt: today(),
    }
    onSave(next)
    setFeedback(t("Le PV signé a été archivé."))
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium">{form.reference}</span>
          <Badge variant={isLocked ? "secondary" : "outline"}>
            {t(form.status)}
          </Badge>
          <span className="text-xs text-muted-foreground">v{form.version}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (
                !printMinutes(
                  form,
                  meetings,
                  decisions,
                  members,
                  actions,
                  ballots
                )
              )
                setFeedback(
                  t(
                    "Impossible d'ouvrir l'impression : autorisez les fenêtres contextuelles."
                  )
                )
            }}
          >
            <Download className="mr-2 size-4" />
            {t("Imprimer / PDF")}
          </Button>
          {canDraft && form.status === "Brouillon" && (
            <>
              <Button size="sm" variant="outline" onClick={save}>
                <Save className="mr-2 size-4" />
                {t("Enregistrer")}
              </Button>
              <Button size="sm" onClick={validate}>
                <CheckCircle2 className="mr-2 size-4" />
                {t("Soumettre au président")}
              </Button>
            </>
          )}
          {canSign && form.status === "À signer" && (
            <>
              <Button size="sm" variant="outline" onClick={returnForCorrection}>
                <RotateCcw className="mr-2 size-4" />
                {t("Demander une correction")}
              </Button>
              <Button size="sm" onClick={sign}>
                <CheckCircle2 className="mr-2 size-4" />
                {t("Signer le PV")}
              </Button>
            </>
          )}
          {canArchive && form.status === "Signé" && (
            <Button size="sm" onClick={archive}>
              <Archive className="mr-2 size-4" />
              {t("Archiver le PV")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid items-start gap-10 xl:grid-cols-2">
        <section className="min-w-0 space-y-8">
          <div className="space-y-2 border-b pb-5">
            <h3 className="text-lg font-semibold tracking-tight">
              {t("Contenu du procès-verbal")}
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              {t(
                "Complétez le compte rendu et vérifiez les présences avant validation."
              )}
            </p>
          </div>
          <fieldset
            disabled={!canDraft || isLocked}
            className="space-y-7 disabled:opacity-70"
          >
            <div className="space-y-3">
              <Label>{t("Feuille de présence liée à la réunion")}</Label>
              <div className="divide-y rounded-xl border px-4">
                {(meeting?.participantIds ?? []).map((id) => {
                  const member = members.find((item) => item.id === id)
                  const presence = recordedPresence?.[id]
                  return (
                    <div
                      key={id}
                      className="flex min-h-12 items-center gap-3 py-3 text-sm"
                    >
                      <span className="font-medium">
                        {member?.name ?? t("Inconnu")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {member?.role ?? t("Membre")}
                      </span>
                      <Badge
                        className="ml-auto"
                        variant={presence === true ? "secondary" : "outline"}
                      >
                        {presence === true
                          ? t("Présent")
                          : presence === false
                            ? t("Absent")
                            : t("Non renseigné")}
                      </Badge>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Les présences sont reprises automatiquement depuis la réunion."
                )}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minutes-summary">
                {t("Déroulement et échanges *")}
              </Label>
              <Textarea
                id="minutes-summary"
                rows={7}
                value={form.summary}
                onChange={(event) => update("summary", event.target.value)}
                placeholder={t("Résumez les échanges et les conclusions…")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minutes-actions">{t("Suites à donner")}</Label>
              <Textarea
                id="minutes-actions"
                rows={4}
                value={form.nextSteps}
                onChange={(event) => update("nextSteps", event.target.value)}
                placeholder={t("Actions, responsables ou échéances évoquées…")}
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("Secrétaire")}</Label>
                <p className="rounded-md border px-3 py-2 text-sm">
                  {form.secretary || "—"}
                </p>
              </div>
              <div className="space-y-2">
                <Label>{t("Président")}</Label>
                <p className="rounded-md border px-3 py-2 text-sm">
                  {form.president || "—"}
                </p>
              </div>
            </div>
          </fieldset>
          {feedback && (
            <p
              role="status"
              className="rounded-lg border px-4 py-3 text-sm text-muted-foreground"
            >
              {feedback}
            </p>
          )}
          {isLocked && (
            <p className="text-xs text-muted-foreground">
              {t(
                "Une fois signé, le PV est verrouillé. L'archiviste peut classer la version signée."
              )}
            </p>
          )}
        </section>
        <section className="min-w-0 space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{t("Aperçu")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Mis à jour automatiquement pendant la saisie.")}
            </p>
          </div>
          <MinutesPreview minutes={form} />
        </section>
      </div>
    </div>
  )
}
