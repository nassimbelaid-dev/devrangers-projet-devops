"use client"

import { useDemoData } from "@/lib/demo-store"

import { Draggable, DragDropContext, Droppable } from "@hello-pangea/dnd"
import type { DropResult } from "@hello-pangea/dnd"
import { CalendarDays, Eye, GripVertical, Plus, UserRound } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ACTION_STATUSES } from "./types"
import type { ActionRecord, ActionStatus, DecisionRecord } from "./types"
import { dateToday, formatDate, isOverdue } from "./utils"

interface ActionsKanbanProps {
  actions: ActionRecord[]
  decisions: DecisionRecord[]
  onMove: (id: string, status: ActionStatus, beforeId: string | null) => void
  onAdd: (status: ActionStatus) => void
  onDetails: (id: string) => void
}

const borderColors: Record<ActionStatus, string> = {
  "À faire": "border-t-slate-400",
  "En cours": "border-t-sky-500",
  "Terminée": "border-t-emerald-500",
}


export function ActionsKanban({ actions, decisions, onMove, onAdd, onDetails }: ActionsKanbanProps) {
  const { members } = useDemoData()
  const memberName = (id: string) => members.find((member) => member.id === id)?.name ?? "Non attribué"
  const today = dateToday()
  const columns = ACTION_STATUSES.map((status) => ({
    status,
    tasks: actions.filter((task) => task.status === status).sort((a, b) => a.order - b.order),
  }))

  function handleDrop(result: DropResult) {
    if (!result.destination) return
    const source = columns.find((column) => column.status === result.source.droppableId)
    const dest = columns.find((column) => column.status === result.destination?.droppableId)
    if (!source || !dest) return
    if (source.status === dest.status && result.source.index === result.destination.index) return
    const moved = source.tasks[result.source.index]
    if (!moved) return

    // destination.index est calculé dans la liste des cartes visibles (filtrées).
    const destWithoutDragged = dest.tasks.filter((task) => task.id !== moved.id)
    const nextCard = destWithoutDragged[result.destination.index]
    onMove(moved.id, dest.status, nextCard?.id ?? null)
  }

  return (
    <div className="overflow-x-auto pb-3">
      <DragDropContext onDragEnd={handleDrop}>
        <div className="flex min-w-max items-start gap-4 p-1">
          {columns.map((column) => (
            <section key={column.status} className={`w-[310px] shrink-0 rounded-xl border border-t-4 bg-muted/35 ${borderColors[column.status]}`}>
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{column.status}</h3>
                  <Badge variant="secondary">{column.tasks.length}</Badge>
                </div>
                <Button size="icon" variant="ghost" aria-label={`Ajouter dans ${column.status}`} onClick={() => onAdd(column.status)}>
                  <Plus className="size-4" />
                </Button>
              </div>
              <Droppable droppableId={column.status} type="action">
                {(dropProvided, snapshot) => (
                  <div ref={dropProvided.innerRef} {...dropProvided.droppableProps}
                    className={`min-h-44 space-y-3 px-3 pb-3 transition-colors ${snapshot.isDraggingOver ? "bg-primary/5" : ""}`}>
                    {column.tasks.map((task, index) => {
                      const overdue = isOverdue(task, today)
                      const linkedDecision = decisions.find((decision) => decision.id === task.decisionId)
                      return (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} style={dragProvided.draggableProps.style}>
                              <Card className={`space-y-3 p-4 ${dragSnapshot.isDragging ? "shadow-lg ring-2 ring-primary/20" : "shadow-sm"}`}>
                                <div className="flex items-start gap-2">
                                  <span {...dragProvided.dragHandleProps} aria-label={`Déplacer ${task.title}`}
                                    className="mt-0.5 cursor-grab rounded p-0.5 text-muted-foreground hover:bg-muted active:cursor-grabbing">
                                    <GripVertical className="size-4" />
                                  </span>
                                  <button type="button" className="min-w-0 flex-1 text-left text-sm font-semibold leading-5 hover:underline"
                                    onClick={() => onDetails(task.id)}>{task.title}</button>
                                  <Button type="button" size="icon" variant="ghost" className="size-7 shrink-0"
                                    aria-label={`Détails de ${task.title}`} onClick={() => onDetails(task.id)}>
                                    <Eye className="size-4" />
                                  </Button>
                                </div>
                                {task.description && <p className="line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}
                                <div className="flex flex-wrap gap-1.5">
                                  <Badge variant={task.priority === "Haute" ? "destructive" : "outline"}>{task.priority}</Badge>
                                  {linkedDecision && <Badge variant="secondary">{linkedDecision.reference}</Badge>}
                                </div>
                                <div className="space-y-1.5 border-t pt-3 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-2"><UserRound className="size-3.5" />
                                    <span className="truncate">{memberName(task.assigneeId)}</span></div>
                                  <div className={`flex items-center gap-2 ${overdue ? "font-medium text-destructive" : ""}`}>
                                    <CalendarDays className="size-3.5" />
                                    {formatDate(task.dueDate)} {overdue ? "· En retard" : ""}
                                  </div>
                                </div>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      )
                    })}
                    {dropProvided.placeholder}
                    {column.tasks.length === 0 && (
                      <p className="py-10 text-center text-xs text-muted-foreground">Glisse une action ici</p>
                    )}
                  </div>
                )}
              </Droppable>
            </section>
          ))}
        </div>
      </DragDropContext>
      <p className="px-2 pt-2 text-xs text-muted-foreground">
        Saisis les cartes par la poignée pour les déplacer. Les actions restent en mémoire tant que la page est ouverte.
      </p>
    </div>
  )
}
