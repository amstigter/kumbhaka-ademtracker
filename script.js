// Configuratie
const API_URL = 'https://ademtracker-api.onrender.com/api';
let authToken = localStorage.getItem('authToken');

// Initialisatie van de Chart.js grafiek
let progressChart;

// Event listeners voor de knoppen
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');

    // Verwijder de update melding na de animatie
    setTimeout(() => {
        const updateMessage = document.getElementById('updateMessage');
        if (updateMessage) {
            setTimeout(() => {
                updateMessage.remove();
            }, 5500); // 5.5 seconden (5 seconden wachten + 0.5 seconden fade)
        }
    }, 0);

    initializeChart();
    loadData();
    updateProgressBar();
    updateWeekNumber();
    updateDailyProgress();
    
    // Event listeners voor knoppen
    const exportCSVBtn = document.getElementById('exportCSV');
    const exportJSONBtn = document.getElementById('exportJSON');
    const importJSONBtn = document.getElementById('importJSONBtn');
    const importJSONInput = document.getElementById('importJSON');
    const clearAllBtn = document.getElementById('clearAll');
    
    console.log('Export CSV button:', exportCSVBtn);
    console.log('Export JSON button:', exportJSONBtn);
    console.log('Clear All button:', clearAllBtn);
    
    if (exportCSVBtn) {
        exportCSVBtn.addEventListener('click', () => {
            console.log('CSV export button clicked');
            try {
                exportToCSV();
            } catch (error) {
                console.error('CSV export error:', error);
                alert('Er is een fout opgetreden bij het exporteren naar CSV.');
            }
        });
    }
    
    if (exportJSONBtn) {
        exportJSONBtn.addEventListener('click', () => {
            console.log('JSON export button clicked');
            try {
                exportToJSON();
            } catch (error) {
                console.error('JSON export error:', error);
                alert('Er is een fout opgetreden bij het exporteren naar JSON.');
            }
        });
    }
    
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllData);
    }
    
    if (importJSONBtn) {
        importJSONBtn.addEventListener('click', () => {
            importJSONInput.click();
        });
    }
    
    if (importJSONInput) {
        importJSONInput.addEventListener('change', handleImport);
    }
    
    // Automatisch laden bij week verandering
    const weekNumberSelect = document.getElementById('weekNumber');
    if (weekNumberSelect) {
        weekNumberSelect.addEventListener('change', () => {
            localStorage.setItem('lastSelectedWeek', weekNumberSelect.value);
            loadData();
            updateWeekNumber();
            updateDailyProgress();
        });
    }
    
    // Event listeners voor automatisch opslaan en voortgang
    const inputs = document.querySelectorAll('#trackerTable input');
    console.log('Aantal input velden gevonden:', inputs.length);
    
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            console.log('Input veranderd');
            saveData();
            updateDailyProgress();
            updateProgressBar();
        });
    });
    
    // Automatisch opslaan voor tekstvelden
    const weeklyExperiences = document.getElementById('weeklyExperiences');
    if (weeklyExperiences) {
        weeklyExperiences.addEventListener('input', saveData);
    }
    
    // Feedback functionaliteit
    const saveFeedbackBtn = document.getElementById('saveFeedback');
    if (saveFeedbackBtn) {
        saveFeedbackBtn.addEventListener('click', saveFeedback);
    }
    
    // Laad de laatste geselecteerde week
    const lastSelectedWeek = localStorage.getItem('lastSelectedWeek') || '1';
    if (weekNumberSelect) {
        weekNumberSelect.value = lastSelectedWeek;
        loadData();
    }
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
        weeklyExperiences: document.getElementById('weeklyExperiences')?.value || ''
    };
    
    localStorage.setItem(`week${weekNumber}`, JSON.stringify(data));
    localStorage.setItem('lastSelectedWeek', weekNumber);
    updateProgressBar();
    updateChart();
    updateDailyProgress();
}

