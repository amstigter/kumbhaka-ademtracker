// Configuratie
const API_URL = 'http://localhost:3000/api';
let authToken = localStorage.getItem('authToken');

// Initialisatie van de Chart.js grafiek
let progressChart;

// Event listeners voor de knoppen
document.addEventListener('DOMContentLoaded', () => {
    initializeChart();
    loadData();
    updateProgressBar();
    updateWeekNumber();
    updateDailyProgress();
    
    document.getElementById('saveButton').addEventListener('click', saveData);
    document.getElementById('loadButton').addEventListener('click', loadData);
    document.getElementById('exportCSV').addEventListener('click', exportToCSV);
    document.getElementById('exportJSON').addEventListener('click', exportToJSON);
    document.getElementById('clearAll').addEventListener('click', clearAllData);
    document.getElementById('weekNumber').addEventListener('change', () => {
        loadData();
        updateWeekNumber();
        updateDailyProgress();
    });
    document.getElementById('saveFeedback').addEventListener('click', saveFeedback);
    
    // Event listeners voor automatisch opslaan bij wijzigingen
    document.querySelectorAll('.input-field').forEach(input => {
        input.addEventListener('change', () => {
            saveData();
            updateDailyProgress();
        });
    });
    
    document.getElementById('additionalExercises').addEventListener('change', saveData);
    document.getElementById('weeklyExperiences').addEventListener('change', saveData);
});

// Authenticatie functies
async function register(email, password) {
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) throw new Error('Registratie mislukt');
        
        await login(email, password);
    } catch (error) {
        alert(error.message);
    }
}

async function login(email, password) {
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) throw new Error('Login mislukt');
        
        const data = await response.json();
        authToken = data.token;
        localStorage.setItem('authToken', authToken);
        hideLoginForm();
        initializeApp();
    } catch (error) {
        alert(error.message);
    }
}

function logout() {
    authToken = null;
    localStorage.removeItem('authToken');
    showLoginForm();
}

// Initialisatie van de grafiek
function initializeChart() {
    const ctx = document.getElementById('progressChart').getContext('2d');
    progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'],
            datasets: [{
                label: 'BOLT Score Ochtend',
                data: [],
                borderColor: '#4CAF50',
                tension: 0.1
            }, {
                label: 'BOLT Score Avond',
                data: [],
                borderColor: '#2196F3',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 50
                }
            }
        }
    });
}

// Functie om het weeknummer bij te werken in de titel
function updateWeekNumber() {
    const weekNumber = document.getElementById('weekNumber').value;
    document.getElementById('currentWeekNumber').textContent = weekNumber;
}

// Opslaan van gegevens
function saveData() {
    const weekNumber = document.getElementById('weekNumber').value;
    const data = {
        weekNumber: parseInt(weekNumber),
        tableData: getTableData(),
        additionalExercises: document.getElementById('additionalExercises').value,
        weeklyExperiences: document.getElementById('weeklyExperiences').value
    };
    
    localStorage.setItem(`week${weekNumber}`, JSON.stringify(data));
    updateProgressBar();
    updateChart();
}

// Laden van gegevens
function loadData() {
    const weekNumber = document.getElementById('weekNumber').value;
    const savedData = localStorage.getItem(`week${weekNumber}`);
    
    if (savedData) {
        const data = JSON.parse(savedData);
        setTableData(data.tableData);
        document.getElementById('additionalExercises').value = data.additionalExercises || '';
        document.getElementById('weeklyExperiences').value = data.weeklyExperiences || '';
    } else {
        clearTable();
        document.getElementById('additionalExercises').value = '';
        document.getElementById('weeklyExperiences').value = '';
    }
    
    displayFeedback(weekNumber);
    updateProgressBar();
    updateChart();
}

// Ophalen van tabelgegevens
function getTableData() {
    const data = [];
    const rows = document.querySelectorAll('#trackerTable tbody tr');
    
    rows.forEach(row => {
        const rowData = [];
        row.querySelectorAll('.input-field').forEach(input => {
            if (input.type === 'checkbox') {
                rowData.push(input.checked);
            } else {
                rowData.push(input.value);
            }
        });
        data.push(rowData);
    });
    
    return data;
}

