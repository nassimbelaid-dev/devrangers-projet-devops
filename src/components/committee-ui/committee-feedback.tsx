"use client"

import { AlertCircle, X } from "lucide-react"
import { clearDemoFeedback, useDemoFeedback } from "@/lib/demo-store"

/** Message uniquement lorsqu'une règle métier empêche une opération. */
export function CommitteeFeedback() {
  const message = useDemoFeedback()
  if (!message) return null
  return (
    <aside role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="flex-1 leading-6">{message}</p>
      <button type="button" aria-label="Fermer le message" onClick={clearDemoFeedback}
        className="rounded-md p-1 transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/50">
        <X className="size-4" aria-hidden="true" />
      </button>
    </aside>
  )
}