// Laden van gegevens
function loadData() {
    const weekNumber = document.getElementById('weekNumber').value;
    const savedData = localStorage.getItem(`week${weekNumber}`);
    
    if (savedData) {
        const data = JSON.parse(savedData);
        setTableData(data.tableData);
        const weeklyExperiences = document.getElementById('weeklyExperiences');
        if (weeklyExperiences) {
            weeklyExperiences.value = data.weeklyExperiences || '';
        }
    } else {
        clearTable();
        const weeklyExperiences = document.getElementById('weeklyExperiences');
        if (weeklyExperiences) {
            weeklyExperiences.value = '';
        }
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
    const inputs = document.querySelectorAll('#trackerTable .input-field');
    inputs.forEach(input => {
        if (input.type === 'checkbox') {
            input.checked = false;
        } else {
            input.value = '';
        }
    });
}

// Voortgangsbalk bijwerken
function updateProgressBar() {
    const rows = document.querySelectorAll('#trackerTable tbody tr');
    let totalFields = 0;
    let filledFields = 0;
    
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        console.log('Aantal inputs gevonden:', inputs.length);
        inputs.forEach(input => {
            if (input.type === 'number' || input.type === 'checkbox') {
                totalFields++;
                if (input.type === 'checkbox' && input.checked) {
                    filledFields++;
                } else if (input.type === 'number' && input.value !== '') {
                    filledFields++;
                }
            }
        });
    });
    
    const progress = (filledFields / totalFields) * 100;
    console.log('Voortgang berekend:', progress);
    const progressBar = document.getElementById('progress');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
        console.log('Voortgangsbalk bijgewerkt');
    } else {
        console.error('Progress bar element niet gevonden');
    }
}

