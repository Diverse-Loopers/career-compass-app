// assets/js/employee.js

let currentUser = null;
let profile = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Session
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
        window.location.href = 'index.html';
        return;
    }

    // 2. Derive Employee ID from the Auth Email (Magic Email: ID@hrms.local)
    // We cannot trust 'session.user.email' to match 'employees.email' because admin might have saved a contact email there.
    // BUT we know the unique ID is the prefix of the magic email used for Login.
    const magicEmail = session.user.email;
    const derivedEmpId = magicEmail.split('@')[0].toUpperCase();

    // 3. Fetch Profile using the Derived Employee ID
    const { data: empData, error: dbError } = await supabaseClient
        .from('employees')
        .select('*')
        .eq('employee_id', derivedEmpId)
        .single();

    if (dbError || !empData) {
        console.error("Fetch Error:", dbError);
        alert('Employee profile not found for ID: ' + derivedEmpId);
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
        return;
    }

    profile = empData;
    currentUser = session.user;

    // 4. Update UI
    const welcomeName = document.getElementById('welcome-name');
    const sidebarName = document.getElementById('sidebar-user-name');
    const sidebarId = document.getElementById('sidebar-user-id');

    if (welcomeName) welcomeName.textContent = profile.full_name;
    if (sidebarName) sidebarName.textContent = profile.full_name;
    if (sidebarId) sidebarId.textContent = profile.employee_id;

    // 5. Load Data
    showSection('dashboard');
    fetchNotifications();
    setInterval(fetchNotifications, 30000);

    // 6. Mobile Menu Logic (Robust Listener)
    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');

    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent bubbling
            sidebar.classList.toggle('active');
            console.log('Sidebar toggled:', sidebar.classList.contains('active'));
        });

        // Close when clicking outside (on main content)
        document.querySelector('.main-content').addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
            }
        });
    }

    // 7. Notification Button Listener
    const notifBtn = document.getElementById('notif-btn');
    if (notifBtn) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleNotifications();
        });
    }

    // Close notifications when clicking elsewhere
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notif-dropdown');
        if (!dropdown.classList.contains('hidden') && !e.target.closest('.notification-wrapper')) {
            dropdown.classList.add('hidden');
        }
    });

});