// Instellen van tabelgegevens
function setTableData(data) {
    const rows = document.querySelectorAll('#trackerTable tbody tr');
    
    rows.forEach((row, rowIndex) => {
        const inputs = row.querySelectorAll('.input-field');
        inputs.forEach((input, colIndex) => {
            if (input.type === 'checkbox') {
                input.checked = data[rowIndex][colIndex];
            } else {
                input.value = data[rowIndex][colIndex];
            }
        });
    });
}

// Tabel leegmaken
function clearTable() {
    document.querySelectorAll('.input-field').forEach(input => {
        if (input.type === 'checkbox') {
            input.checked = false;
        } else {
            input.value = '';
        }
    });
    document.getElementById('additionalExercises').value = '';
}

// Voortgangsbalk bijwerken
function updateProgressBar() {
    const rows = document.querySelectorAll('#trackerTable tbody tr');
    let totalFields = 0;
    let filledFields = 0;
    
    rows.forEach(row => {
        const inputs = row.querySelectorAll('.input-field');
        inputs.forEach(input => {
            totalFields++;
            if (input.type === 'checkbox') {
                if (input.checked) filledFields++;
            } else {
                if (input.value !== '') filledFields++;
            }
        });
    });
    
    const progress = (filledFields / totalFields) * 100;
    document.getElementById('progress').style.width = `${progress}%`;
}

// Dagelijkse voortgang berekenen en weergeven
function updateDailyProgress() {
    const rows = document.querySelectorAll('#trackerTable tbody tr');
    
    rows.forEach((row, index) => {
        const inputs = row.querySelectorAll('.input-field');
        let filledFields = 0;
        let totalFields = 0;
        
        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                totalFields++;
                if (input.checked) filledFields++;
            } else {
                totalFields++;
                if (input.value !== '') filledFields++;
            }
        });
        
        const progress = (filledFields / totalFields) * 100;
        const dayCell = row.querySelector('td:first-child');
        
        // Verwijder bestaande voortgang indicator als die er is
        const existingProgress = dayCell.querySelector('.daily-progress');
        if (existingProgress) {
            existingProgress.remove();
        }
        
        // Voeg nieuwe voortgang indicator toe
        const progressSpan = document.createElement('span');
        progressSpan.className = 'daily-progress';
        progressSpan.textContent = `${Math.round(progress)}%`;
        dayCell.appendChild(progressSpan);
    });
}

// Grafiek bijwerken
function updateChart() {
    const boltMorningData = [];
    const boltEveningData = [];
    
    document.querySelectorAll('#trackerTable tbody tr').forEach(row => {
        const inputs = row.querySelectorAll('.input-field');
        boltMorningData.push(inputs[0].value || null);
        boltEveningData.push(inputs[1].value || null);
    });
    
    progressChart.data.datasets[0].data = boltMorningData;
    progressChart.data.datasets[1].data = boltEveningData;
    progressChart.update();
}

// Exporteren naar CSV
function exportToCSV() {
    const weekNumber = document.getElementById('weekNumber').value;
    const data = getTableData();
    const additionalExercises = document.getElementById('additionalExercises').value;
    const weeklyExperiences = document.getElementById('weeklyExperiences').value;
    const weekFeedback = JSON.parse(localStorage.getItem(`feedback_week${weekNumber}`) || '[]');
    
    let csv = 'Dag,BOLT Score Ochtend,BOLT Score Avond,4 min Licht Laag Langzaam Ochtend,4 min Licht Laag Langzaam Avond,Mond Tape Tijdens Slaap\n';
    
    const days = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
    
    data.forEach((row, index) => {
        csv += `${days[index]},${row.join(',')}\n`;
    });
    
    csv += '\nExtra Oefeningen:\n' + additionalExercises;
    csv += '\n\nWekelijkse Ervaringen:\n' + weeklyExperiences;
    
    if (weekFeedback.length > 0) {
        csv += '\n\nDagelijkse Feedback:\n';
        weekFeedback.forEach(feedback => {
            csv += `\n${feedback.day}:\n`;
            csv += `Humeur: ${getMoodEmoji(feedback.mood)}\n`;
            csv += `Ervaringen: ${feedback.text}\n`;
        });
    }
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ademtracker_week${weekNumber}.csv`;
    link.click();
}

// Exporteren naar JSON
function exportToJSON() {
    const weekNumber = document.getElementById('weekNumber').value;
    const data = {
        week: weekNumber,
        tableData: getTableData(),
        additionalExercises: document.getElementById('additionalExercises').value,
        weeklyExperiences: document.getElementById('weeklyExperiences').value,
        feedback: JSON.parse(localStorage.getItem(`feedback_week${weekNumber}`) || '[]')
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ademtracker_week${weekNumber}.json`;
    link.click();
}

