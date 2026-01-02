// --- Supabase Configuration ---
// Replace with your actual project URL and Anon Key
const SUPABASE_URL = 'https://tjqsmkaiajdpotmafqvw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqcXNta2FpYWpkcG90bWFmcXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5ODA3NDIsImV4cCI6MjA3MTU1Njc0Mn0.9710q9W5EFfCagj340AizUSKiOXYApy0xkTFszFjO8o';
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- 1. DATA LOADING ---
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    let eventData = {
        title: "Event Not Found",
        shortDesc: "Details unavailable.",
        date: "--/--/----",
        location: "Unknown",
        description: "Please return to the events list.",
        mainImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80",
        gallery: [],
        video: null
    };

    if (eventId) {
        try {
            // Fetch from 'events' table
            const { data, error } = await _supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (error) {
                console.error("Error fetching event:", error);
            } else if (data) {
                // Map DB fields to local object
                eventData = {
                    title: data.title,
                    // Create a short snippet from description if needed
                    shortDesc: data.description.length > 100 ? data.description.substring(0, 100) + "..." : data.description, 
                    date: new Date(data.date).toLocaleDateString(),
                    location: data.location || "Online",
                    description: data.description, // Full description (HTML or text)
                    mainImage: data.main_media_url || eventData.mainImage,
                    gallery: data.gallery_urls || [],
                    video: data.video_url
                };
            }
        } catch (err) {
            console.error("Unexpected fetch error:", err);
        }
    }

    // --- 2. POPULATE UI ---
    function renderEvent() {
        document.getElementById('event-title').textContent = eventData.title;
        document.getElementById('event-short-desc').textContent = eventData.shortDesc;
        document.getElementById('event-date').textContent = eventData.date;
        document.getElementById('event-location').textContent = eventData.location;
        document.getElementById('event-full-desc').innerHTML = `<p>${eventData.description}</p>`; // Supports HTML content
        document.getElementById('modal-event-name').textContent = eventData.title;

        // Hero Background
        const heroSection = document.getElementById('event-hero');
        if(heroSection) {
            heroSection.style.backgroundImage = `url('${eventData.mainImage}')`;
        }

        // Gallery Rendering (Basic)
        // If the DB has gallery images, we replace the placeholders.
        // Otherwise, we leave the placeholders for now.
        const galleryItems = document.querySelectorAll('.gallery-item .placeholder-img');
        if (eventData.gallery.length > 0) {
             eventData.gallery.forEach((url, index) => {
                 if (galleryItems[index]) {
                     galleryItems[index].innerHTML = `<img src="${url}" alt="Gallery ${index+1}" style="width:100%; height:100%; object-fit:cover;">`;
                 }
             });
        }
        
        // Video Rendering
        // If a video URL exists, we could replace the placeholder.
        // (Currently just logging it as per requirement to 'structure page for future')
        if (eventData.video) {
            console.log("Video URL available:", eventData.video);
            // Logic to embed YouTube/Video would go here
        }
    }

    renderEvent();

    // --- 3. MODAL & REGISTRATION LOGIC ---
    const modal = document.getElementById('registration-modal');
    const openBtn = document.getElementById('open-register-btn');
    const closeBtn = document.getElementById('close-modal-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const form = document.getElementById('registration-form');

    // Open
    if(openBtn) {
        openBtn.addEventListener('click', () => {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    // Close
    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    };

    if(closeBtn) closeBtn.addEventListener('click', closeModal);
    if(cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if(modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // Submit
    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            submitBtn.textContent = 'Registering...';
            submitBtn.disabled = true;

            const formData = new FormData(form);
            const registrationPayload = {
                event_id: eventId, // FK to events table
                full_name: formData.get('fullName'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                organization: formData.get('organization'),
                role: formData.get('role'),
                reason: formData.get('reason')
            };

            try {
                // Insert into the new 'event_registrations' table
                const { error } = await _supabase
                    .from('event_registrations')
                    .insert([registrationPayload]);

                if (error) throw error;

                alert(`Success! ${registrationPayload.full_name}, you are registered for "${eventData.title}".`);
                form.reset();
                closeModal();

            } catch (err) {
                console.error("Registration failed:", err);
                alert("Registration failed. Please try again.");
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});