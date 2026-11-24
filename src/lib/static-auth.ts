"use client"

import { useEffect, useSyncExternalStore } from "react"

export type DemoRole = "admin" | "president" | "secretary" | "archivist" | "member"
export type DemoUser = { id: string; firstName: string; lastName: string; email: string; role: DemoRole; seatId?: string; memberId?: string }

export const demoAccounts: Array<DemoUser & { password: string; roleLabel: string }> = [
  { id: "u-admin", firstName: "Amine", lastName: "Bensaïd", email: "admin@comite.test", password: "Comite2026", role: "admin", roleLabel: "Administrateur" },
  { id: "u-president", firstName: "Karim", lastName: "Haddad", email: "president@comite.test", password: "Comite2026", role: "president", roleLabel: "Président du comité", seatId: "s1", memberId: "m1" },
  { id: "u-secretary", firstName: "Lina", lastName: "Amrane", email: "secretaire@comite.test", password: "Comite2026", role: "secretary", roleLabel: "Secrétaire", seatId: "s2", memberId: "m2" },
  { id: "u-archive", firstName: "Amine", lastName: "Cherif", email: "archives@comite.test", password: "Comite2026", role: "archivist", roleLabel: "Responsable des archives", seatId: "s5", memberId: "m5" },
  { id: "u-member", firstName: "Nadia", lastName: "Bouzid", email: "membre@comite.test", password: "Comite2026", role: "member", roleLabel: "Membre du comité", seatId: "s3", memberId: "m3" },
  { id: "u-member-m4", firstName: "Yanis", lastName: "Aït Ali", email: "yanis@comite.test", password: "Comite2026", role: "member", roleLabel: "Membre du comité", seatId: "s4", memberId: "m4" },
  { id: "u-member-m6", firstName: "Sara", lastName: "Bensaïd", email: "sara@comite.test", password: "Comite2026", role: "member", roleLabel: "Membre suppléante", seatId: "s3", memberId: "m6" },
]

const STORAGE_KEY = "comite-scientifique:static-auth:v2"
const ACCOUNTS_KEY = "comite-scientifique:accounts:v1"
const COOKIE_KEY = "demo-auth"
const listeners = new Set<() => void>()
let current: DemoUser | null = null
let initialized = false

function emit() { listeners.forEach((listener) => listener()) }
function readStorage(): DemoUser | null {
  if (typeof window === "undefined") return null
  try {
    const id = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null")?.id
    return getDemoAccounts().find(({ id: accountId }) => accountId === id) ?? null
  } catch { return null }
}
export type DemoAccount = DemoUser & { password: string; roleLabel: string }
export function getDemoAccounts(): DemoAccount[] {
  if (typeof window === "undefined") return demoAccounts
  try {
    const stored = JSON.parse(window.localStorage.getItem(ACCOUNTS_KEY) ?? "null")
    if (Array.isArray(stored)) {
      const valid = stored.filter((account) => account && typeof account.id === "string" && typeof account.email === "string" && typeof account.password === "string" && ["admin", "president", "secretary", "archivist", "member"].includes(account.role))
      const existingIds = new Set(valid.map((account) => account.id))
      return [...valid, ...demoAccounts.filter((account) => !existingIds.has(account.id))]
    }
  } catch { /* Repli sur les comptes de démonstration intégrés. */ }
  return demoAccounts
}
export function saveDemoAccounts(accounts: DemoAccount[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}
function setCookie(value: boolean) {
  if (typeof document !== "undefined") document.cookie = `${COOKIE_KEY}=${value ? "1" : "0"}; path=/; max-age=${value ? 604800 : 0}; SameSite=Lax`
}
function initialize() {
  if (initialized || typeof window === "undefined") return
  initialized = true
  current = readStorage()
  emit()
}
function subscribe(listener: () => void) { listeners.add(listener); initialize(); return () => listeners.delete(listener) }
function snapshot() { return current }
function serverSnapshot() { return null }

export function signInStatic(email: string, password: string) {
  const account = getDemoAccounts().find((item) => item.email === email.trim().toLowerCase() && item.password === password)
  if (!account) return false
  const { password: _password, roleLabel: _roleLabel, ...user } = account
  current = user
  initialized = true
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  setCookie(true)
  emit()
  return true
}
export function signOutStatic() {
  current = null
  initialized = true
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY)
  setCookie(false)
  emit()
}
export function useStaticAuth() {
  const user = useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  useEffect(() => { initialize() }, [])
  return { user, isAuthenticated: Boolean(user) }
}

export type Permission = "view" | "create" | "edit" | "delete" | "approve" | "vote" | "archive" | "manageUsers" | "manageRoles" | "manageMeetings" | "manageMembers"
const all: Permission[] = ["view", "create", "edit", "delete", "approve", "vote", "archive", "manageUsers", "manageRoles", "manageMeetings", "manageMembers"]
const adminAccess = all.filter((permission) => permission !== "approve" && permission !== "vote")
export const rolePermissions: Record<DemoRole, Partial<Record<string, Permission[]>>> = {
  admin: { dashboard: adminAccess, meetings: adminAccess, members: adminAccess, agenda: adminAccess, votes: ["view"], actions: adminAccess, documents: adminAccess, notifications: ["view"], profile: ["view", "edit"], users: ["view", "create", "edit", "delete", "manageUsers", "manageRoles"] },
  president: { dashboard: ["view"], meetings: ["view", "create", "edit", "delete", "manageMeetings"], members: ["view"], agenda: ["view", "create", "edit", "approve"], votes: ["view", "approve", "vote"], actions: ["view", "create", "edit"], documents: ["view", "approve"], notifications: ["view"], profile: ["view", "edit"] },
  secretary: { dashboard: ["view"], meetings: ["view", "create", "edit"], members: ["view"], agenda: ["view", "create", "edit"], votes: ["view", "vote"], actions: ["view", "create", "edit"], documents: ["view", "create", "edit"], notifications: ["view"], profile: ["view", "edit"] },
  archivist: { dashboard: ["view"], meetings: ["view"], members: ["view"], agenda: ["view"], votes: ["view"], actions: ["view"], documents: ["view", "create", "edit", "archive"], notifications: ["view"], profile: ["view", "edit"] },
  member: { dashboard: ["view"], meetings: ["view"], members: ["view"], agenda: ["view", "create", "edit"], votes: ["view", "vote"], actions: ["view", "edit"], documents: ["view"], notifications: ["view"], profile: ["view", "edit"] },
}

const routeModules: Array<[string, string]> = [["/dashboards", "dashboard"], ["/meetings", "meetings"], ["/members", "members"], ["/agenda", "agenda"], ["/votes", "votes"], ["/actions", "actions"], ["/documents", "documents"], ["/notifications", "notifications"], ["/profile", "profile"], ["/users", "users"]]
export function moduleForPath(pathname: string) { return routeModules.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? "dashboard" }
export function hasPermission(user: DemoUser | null, module: string, permission: Permission = "view") {
  return Boolean(user && rolePermissions[user.role][module]?.includes(permission))
}
export function getRoleLabel(role: DemoRole) { return demoAccounts.find((account) => account.role === role)?.roleLabel ?? role }
