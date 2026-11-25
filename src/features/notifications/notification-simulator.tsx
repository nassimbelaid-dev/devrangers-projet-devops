"use client"

import { Plus } from "lucide-react"

import type { NotificationKind } from "./types"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUiText } from "../ui-text"
import { kindLabels } from "./utils"

const kinds: NotificationKind[] = [
  "convocation",
  "rappel-reunion",
  "echeance-action",
  "avis-decision",
]

type Props = {
  open: boolean
  kind: NotificationKind
  onKindChange: (kind: NotificationKind) => void
  onClose: () => void
  onCreate: () => void
}

export function NotificationSimulator({
  open,
  kind,
  onKindChange,
  onClose,
  onCreate,
}: Props) {
  const t = useUiText()
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Simuler une notification")}</DialogTitle>
          <DialogDescription>
            {t(
              "Ajoutez un exemple local à la boîte de réception, sans envoi réel."
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <Label htmlFor="notification-kind">{t("Type d'événement")}</Label>
          <Select
            value={kind}
            onValueChange={(value) => onKindChange(value as NotificationKind)}
          >
            <SelectTrigger id="notification-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {kinds.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(kindLabels[value])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs leading-6 text-muted-foreground">
            {t(
              "L’exemple reste enregistré dans la boîte de réception du compte connecté."
            )}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Annuler")}
          </Button>
          <Button onClick={onCreate}>
            <Plus className="mr-2 size-4" /> {t("Ajouter l'exemple")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
