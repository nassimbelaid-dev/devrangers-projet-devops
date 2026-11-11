import type { Metadata } from "next"

import { eventsData } from "../apps/calendar/_data/events"

import { Card } from "@/components/ui/card"
import { CalendarContent } from "../apps/calendar/_components/calendar-content"
import { CalendarHeader } from "../apps/calendar/_components/calendar-header"
import { CalendarWrapper } from "../apps/calendar/_components/calendar-wrapper"

export const metadata: Metadata = {
  title: "Réunions | Gestion du comité scientifique",
  description: "Planning des réunions du comité scientifique",
}

export default function MeetingsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Gestion des réunions
        </h1>

        <p className="text-muted-foreground">
          Consultez le calendrier des réunions du comité scientifique.
        </p>
      </div>

      <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        Version de démonstration : les événements affichés proviennent
        actuellement du template Shadboard.
      </div>

      <CalendarWrapper events={eventsData}>
        <Card>
          <CalendarHeader />
          <CalendarContent />
        </Card>
      </CalendarWrapper>
    </div>
  )
}
