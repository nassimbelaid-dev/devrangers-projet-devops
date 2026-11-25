"use client"

import { useParams } from "next/navigation"
import { useUiText } from "@/features/ui-text"
import arLocale from "@fullcalendar/core/locales/ar"
import enLocale from "@fullcalendar/core/locales/en-gb"
import frLocale from "@fullcalendar/core/locales/fr"
import dayGridPlugin from "@fullcalendar/daygrid"
import listPlugin from "@fullcalendar/list"
import FullCalendar from "@fullcalendar/react"
import timeGridPlugin from "@fullcalendar/timegrid"

import type { Meeting } from "./types"

interface MeetingCalendarProps {
  meetings: Meeting[]
  onSelectMeeting: (id: string) => void
}

export function MeetingCalendar({
  meetings,
  onSelectMeeting,
}: MeetingCalendarProps) {
  const { lang } = useParams<{ lang: string }>()
  const t = useUiText()
  const locale = lang === "ar" ? arLocale : lang === "en" ? enLocale : frLocale
  return (
    <div className="overflow-x-auto p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
        locale={locale}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,listWeek",
        }}
        buttonText={{
          today: t("Aujourd'hui"),
          month: t("Mois"),
          week: t("Semaine"),
          list: t("Liste"),
        }}
        height="auto"
        dayMaxEvents={3}
        events={meetings.map((meeting) => ({
          id: meeting.id,
          title: meeting.title,
          start: `${meeting.date}T${meeting.startTime}:00`,
          end: `${meeting.date}T${meeting.endTime}:00`,
          color:
            meeting.status === "Annulée"
              ? "#ef4444"
              : meeting.status === "Clôturée" || meeting.status === "PV signé"
                ? "#64748b"
                : meeting.status === "En cours"
                  ? "#7c3aed"
                  : "#2563eb",
        }))}
        eventClick={({ event }) => onSelectMeeting(event.id)}
      />
    </div>
  )
}
