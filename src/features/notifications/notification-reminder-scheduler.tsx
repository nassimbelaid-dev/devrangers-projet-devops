"use client"

import { useEffect } from "react"

import { NOTIFICATION_REMINDER_WINDOWS } from "@/lib/demo-business"
import { checkDemoNotificationReminders, useDemoData } from "@/lib/demo-store"
import { useStaticAuth } from "@/lib/static-auth"

/** Rappels de démonstration actifs uniquement tant qu'une session navigateur est ouverte. */
export function NotificationReminderScheduler() {
  const { user } = useStaticAuth()
  const state = useDemoData()
  const userId = user?.id

  useEffect(() => {
    if (!userId) return

    const check = () => checkDemoNotificationReminders(userId)

    check()

    const timer = window.setInterval(
      check,
      NOTIFICATION_REMINDER_WINDOWS.checkEveryMs
    )

    return () => window.clearInterval(timer)
  }, [userId, state.meetings, state.actions])

  return null
}
