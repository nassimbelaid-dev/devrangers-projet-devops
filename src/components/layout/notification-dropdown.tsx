"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, CheckCheck, ExternalLink, Inbox } from "lucide-react"

import type { DictionaryType } from "@/lib/get-dictionary"
import { useDemoCollection } from "@/lib/demo-store"
import { NotificationIcon } from "@/features/notifications/notification-icon"
import { kindLabels } from "@/features/notifications/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function NotificationDropdown({ dictionary: _dictionary }: { dictionary: DictionaryType }) {
  const [items, setItems] = useDemoCollection("notifications")
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const lang = pathname.split("/").filter(Boolean)[0] || "en"

  const recent = useMemo(() =>
    items
      .filter((item) => !item.archived)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5),
    [items],
  )
  const unreadCount = items.filter((item) => !item.archived && !item.read).length

  function markRead(id: string) {
    setItems((current) => current.map((item) =>
      item.id === id ? { ...item, read: true } : item,
    ))
  }

  function markAllRead() {
    setItems((current) => current.map((item) =>
      item.archived || item.read ? item : { ...item, read: true },
    ))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl" aria-label={`${_dictionary.navigation.notification.notifications}, ${unreadCount} ${_dictionary.navigation.notification.unread}`}>
          <Bell className="size-4" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-semibold text-white" aria-live="polite">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(380px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl p-0 shadow-lg">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold">{_dictionary.navigation.notification.notifications}</p>
            <p className="text-xs text-muted-foreground">{unreadCount ? `${unreadCount} ${_dictionary.navigation.notification.unread}` : _dictionary.navigation.notification.allUpToDate}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={markAllRead} disabled={!unreadCount} className="gap-1.5 text-xs">
            <CheckCheck className="size-3.5" /> {_dictionary.navigation.notification.markAllRead}
          </Button>
        </div>
        <div className="max-h-[min(420px,65vh)] overflow-y-auto">
          {recent.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center text-sm text-muted-foreground">
              <Inbox className="size-7 opacity-60" /> {_dictionary.navigation.notification.empty}
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {recent.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/${lang}${item.target}`}
                    onClick={() => { markRead(item.id); setOpen(false) }}
                    className={`flex gap-3 px-4 py-3.5 transition-colors hover:bg-accent/65 focus-visible:bg-accent ${item.read ? "" : "bg-indigo-500/[0.055]"}`}
                  >
                    <NotificationIcon kind={item.kind} />
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className="line-clamp-1 text-xs font-medium text-muted-foreground">{kindLabels[item.kind]}</span>
                        {!item.readAt && <span className="mt-1 size-2 shrink-0 rounded-full bg-indigo-500" aria-label={_dictionary.navigation.notification.unread} />}
                      </span>
                      <span className="block text-sm font-medium leading-5">{item.title}</span>
                      <span className="block line-clamp-2 text-xs leading-5 text-muted-foreground">{item.preview}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t p-2">
          <Button variant="ghost" className="w-full gap-2 text-indigo-600 dark:text-indigo-400" asChild>
            <Link href={`/${lang}/notifications`} onClick={() => setOpen(false)}>
              {_dictionary.navigation.notification.seeAllNotifications} <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