// ==========================
// NOTIFICATIONS
// ==========================
async function fetchNotifications() {
    const list = document.getElementById('notif-list');
    const badge = document.getElementById('notif-count');

    // Fetch notifications for THIS employee or 'employee' role broadcasts (if any)
    // Here strict to ID
    const { data, error } = await supabaseClient
        .from('notifications')
        .select('*')
        .eq('recipient_role', 'employee')
        .eq('recipient_id', profile.employee_id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

    if (error) return console.error(error);

    if (data.length > 0) {
        badge.textContent = data.length;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }

    if (data.length === 0) {
        list.innerHTML = '<li style="padding:10px; color:#666;">No new notifications</li>';
        return;
    }

    list.innerHTML = '';
    data.forEach(n => {
        const li = document.createElement('li');
        li.textContent = n.message;
        li.className = 'unread';
        list.appendChild(li);
    });
}

function toggleNotifications() {
    document.getElementById('notif-dropdown').classList.toggle('hidden');
}

async function markAllRead() {
    await supabaseClient
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', profile.employee_id);

    fetchNotifications();
}

function showSection(sectionId) {
    // Sidebar active state
    document.querySelectorAll('.nav-links button').forEach(btn => btn.classList.remove('active'));
    // (Simulated active class toggle - in real app match by ID or index)

    // Hide all
    ['dashboard', 'tasks', 'leaves'].forEach(id => {
        document.getElementById(`${id}-section`).classList.add('hidden');
    });
    document.getElementById(`${sectionId}-section`).classList.remove('hidden');

    if (sectionId === 'dashboard') loadDashboardStats();
    if (sectionId === 'tasks') loadMyTasks();
    if (sectionId === 'leaves') loadMyLeaves();
}

// ==========================
// DASHBOARD & ATTENDANCE
// ==========================
async function loadDashboardStats() {
    // Recent Attendance
    const { data: attData } = await supabaseClient
        .from('attendance')
        .select('*')
        .eq('employee_id', profile.employee_id)
        .order('date', { ascending: false })
        .limit(5);

    const attBody = document.querySelector('#recent-attendance-table tbody');
    attBody.innerHTML = '';

    // Check if marked today (Local Time)
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Debug
    // console.log("Checking attendance for local date:", todayStr);

    const presentToday = attData?.find(a => a.date === todayStr);

    if (presentToday) {
        document.getElementById('attendance-status').textContent = `Checked in at ${presentToday.check_in_time}`;
        document.getElementById('mark-attendance-btn').disabled = true;
        document.getElementById('mark-attendance-btn').innerHTML = '✅ Present';
        document.getElementById('mark-attendance-btn').classList.replace('btn-primary', 'btn-secondary');
    } else {
        document.getElementById('mark-attendance-btn').disabled = false;
    }

    if (attData) {
        attData.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatDate(r.date)}</td>
                <td>${r.check_in_time}</td>
                <td>${r.status}</td>
                 <td>${r.face_verified ? '✅ Verified' : '⚠️ Manual'}</td>
            `;
            attBody.appendChild(tr);
        });
    }

    // Stats: Pending Tasks
    const { count: taskCount, error: taskError } = await supabaseClient
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', profile.employee_id)
        .eq('status', 'Pending');

    if (!taskError) {
        document.getElementById('stat-pending-tasks').textContent = taskCount || 0;
    }

    // Stats: Leaves Taken (Approved)
    const { count: leaveCount, error: leaveError } = await supabaseClient
        .from('leaves')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', profile.employee_id)
        .eq('status', 'Approved');

    if (!leaveError) {
        // Calculate total days? Or just count of applications? 
        // User asked for "one leave is approved", so count of applications is consistent with "1".
        // Use count for now.
        document.getElementById('stat-leaves').textContent = leaveCount || 0;
    }

    // Stats: Attendance % (Current Month)
    // Fix: Use Local Time for "Start of Month" to avoid timezone shifts (e.g. 00:00 IST -> Prev Day UTC)
    const todayDate = new Date();
    const startOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    // Format to YYYY-MM-DD Local
    const startOfMonthStr = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}-${String(startOfMonth.getDate()).padStart(2, '0')}`;

    const { count: presentCount, error: attError } = await supabaseClient
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', profile.employee_id)
        .gte('date', startOfMonthStr)
        .eq('status', 'Present');

    if (!attError) {
        const today = todayDate.getDate(); // Days passed including today
        const percentage = today > 0 ? Math.round((presentCount / today) * 100) : 0;
        document.getElementById('stat-attendance').textContent = `${percentage}%`;
    }
}

// Attendance Logic
async function markAttendance() {
    // ... (Simulation) ...
    const confirmed = confirm("Simulating Face Verification...\n\nIs your face visible?");
    if (!confirmed) return;

    // Insert Attendance Record
    const now = new Date();
    // Fix: Use Local Date String for DB to match the "Today" check
    const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const { error } = await supabaseClient.from('attendance').insert([{
        employee_id: profile.employee_id,
        date: localDateStr,
        check_in_time: now.toLocaleTimeString(), // Browser default local time string
        face_verified: true,
        status: 'Present'
    }]);

    if (error) showToast(error.message, 'error');
    else {
        // TRIGGER NOTIFICATION: Attendance
        // ... (Notification Insert) ...
        await supabaseClient.from('notifications').insert([{
            recipient_role: 'admin',
            recipient_id: null, // Broadcast to all admins
            type: 'attendance',
            message: `${profile.full_name} (${profile.employee_id}) marked attendance.`
        }]);

        showToast('Attendance Marked Successfully!', 'success');
        loadDashboardStats();
    }
}


// ==========================
// TASKS
// ==========================
async function loadMyTasks() {
    console.log("Loading tasks for:", profile.employee_id);
    const { data, error } = await supabaseClient
        .from('tasks')
        .select('*')
        .eq('employee_id', profile.employee_id)
        .order('assigned_at', { ascending: false });

    console.log("Tasks Data:", data, "Error:", error);

    const tbody = document.querySelector('#my-tasks-table tbody');
    tbody.innerHTML = '';

    if (data) {
        data.forEach(task => {
            const action = task.status === 'Pending' || task.status === 'Rejected'
                ? `<button class="btn-primary" style="font-size:0.8rem; padding: 0.25rem 0.5rem;" onclick="openSubmitTask(${task.id})">Submit</button>`
                : '-';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${task.title}</td>
                <td style="max-width: 200px; white-space: normal;">${task.description || '-'}</td>
                <td>${formatDate(task.assigned_at)}</td>
                <td>${formatDate(task.deadline)}</td>
                <td>${task.priority}</td>
                <td><span class="status-badge status-${task.status.toLowerCase()}">${task.status}</span></td>
                <td>${action}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

function openSubmitTask(id) {
    document.getElementById('submit-task-id').value = id;
    document.getElementById('submit-task-modal').classList.remove('hidden');
}

async function handleSubmitTask(e) {
    e.preventDefault();
    const id = document.getElementById('submit-task-id').value;
    const notes = document.getElementById('submission-link').value;

    const { error } = await supabaseClient.from('tasks').update({
        status: 'Submitted',
        submission_link: notes,
        submitted_at: new Date().toISOString()
    }).eq('id', id);

    if (error) showToast(error.message, 'error');
    else {
        // TRIGGER NOTIFICATION: Task Submitted
        await supabaseClient.from('notifications').insert([{
            recipient_role: 'admin',
            recipient_id: null,
            type: 'submission',
            message: `${profile.full_name} submitted task (ID: ${id})`
        }]);

        showToast('Task Submitted!', 'success');
        closeModal('submit-task-modal');
        loadMyTasks();
    }
}

// Mobile Sidebar Toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

// ==========================
// LEAVES
// ==========================
async function loadMyLeaves() {
    const { data, error } = await supabaseClient
        .from('leaves')
        .select('*')
        .eq('employee_id', profile.employee_id)
        .order('created_at', { ascending: false });

    const tbody = document.querySelector('#my-leaves-table tbody');
    tbody.innerHTML = '';

    if (data) {
        data.forEach(leave => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatDate(leave.start_date)}</td>
                <td>${formatDate(leave.end_date)}</td>
                <td>${leave.reason}</td>
                <td><span class="status-badge status-${leave.status.toLowerCase()}">${leave.status}</span></td>
                <td>${leave.admin_remarks || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

function openLeaveModal() {
    document.getElementById('apply-leave-modal').classList.remove('hidden');
}

async function handleApplyLeave(e) {
    e.preventDefault();
    const start = document.getElementById('leave-start').value;
    const end = document.getElementById('leave-end').value;
    const reason = document.getElementById('leave-reason').value;

    const { error } = await supabaseClient.from('leaves').insert([{
        employee_id: profile.employee_id,
        start_date: start,
        end_date: end,
        reason: reason,
        status: 'Pending'
    }]);

    if (error) showToast(error.message, 'error');
    else {
        // TRIGGER NOTIFICATION: Leave Applied
        await supabaseClient.from('notifications').insert([{
            recipient_role: 'admin',
            recipient_id: null,
            type: 'leave_application',
            message: `${profile.full_name} applied for leave (${start} to ${end})`
        }]);

        showToast('Leave Application Sent!', 'success');
        closeModal('apply-leave-modal');
        loadMyLeaves();
    }
}

// ==========================
// UTILS
// ==========================
function logoutUser() {
    supabaseClient.auth.signOut().then(() => window.location.href = 'index.html');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}
