"use client"

import { useEffect, useSyncExternalStore } from "react"

const STORAGE_KEY = "comite-scientifique:static-auth:v1"
const COOKIE_KEY = "demo-auth"
const listeners = new Set<() => void>()
let authenticated = false
let initialized = false

function emit() {
  listeners.forEach((listener) => listener())
}

function readStorage() {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(STORAGE_KEY) === "1"
}

function setCookie(value: boolean) {
  if (typeof document === "undefined") return
  document.cookie = `${COOKIE_KEY}=${value ? "1" : "0"}; path=/; max-age=${value ? 60 * 60 * 24 * 7 : 0}; SameSite=Lax`
}

function initialize() {
  if (initialized || typeof window === "undefined") return
  initialized = true
  authenticated = readStorage()
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  initialize()
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return authenticated
}

function getServerSnapshot() {
  return false
}

export const staticDemoAccount = {
  email: "admin@comite.test",
  password: "Comite2026",
  name: "Administrateur du comité",
}

export function signInStatic(email: string, password: string) {
  const valid = email.trim().toLowerCase() === staticDemoAccount.email &&
    password === staticDemoAccount.password
  if (!valid) return false

  authenticated = true
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, "1")
  setCookie(true)
  emit()
  return true
}

export function signOutStatic() {
  authenticated = false
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY)
  setCookie(false)
  emit()
}

export function useStaticAuth() {
  const isAuthenticated = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  useEffect(() => { initialize() }, [])
  return isAuthenticated
}
