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
import { applyDemoChange } from "./demo-business"
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
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
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
  notify()
}
