"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Mail,
  Phone,
  RotateCcw,
  Save,
  UserRound,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const STORAGE_KEY = "devrangers:profil:v1"

type Profile = {
  firstName: string
  lastName: string
  email: string
  phone: string
  position: string
  department: string
  bio: string
}

const emptyProfile: Profile = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  position: "",
  department: "Département d’informatique",
  bio: "",
}

const profileKeys: (keyof Profile)[] = [
  "firstName", "lastName", "email", "phone", "position", "department", "bio",
]

function parseProfile(value: string | null): Profile | null {
  if (!value) return null
  try {
    const json: unknown = JSON.parse(value)
    if (!json || typeof json !== "object" || Array.isArray(json)) return null
    const record = json as Record<string, unknown>
    const sanitized = { ...emptyProfile }
    for (const key of profileKeys) {
      if (typeof record[key] === "string") sanitized[key] = (record[key] as string).slice(0, 500)
    }
    return sanitized
  } catch {
    return null
  }
}

export function ProfileClient() {
  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [savedProfile, setSavedProfile] = useState<Profile>(emptyProfile)
  const [feedback, setFeedback] = useState("")
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const local = parseProfile(window.localStorage.getItem(STORAGE_KEY))
      if (local) {
        setProfile(local)
        setSavedProfile(local)
      }
    } catch {
      setFeedback("Le stockage local n’est pas disponible dans ce navigateur.")
    }
    setLoaded(true)
  }, [])

  const displayName = useMemo(() => {
    const full = `${profile.firstName.trim()} ${profile.lastName.trim()}`.trim()
    return full || "Votre profil"
  }, [profile.firstName, profile.lastName])

  const initials = useMemo(() => {
    const chars = [profile.firstName.trim().charAt(0), profile.lastName.trim().charAt(0)]
    return chars.filter(Boolean).join("").toLocaleUpperCase("fr") || "CS"
  }, [profile.firstName, profile.lastName])

  const dirty = profileKeys.some((key) => profile[key] !== savedProfile[key])

  function update(key: keyof Profile, value: string) {
    setProfile((prev) => ({ ...prev, [key]: value }))
    setFeedback("")
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleaned: Profile = Object.fromEntries(
      profileKeys.map((key) => [key, profile[key].trim()]),
    ) as Profile
    if (!cleaned.firstName || !cleaned.lastName) {
      setFeedback("Renseignez votre prénom et votre nom.")
      return
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned))
      setProfile(cleaned)
      setSavedProfile(cleaned)
      setFeedback("Vos informations ont été enregistrées.")
    } catch {
      setFeedback("Impossible d’enregistrer le profil dans ce navigateur.")
    }
  }

  function reset() {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
      setProfile(emptyProfile)
      setSavedProfile(emptyProfile)
      setFeedback("Le profil a été réinitialisé.")
    } catch {
      setFeedback("Impossible de réinitialiser le profil dans ce navigateur.")
    }
  }

  return (
    <main className="w-full space-y-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
          <UserRound className="size-4" aria-hidden="true" />
          Espace personnel
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Mon profil</h1>
        <p className="text-sm text-muted-foreground">
          Modifiez vos coordonnées et les informations principales de votre profil.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:gap-8">
        <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
          <div className="h-20 bg-gradient-to-r from-indigo-500/90 via-violet-500/85 to-cyan-500/80" />
          <CardContent className="relative space-y-4 px-6 pb-7 pt-0">
            <div className="-mt-9 flex size-20 items-center justify-center rounded-2xl border-4 border-background bg-indigo-50 text-2xl font-semibold text-indigo-700 shadow-sm dark:bg-indigo-950 dark:text-indigo-300">
              {initials}
            </div>
            <div className="space-y-1">
              <h2 className="break-words text-lg font-semibold">{displayName}</h2>
              <p className="break-words text-sm text-muted-foreground">
                {profile.position.trim() || "Membre du comité scientifique"}
              </p>
            </div>
            <div className="space-y-4 border-t border-border/60 pt-5 text-sm">
              <div className="flex min-w-0 items-start gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-indigo-500" aria-hidden="true" />
                <span className="break-all text-muted-foreground">{profile.email || "E-mail non renseigné"}</span>
              </div>
              <div className="flex min-w-0 items-start gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-teal-500" aria-hidden="true" />
                <span className="break-words text-muted-foreground">{profile.phone || "Téléphone non renseigné"}</span>
              </div>
              <div className="flex min-w-0 items-start gap-3">
                <Building2 className="mt-0.5 size-4 shrink-0 text-violet-500" aria-hidden="true" />
                <span className="break-words text-muted-foreground">{profile.department || "Département non renseigné"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardHeader className="space-y-1 px-5 pt-6 sm:px-8 sm:pt-8">
            <div className="mb-1 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <BriefcaseBusiness className="size-4" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wide">Informations personnelles</span>
            </div>
            <CardTitle className="text-xl">Modifier mon profil</CardTitle>
            <p className="text-sm text-muted-foreground">Les champs marqués d’un astérisque sont obligatoires.</p>
          </CardHeader>
          <CardContent className="px-5 pb-7 sm:px-8 sm:pb-8">
            <form className="space-y-7" onSubmit={save}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="profile-first-name">Prénom *</Label>
                  <Input id="profile-first-name" autoComplete="given-name" maxLength={80} required value={profile.firstName} onChange={(e) => update("firstName", e.target.value)} placeholder="Votre prénom" />
                </div>
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="profile-last-name">Nom *</Label>
                  <Input id="profile-last-name" autoComplete="family-name" maxLength={80} required value={profile.lastName} onChange={(e) => update("lastName", e.target.value)} placeholder="Votre nom" />
                </div>
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="profile-email">Adresse e-mail</Label>
                  <Input id="profile-email" type="email" autoComplete="email" maxLength={150} value={profile.email} onChange={(e) => update("email", e.target.value)} placeholder="prenom.nom@exemple.dz" />
                </div>
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="profile-phone">Téléphone</Label>
                  <Input id="profile-phone" type="tel" autoComplete="tel" maxLength={30} value={profile.phone} onChange={(e) => update("phone", e.target.value)} placeholder="Numéro de téléphone" />
                </div>
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="profile-position">Fonction ou poste</Label>
                  <Input id="profile-position" maxLength={100} value={profile.position} onChange={(e) => update("position", e.target.value)} placeholder="Ex. Enseignant-chercheur" />
                </div>
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="profile-department">Département</Label>
                  <Input id="profile-department" maxLength={150} value={profile.department} onChange={(e) => update("department", e.target.value)} placeholder="Département d'informatique" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-bio">Présentation</Label>
                <Textarea id="profile-bio" rows={4} maxLength={500} value={profile.bio} onChange={(e) => update("bio", e.target.value)} placeholder="Quelques informations complémentaires…" className="resize-y" />
              </div>

              <div className="flex flex-col gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p role="status" aria-live="polite" className="flex min-h-5 items-center gap-2 text-sm text-muted-foreground">
                  {feedback ? <><CheckCircle2 className="size-4 shrink-0 text-teal-500" aria-hidden="true" />{feedback}</> : dirty ? "Modifications non enregistrées" : loaded ? "Informations à jour" : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={reset} className="gap-2">
                    <RotateCcw className="size-4" aria-hidden="true" />Réinitialiser
                  </Button>
                  <Button type="submit" className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700">
                    <Save className="size-4" aria-hidden="true" />Enregistrer
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
