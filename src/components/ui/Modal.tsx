// Compatibility wrapper — Modal now uses shadcn Dialog.
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog"

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  size?: "sm" | "md" | "lg"
  children: React.ReactNode
}

const maxWidths = { sm: "420px", md: "560px", lg: "720px" }

export function Modal({ open, onClose, title, size = "md", children }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent style={{ maxWidth: maxWidths[size] }}>
        {title && (
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "14px" }}>
              {title}
            </DialogTitle>
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  )
}
