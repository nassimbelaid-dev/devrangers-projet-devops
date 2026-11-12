"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { NotificationKind } from "./types"
import { kindLabels } from "./utils"

const kinds: NotificationKind[] = ["convocation", "rappel-reunion", "echeance-action", "avis-decision"]

type Props = {
  open: boolean
  kind: NotificationKind
  onKindChange: (kind: NotificationKind) => void
  onClose: () => void
  onCreate: () => void
}

export function NotificationSimulator({ open, kind, onKindChange, onClose, onCreate }: Props) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Simuler une notification</DialogTitle>
          <DialogDescription>
            Ajoutez un exemple local à la boîte de réception, sans envoi réel.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <Label htmlFor="notification-kind">Type d'événement</Label>
          <Select value={kind} onValueChange={(value) => onKindChange(value as NotificationKind)}>
            <SelectTrigger id="notification-kind" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {kinds.map((value) => <SelectItem key={value} value={value}>{kindLabels[value]}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs leading-6 text-muted-foreground">
            Cet exemple sera marqué « non lu » et disparaîtra à la prochaine actualisation de la page.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={onCreate}><Plus className="mr-2 size-4" /> Ajouter l'exemple</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
