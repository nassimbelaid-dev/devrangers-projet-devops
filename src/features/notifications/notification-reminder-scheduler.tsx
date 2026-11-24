"use client"

import { useEffect } from "react"
import { useStaticAuth } from "@/lib/static-auth"
import { checkDemoNotificationReminders, useDemoData } from "@/lib/demo-store"
import { NOTIFICATION_REMINDER_WINDOWS } from "@/lib/demo-business"

/** Rappels de démonstration actifs uniquement tant qu'une session navigateur est ouverte. */
export function NotificationReminderScheduler() {
  const { user } = useStaticAuth()
  const state = useDemoData()
  useEffect(() => {
    if (!user) return
    const check = () => checkDemoNotificationReminders(user.id)
    check()
    const timer = window.setInterval(check, NOTIFICATION_REMINDER_WINDOWS.checkEveryMs)
    return () => window.clearInterval(timer)
  }, [user?.id, state.meetings, state.actions])
  return null
}
