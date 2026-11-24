import { CalendarDays, Clock3, FileCheck2, ListTodo, Archive, Bell, CircleCheck, CircleX, UserRound, CalendarClock } from "lucide-react"
import type { NotificationKind } from "./types"

export function NotificationIcon({ kind }: { kind: NotificationKind }) {
  const Icon = {
    convocation: CalendarDays,
    "reunion-modifiee": CalendarDays,
    "reunion-annulee": CircleX,
    "rappel-reunion": Clock3,
    "proposition-agenda": Bell,
    "revue-agenda": FileCheck2,
    "echeance-action": ListTodo,
    "action-attribuee": UserRound,
    "action-reattribuee": UserRound,
    "action-echeance-modifiee": CalendarClock,
    "rappel-action": Clock3,
    "action-en-retard": CircleX,
    "avis-decision": FileCheck2,
    "pv-signature": FileCheck2,
    "pv-correction": FileCheck2,
    "pv-signe": FileCheck2,
    "pv-archives": Archive,
  }[kind]

  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-foreground/80">
      <Icon className="size-4" aria-hidden="true" />
    </span>
  )
}
