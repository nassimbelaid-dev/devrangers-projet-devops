"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Pencil, Plus, ShieldCheck, Trash2, UsersRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { demoAccounts, getDemoAccounts, getRoleLabel, rolePermissions, saveDemoAccounts, type DemoAccount, type DemoRole } from "@/lib/static-auth"

const roles: DemoRole[] = ["admin", "president", "secretary", "archivist", "member"]
const blank: DemoAccount = { id: "", firstName: "", lastName: "", email: "", password: "Comite2026", role: "member", roleLabel: "Membre du comité" }

export function UsersClient() {
  const [accounts, setAccounts] = useState<DemoAccount[]>(demoAccounts)
  const [form, setForm] = useState<DemoAccount>(blank)
  const [feedback, setFeedback] = useState("")
  useEffect(() => { setAccounts(getDemoAccounts()) }, [])

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const account = { ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim().toLowerCase(), roleLabel: getRoleLabel(form.role) }
    if (!account.firstName || !account.lastName || !account.email || !account.password) return
    const duplicate = accounts.some((item) => item.email === account.email && item.id !== account.id)
    if (duplicate) { setFeedback("Cette adresse e-mail est déjà utilisée."); return }
    const next = account.id ? accounts.map((item) => item.id === account.id ? account : item) : [...accounts, { ...account, id: `user-${Date.now()}` }]
    saveDemoAccounts(next)
    setAccounts(next)
    setForm(blank)
    setFeedback("Le compte fictif a été enregistré.")
  }

  function remove(id: string) {
    const next = accounts.filter((account) => account.id !== id)
    saveDemoAccounts(next)
    setAccounts(next)
    if (form.id === id) setForm(blank)
    setFeedback("Le compte fictif a été supprimé.")
  }

  return <main className="mx-auto w-full max-w-6xl space-y-8 pb-12">
    <header className="space-y-2"><div className="flex items-center gap-2 text-sm font-medium text-indigo-600"><UsersRound className="size-4" /> Administration</div><h1 className="text-3xl font-semibold tracking-tight">Comptes et rôles</h1><p className="text-sm text-muted-foreground">Gérez les comptes fictifs et attribuez un rôle. Les droits associés sont définis dans la configuration RBAC.</p></header>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="rounded-2xl"><CardHeader><CardTitle className="text-lg">Comptes ({accounts.length})</CardTitle></CardHeader><CardContent className="space-y-3">
        {accounts.map((account) => <div key={account.id} className="flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"><div className="min-w-0"><p className="truncate font-medium">{account.firstName} {account.lastName}</p><p className="truncate text-sm text-muted-foreground">{account.email}</p><span className="mt-2 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"><ShieldCheck className="size-3" />{getRoleLabel(account.role)}</span></div><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => { setForm(account); setFeedback("") }}><Pencil className="mr-1.5 size-3.5" />Modifier</Button><Button type="button" size="sm" variant="outline" onClick={() => remove(account.id)} aria-label={`Supprimer ${account.email}`}><Trash2 className="size-3.5" /></Button></div></div>)}
        {!accounts.length && <p className="py-8 text-center text-sm text-muted-foreground">Aucun compte fictif.</p>}
      </CardContent></Card>
      <Card className="rounded-2xl"><CardHeader><CardTitle className="text-lg">{form.id ? "Modifier le compte" : "Ajouter un compte"}</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={save}>
        <div className="space-y-2"><Label htmlFor="user-first">Prénom</Label><Input id="user-first" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="user-last">Nom</Label><Input id="user-last" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="user-email">Adresse e-mail</Label><Input id="user-email" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="user-password">Mot de passe fictif</Label><Input id="user-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        <div className="space-y-2"><Label>Rôle</Label><Select value={form.role} onValueChange={(value: DemoRole) => setForm({ ...form, role: value, roleLabel: getRoleLabel(value) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{roles.map((role) => <SelectItem key={role} value={role}>{getRoleLabel(role)}</SelectItem>)}</SelectContent></Select></div>
        <p className="text-xs leading-5 text-muted-foreground">Droits attribués : {Object.keys(rolePermissions[form.role]).join(", ")}.</p>
        {feedback && <p role="status" className="text-sm text-muted-foreground">{feedback}</p>}
        <div className="flex gap-2"><Button type="submit" className="flex-1"><Plus className="mr-2 size-4" />Enregistrer</Button>{form.id && <Button type="button" variant="outline" onClick={() => setForm(blank)}>Annuler</Button>}</div>
      </form></CardContent></Card>
    </div>
    <p className="text-xs text-muted-foreground">Ces modifications restent dans le stockage local de ce navigateur. Les rôles de démonstration associés aux sièges votants sont configurés dans le fichier RBAC.</p>
  </main>
}
