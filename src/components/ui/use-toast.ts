
// Re-export the toast hooks from the main hooks directory
// This allows components to import from @/components/ui/use-toast instead of directly from hooks
import { useToast, toast } from "@/hooks/use-toast";

export { useToast, toast };
