"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DecisionRecord } from "@/features/decisions/types"

interface Props {
  open: boolean
  onOpenChange: (value: boolean) => void
  availableDecisions: DecisionRecord[]
  onCreate: (decisionId: string) => void
}

export function CreateBallotDialog({ open, onOpenChange, availableDecisions, onCreate }: Props) {
  const [decisionId, setDecisionId] = useState("")
  const selected = availableDecisions.some((decision) => decision.id === decisionId) ? decisionId : ""
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau scrutin simulé</DialogTitle>
          <DialogDescription>
            Choisissez une décision fictive. La présence, le quorum et les bulletins pourront être configurés ensuite.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-3">
          <Label htmlFor="new-ballot-decision">Décision à soumettre au vote</Label>
          {availableDecisions.length ? (
            <Select value={selected} onValueChange={setDecisionId}>
              <SelectTrigger id="new-ballot-decision"><SelectValue placeholder="Choisir une décision" /></SelectTrigger>
              <SelectContent>
                {availableDecisions.map((decision) => (
                  <SelectItem key={decision.id} value={decision.id}>
                    {decision.reference} — {decision.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">Toutes les décisions possèdent déjà un scrutin.</p>}
          <p className="text-xs text-muted-foreground">Une seule simulation par décision pour cette première version.</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button type="button" disabled={!selected} onClick={() => {
            if (!selected) return
            onCreate(selected)
            setDecisionId("")
            onOpenChange(false)
          }}><Plus className="mr-2 size-4" />Créer le scrutin</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
