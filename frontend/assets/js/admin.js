// assets/js/admin.js

// Check if user is admin (Simple check for now, real auth should happen in auth.js)
// window.onload = function() { ... verify admin role ... }

let employeesCache = [];

document.addEventListener('DOMContentLoaded', () => {
    // Initial Load
    showSection('employees');
    loadEmployees(); // Pre-load for selections
});

function showSection(sectionId) {
    // Update Sidebar
    document.querySelectorAll('.nav-links button').forEach(btn => btn.classList.remove('active'));
    // Find the button that calls this function (approximate) - in a real app use event delegation or IDs
    const navBtns = document.querySelectorAll('.nav-links button');
    if (sectionId === 'employees') navBtns[0].classList.add('active');
    if (sectionId === 'tasks') navBtns[1].classList.add('active');
    if (sectionId === 'attendance') navBtns[2].classList.add('active');
    if (sectionId === 'leaves') navBtns[3].classList.add('active');

    // Show Section
    ['employees', 'tasks', 'attendance', 'leaves'].forEach(id => {
        document.getElementById(`${id}-section`).classList.add('hidden');
    });
    document.getElementById(`${sectionId}-section`).classList.remove('hidden');

    // Load Data
    if (sectionId === 'employees') loadEmployees();
    if (sectionId === 'tasks') loadTasks();
    if (sectionId === 'attendance') loadAttendance();
    if (sectionId === 'leaves') loadLeaves();

    // Always load stats on dashboard view (or initial load)
    loadAdminStats();
    fetchNotifications(); // Initial fetch

    // Poll for notifications every 30 seconds
    setInterval(fetchNotifications, 30000);
}

// ==========================
// NOTIFICATIONS
// ==========================
async function fetchNotifications() {
    const list = document.getElementById('notif-list');
    const badge = document.getElementById('notif-count');

    const { data, error } = await supabaseClient
        .from('notifications')
        .select('*')
        .eq('recipient_role', 'admin')
        .eq('is_read', false)
        .order('created_at', { ascending: false });

    if (error) return console.error('Error fetching notifications:', error);

    // Update Badge
    if (data.length > 0) {
        badge.textContent = data.length;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }

    // Update List
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
        .eq('recipient_role', 'admin');

    fetchNotifications();
}

async function loadAdminStats() {
    // 1. Total Employees
    const { count: totalEmp } = await supabaseClient
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .neq('role', 'admin'); // Exclude admins if needed

    // 2. Present Today
    const today = new Date().toISOString().split('T')[0];
    const { data: presentData } = await supabaseClient
        .from('attendance')
        .select('employee_id')
        .eq('date', today);

    // exact unique count
    const uniquePresent = new Set(presentData.map(d => d.employee_id)).size;

    // Update UI (Assuming elements exist, if not we will add them to HTML next)
    const totalEl = document.getElementById('stat-total-employees');
    const presentEl = document.getElementById('stat-present-today');

    if (totalEl) totalEl.textContent = totalEmp || 0;
    if (presentEl) presentEl.textContent = uniquePresent || 0;
}

// ==========================
// EMPLOYEES
// ==========================
async function loadEmployees() {
    const { data, error } = await supabaseClient
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return showToast('Error loading employees: ' + error.message, 'error');

    employeesCache = data; // Cache for other dropdowns
    const tbody = document.querySelector('#employees-table tbody');
    tbody.innerHTML = '';

    data.forEach(emp => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${emp.employee_id}</td>
            <td>${emp.full_name}</td>
            <td>${emp.role}</td>
            <td>${emp.email || '-'}</td>
            <td>
                <button class="btn-secondary" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;" onclick="deleteEmployee('${emp.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Populate Task Assignment Dropdown
    const select = document.getElementById('task-assign-to');
    select.innerHTML = '';
    data.filter(e => e.role !== 'admin').forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.employee_id;
        opt.textContent = `${emp.full_name} (${emp.employee_id})`;
        select.appendChild(opt);
    });
}

function openAddEmployeeModal() {
    document.getElementById('add-employee-modal').classList.remove('hidden');
}

