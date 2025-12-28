const SUPABASE_URL = 'https://tjqsmkaiajdpotmafqvw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqcXNta2FpYWpkcG90bWFmcXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5ODA3NDIsImV4cCI6MjA3MTU1Njc0Mn0.9710q9W5EFfCagj340AizUSKiOXYApy0xkTFszFjO8o';
if (SUPABASE_URL === 'here_your_supabase_url' || SUPABASE_ANON_KEY === 'here_your_supabase_anon_key') {
    console.error('CRITICAL: Supabase credentials not set in assets/js/supabase-config.js');
    alert('Please configure Supabase credentials in assets/js/supabase-config.js');
}
// Attach to window to ensure global availability across all scripts
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);