"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useUiText } from "@/features/ui-text"
import { Landmark, LogIn, ShieldCheck, UsersRound } from "lucide-react"

import type { DictionaryType } from "@/lib/get-dictionary"
import type { DemoAccount } from "@/lib/static-auth"
import type { FormEvent } from "react"

import { demoAccounts, getDemoAccounts, signInStatic } from "@/lib/static-auth"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function StaticSignIn({
  dictionary,
  locale,
}: {
  dictionary: DictionaryType
  locale: string
}) {
  const t = useUiText()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<DemoAccount[]>(demoAccounts)
  const [email, setEmail] = useState(demoAccounts[0].email)
  const [password, setPassword] = useState(demoAccounts[0].password)
  const [error, setError] = useState("")
  useEffect(() => {
    const active = getDemoAccounts().filter(
      (account) => account.isActive !== false
    )

    setAccounts(active)

    if (
      active.length &&
      !active.some((account) => account.email === demoAccounts[0].email)
    ) {
      setEmail(active[0].email)
      setPassword(active[0].password)
    }
  }, [])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!signInStatic(email, password)) {
      setError(dictionary.auth.invalidCredentials)
      return
    }
    const next = searchParams.get("next")
    const destination =
      next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : `/${locale}/dashboards/analytics`
    router.replace(destination)
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-background to-cyan-50 p-4 dark:from-indigo-950/30 dark:to-cyan-950/20 sm:p-8">
      <div className="pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-indigo-400/10 blur-3xl" />
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border bg-card shadow-2xl shadow-indigo-950/10 md:grid-cols-[1fr_1.1fr]">
        <section className="hidden flex-col justify-between bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 p-10 text-white md:flex">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-white/15 p-3">
              <Landmark className="size-6" />
            </span>
            <span className="font-semibold">
              Gestion du comité scientifique
            </span>
          </div>
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-100">
              Espace de démonstration
            </p>
            <h1 className="text-4xl font-semibold leading-tight">
              Une gouvernance claire, un comité mieux organisé.
            </h1>
            <p className="max-w-sm text-indigo-100">
              Connectez-vous avec l’un des profils fictifs pour explorer les
              accès adaptés à chaque rôle.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-indigo-100">
            <ShieldCheck className="size-4" /> Simulation frontend avec données
            fictives
          </div>
        </section>
        <section className="p-6 sm:p-10">
          <Card className="border-0 shadow-none">
            <CardHeader className="px-0 pt-2">
              <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 md:hidden">
                <Landmark className="size-5" />
              </div>
              <CardTitle className="text-2xl">
                {dictionary.auth.signIn}
              </CardTitle>
              <CardDescription>
                {dictionary.auth.demoDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <form onSubmit={submit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="demo-account">Compte de démonstration</Label>
                  <select
                    id="demo-account"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={email}
                    onChange={(event) => {
                      const account = accounts.find(
                        (item) => item.email === event.target.value
                      )
                      setEmail(event.target.value)
                      if (account) setPassword(account.password)
                    }}
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.email}>
                        {t(account.roleLabel)} — {account.firstName}{" "}
                        {account.lastName}
                        {account.memberId ? ` · ${account.memberId}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{dictionary.auth.email}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{dictionary.auth.password}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full">
                  <LogIn className="mr-2 size-4" />
                  {dictionary.auth.submit}
                </Button>
                <div className="rounded-xl border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
                  <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                    <UsersRound className="size-3.5" /> Comptes fictifs actifs
                  </div>
                  Mot de passe commun :{" "}
                  <code className="rounded bg-background px-1.5 py-0.5 font-semibold text-foreground">
                    Comite2026
                  </code>
                  <br />
                  Les membres titulaires et suppléants se connectent avec leur
                  propre compte de démonstration.
                </div>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
