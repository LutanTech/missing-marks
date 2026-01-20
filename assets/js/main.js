// const API_URL = "http://localhost:7820/submission/missing-marks";
const API_URL = "https://missingmarks.eu.pythonanywhere.com/submission/missing-marks";
let autoCloseTimer;

function showModal(type, title, message) {
    const overlay = document.getElementById('overlay');
    const modal = document.getElementById('modal');
    const icon = document.getElementById('modalIcon');
    const timerBar = document.getElementById('timerBar');
    
    modal.className = 'modal ' + type;
    icon.innerHTML = type === 'success' ? '✓' : '✕';
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalMsg').innerText = message;
    
    overlay.classList.add('active');

    if (type === 'success') {
        timerBar.style.display = 'block';
        timerBar.style.animation = 'shrink 5s linear forwards';
        autoCloseTimer = setTimeout(allowClose, 5000);
    } else {
        timerBar.style.display = 'none';
    }
}
function allowClose(){
    const btn = document.querySelector('.close-btn');
    btn.disabled = false

}

function closeModal() {
    document.getElementById('overlay').classList.remove('active');
    clearTimeout(autoCloseTimer);
}

document.getElementById('missingMarksForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    
    const payload = {
        admNumber: document.getElementById('admNumber').value.trim().toUpperCase(),
        name: document.getElementById('name').value.trim().toUpperCase(),
        courseCode: document.getElementById('courseCode').value.trim().toUpperCase(),
        courseTitle: document.getElementById('courseTitle').value.trim().toUpperCase(),
        session: document.getElementById('session').value.toUpperCase(),
        lecturerName: document.getElementById('lecturerName').value.trim().toUpperCase()
    };

    btn.disabled = true;
    btn.innerText = "Processing...";

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok) {
            showModal('success', 'Submission Successful', 'Your claim has been recorded with Reference ID: ' + (data.reference_id || "N/A"));
            document.getElementById('missingMarksForm').reset();
        } else {
            showModal('error', 'Submission Failed', data.error || 'Please check your details and try again.');
        }
    } catch (err) {
        showModal('error', 'Network Error', 'Could not connect to the server. Please ensure you are connected to the internet.');
    } finally {
        btn.disabled = false;
        btn.innerText = "Submit";
        allowClose()
    }
});