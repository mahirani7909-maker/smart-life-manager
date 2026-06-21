// ==========================================
// STATE MANAGEMENT & LOCAL STORAGE
// ==========================================
const STORAGE_KEYS = {
    USER: 'slm_username',
    TASKS: 'slm_tasks',
    DIARY: 'slm_diary',
    NOTES: 'slm_notes',
    THEME: 'slm_theme'
};

function getData(key, defaultValue) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

let username = getData(STORAGE_KEYS.USER, "");
let tasks = getData(STORAGE_KEYS.TASKS, []);
let diaryEntries = getData(STORAGE_KEYS.DIARY, {});
let notes = getData(STORAGE_KEYS.NOTES, []);

// Data Migration/Compatibility: Add priority and dueDate to old tasks
tasks = tasks.map(t => ({
    ...t,
    priority: t.priority || 'low',
    dueDate: t.dueDate || ''
}));
saveData(STORAGE_KEYS.TASKS, tasks);

// ==========================================
// APP INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    checkLogin();
    initTheme();
    initNavigation();
    
    renderTasks();
    initDiary();
    renderNotes();
    updateDashboard();
    initSettings();
});

// ==========================================
// LOGIN & GREETING
// ==========================================
function checkLogin() {
    const overlay = document.getElementById('login-overlay');
    const appContainer = document.getElementById('app-container');
    const loginBtn = document.getElementById('login-btn');
    const nameInput = document.getElementById('username-input');

    if (!username) {
        appContainer.style.display = 'none';
        overlay.classList.add('active');

        loginBtn.addEventListener('click', () => {
            const name = nameInput.value.trim();
            if (name) {
                username = name;
                saveData(STORAGE_KEYS.USER, username);
                overlay.classList.remove('active');
                setTimeout(() => {
                    appContainer.style.display = 'flex';
                    updateGreeting();
                }, 400);
            }
        });
        nameInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') loginBtn.click();
        });
    } else {
        overlay.classList.remove('active');
        appContainer.style.display = 'flex';
        updateGreeting();
    }
}

function updateGreeting() {
    const greetingEl = document.getElementById('user-greeting');
    const dateEl = document.getElementById('current-date-display');
    
    const hour = new Date().getHours();
    let timeGreeting = 'Good Evening';
    if (hour < 12) timeGreeting = 'Good Morning';
    else if (hour < 17) timeGreeting = 'Good Afternoon';

    greetingEl.innerHTML = `${timeGreeting}, ${username}! <span style="color:var(--primary);">🌿</span>`;
    
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = new Date().toLocaleDateString(undefined, options);
}

// ==========================================
// NAVIGATION & THEME
// ==========================================
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.view-section');
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');

    toggleBtn.addEventListener('click', () => sidebar.classList.toggle('collapsed'));

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(sec => sec.classList.remove('active'));
            
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
            
            if(targetId === 'dashboard') updateDashboard();
        });
    });
}

function initTheme() {
    const isDark = getData(STORAGE_KEYS.THEME, false);
    const toggle = document.getElementById('theme-toggle');
    if (isDark) {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
        if(toggle) toggle.checked = true;
    }
    
    if(toggle) {
        toggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.add('dark-mode');
                document.body.classList.remove('light-mode');
                saveData(STORAGE_KEYS.THEME, true);
            } else {
                document.body.classList.remove('dark-mode');
                document.body.classList.add('light-mode');
                saveData(STORAGE_KEYS.THEME, false);
            }
        });
    }
}

// ==========================================
// DASHBOARD & CALENDAR
// ==========================================
function updateDashboard() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = total - completed;
    
    document.getElementById('dash-total').textContent = total;
    document.getElementById('dash-completed').textContent = completed;
    document.getElementById('dash-pending').textContent = pending;
    
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    document.getElementById('dash-progress-text').textContent = `${pct}%`;

    renderTodayTasks();
    renderCalendar();
}