async function handleAddEmployee(e) {
    e.preventDefault();
    const name = document.getElementById('new-emp-name').value;
    const dept = document.getElementById('new-emp-dept').value;
    const email = document.getElementById('new-emp-email').value; // New Field
    const designation = document.getElementById('new-emp-designation').value; // New Field

    const empId = generateEmployeeID();

    // Use the provided email for login instead of magic email
    // Or if user wants ID login, we map ID to this email in backend?
    // User said: "Employee login using ONLY Employee ID".
    // Strategy: We still use {ID}@hrms.local for Auth, but store real email for contact.

    // Construct email for Supabase Auth
    const magicEmail = `${empId}@hrms.local`.toLowerCase();

    // READ THE PASSWORD INPUT CORRECTLY
    const passwordInput = document.getElementById('new-emp-password');
    const password = passwordInput ? passwordInput.value : '';

    if (!password || password.length < 6) return showToast('Password must be at least 6 characters', 'error');

    // 1. Create Auth User
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email: magicEmail,
        password: password,
        options: {
            data: {
                full_name: name,
                employee_id: empId,
                department: dept,
                designation: designation, // New Field
                role: 'employee',
                contact_email: email // Store real email in metadata
            }
        }
    });

    if (authError) return showToast(authError.message, 'error');

    // 2. Insert into 'employees' table
    const { error: dbError } = await supabaseClient.from('employees').insert([
        {
            employee_id: empId,
            full_name: name,
            email: email, // SAVE THE REAL CONTACT EMAIL
            role: 'employee',
            department: dept,
            designation: designation // New Field
        }
    ]);

    if (dbError) {
        showToast('Auth created but DB failed: ' + dbError.message, 'error');
    } else {
        showToast(`Employee Created! ID: ${empId}, Default Password: ${password}`, 'success');
        closeModal('add-employee-modal');
        loadEmployees();
        document.getElementById('add-employee-form').reset();
    }
}

async function deleteEmployee(uuid) {
    if (!confirm('Are you sure? This will delete the employee record.')) return;

    // Supabase foreign keys set to CASCADE should handle related data, but Auth user deletion requires Service Role (backend).
    // Client-side delete only removes from public table usually.
    const { error } = await supabaseClient.from('employees').delete().eq('id', uuid);
    if (error) showToast(error.message, 'error');
    else loadEmployees();
}


