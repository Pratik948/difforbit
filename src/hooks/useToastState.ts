import { toast } from "sonner"

// Drop-in replacement for the old useToast() hook.
// Maps { variant, message } → sonner toast types.
export function useToast() {
  return {
    addToast: ({ variant, message }: { variant: "success" | "error" | "info"; message: string }) => {
      if (variant === "success") toast.success(message)
      else if (variant === "error") toast.error(message)
      else toast(message)
    },
  }
}
