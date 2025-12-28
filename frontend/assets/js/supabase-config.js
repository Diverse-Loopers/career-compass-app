
// assets/js/supabase-config.js

// TODO: Replace these with your actual Supabase URL and Anon Key
const SUPABASE_URL = 'https://tjqsmkaiajdpotmafqvw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqcXNta2FpYWpkcG90bWFmcXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5ODA3NDIsImV4cCI6MjA3MTU1Njc0Mn0.9710q9W5EFfCagj340AizUSKiOXYApy0xkTFszFjO8o';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqcXNta2FpYWpkcG90bWFmcXZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk4MDc0MiwiZXhwIjoyMDcxNTU2NzQyfQ.r1iyV8GQV7zok8Z3f7ZtKmO9KNqk8mPC9KIu01R8mjY'; 

// Create a separate Admin Client if key is provided
window.supabaseAdmin = null;
if (SUPABASE_SERVICE_ROLE_KEY && SUPABASE_SERVICE_ROLE_KEY !== 'YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE') {
    window.supabaseAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

if (SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE') {
    console.error('CRITICAL: Supabase credentials not set in assets/js/supabase-config.js');
    alert('Please configure Supabase credentials in assets/js/supabase-config.js');
}

// Attach to window to ensure global availability across all scripts
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
