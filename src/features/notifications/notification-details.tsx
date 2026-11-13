"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { NotificationIcon } from "./notification-icon"
import type { CommitteeNotification } from "./types"
import { formatNotificationDate, kindLabels } from "./utils"

type Props = {
  notification: CommitteeNotification | null
  locale: string
  onClose: () => void
  onToggleRead: (id: string, read: boolean) => void
  onToggleArchive: (id: string) => void
}

export function NotificationDetails({ notification, locale, onClose, onToggleRead, onToggleArchive }: Props) {
  return (
    <Dialog open={Boolean(notification)} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto w-[calc(100vw-2rem)] sm:max-w-md">
        {notification && (
          <>
            <DialogHeader className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <NotificationIcon kind={notification.kind} />
                <span className="text-xs font-medium text-muted-foreground">{kindLabels[notification.kind]}</span>
                {notification.priority === "importante" && <Badge variant="secondary">À surveiller</Badge>}
              </div>
              <DialogTitle className="text-xl leading-7">{notification.title}</DialogTitle>
              <DialogDescription>
                {formatNotificationDate(notification.createdAt)} · Notification fictive
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <p className="text-sm leading-7">{notification.detail}</p>
              <div className="space-y-1 border-t pt-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Élément associé</p>
                <p className="text-sm">{notification.context}</p>
              </div>
            </div>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={() => onToggleRead(notification.id, !notification.read)}>
                {notification.read ? "Marquer non lue" : "Marquer comme lue"}
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => onToggleArchive(notification.id)}>
                  {notification.archived ? "Restaurer" : "Archiver"}
                </Button>
                <Button asChild>
                  <Link href={`/${locale}${notification.target}`} onClick={onClose}>
                    Voir le module lié
                  </Link>
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