function renderTodayTasks() {
    const recentList = document.getElementById('dashboard-recent-list');
    const emptyState = document.getElementById('dash-empty-state');
    recentList.innerHTML = '';
    
    const todayStr = new Date().toISOString().split('T')[0];
    // Show tasks due today, or if none, just recent pending tasks
    let displayTasks = tasks.filter(t => t.dueDate === todayStr && t.status !== 'completed');
    if (displayTasks.length === 0) {
        displayTasks = tasks.filter(t => t.status !== 'completed').slice(0, 4);
    }
    
    if (displayTasks.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        displayTasks.forEach(t => {
            const el = document.createElement('div');
            el.className = `task-item ${t.status === 'completed' ? 'completed' : ''}`;
            el.setAttribute('data-priority', t.priority);
            el.innerHTML = `
                <div class="task-content">
                    <div class="checkbox"><i class="ph-bold ph-check"></i></div>
                    <div class="task-details">
                        <span class="task-text">${t.task}</span>
                        ${t.dueDate ? `<div class="task-meta"><span class="task-meta-badge"><i class="ph ph-calendar"></i> ${t.dueDate}</span></div>` : ''}
                    </div>
                </div>
            `;
            recentList.appendChild(el);
        });
    }
}

let currentDate = new Date();
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const header = document.getElementById('cal-month-year');
    if(!grid) return;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    header.textContent = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    grid.innerHTML = '';
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    
    // Empty slots for start of month
    for (let i = 0; i < firstDay; i++) {
        const div = document.createElement('div');
        div.className = 'cal-day empty';
        grid.appendChild(div);
    }
    
    // Days
    for (let i = 1; i <= daysInMonth; i++) {
        const div = document.createElement('div');
        div.className = 'cal-day';
        div.textContent = i;
        
        // Highlight today
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            div.classList.add('today');
        }
        
        // Mark days with tasks due
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        const hasTask = tasks.some(t => t.dueDate === dateStr && t.status !== 'completed');
        if (hasTask) div.classList.add('has-task');
        
        grid.appendChild(div);
    }
}

document.getElementById('cal-prev')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});
document.getElementById('cal-next')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});


// ==========================================
// TASKS LOGIC
// ==========================================
let currentTaskFilter = 'all';

document.getElementById('add-task-btn').addEventListener('click', addTask);
document.getElementById('new-task-input').addEventListener('keypress', (e) => {
    if(e.key === 'Enter') addTask();
});
document.getElementById('task-search').addEventListener('input', renderTasks);
document.getElementById('delete-all-btn').addEventListener('click', () => {
    if(confirm('Are you sure you want to delete all tasks?')) {
        tasks = [];
        saveData(STORAGE_KEYS.TASKS, tasks);
        renderTasks();
        updateDashboard();
    }
});

document.querySelectorAll('#task-filters .tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        document.querySelectorAll('#task-filters .tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        currentTaskFilter = e.target.getAttribute('data-filter');
        renderTasks();
    });
});

function addTask() {
    const input = document.getElementById('new-task-input');
    const priority = document.getElementById('new-task-priority').value;
    const dueDate = document.getElementById('new-task-date').value;
    const text = input.value.trim();
    
    if (text) {
        tasks.push({
            id: Date.now().toString(),
            task: text,
            status: 'pending',
            priority: priority,
            dueDate: dueDate
        });
        saveData(STORAGE_KEYS.TASKS, tasks);
        input.value = '';
        document.getElementById('new-task-date').value = '';
        renderTasks();
        updateDashboard();
    }
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.status = task.status === 'pending' ? 'completed' : 'pending';
        saveData(STORAGE_KEYS.TASKS, tasks);
        renderTasks();
        updateDashboard();
    }
}

function deleteTask(e, id) {
    e.stopPropagation();
    tasks = tasks.filter(t => t.id !== id);
    saveData(STORAGE_KEYS.TASKS, tasks);
    renderTasks();
    updateDashboard();
}

