"use client"

import { useState } from "react"
import { useUiText } from "@/features/ui-text"

import { useAuditEvents } from "@/lib/demo-audit"
import { getRoleLabel, useStaticAuth } from "@/lib/static-auth"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const pageSize = 10

export function AuditClient() {
  const { user } = useStaticAuth()
  const events = useAuditEvents(user)
  const t = useUiText()
  const [query, setQuery] = useState("")
  const [actor, setActor] = useState("")
  const [operation, setOperation] = useState("")
  const [module, setModule] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [page, setPage] = useState(0)
  if (user?.role !== "admin") return null

  const normalize = (value: string) =>
    value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase()
  const filtered = events
    .filter((event) => {
      const date = new Date(event.occurredAt)
      const day = date.toLocaleDateString("sv-SE", {
        timeZone: "Africa/Algiers",
      })
      const haystack = [
        event.details?.actorName,
        event.entityId,
        event.details?.reference,
        t(event.operation),
        t(event.entityType),
        event.details?.status && t(event.details.status),
        ...(event.details?.changes ?? []).map((change) => t(change)),
      ].join(" ")
      return (
        (!actor || event.details?.actorName === actor) &&
        (!operation || event.operation === operation) &&
        (!module || event.entityType === module) &&
        (!from || day >= from) &&
        (!to || day <= to) &&
        normalize(haystack).includes(normalize(query.trim()))
      )
    })
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
  const total = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, total - 1)
  const selects = [
    {
      id: "audit-actor",
      label: "Utilisateur",
      selected: actor,
      set: setActor,
      options: [
        ...new Set(
          events.flatMap((event) =>
            event.details?.actorName ? [event.details.actorName] : []
          )
        ),
      ].sort(),
      translate: false,
    },
    {
      id: "audit-operation",
      label: "Opération",
      selected: operation,
      set: setOperation,
      options: [...new Set(events.map((event) => event.operation))].sort(),
      translate: true,
    },
    {
      id: "audit-module",
      label: "Module",
      selected: module,
      set: setModule,
      options: [...new Set(events.map((event) => event.entityType))].sort(),
      translate: true,
    },
  ]

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
        {t("Journal d’audit")}
      </h1>
      <div className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="audit-query">{t("Rechercher")}</Label>
          <Input
            id="audit-query"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(0)
            }}
          />
        </div>
        {selects.map((field) => (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{t(field.label)}</Label>
            <select
              id={field.id}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={field.selected}
              onChange={(event) => {
                field.set(event.target.value)
                setPage(0)
              }}
            >
              <option value="">{t("Tous")}</option>
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {field.translate ? t(option) : option}
                </option>
              ))}
            </select>
          </div>
        ))}
        {[
          { id: "audit-from", label: "Du", value: from, set: setFrom },
          { id: "audit-to", label: "Au", value: to, set: setTo },
        ].map((field) => (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{t(field.label)}</Label>
            <Input
              id={field.id}
              type="date"
              value={field.value}
              onChange={(event) => {
                field.set(event.target.value)
                setPage(0)
              }}
            />
          </div>
        ))}
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Date et heure",
                "Utilisateur",
                "Rôle",
                "Opération",
                "Module",
                "Référence ou identifiant",
                "Détails",
              ].map((heading) => (
                <TableHead key={heading} className="text-start">
                  {t(heading)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered
              .slice(current * pageSize, (current + 1) * pageSize)
              .map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <time dateTime={event.occurredAt}>
                      {new Date(event.occurredAt).toLocaleString(undefined, {
                        timeZone: "Africa/Algiers",
                      })}
                    </time>
                  </TableCell>
                  <TableCell>{event.details?.actorName ?? "—"}</TableCell>
                  <TableCell>
                    {event.details?.actorRole
                      ? t(getRoleLabel(event.details.actorRole))
                      : "—"}
                  </TableCell>
                  <TableCell>{t(event.operation)}</TableCell>
                  <TableCell>{t(event.entityType)}</TableCell>
                  <TableCell>
                    <code className="text-xs">
                      {event.details?.reference ?? event.entityId}
                    </code>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {event.details?.demonstration && (
                      <Badge variant="outline">{t("Démonstration")}</Badge>
                    )}
                    {event.details?.status
                      ? event.details.previousStatus &&
                        event.details.previousStatus !== event.details.status
                        ? `${t(event.details.previousStatus)} → ${t(event.details.status)}`
                        : t(event.details.status)
                      : "—"}
                    {event.details?.changes?.map((change) => (
                      <div key={change}>{t(change)}</div>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            {!filtered.length && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  {t("Aucun événement d’audit.")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span role="status">
          {t("Page {page} sur {total}", { page: current + 1, total })}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            {t("Précédent")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={current + 1 === total}
            onClick={() => setPage(current + 1)}
          >
            {t("Suivant")}
          </Button>
        </div>
      </div>
    </main>
  )
}
