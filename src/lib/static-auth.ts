"use client"

import { useEffect, useSyncExternalStore } from "react"

export type DemoRole =
  | "admin"
  | "president"
  | "secretary"
  | "archivist"
  | "member"
export type DemoUser = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: DemoRole
  seatId?: string
  memberId?: string
  isActive?: boolean
}

export const demoAccounts: Array<
  DemoUser & { password: string; roleLabel: string }
> = [
  {
    id: "u-admin",
    firstName: "Amine",
    lastName: "Bensaïd",
    email: "admin@comite.test",
    password: "Comite2026",
    role: "admin",
    roleLabel: "Administrateur",
  },
  {
    id: "u-president",
    firstName: "Karim",
    lastName: "Haddad",
    email: "president@comite.test",
    password: "Comite2026",
    role: "president",
    roleLabel: "Président du comité",
    seatId: "s1",
    memberId: "m1",
  },
  {
    id: "u-secretary",
    firstName: "Lina",
    lastName: "Amrane",
    email: "secretaire@comite.test",
    password: "Comite2026",
    role: "secretary",
    roleLabel: "Secrétaire",
    seatId: "s2",
    memberId: "m2",
  },
  {
    id: "u-archive",
    firstName: "Amine",
    lastName: "Cherif",
    email: "archives@comite.test",
    password: "Comite2026",
    role: "archivist",
    roleLabel: "Responsable des archives",
    seatId: "s5",
    memberId: "m5",
  },
  {
    id: "u-member",
    firstName: "Nadia",
    lastName: "Bouzid",
    email: "membre@comite.test",
    password: "Comite2026",
    role: "member",
    roleLabel: "Membre du comité",
    seatId: "s3",
    memberId: "m3",
  },
  {
    id: "u-member-m4",
    firstName: "Yanis",
    lastName: "Aït Ali",
    email: "yanis@comite.test",
    password: "Comite2026",
    role: "member",
    roleLabel: "Membre du comité",
    seatId: "s4",
    memberId: "m4",
  },
  {
    id: "u-member-m6",
    firstName: "Sara",
    lastName: "Bensaïd",
    email: "sara@comite.test",
    password: "Comite2026",
    role: "member",
    roleLabel: "Membre suppléante",
    seatId: "s3",
    memberId: "m6",
  },
]

const STORAGE_KEY = "comite-scientifique:static-auth:v2"
const ACCOUNTS_KEY = "comite-scientifique:accounts:v1"
const COOKIE_KEY = "demo-auth"
const listeners = new Set<() => void>()
let current: DemoUser | null = null
let initialized = false
let storageListenerAdded = false

function emit() {
  listeners.forEach((listener) => listener())
}
function readStorage(): DemoUser | null {
  if (typeof window === "undefined") return null
  try {
    const id = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "null"
    )?.id
    const account = getDemoAccounts().find(
      ({ id: accountId }) => accountId === id
    )
    if (!account || account.isActive === false) return null
    const { password: _password, roleLabel: _roleLabel, ...user } = account
    return user
  } catch {
    return null
  }
}
export type DemoAccount = DemoUser & { password: string; roleLabel: string }
export function getDemoAccounts(): DemoAccount[] {
  if (typeof window === "undefined") return demoAccounts
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(ACCOUNTS_KEY) ?? "null"
    )
    if (Array.isArray(stored)) {
      const valid = stored
        .filter(
          (account) =>
            account &&
            typeof account.id === "string" &&
            typeof account.email === "string" &&
            typeof account.password === "string" &&
            ["admin", "president", "secretary", "archivist", "member"].includes(
              account.role
            )
        )
        .map((account) => ({
          ...account,
          isActive: account.isActive !== false,
        }))
      const existingIds = new Set(valid.map((account) => account.id))
      const migrationAccounts = demoAccounts.filter(
        (account) =>
          ["u-member-m4", "u-member-m6"].includes(account.id) &&
          !existingIds.has(account.id)
      )
      return [...valid, ...migrationAccounts]
    }
  } catch {
    /* Repli sur les comptes de démonstration intégrés. */
  }
  return demoAccounts
}
export function saveDemoAccounts(
  accounts: DemoAccount[],
  members?: Array<{ id: string; seatId: string }>
): boolean {
  if (typeof window === "undefined" || getCurrentDemoUser()?.role !== "admin")
    return false
  const activeAdmins = accounts.filter(
    (account) => account.role === "admin" && account.isActive !== false
  )
  if (!activeAdmins.length) return false
  if (
    demoAccounts.some(
      (builtin) => !accounts.some((account) => account.id === builtin.id)
    )
  )
    return false
  const emails = accounts.map((account) => account.email.trim().toLowerCase())
  const memberIds = accounts.flatMap((account) =>
    account.memberId ? [account.memberId] : []
  )
  if (
    new Set(emails).size !== emails.length ||
    new Set(memberIds).size !== memberIds.length ||
    accounts.some(
      (account) =>
        !account.id ||
        !account.email ||
        !account.password ||
        !["admin", "president", "secretary", "archivist", "member"].includes(
          account.role
        )
    )
  )
    return false
  if (
    members &&
    accounts.some(
      (account) =>
        account.role !== "admin" &&
        (!account.memberId ||
          !members.some(
            (member) =>
              member.id === account.memberId && member.seatId === account.seatId
          ))
    )
  )
    return false
  window.localStorage.setItem(
    ACCOUNTS_KEY,
    JSON.stringify(
      accounts.map((account) => ({
        ...account,
        isActive: account.isActive !== false,
      }))
    )
  )
  const updated = accounts.find((account) => account.id === current?.id)
  if (!updated || updated.isActive === false) signOutStatic()
  else {
    const { password: _password, roleLabel: _roleLabel, ...user } = updated
    current = user
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    emit()
  }
  return true
}