function renderTasks() {
    const list = document.getElementById('task-list');
    const emptyState = document.getElementById('tasks-empty-state');
    const searchTerm = document.getElementById('task-search').value.toLowerCase();
    
    list.innerHTML = '';
    let filteredTasks = tasks.filter(t => t.task.toLowerCase().includes(searchTerm));
    if (currentTaskFilter !== 'all') {
        filteredTasks = filteredTasks.filter(t => t.status === currentTaskFilter);
    }
    
    // Sort by priority then date
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    filteredTasks.sort((a, b) => {
        if(a.status !== b.status) return a.status === 'completed' ? 1 : -1;
        if(priorityWeight[b.priority] !== priorityWeight[a.priority]) return priorityWeight[b.priority] - priorityWeight[a.priority];
        if(a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        return 0;
    });
    
    if (filteredTasks.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        filteredTasks.forEach(t => {
            const li = document.createElement('li');
            li.className = `task-item ${t.status === 'completed' ? 'completed' : ''}`;
            li.setAttribute('data-priority', t.priority);
            
            li.innerHTML = `
                <div class="task-content" onclick="toggleTask('${t.id}')">
                    <div class="checkbox"><i class="ph-bold ph-check"></i></div>
                    <div class="task-details">
                        <span class="task-text">${t.task}</span>
                        ${t.dueDate ? `<div class="task-meta"><span class="task-meta-badge"><i class="ph ph-calendar"></i> ${t.dueDate}</span></div>` : ''}
                    </div>
                </div>
                <button class="delete-task-btn" onclick="deleteTask(event, '${t.id}')" aria-label="Delete">
                    <i class="ph-bold ph-trash"></i>
                </button>
            `;
            list.appendChild(li);
        });
    }
}

// ==========================================
// DIARY LOGIC
// ==========================================
const dateInput = document.getElementById('diary-date');
const contentInput = document.getElementById('diary-content');
const saveBtn = document.getElementById('save-diary-btn');
const saveStatus = document.getElementById('diary-save-status');
let currentMood = '😊 Happy';

function initDiary() {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    
    dateInput.addEventListener('change', loadDiaryEntry);
    saveBtn.addEventListener('click', saveDiaryEntry);
    
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentMood = e.target.getAttribute('data-mood');
        });
    });
    
    loadDiaryEntry();
    renderDiaryHistory();
}

function loadDiaryEntry() {
    const date = dateInput.value;
    if (diaryEntries[date]) {
        contentInput.value = diaryEntries[date].text || '';
        currentMood = diaryEntries[date].mood || '😊 Happy';
    } else {
        contentInput.value = '';
        currentMood = '😊 Happy';
    }
    
    document.querySelectorAll('.mood-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-mood') === currentMood);
    });
}

function saveDiaryEntry() {
    const date = dateInput.value;
    const text = contentInput.value.trim();
    
    if (text) {
        diaryEntries[date] = { text: text, mood: currentMood };
        saveData(STORAGE_KEYS.DIARY, diaryEntries);
        
        saveStatus.textContent = 'Saved successfully!';
        saveStatus.classList.add('show');
        setTimeout(() => saveStatus.classList.remove('show'), 2000);
        
        renderDiaryHistory();
    }
}

function renderDiaryHistory() {
    const historyList = document.getElementById('diary-history');
    const emptyState = document.getElementById('diary-empty-state');
    historyList.innerHTML = '';
    
    const dates = Object.keys(diaryEntries).sort().reverse();
    
    if (dates.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        dates.forEach(date => {
            const entry = diaryEntries[date];
            const li = document.createElement('li');
            li.className = `diary-history-item ${date === dateInput.value ? 'active' : ''}`;
            li.onclick = () => {
                dateInput.value = date;
                loadDiaryEntry();
                renderDiaryHistory();
            };
            
            li.innerHTML = `
                <div class="diary-history-date">
                    <span>${date}</span>
                    <span>${entry.mood.split(' ')[0]}</span>
                </div>
                <div class="diary-history-preview">${entry.text}</div>
            `;
            historyList.appendChild(li);
        });
    }
}

// ==========================================
// NOTES LOGIC
// ==========================================
let editingNoteId = null;
const noteModal = document.getElementById('note-modal');
const noteTitleInput = document.getElementById('note-modal-title');
const noteContentInput = document.getElementById('note-modal-content');