// Feedback opslaan
function saveFeedback() {
    const weekNumber = document.getElementById('weekNumber').value;
    const day = document.getElementById('feedbackDay').value;
    const mood = document.getElementById('feedbackMood').value;
    const text = document.getElementById('feedbackText').value;
    
    if (!text.trim()) {
        alert('Vul alstublieft je ervaringen in.');
        return;
    }
    
    if (!mood) {
        alert('Selecteer alstublieft hoe je je voelt.');
        return;
    }
    
    const feedback = {
        day,
        mood,
        text,
        timestamp: new Date().toISOString()
    };
    
    // Bestaande feedback laden
    let weekFeedback = JSON.parse(localStorage.getItem(`feedback_week${weekNumber}`) || '[]');
    
    // Feedback voor deze dag updaten of toevoegen
    const existingIndex = weekFeedback.findIndex(f => f.day === day);
    if (existingIndex !== -1) {
        weekFeedback[existingIndex] = feedback;
    } else {
        weekFeedback.push(feedback);
    }
    
    // Feedback opslaan
    localStorage.setItem(`feedback_week${weekNumber}`, JSON.stringify(weekFeedback));
    
    // Feedback lijst updaten
    displayFeedback(weekNumber);
    
    // Formulier resetten
    document.getElementById('feedbackText').value = '';
    document.getElementById('feedbackMood').value = '';
    
    // Bevestiging tonen
    alert('Je feedback is opgeslagen!');
}

// Feedback weergeven
function displayFeedback(weekNumber) {
    const feedbackList = document.getElementById('feedbackList');
    const weekFeedback = JSON.parse(localStorage.getItem(`feedback_week${weekNumber}`) || '[]');
    
    // Sorteer op dag
    const days = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
    weekFeedback.sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day));
    
    feedbackList.innerHTML = weekFeedback.map(feedback => `
        <div class="feedback-item">
            <div class="feedback-item-header">
                <span>${feedback.day}</span>
                <span>${getMoodEmoji(feedback.mood)}</span>
            </div>
            <div class="feedback-item-content">
                ${feedback.text}
            </div>
        </div>
    `).join('');
}

// Emoji converteren
function getMoodEmoji(mood) {
    const emojis = {
        '1': '😢',
        '2': '😕',
        '3': '😐',
        '4': '🙂',
        '5': '😊',
        'Niet geselecteerd': '❓'
    };
    return emojis[mood] || '❓';
}

// Alle gegevens wissen
function clearAllData() {
    if (confirm('Weet je zeker dat je alle gegevens wilt wissen? Dit kan niet ongedaan worden gemaakt.')) {
        // Wis alle wekelijkse gegevens
        for (let i = 1; i <= 6; i++) {
            localStorage.removeItem(`week${i}`);
            localStorage.removeItem(`feedback_week${i}`);
        }
        
        // Wis huidige week
        clearTable();
        document.getElementById('additionalExercises').value = '';
        document.getElementById('weeklyExperiences').value = '';
        document.getElementById('feedbackText').value = '';
        document.getElementById('feedbackMood').value = '';
        document.getElementById('feedbackList').innerHTML = '';
        
        // Update voortgang en grafiek
        updateProgressBar();
        updateChart();
        updateDailyProgress();
        
        alert('Alle gegevens zijn gewist.');
    }
} 