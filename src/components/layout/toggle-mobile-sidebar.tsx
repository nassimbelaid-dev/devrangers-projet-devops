"use client"

import { useParams } from "next/navigation"
import { PanelLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"

export function ToggleMobileSidebar() {
  const { isMobile, openMobile, setOpenMobile } = useSidebar()
  const locale = (useParams().lang as string) || "fr"
  const label =
    locale === "ar"
      ? "تبديل الشريط الجانبي"
      : locale === "en"
        ? "Toggle sidebar"
        : "Afficher la barre latérale"

  if (isMobile) {
    return (
      <Button
        data-sidebar="trigger"
        variant="ghost"
        size="icon"
        onClick={() => setOpenMobile(!openMobile)}
        aria-label={label}
      >
        <PanelLeft className="h-4 w-4" />
      </Button>
    )
  }
}
