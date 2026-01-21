// const API_URL = "http://localhost:7820/submission/missing-marks";
let firstClick = true
const API_URL = "https://missingmarks.eu.pythonanywhere.com/submission/missing-marks";
let autoCloseTimer;
function splitAndClean(value) {
    return value
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0);
}

function updateInputCounts() {
    const counts = {
        courseCode: splitAndClean(document.getElementById('courseCode').value).length,
        courseTitle: splitAndClean(document.getElementById('courseTitle').value).length,
        session: splitAndClean(document.getElementById('session').value).length,
        lecturerName: splitAndClean(document.getElementById('lecturerName').value).length
    };

    document.getElementById('courseCodeCount').innerText = `(${counts.courseCode})`;
    document.getElementById('courseTitleCount').innerText = `(${counts.courseTitle})`;
    document.getElementById('sessionCount').innerText = `(${counts.session})`;
    document.getElementById('lecturerCount').innerText = `(${counts.lecturerName})`;

    const values = Object.values(counts);
    const allMatch = values.every(v => v === values[0]);

    Object.keys(counts).forEach(key => {
        const spanId = key === 'lecturerName' ? 'lecturerCount' : `${key}Count`;
        document.getElementById(spanId).style.color = allMatch ? '#16a34a' : '#dc2626';
    });
}

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

    const courseCodes = splitAndClean(document.getElementById('courseCode').value.toUpperCase());
    const courseTitles = splitAndClean(document.getElementById('courseTitle').value.toUpperCase());
    const lecturers = splitAndClean(document.getElementById('lecturerName').value.toUpperCase());
    const sessions = splitAndClean(
        document.getElementById('session').value.toUpperCase()
    );
    
    const counts = {
        "Course Codes": courseCodes.length,
        "Course Titles": courseTitles.length,
        "Lecturers": lecturers.length,
        "Sessions": sessions.length
    };
    
    const values = Object.values(counts);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    if (min !== max) {
        let details = '';
    
        for (const [key, count] of Object.entries(counts)) {
            if (count === min) {
                details += `• ${key} has LESS items (${count})\n`;
            } else if (count === max) {
                details += `• ${key} has MORE items (${count})\n`;
            }
        }
    
        showModal(
            'error',
            'Input Count Mismatch',
            `Please fix the following:\n\n${details}\nAll fields must have the same number of entries.`
        );
    
        allowClose();
        return;
    }
    

    const payload = {
        admNumber: document.getElementById('admNumber').value.trim().toUpperCase(),
        name: document.getElementById('name').value.trim().toUpperCase(),
        courseCode: courseCodes.join(', '),
        courseTitle: courseTitles.join(', '),
        session: sessions.join(', '),
        lecturerName: lecturers.join(', ')
    };

    // Build confirmation message
    let preview = '';
    courseCodes.forEach((code, i) => {
        preview += `${i + 1}. ${code} | ${courseTitles[i]} | ${lecturers[i]} | ${sessions[i]}\n`;
    });
    

    showModal(
        'success',
        'Confirm Submission',
        `You are about to submit ${courseCodes.length} course(s):\n\n${preview}\nClick CLOSE to confirm.`
    );
    firstClick = true

    allowClose();


    
    // Wait for confirmation
    document.querySelector('.close-btn').onclick = async () => {
        closeModal();


        if(!firstClick){
            return
        }
        btn.disabled = true;
        btn.innerText = "Processing...";
        setTimeout(() => {
            firstClick = false
        }, 2000);
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                showModal(
                    'success',
                    'Submission Successful',
                    `Your claim was recorded.\nReference IDs: ${(data.reference_ids || []).join(', ')}`
                );
                document.getElementById('missingMarksForm').reset();
            } else {
                showModal(
                    'error',
                    'Submission Failed',
                    data.error || 'Please check your details and try again.'
                );
            }

        } catch (err) {
            showModal(
                'error',
                'Network Error',
                'Could not connect to the server. Check your internet connection.'
            );
        } finally {
            btn.disabled = false;
            btn.innerText = "Submit";
            allowClose();
        }
    };
});
document.addEventListener('DOMContentLoaded', ()=>{
    ['courseCode', 'courseTitle', 'session', 'lecturerName'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateInputCounts);
    });
})