// ==========================
// TASKS
// ==========================
async function loadTasks() {
    const { data, error } = await supabaseClient
        .from('tasks')
        .select('*')
        .order('assigned_at', { ascending: false });

    if (error) return showToast('Error loading tasks', 'error');

    const tbody = document.querySelector('#tasks-table tbody');
    tbody.innerHTML = '';

    data.forEach(task => {
        // Find employee name from cache
        const emp = employeesCache.find(e => e.employee_id === task.employee_id);
        const empName = emp ? emp.full_name : task.employee_id;

        const tr = document.createElement('tr');

        // Format Submission Link
        let submissionDisplay = '-';
        if (task.status === 'Submitted' && task.submission_link) {
            submissionDisplay = `<a href="${task.submission_link}" target="_blank" style="color:blue; text-decoration:underline;">View Link</a>`;
        } else if (task.status === 'Submitted') {
            submissionDisplay = 'Submitted (No Link)';
        }

        tr.innerHTML = `
            <td>${task.title}</td>
            <td>${empName}</td>
            <td>${formatDate(task.deadline)}</td>
            <td>${task.priority}</td>
            <td><span class="status-badge status-${task.status.toLowerCase()}">${task.status}</span></td>
            <td>${submissionDisplay}</td>
            <td>
                ${task.status === 'Submitted' ? `<button class="btn-primary" style="font-size:0.8rem; padding: 0.25rem 0.5rem;" onclick="reviewTask('${task.id}')">Review</button>` : '-'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openAssignTaskModal() {
    document.getElementById('assign-task-modal').classList.remove('hidden');
}

async function handleAssignTask(e) {
    e.preventDefault();
    const title = document.getElementById('task-title').value;
    const desc = document.getElementById('task-desc').value;
    const empId = document.getElementById('task-assign-to').value.toUpperCase(); // Force Uppercase match
    const deadline = document.getElementById('task-deadline').value;
    const priority = document.getElementById('task-priority').value;

    const { error } = await supabaseClient.from('tasks').insert([{
        title,
        description: desc,
        employee_id: empId,
        deadline,
        priority,
        status: 'Pending'
    }]);

    if (error) showToast(error.message, 'error');
    else {
        // TRIGGER NOTIFICATION: Task Assigned
        await supabaseClient.from('notifications').insert([{
            recipient_role: 'employee',
            recipient_id: empId, // ID from form
            type: 'task_assigned',
            message: `New Task Assigned: "${title}" (Priority: ${priority})`
        }]);

        showToast('Task Assigned!', 'success');
        closeModal('assign-task-modal');
        loadTasks();
        document.getElementById('assign-task-form').reset();
    }
}

async function reviewTask(taskId) {
    const action = prompt("Type 'approve' to Complete or 'reject' to Require Changes:");
    if (!action) return;

    let status = '';
    if (action.toLowerCase().includes('approve')) status = 'Completed';
    else if (action.toLowerCase().includes('reject')) status = 'Rejected';
    else return showToast('Invalid input', 'error');

    const { error } = await supabaseClient.from('tasks').update({ status }).eq('id', taskId);
    if (error) showToast(error.message, 'error');
    else loadTasks();
}


// ==========================
// ATTENDANCE
// ==========================
async function loadAttendance() {
    const filterDate = document.getElementById('attendance-filter-date').value || new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseClient
        .from('attendance')
        .select('*, employees(full_name)')
        .eq('date', filterDate);

    if (error) return showToast('Error loading attendance', 'error');

    const tbody = document.querySelector('#attendance-table tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No records for this date</td></tr>';
        return;
    }

    data.forEach(rec => {
        // Join handling: Supabase returns joined data in object if configured, but we didn't set up explicit foreign table selects in the simple query above efficiently without defining the relationship in client.
        // Actually, 'employees(full_name)' in select works if foreign key exists.
        const empName = rec.employees ? rec.employees.full_name : rec.employee_id;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(rec.date)}</td>
            <td>${rec.employee_id}</td>
            <td>${empName}</td>
            <td>${rec.check_in_time}</td>
            <td>${rec.face_verified ? '✅ Verified' : '❌ Failed'}</td>
        `;
        tbody.appendChild(tr);
    });
}


// ==========================
// LEAVES
// ==========================
async function loadLeaves() {
    const { data, error } = await supabaseClient
        .from('leaves')
        .select('*, employees(full_name)')
        .order('created_at', { ascending: false });

    if (error) return showToast('Error loading leaves', 'error');

    const tbody = document.querySelector('#leaves-table tbody');
    tbody.innerHTML = '';

    data.forEach(leave => {
        const empName = leave.employees ? leave.employees.full_name : leave.employee_id;

        const actions = leave.status === 'Pending' ? `
            <button class="btn-primary" style="background:#10b981; padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="updateLeave(${leave.id}, 'Approved')">Approve</button>
            <button class="btn-secondary" style="background:#ef4444; color:white; border:none; padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="updateLeave(${leave.id}, 'Rejected')">Reject</button>
        ` : '-';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${empName}<br><small>${leave.employee_id}</small></td>
            <td>${formatDate(leave.start_date)} to ${formatDate(leave.end_date)}</td>
            <td>${leave.reason}</td>
            <td><span class="status-badge status-${leave.status.toLowerCase()}">${leave.status}</span></td>
            <td>${actions}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function updateLeave(id, status) {
    if (!confirm(`Mark leave as ${status}?`)) return;
    const { error } = await supabaseClient.from('leaves').update({ status }).eq('id', id);
    if (error) showToast(error.message, 'error');
    else {
        // Determine recipient (we need to know WHO applied for the leave to notify them)
        // Ideally updateLeave should take empID, or we fetch the leave first. 
        // For simplicity in this edit, assuming we can get it from the row data or UI? 
        // Actually, we need to fetch the single leave to know the employee_id
        const { data: leaveData } = await supabaseClient.from('leaves').select('employee_id').eq('id', id).single();

        if (leaveData) {
            await supabaseClient.from('notifications').insert([{
                recipient_role: 'employee',
                recipient_id: leaveData.employee_id,
                type: 'leave_status',
                message: `Your Leave Application was ${status}`
            }]);
        }

        loadLeaves();
    }
}


// ==========================
// UTILS
// ==========================
function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function logoutAdmin() {
    supabaseClient.auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}
