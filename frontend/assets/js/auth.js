// assets/js/auth.js

// DOM Elements
const video = document.getElementById('video');
const empError = document.getElementById('emp-error');
const adminError = document.getElementById('admin-error');

// State
let isModelsLoaded = false;
let stream = null;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Face API if on login page
    if (document.getElementById('video')) {
        // Allow user to trigger it manually to save resources/permissions
    }
});

// Tab Switching
function switchTab(type) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.form-section').forEach(f => f.classList.add('hidden'));

    if (type === 'employee') {
        document.querySelectorAll('.tab')[0].classList.add('active');
        document.getElementById('employee-login').classList.remove('hidden');
    } else {
        document.querySelectorAll('.tab')[1].classList.add('active');
        document.getElementById('admin-login').classList.remove('hidden');
    }
}

// ==========================
// ADMIN LOGIN
// ==========================
document.getElementById('admin-login-btn').addEventListener('click', async () => {
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    adminError.textContent = '';

    if (!email || !password) return (adminError.textContent = 'Please fill all fields');

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email, password
    });

    if (error) {
        console.error("Supabase Auth Error:", error);
        alert("Login Failed: " + error.message + "\n\n(Tip: Ensure you created the user in the Supabase 'Authentication' tab, NOT just the table!)");
        if (adminError) adminError.textContent = error.message;
    } else {
        // Check if role is admin in employees table
        const { data: emp } = await supabaseClient.from('employees').select('role').eq('email', email).single();

        if (emp && emp.role === 'admin') {
            window.location.href = 'admin-dashboard.html';
        } else {
            // If they are regular employee trying to login as admin
            await supabaseClient.auth.signOut();
            adminError.textContent = 'Access Denied: Not an Admin Account';
        }
    }
});


// ==========================
// EMPLOYEE LOGIN (ID + PASSWORD)
// ==========================
const empLoginBtn = document.getElementById('emp-login-btn');
if (empLoginBtn) {
    empLoginBtn.addEventListener('click', async () => {
        const empId = document.getElementById('emp-id').value.toUpperCase();
        const password = document.getElementById('emp-password').value;
        const empError = document.getElementById('emp-error');

        empError.textContent = '';

        if (!empId || !password) return (empError.textContent = 'Please enter ID and Password');

        // Construct the magic email used for Auth
        const magicEmail = `${empId}@hrms.local`.toLowerCase();

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: magicEmail,
            password: password
        });

        if (error) {
            console.error(error);
            empError.textContent = 'Login Failed: ' + error.message;
        } else {
            // Check if they are actually an employee (optional extra check)
            window.location.href = 'employee-dashboard.html';
        }
    });
}

// ==========================
// EMPLOYEE LOGIN START (Face ID - Legacy/Alternative)
// ==========================
const verifyFaceBtn = document.getElementById('verify-face-btn');
if (verifyFaceBtn) {
    verifyFaceBtn.addEventListener('click', async () => {
        const empId = document.getElementById('emp-id').value.toUpperCase();
        empError.textContent = '';

        if (empId.length !== 5) return (empError.textContent = 'Invalid Employee ID format');

        // 1. Check if ID exists in DB
        const { data: emp, error } = await supabase
            .from('employees')
            .select('*')
            .eq('employee_id', empId)
            .single();

        if (error || !emp) {
            return (empError.textContent = 'Employee ID not found');
        }

        // 2. Open Camera Modal
        document.getElementById('camera-modal').classList.remove('hidden');
        startCamera();
    });

    // ==========================
    // FACE API & CAMERA
    // ==========================
    async function startCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: {} });
            video.srcObject = stream;

            document.getElementById('status-msg').textContent = 'Initializing Face Recognition...';

            // Load Models (Simulating Async Load)
            if (!isModelsLoaded) {
                // await faceapi.nets.tinyFaceDetector.loadFromUri('/assets/models');
                // await faceapi.nets.faceLandmark68Net.loadFromUri('/assets/models');
                // await faceapi.nets.faceRecognitionNet.loadFromUri('/assets/models');
                // await faceapi.nets.ssdMobilenetv1.loadFromUri('/assets/models');
                isModelsLoaded = true;
            }

            document.getElementById('status-msg').textContent = 'Look at the camera...';
            document.getElementById('capture-btn').disabled = false;

        } catch (err) {
            console.error(err);
            document.getElementById('status-msg').textContent = 'Camera Error: ' + err.message;
        }
    }

    document.getElementById('capture-btn').addEventListener('click', async () => {
        const empId = document.getElementById('emp-id').value.toUpperCase();
        const btn = document.getElementById('capture-btn');

        btn.disabled = true;
        btn.textContent = 'Verifying...';

        // ----------------------------------------------------------------
        // SIMULATION OF FACE MATCHING
        // In a real browser-only app without node, we would capture the canvas,
        // generate a descriptor, and match it against the JSON stored in 'facial_data' table.
        // ----------------------------------------------------------------

        // FETCH SAVED FACE DATA
        const { data: faceRecord } = await supabase
            .from('facial_data')
            .select('descriptor')
            .eq('employee_id', empId)
            .single();

        let isMatch = false;

        if (!faceRecord) {
            // First time login? Or no face data?
            // OPTION: Allow first login to SET the face data.
            const setFace = confirm("No face data found. Is this your first login? Click OK to register this face.");
            if (setFace) {
                // Mock saving face
                await supabaseClient.from('facial_data').insert([{ employee_id: empId, descriptor: { mock: "data" } }]);
                isMatch = true;
            } else {
                isMatch = false;
            }
        } else {
            // Compare (Mock)
            // const distance = faceapi.euclideanDistance(faceRecord.descriptor, currentDescriptor);
            // isMatch = distance < 0.6;
            isMatch = true; // Simulating success for User Demo
        }

        if (isMatch) {
            // Perform Login via "Magic Email"
            const magicEmail = `${empId}@hrms.local`.toLowerCase();
            const magicPass = 'password123'; // Hardcoded for prototype as per plan

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: magicEmail,
                password: magicPass
            });

            if (error) {
                alert('Face Verified but Login Failed: ' + error.message);
            } else {
                window.location.href = 'employee-dashboard.html';
            }

        } else {
            alert('Face Verification Failed! Access Denied.');
        }

        btn.disabled = false;
        btn.textContent = 'Verify';
    });


    // Close Modal
    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('camera-modal').classList.add('hidden');
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    });
     };
