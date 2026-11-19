import type { Metadata } from "next"
import type { LocaleType } from "@/types"
import { getDictionary } from "@/lib/get-dictionary"
import { StaticSignIn } from "@/components/auth/static-sign-in"

export const metadata: Metadata = {
  title: "Connexion",
}

export default async function SignInPage({ params }: { params: Promise<{ lang: LocaleType }> }) {
  const { lang } = await params
  const dictionary = await getDictionary(lang)
  return <StaticSignIn dictionary={dictionary} locale={lang} />
}