/** Keep the copied seat label in the account record aligned with its canonical member record. */
export function syncDemoAccountSeats(
  members: Array<{ id: string; seatId: string }>
): boolean {
  if (typeof window === "undefined" || getCurrentDemoUser()?.role !== "admin")
    return false
  const accounts = getDemoAccounts()
  if (
    accounts.some(
      (account) =>
        account.memberId &&
        !members.some((member) => member.id === account.memberId)
    )
  )
    return false
  const updated = accounts.map((account) => {
    const member = members.find((item) => item.id === account.memberId)
    return member && account.seatId !== member.seatId
      ? { ...account, seatId: member.seatId }
      : account
  })
  if (
    updated.every((account, index) => account.seatId === accounts[index].seatId)
  )
    return true
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated))
  const active = updated.find((account) => account.id === current?.id)
  if (active && active.isActive !== false) {
    const { password: _password, roleLabel: _roleLabel, ...user } = active
    current = user
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    emit()
  }
  return true
}
function setCookie(value: boolean) {
  if (typeof document !== "undefined")
    document.cookie = `${COOKIE_KEY}=${value ? "1" : "0"}; path=/; max-age=${value ? 604800 : 0}; SameSite=Lax`
}
function initialize() {
  if (initialized || typeof window === "undefined") return
  initialized = true
  current = readStorage()
  emit()
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  initialize()
  if (typeof window !== "undefined" && !storageListenerAdded) {
    window.addEventListener("storage", (event) => {
      if (
        event.key === STORAGE_KEY ||
        event.key === ACCOUNTS_KEY ||
        event.key === null
      ) {
        current = readStorage()
        if (!current) setCookie(false)
        emit()
      }
    })
    storageListenerAdded = true
  }
  return () => listeners.delete(listener)
}
function snapshot() {
  return current
}
function serverSnapshot() {
  return null
}

export function signInStatic(email: string, password: string) {
  const account = getDemoAccounts().find(
    (item) =>
      item.isActive !== false &&
      item.email === email.trim().toLowerCase() &&
      item.password === password
  )
  if (!account) return false
  const { password: _password, roleLabel: _roleLabel, ...user } = account
  current = user
  initialized = true
  if (typeof window !== "undefined")
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
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
  useEffect(() => {
    initialize()
  }, [])
  return { user, isAuthenticated: Boolean(user) }
}

export type Permission =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "approve"
  | "vote"
  | "archive"
  | "manageUsers"
  | "manageRoles"
  | "manageMeetings"
  | "manageMembers"
  | "managePresence"
const view = ["view"] as Permission[]
export const rolePermissions: Record<
  DemoRole,
  Partial<Record<string, Permission[]>>
> = {
  admin: {
    dashboard: view,
    meetings: view,
    members: ["view", "create", "edit", "delete", "manageMembers"],
    agenda: view,
    votes: view,
    actions: view,
    documents: view,
    minutes: view,
    notifications: view,
    profile: ["view", "edit"],
    users: ["view", "create", "edit", "delete", "manageUsers", "manageRoles"],
  },
  president: {
    dashboard: view,
    meetings: ["view", "manageMeetings", "managePresence"],
    members: view,
    agenda: ["view", "create", "edit", "approve"],
    votes: ["view", "approve", "vote"],
    decisions: ["view", "create"],
    actions: ["view", "create"],
    documents: view,
    minutes: ["view", "approve"],
    notifications: view,
    profile: ["view", "edit"],
  },
  secretary: {
    dashboard: view,
    meetings: ["view", "create", "edit", "managePresence"],
    members: view,
    agenda: ["view", "create", "edit"],
    votes: ["view", "vote"],
    actions: ["view", "create", "edit"],
    documents: ["view", "create", "edit"],
    minutes: ["view", "create", "edit"],
    notifications: view,
    profile: ["view", "edit"],
  },
  archivist: {
    dashboard: view,
    meetings: view,
    members: view,
    agenda: view,
    votes: view,
    actions: view,
    documents: ["view", "archive"],
    minutes: ["view", "archive"],
    notifications: view,
    profile: ["view", "edit"],
  },
  member: {
    dashboard: view,
    meetings: view,
    members: view,
    agenda: ["view", "create", "edit"],
    votes: ["view", "vote"],
    actions: ["view", "edit"],
    documents: view,
    minutes: view,
    notifications: view,
    profile: ["view", "edit"],
  },
}

const routeModules: Array<[string, string]> = [
  ["/dashboards", "dashboard"],
  ["/meetings", "meetings"],
  ["/members", "members"],
  ["/agenda", "agenda"],
  ["/votes", "votes"],
  ["/actions", "actions"],
  ["/documents", "documents"],
  ["/notifications", "notifications"],
  ["/profile", "profile"],
  ["/users", "users"],
]
export function moduleForPath(pathname: string) {
  return (
    routeModules.find(
      ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )?.[1] ?? "dashboard"
  )
}
export function hasPermission(
  user: DemoUser | null,
  module: string,
  permission: Permission = "view"
) {
  return Boolean(
    user?.isActive !== false &&
      user &&
      rolePermissions[user.role][module]?.includes(permission)
  )
}
export function getRoleLabel(role: DemoRole) {
  return (
    demoAccounts.find((account) => account.role === role)?.roleLabel ?? role
  )
}

export function getCurrentDemoUser(): DemoUser | null {
  if (typeof window === "undefined") return current
  current = readStorage()
  initialized = true
  return current
}
