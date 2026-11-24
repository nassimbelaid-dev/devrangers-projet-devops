"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Pencil, Plus, ShieldCheck, Trash2, UsersRound, UserCheck, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { demoAccounts, getDemoAccounts, getRoleLabel, rolePermissions, saveDemoAccounts, type DemoAccount, type DemoRole } from "@/lib/static-auth"
import { useDemoData } from "@/lib/demo-store"
import { useUsersText } from "./user-text"

const roles: DemoRole[] = ["admin", "president", "secretary", "archivist", "member"]
const blank: DemoAccount = { id: "", firstName: "", lastName: "", email: "", password: "Comite2026", role: "member", roleLabel: "Membre du comité", isActive: true }

export function UsersClient() {
  const t = useUsersText()
  const { members } = useDemoData()
  const [accounts, setAccounts] = useState<DemoAccount[]>(demoAccounts)
  const [form, setForm] = useState<DemoAccount>(blank)
  const [feedback, setFeedback] = useState("")
  useEffect(() => { setAccounts(getDemoAccounts()) }, [])

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const associatedMember = members.find((member) => member.id === form.memberId)
    const account = { ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim().toLowerCase(), roleLabel: form.role === "member" && associatedMember?.kind === "Suppléant" ? "Membre suppléante" : getRoleLabel(form.role), isActive: form.isActive !== false }
    if (!account.firstName || !account.lastName || !account.email || !account.password) return
    const duplicate = accounts.some((item) => item.email === account.email && item.id !== account.id)
    if (duplicate) { setFeedback(t("Cette adresse e-mail est déjà utilisée.")); return }
    const next = account.id ? accounts.map((item) => item.id === account.id ? account : item) : [...accounts, { ...account, id: `user-${Date.now()}` }]
    if (!saveDemoAccounts(next)) { setFeedback(t("Modification refusée : vérifiez les permissions, les doublons et la présence d'un administrateur actif.")); return }
    setAccounts(next)
    setForm(blank)
    setFeedback(t("Le compte fictif a été enregistré."))
  }

  function remove(id: string) {
    const next = accounts.filter((account) => account.id !== id)
    if (!saveDemoAccounts(next)) { setFeedback(t("Les comptes de démonstration intégrés ne peuvent pas être supprimés. Désactivez-les si nécessaire.")); return }
    setAccounts(next)
    if (form.id === id) setForm(blank)
    setFeedback(t("Le compte fictif a été supprimé."))
  }

  return <main className="mx-auto w-full max-w-6xl space-y-8 pb-12">
    <header className="space-y-2"><div className="flex items-center gap-2 text-sm font-medium text-indigo-600"><UsersRound className="size-4" /> {t("Administration")}</div><h1 className="text-3xl font-semibold tracking-tight">{t("Comptes et rôles")}</h1><p className="text-sm text-muted-foreground">{t("Gérez les comptes fictifs et attribuez un rôle. Les droits associés sont définis dans la configuration RBAC.")}</p></header>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="rounded-2xl"><CardHeader><CardTitle className="text-lg">{t("Comptes ({count})", { count: accounts.length })}</CardTitle></CardHeader><CardContent className="space-y-3">
        {accounts.map((account) => <div key={account.id} className="flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"><div className="min-w-0"><p className="truncate font-medium">{account.firstName} {account.lastName}</p><p className="truncate text-sm text-muted-foreground">{account.email}</p><span className="mt-2 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"><ShieldCheck className="size-3" />{t(account.roleLabel)}</span><span className={`ms-2 text-xs ${account.isActive === false ? "text-destructive" : "text-emerald-700"}`}>{t(account.isActive === false ? "Désactivé" : "Actif")}</span>{account.memberId && <span className="ms-2 text-xs text-muted-foreground">{t("Membre associé")}: {members.find((member) => member.id === account.memberId)?.name ?? account.memberId}</span>}</div><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => { setForm(account); setFeedback("") }}><Pencil className="mr-1.5 size-3.5" />{t("Modifier")}</Button><Button type="button" size="sm" variant="outline" onClick={() => { const next = accounts.map((item) => item.id === account.id ? { ...item, isActive: item.isActive === false } : item); if (!saveDemoAccounts(next)) { setFeedback(t("Impossible de désactiver le dernier administrateur actif.")); return }; setAccounts(next); setFeedback(t("État du compte mis à jour.")) }} aria-label={`${t(account.isActive === false ? "Activer" : "Désactiver")} ${account.email}`}>{account.isActive === false ? <UserCheck className="size-3.5" /> : <UserX className="size-3.5" />}</Button><Button type="button" size="sm" variant="outline" onClick={() => remove(account.id)} aria-label={`${t("Supprimer")} ${account.email}`}><Trash2 className="size-3.5" /></Button></div></div>)}
        {!accounts.length && <p className="py-8 text-center text-sm text-muted-foreground">{t("Aucun compte fictif.")}</p>}
      </CardContent></Card>
      <Card className="rounded-2xl"><CardHeader><CardTitle className="text-lg">{t(form.id ? "Modifier le compte" : "Ajouter un compte")}</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={save}>
        <div className="space-y-2"><Label htmlFor="user-first">{t("Prénom")}</Label><Input id="user-first" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="user-last">{t("Nom")}</Label><Input id="user-last" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="user-email">{t("Adresse e-mail")}</Label><Input id="user-email" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="user-password">{t("Mot de passe fictif")}</Label><Input id="user-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        <div className="space-y-2"><Label>{t("Rôle")}</Label><Select value={form.role} onValueChange={(value: DemoRole) => setForm({ ...form, role: value, roleLabel: getRoleLabel(value), ...(value === "admin" ? { memberId: undefined, seatId: undefined } : {}) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{roles.map((role) => <SelectItem key={role} value={role}>{t(getRoleLabel(role))}</SelectItem>)}</SelectContent></Select></div>
        {form.role !== "admin" && <div className="space-y-2"><Label>{t("Membre associé (siège et éligibilité au vote)")}</Label><Select value={form.memberId ?? "none"} onValueChange={(value) => { const member = members.find((item) => item.id === value); setForm({ ...form, memberId: member?.id, seatId: member?.seatId }) }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">{t("Aucun membre associé")}</SelectItem>{members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name} · {t(member.kind)} · {member.seatId}</SelectItem>)}</SelectContent></Select></div>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive !== false} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="size-4 accent-primary" />{t("Compte actif")}</label>
        <p className="text-xs leading-5 text-muted-foreground">{t("Droits attribués selon le rôle")}: {Object.keys(rolePermissions[form.role]).map((module) => t(module)).join(", ")}.</p>
        {feedback && <p role="status" className="text-sm text-muted-foreground">{feedback}</p>}
        <div className="flex gap-2"><Button type="submit" className="flex-1"><Plus className="mr-2 size-4" />{t("Enregistrer")}</Button>{form.id && <Button type="button" variant="outline" onClick={() => setForm(blank)}>{t("Annuler")}</Button>}</div>
      </form></CardContent></Card>
    </div>
    <p className="text-xs text-muted-foreground">{t("Ces modifications restent dans le stockage local de ce navigateur. Les rôles de démonstration associés aux sièges votants sont configurés dans le fichier RBAC.")}</p>
  </main>
}
