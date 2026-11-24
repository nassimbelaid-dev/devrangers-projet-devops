"use client"

import { useCallback, useSyncExternalStore } from "react"
import type { SetStateAction } from "react"

import { initialMeetings } from "@/features/meetings/mock-data"
import { initialMembers } from "@/features/members/mock-data"
import { initialDecisions, initialActions } from "@/features/decisions/mock-data"
import { initialBallots } from "@/features/votes/mock-data"
import { initialDocuments, initialMinutes } from "@/features/documents/mock-data"
import { initialAgendaProposals } from "@/features/agenda/mock-data"
import { initialNotifications } from "@/features/notifications/mock-data"
import { applyDemoChange, applyMeetingWorkflow, type WorkflowAction } from "./demo-business"
import type { DemoState } from "./demo-business"

// État commun à l'application pendant la navigation ; aucune persistance serveur.
const initial: DemoState = {
  meetings: initialMeetings,
  members: initialMembers,
  decisions: initialDecisions,
  actions: initialActions,
  ballots: initialBallots,
  documents: initialDocuments,
  minutes: initialMinutes,
  agenda: initialAgendaProposals,
  notifications: initialNotifications,
}

let current: DemoState = initial
let feedback = ""
const STORAGE_KEY = "comite-scientifique:demo-data:v1"
let initialized = false
const listeners = new Set<() => void>()

function initialize() {
  if (initialized || typeof window === "undefined") return
  initialized = true
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<DemoState> | null
    if (stored && typeof stored === "object") {
      current = {
        meetings: Array.isArray(stored.meetings) ? stored.meetings : initial.meetings,
        members: Array.isArray(stored.members) ? stored.members : initial.members,
        decisions: Array.isArray(stored.decisions) ? stored.decisions : initial.decisions,
        actions: Array.isArray(stored.actions) ? stored.actions : initial.actions,
        ballots: Array.isArray(stored.ballots) ? stored.ballots : initial.ballots,
        documents: Array.isArray(stored.documents) ? stored.documents : initial.documents,
        minutes: Array.isArray(stored.minutes) ? stored.minutes : initial.minutes,
        agenda: Array.isArray(stored.agenda) ? stored.agenda : initial.agenda,
        notifications: Array.isArray(stored.notifications) ? stored.notifications : initial.notifications,
      }
    }
  } catch {
    current = initial
  }
}

function persist() {
  if (typeof window === "undefined") return
  try {
    // Les métadonnées des fichiers sont conservées ; les objets File ne sont pas sérialisables.
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current, (key, value) => key === "file" ? undefined : value))
  } catch {
    feedback = "Le stockage local est indisponible. Les modifications ne survivront pas au rechargement."
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  initialize()
  listener()
  return () => { listeners.delete(listener) }
}
function notify() { listeners.forEach((listener) => listener()) }
function snapshot() { return current }
function serverSnapshot() { return initial }

export function useDemoData() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}

/** Les composants existants conservent leur interface [valeur, setter]. */
export function useDemoCollection<K extends keyof DemoState>(key: K) {
  const value = useSyncExternalStore(
    subscribe,
    () => current[key],
    () => initial[key],
  )
  const setValue = useCallback((next: SetStateAction<DemoState[K]>) => {
    const previous = current[key]
    const updated = typeof next === "function"
      ? (next as (previous: DemoState[K]) => DemoState[K])(previous)
      : next
    const result = applyDemoChange(current, key, updated)
    feedback = result.error ?? ""
    if (!Object.is(current, result.state) || result.error) {
      current = result.state
      if (!result.error) persist()
      notify()
    }
  }, [key])
  return [value, setValue] as const
}

export function useDemoFeedback() {
  return useSyncExternalStore(subscribe, () => feedback, () => "")
}

export function clearDemoFeedback() {
  if (!feedback) return
  feedback = ""
  notify()
}

export function resetDemoData() {
  current = initial
  feedback = ""
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY)
  notify()
}

export function runMeetingWorkflow(action: WorkflowAction, meetingId: string, actor: { id: string; firstName: string; lastName: string; role: string }, minutesId?: string) {
  initialize()
  const result = applyMeetingWorkflow(current, action, meetingId, actor, minutesId)
  feedback = result.error ?? ""
  if (!result.error && result.state !== current) {
    current = result.state
    persist()
    notify()
  } else if (result.error) notify()
  return result
}

export function createMeetingMinutes(meetingId: string, actor: { firstName: string; lastName: string; role: string }) {
  initialize()
  const meeting = current.meetings.find((item) => item.id === meetingId)
  if (actor.role !== "secretary" || (meeting?.status !== "En cours" && meeting?.status !== "Clôturée")) return { error: "Seul le secrétaire peut créer le PV pendant ou après une réunion démarrée." }
  if (current.minutes.some((item) => item.meetingId === meetingId)) return { error: "Un PV existe déjà pour cette réunion." }
  const id = `pv-${Date.now()}`
  const next = { id, reference: `PV-2026-${String(current.minutes.length + 1).padStart(3, "0")}`, meetingId, status: "Brouillon" as const, presentMemberIds: [], summary: "", nextSteps: "", secretary: `${actor.firstName} ${actor.lastName}`, president: "Karim Haddad", version: 1, updatedAt: new Date().toISOString().slice(0, 10) }
  const result = applyDemoChange(current, "minutes", [next, ...current.minutes])
  if (result.error) return { error: result.error }
  current = result.state
  persist()
  notify()
  return { id }
}
