const SUPABASE_URL = "https://ruunghmsdqefduzbtwtm.supabase.co";

const SUPABASE_ANON_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dW5naG1zZHFlZmR1emJ0d3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MTEwNjIsImV4cCI6MjA5NjQ4NzA2Mn0.wspaHe2Jblu5PSytOvRSTTPl27cF4qUc9A0XWKX4T6Y";

window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);