import type { Metadata } from "next"

import { CommitteeShell } from "@/components/committee-ui/committee-shell"
import { ProfileClient } from "@/features/profile/profile-client"

export const metadata: Metadata = {
  title: "Mon profil | Gestion du comité scientifique",
  description: "Gérer les informations personnelles du profil",
}

export default function ProfilePage() {
  return (
    <CommitteeShell module="profile">
      <ProfileClient />
    </CommitteeShell>
  )
}
