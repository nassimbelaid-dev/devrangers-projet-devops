"use client"

import { useState } from "react"
import type { FormEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

import { committeeSeats } from "./mock-data"
import { MEMBER_ROLES } from "./types"
import type { CommitteeMemberRecord, MemberKind, MemberRole } from "./types"

type MemberFormProps = {
  open: boolean
  initialMember: CommitteeMemberRecord | null
  onOpenChange: (open: boolean) => void
  /** Retourne un message d'erreur en cas de conflit, sinon null. */
  onSave: (member: CommitteeMemberRecord) => string | null
}

function emptyMember(): CommitteeMemberRecord {
  return {
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: "", email: "", phone: "", role: "Membre", kind: "Titulaire",
    seatId: committeeSeats[0].id, mandateStart: "", mandateEnd: "", notes: "",
  }
}

export function MemberForm({ open, initialMember, onOpenChange, onSave }: MemberFormProps) {
  // Le parent remonte le formulaire avec une nouvelle clé à chaque ouverture.
  const [form, setForm] = useState<CommitteeMemberRecord>(() =>
    initialMember ? { ...initialMember } : emptyMember()
  )
  const [error, setError] = useState("")

  function update<K extends keyof CommitteeMemberRecord>(key: K, value: CommitteeMemberRecord[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setError("")
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.mandateStart || !form.mandateEnd) {
      setError("Le nom, l'adresse e-mail et les dates du mandat sont obligatoires.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Renseigne une adresse e-mail valide.")
      return
    }
    if (form.mandateEnd < form.mandateStart) {
      setError("La fin du mandat doit être postérieure ou égale à sa date de début.")
      return
    }
    const clean = {
      ...form,
      name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), notes: form.notes.trim(),
    }
    const saveError = onSave(clean)
    if (saveError) {
      setError(saveError)
      return
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialMember ? "Modifier un membre" : "Ajouter un membre"}</DialogTitle>
          <DialogDescription>
            Coordonnées, rôle et affectation d'un siège — données fictives en mémoire.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <Tabs defaultValue="identity">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="identity">Identité et rôle</TabsTrigger>
              <TabsTrigger value="mandate">Mandat et suppléance</TabsTrigger>
            </TabsList>

            <TabsContent value="identity" className="space-y-4 pt-3">
              <div className="space-y-2">
                <Label htmlFor="member-name">Nom complet *</Label>
                <Input id="member-name" placeholder="Ex. Nadia Bouzid" value={form.name}
                  onChange={(e) => update("name", e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="member-email">Adresse e-mail *</Label>
                  <Input id="member-email" type="email" placeholder="nom@example.com"
                    value={form.email} onChange={(e) => update("email", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="member-phone">Téléphone (facultatif)</Label>
                  <Input id="member-phone" type="tel" placeholder="05..."
                    value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-role">Fonction au comité *</Label>
                <Select value={form.role} onValueChange={(value) => update("role", value as MemberRole)}>
                  <SelectTrigger id="member-role"><SelectValue placeholder="Choisir un rôle" /></SelectTrigger>
                  <SelectContent>
                    {MEMBER_ROLES.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-notes">Observations</Label>
                <Textarea id="member-notes" rows={3} value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="Informations complémentaires (facultatif)" />
              </div>
            </TabsContent>

            <TabsContent value="mandate" className="space-y-4 pt-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="member-seat">Siège au comité *</Label>
                  <Select value={form.seatId} onValueChange={(value) => update("seatId", value)}>
                    <SelectTrigger id="member-seat"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {committeeSeats.map((seat) => <SelectItem key={seat.id} value={seat.id}>{seat.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="member-kind">Qualité *</Label>
                  <Select value={form.kind} onValueChange={(value) => update("kind", value as MemberKind)}>
                    <SelectTrigger id="member-kind"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Titulaire">Titulaire</SelectItem>
                      <SelectItem value="Suppléant">Suppléant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mandate-start">Début du mandat *</Label>
                  <Input id="mandate-start" type="date" value={form.mandateStart}
                    onChange={(e) => update("mandateStart", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mandate-end">Fin du mandat *</Label>
                  <Input id="mandate-end" type="date" value={form.mandateEnd}
                    onChange={(e) => update("mandateEnd", e.target.value)} />
                </div>
              </div>
              <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                Un siège ne peut avoir qu'un titulaire et un suppléant sur une même période.
                Si le titulaire est absent, le suppléant peut représenter le siège : cette règle
                est uniquement simulée dans l'onglet « Sièges et suppléances ».
              </div>
            </TabsContent>
          </Tabs>

          {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit">{initialMember ? "Enregistrer" : "Ajouter le membre"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
