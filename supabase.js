
import { createClient } from
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://vfbyrlqegjvgueizaixz.supabase.co";
const SUPABASE_KEY = "sb_publishable_VAKxFGrOyQBk9MoJlLuzEA_-aRzKdE0";

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
