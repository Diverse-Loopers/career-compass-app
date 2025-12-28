// assets/js/utils.js

function generateEmployeeID() {
    // Format: 2 Letters + 3 Digits (e.g., AB123)
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';

    let id = '';
    for (let i = 0; i < 2; i++) {
        id += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    for (let i = 0; i < 3; i++) {
        id += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return id;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US');
}

function showToast(message, type = 'info') {
    // Simple alert for now, can be upgraded to a real toast
    alert(`${type.toUpperCase()}: ${message}`);
}
