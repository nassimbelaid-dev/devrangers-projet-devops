import { CalendarDays, Clock3, FileCheck2, ListTodo } from "lucide-react"
import type { NotificationKind } from "./types"

export function NotificationIcon({ kind }: { kind: NotificationKind }) {
  const Icon = {
    convocation: CalendarDays,
    "rappel-reunion": Clock3,
    "echeance-action": ListTodo,
    "avis-decision": FileCheck2,
  }[kind]

  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-foreground/80">
      <Icon className="size-4" aria-hidden="true" />
    </span>
  )
}
