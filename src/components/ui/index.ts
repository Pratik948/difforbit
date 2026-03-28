// Barrel — all app imports come through here.
// Shadcn components + thin compat wrappers that preserve existing prop APIs.

export { Button } from "./ButtonCompat"
export { Input } from "./input"
export { Textarea } from "./textarea"
export { Switch } from "./SwitchCompat"
export { Badge } from "./badge"
export { Card } from "./card"
export { Panel } from "./Panel"
export { Modal } from "./Modal"
export { Toaster as ToastProvider } from "./sonner"
export { useToast } from "@/hooks/useToastState"