document.getElementById('new-note-btn').addEventListener('click', openNewNoteModal);
document.getElementById('close-note-btn').addEventListener('click', closeNoteModal);
document.getElementById('save-note-btn').addEventListener('click', saveNote);
document.getElementById('notes-search').addEventListener('input', renderNotes);

function openNewNoteModal() {
    editingNoteId = null;
    noteTitleInput.value = '';
    noteContentInput.value = '';
    noteModal.classList.add('active');
    noteTitleInput.focus();
}

function openEditNoteModal(id) {
    const note = notes.find(n => n.id === id);
    if (note) {
        editingNoteId = id;
        noteTitleInput.value = note.title;
        noteContentInput.value = note.content;
        noteModal.classList.add('active');
    }
}

function closeNoteModal() { noteModal.classList.remove('active'); }

function saveNote() {
    const title = noteTitleInput.value.trim() || 'Untitled Note';
    const content = noteContentInput.value.trim();
    
    if (content || title !== 'Untitled Note') {
        if (editingNoteId) {
            const idx = notes.findIndex(n => n.id === editingNoteId);
            if(idx > -1) {
                notes[idx].title = title;
                notes[idx].content = content;
                notes[idx].updatedAt = new Date().toLocaleDateString();
            }
        } else {
            notes.unshift({
                id: Date.now().toString(),
                title: title,
                content: content,
                updatedAt: new Date().toLocaleDateString()
            });
        }
        saveData(STORAGE_KEYS.NOTES, notes);
        renderNotes();
    }
    closeNoteModal();
}

function deleteNote(e, id) {
    e.stopPropagation();
    if(confirm('Delete this note?')) {
        notes = notes.filter(n => n.id !== id);
        saveData(STORAGE_KEYS.NOTES, notes);
        renderNotes();
    }
}

function renderNotes() {
    const grid = document.getElementById('notes-grid');
    const emptyState = document.getElementById('notes-empty-state');
    const search = document.getElementById('notes-search').value.toLowerCase();
    
    grid.innerHTML = '';
    const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(search) || n.content.toLowerCase().includes(search));
    
    if (filteredNotes.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        filteredNotes.forEach(note => {
            const card = document.createElement('div');
            card.className = 'note-card';
            card.onclick = () => openEditNoteModal(note.id);
            
            card.innerHTML = `
                <div class="note-title">${note.title}</div>
                <div class="note-preview">${note.content}</div>
                <div class="note-date">${note.updatedAt || ''}</div>
                <button class="delete-note-btn" onclick="deleteNote(event, '${note.id}')" aria-label="Delete Note">
                    <i class="ph-bold ph-trash"></i>
                </button>
            `;
            grid.appendChild(card);
        });
    }
}

// ==========================================
// SETTINGS LOGIC
// ==========================================
function initSettings() {
    const nameInput = document.getElementById('settings-name-input');
    if (nameInput) nameInput.value = username;
    
    document.getElementById('save-name-btn')?.addEventListener('click', () => {
        const newName = nameInput.value.trim();
        if (newName) {
            username = newName;
            saveData(STORAGE_KEYS.USER, username);
            updateGreeting();
            alert("Name updated successfully!");
        }
    });

    document.getElementById('clear-data-btn').addEventListener('click', () => {
        if(confirm('WARNING: This will permanently delete ALL data. Are you sure?')) {
            localStorage.clear();
            window.location.reload();
        }
    });

    document.getElementById('export-data-btn').addEventListener('click', () => {
        const data = { username, tasks, diary: diaryEntries, notes };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `slm-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById('import-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.username) saveData(STORAGE_KEYS.USER, data.username);
                if (data.tasks) saveData(STORAGE_KEYS.TASKS, data.tasks);
                if (data.diary) saveData(STORAGE_KEYS.DIARY, data.diary);
                if (data.notes) saveData(STORAGE_KEYS.NOTES, data.notes);
                alert('Data imported successfully!');
                window.location.reload();
            } catch (err) { alert('Invalid JSON backup file.'); }
        };
        reader.readAsText(file);
    });
}
