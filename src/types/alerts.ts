
import { Json } from "@/integrations/supabase/types";

export interface Alert {
  id: string;
  type: string;
  message: string;
  status: string;
  created_at: string;
  data?: Record<string, any> | Json;
}
