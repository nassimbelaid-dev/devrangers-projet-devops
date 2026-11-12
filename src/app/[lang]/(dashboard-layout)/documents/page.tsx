import type { Metadata } from "next"
import { CommitteeShell } from "@/components/committee-ui/committee-shell"
import { DocumentsClient } from "@/features/documents/documents-client"

export const metadata: Metadata = {
  title: "Documents et procès-verbaux | Gestion du comité scientifique",
  description: "Bibliothèque documentaire et édition fictive des procès-verbaux du comité scientifique",
}

export default function DocumentsPage() {
  return <CommitteeShell module="documents"><DocumentsClient /></CommitteeShell>
}