// Dagelijkse voortgang berekenen en weergeven
function updateDailyProgress() {
    console.log('updateDailyProgress wordt aangeroepen');
    const rows = document.querySelectorAll('#trackerTable tbody tr');
    
    rows.forEach(row => {
        const dayCell = row.cells[0];
        const progressSpan = dayCell.querySelector('.daily-progress');
        
        // Verwijder bestaande progress span als die er is
        if (progressSpan) {
            progressSpan.remove();
        }
        
        // Bereken percentage voor deze dag
        const inputs = row.querySelectorAll('input');
        console.log('Aantal inputs gevonden voor dag:', inputs.length);
        let completedFields = 0;
        let totalFields = 0;
        
        inputs.forEach(input => {
            if (input.type === 'number' || input.type === 'checkbox') {
                totalFields++;
                if (input.type === 'checkbox' && input.checked) {
                    completedFields++;
                } else if (input.type === 'number' && input.value !== '') {
                    completedFields++;
                }
            }
        });
        
        const percentage = Math.round((completedFields / totalFields) * 100);
        console.log('Percentage berekend voor dag:', percentage);
        
        // Voeg nieuwe progress span toe
        const newProgressSpan = document.createElement('span');
        newProgressSpan.className = 'daily-progress';
        newProgressSpan.textContent = `${percentage}%`;
        
        // Voeg de progress span toe aan de eerste cel van de rij
        dayCell.appendChild(newProgressSpan);
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
    const weeklyExperiences = document.getElementById('weeklyExperiences').value;
    const weekFeedback = JSON.parse(localStorage.getItem(`feedback_week${weekNumber}`) || '[]');
    
    let csv = 'Dag,BOLT Score Ochtend,BOLT Score Avond,4 min Licht Laag Langzaam Ochtend,4 min Licht Laag Langzaam Avond,Mond Tape Tijdens Slaap\n';
    
    const days = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
    
    data.forEach((row, index) => {
        csv += `${days[index]},${row.join(',')}\n`;
    });
    
    csv += '\nWekelijkse Ervaringen:\n' + weeklyExperiences;
    
    if (weekFeedback.length > 0) {
        csv += '\n\nDagelijkse Feedback:\n';
        weekFeedback.forEach(feedback => {
            csv += `\n${feedback.day}:\n`;
            csv += `Humeur: ${getMoodEmoji(feedback.mood)}\n`;
            csv += `Ervaringen: ${feedback.text}\n`;
            if (feedback.extraExercises) {
                csv += `Extra Oefeningen: ${feedback.extraExercises}\n`;
            }
        });
    }
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ademtracker_week${weekNumber}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

// Exporteren naar JSON
function exportToJSON() {
    const weekNumber = document.getElementById('weekNumber').value;
    const data = {
        week: weekNumber,
        tableData: getTableData(),
        weeklyExperiences: document.getElementById('weeklyExperiences').value,
        feedback: JSON.parse(localStorage.getItem(`feedback_week${weekNumber}`) || '[]')
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ademtracker_week${weekNumber}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

// Feedback opslaan
function saveFeedback() {
    const weekNumber = document.getElementById('weekNumber').value;
    const day = document.getElementById('feedbackDay').value;
    const mood = document.getElementById('feedbackMood').value;
    const text = document.getElementById('feedbackText').value;
    const extraExercises = document.getElementById('extraExercises').value;

    if (!mood || !text) {
        alert('Vul alstublieft zowel je humeur als je ervaringen in.');
        return;
    }

    let weekFeedback = JSON.parse(localStorage.getItem(`feedback_week${weekNumber}`) || '[]');
    
    // Verwijder bestaande feedback voor deze dag
    weekFeedback = weekFeedback.filter(item => item.day !== day);
    
    // Voeg nieuwe feedback toe
    weekFeedback.push({
        day,
        mood,
        text,
        extraExercises,
        timestamp: new Date().toISOString()
    });
    
    // Sorteer feedback op dag van de week
    const dayOrder = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
    weekFeedback.sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));
    
    localStorage.setItem(`feedback_week${weekNumber}`, JSON.stringify(weekFeedback));
    
    // Reset formulier
    document.getElementById('feedbackMood').value = '';
    document.getElementById('feedbackText').value = '';
    document.getElementById('extraExercises').value = '';
    
    displayFeedback(weekNumber);
    alert('Feedback opgeslagen!');
}

// Feedback weergeven
function displayFeedback(weekNumber) {
    const weekFeedback = JSON.parse(localStorage.getItem(`feedback_week${weekNumber}`) || '[]');
    const feedbackList = document.getElementById('feedbackList');
    feedbackList.innerHTML = '';
    
    weekFeedback.forEach(feedback => {
        const feedbackItem = document.createElement('div');
        feedbackItem.className = 'feedback-item';
        feedbackItem.innerHTML = `
            <strong>${feedback.day}</strong><br>
            Humeur: ${getMoodEmoji(feedback.mood)}<br>
            ${feedback.extraExercises ? `<strong>Extra oefeningen:</strong><br>${feedback.extraExercises}<br><br>` : ''}
            <strong>Ervaringen:</strong><br>${feedback.text}
        `;
        feedbackList.appendChild(feedbackItem);
    });
}

// Als een dag wordt geselecteerd, laad de bestaande feedback
document.getElementById('feedbackDay').addEventListener('change', function() {
    const weekNumber = document.getElementById('weekNumber').value;
    const selectedDay = this.value;
    const weekFeedback = JSON.parse(localStorage.getItem(`feedback_week${weekNumber}`) || '[]');
    const dayFeedback = weekFeedback.find(item => item.day === selectedDay);
    
    if (dayFeedback) {
        document.getElementById('feedbackMood').value = dayFeedback.mood;
        document.getElementById('feedbackText').value = dayFeedback.text;
        document.getElementById('extraExercises').value = dayFeedback.extraExercises || '';
    } else {
        document.getElementById('feedbackMood').value = '';
        document.getElementById('feedbackText').value = '';
        document.getElementById('extraExercises').value = '';
    }
});

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

// Import functionaliteit
function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Controleer of het een geldig back-up bestand is
            if (!data.week || !data.tableData) {
                alert('Dit is geen geldig back-up bestand van de Ademtracker.');
                return;
            }
            
            // Bevestig met de gebruiker
            if (!confirm(`Weet je zeker dat je de gegevens van week ${data.week} wilt herstellen? Dit zal je huidige gegevens overschrijven.`)) {
                return;
            }
            
            // Herstel de gegevens
            localStorage.setItem(`week${data.week}`, JSON.stringify({
                weekNumber: parseInt(data.week),
                tableData: data.tableData,
                weeklyExperiences: data.weeklyExperiences || ''
            }));
            
            // Herstel de feedback
            if (data.feedback) {
                localStorage.setItem(`feedback_week${data.week}`, JSON.stringify(data.feedback));
            }
            
            // Update de UI
            document.getElementById('weekNumber').value = data.week;
            loadData();
            updateProgressBar();
            updateChart();
            updateDailyProgress();
            
            alert('Back-up succesvol hersteld!');
        } catch (error) {
            console.error('Import error:', error);
            alert('Er is een fout opgetreden bij het herstellen van de back-up.');
        }
    };
    
    reader.readAsText(file);
    // Reset de file input
    event.target.value = '';
} 