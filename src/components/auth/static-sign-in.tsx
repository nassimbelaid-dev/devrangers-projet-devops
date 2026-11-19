"use client"

import { FormEvent, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LogIn } from "lucide-react"
import type { DictionaryType } from "@/lib/get-dictionary"
import { signInStatic, staticDemoAccount } from "@/lib/static-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function StaticSignIn({ dictionary, locale }: { dictionary: DictionaryType; locale: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState(staticDemoAccount.email)
  const [password, setPassword] = useState(staticDemoAccount.password)
  const [error, setError] = useState("")

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!signInStatic(email, password)) {
      setError(dictionary.auth.invalidCredentials)
      return
    }
    const next = searchParams.get("next")
    const destination = next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : `/${locale}/dashboards/analytics`
    router.replace(destination)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{dictionary.auth.signIn}</CardTitle>
          <CardDescription>{dictionary.auth.demoDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">{dictionary.auth.email}</Label>
              <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{dictionary.auth.password}</Label>
              <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full"><LogIn className="mr-2 size-4" />{dictionary.auth.submit}</Button>
            <p className="text-xs leading-5 text-muted-foreground">{dictionary.auth.credentialsHint}</p>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
