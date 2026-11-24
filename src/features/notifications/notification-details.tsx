"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { NotificationIcon } from "./notification-icon"
import { useUiText } from "../ui-text"
import type { CommitteeNotification } from "./types"
import { formatNotificationDate, kindLabels, notificationMessage, notificationTitle } from "./utils"

type Props = {
  notification: CommitteeNotification | null
  locale: string
  href: string | null
  onClose: () => void
  onToggleRead: (id: string, read: boolean) => void
  onToggleArchive: (id: string) => void
}

export function NotificationDetails({ notification, locale, href, onClose, onToggleRead, onToggleArchive }: Props) {
  const t = useUiText()
  return (
    <Dialog open={Boolean(notification)} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto w-[calc(100vw-2rem)] sm:max-w-md">
        {notification && (
          <>
            <DialogHeader className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <NotificationIcon kind={notification.kind} />
                <span className="text-xs font-medium text-muted-foreground">{t(kindLabels[notification.kind])}</span>
                {notification.priority === "importante" && <Badge variant="secondary">{t("À surveiller")}</Badge>}
              </div>
              <DialogTitle className="text-xl leading-7">{notificationTitle(notification, t)}</DialogTitle>
              <DialogDescription>
                {formatNotificationDate(notification.createdAt, locale)} · {t("Notification interne")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <p className="text-sm leading-7">{notificationMessage(notification, t)}</p>
              <div className="space-y-1 border-t pt-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Élément associé")}</p>
                <p className="text-sm">{notification.context}</p>
              </div>
            </div>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={() => onToggleRead(notification.id, !notification.read)}>
                {t(notification.read ? "Marquer non lue" : "Marquer comme lue")}
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => onToggleArchive(notification.id)}>
                  {t(notification.archived ? "Restaurer" : "Archiver")}
                </Button>
                {href ? <Button asChild><Link href={href} onClick={onClose}>{t("Voir l’élément associé")}</Link></Button> : <span className="self-center text-xs text-muted-foreground">{t("Cet élément n’est plus disponible ou votre compte n’y a plus accès.")}</span>}
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
