"use client"

import dayGridPlugin from "@fullcalendar/daygrid"
import listPlugin from "@fullcalendar/list"
import FullCalendar from "@fullcalendar/react"
import timeGridPlugin from "@fullcalendar/timegrid"
import frLocale from "@fullcalendar/core/locales/fr"

import type { Meeting } from "./types"

interface MeetingCalendarProps {
  meetings: Meeting[]
  onSelectMeeting: (id: string) => void
}

export function MeetingCalendar({ meetings, onSelectMeeting }: MeetingCalendarProps) {
  return (
    <div className="overflow-x-auto p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
        locale={frLocale}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,listWeek",
        }}
        buttonText={{ month: "Mois", week: "Semaine", list: "Liste" }}
        height="auto"
        dayMaxEvents={3}
        events={meetings.map((meeting) => ({
          id: meeting.id,
          title: meeting.title,
          start: `${meeting.date}T${meeting.startTime}:00`,
          end: `${meeting.date}T${meeting.endTime}:00`,
          color: meeting.status === "Annulée" ? "#ef4444"
            : meeting.status === "Terminée" ? "#64748b" : "#2563eb",
        }))}
        eventClick={({ event }) => onSelectMeeting(event.id)}
      />
    </div>
  )
}
