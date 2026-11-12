export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background/70 px-5 py-4 text-xs text-muted-foreground">
      <div className="container flex flex-col gap-2 sm:flex-row sm:justify-between">
        <span>© {new Date().getFullYear()} Gestion du comité scientifique</span>
        <span>Projet universitaire · DevRangers</span>
      </div>
    </footer>
  )
}
