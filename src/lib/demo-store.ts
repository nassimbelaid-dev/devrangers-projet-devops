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

// Magasin partagé entre les pages du navigateur (pas de persistance après rechargement).
const initial = {
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

type DemoState = typeof initial
let current: DemoState = initial
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function snapshot() { return current }
function serverSnapshot() { return initial }

export function useDemoData() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}

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
    if (Object.is(previous, updated)) return
    current = { ...current, [key]: updated }
    listeners.forEach((listener) => listener())
  }, [key])
  return [value, setValue] as const
}

export function resetDemoData() {
  current = initial
  listeners.forEach((listener) => listener())
}
