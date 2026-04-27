let playerLevel = 1;
let playerXP = 0;
const xpNeeded = 100;
let tasks = [];
let jumpscareActive = false;
let isPaused = false;
let globalTimer = null;

// New Features State
let dailyGoal = 3;
let tasksCompletedToday = 0;
let inventory = []; // e.g. { type: 'weapon', item: {...} }
let equipped = { weapon: null, armor: null };
let gender = 'male';
let skinColor = '#f1c27d';

const lootDB = {
    weapon: [
        { id: 'w1', name: 'Wooden Sword', icon: '🗡️', rarity: 'common', color: '#fff' },
        { id: 'w2', name: 'Steel Dagger', icon: '🔪', rarity: 'common', color: '#fff' },
        { id: 'w3', name: 'Knight Sword', icon: '⚔️', rarity: 'rare', color: '#00e5ff' },
        { id: 'w4', name: 'Magic Staff', icon: '🪄', rarity: 'rare', color: '#00e5ff' },
        { id: 'w5', name: 'Demon Blade', icon: '🗡️', rarity: 'epic', color: '#d500f9' }
    ],
    armor: [
        { id: 'a1', name: 'Peasant Shirt', icon: '👕', rarity: 'common', color: '#fff' },
        { id: 'a2', name: 'Leather Vest', icon: '🦺', rarity: 'common', color: '#fff' },
        { id: 'a3', name: 'Mage Robe', icon: '👘', rarity: 'rare', color: '#00e5ff' },
        { id: 'a4', name: 'Shadow Cloak', icon: '🧥', rarity: 'epic', color: '#d500f9' }
    ]
};

// Audio Context Setup
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

// DOM Elements
const levelEl = document.getElementById('player-level');
const xpTextEl = document.getElementById('xp-text');
const xpBarFill = document.getElementById('xp-bar-fill');
const taskInput = document.getElementById('task-input');
const timeInput = document.getElementById('time-input');
const addTaskBtn = document.getElementById('add-task-btn');
const taskListEl = document.getElementById('task-list');
const jumpscareOverlay = document.getElementById('jumpscare-overlay');
const upgradeOverlay = document.getElementById('upgrade-overlay');
const breakBtn = document.getElementById('break-btn');

const genderSelect = document.getElementById('gender-select');
const skinColorInput = document.getElementById('skin-color');
const dailyGoalInput = document.getElementById('daily-goal-input');
const dailyProgressText = document.getElementById('daily-progress-text');
const dailyBarFill = document.getElementById('daily-bar-fill');
const inventoryGrid = document.getElementById('inventory-grid');
const eqWeaponEl = document.getElementById('eq-weapon');
const eqArmorEl = document.getElementById('eq-armor');

function initAudio() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function updateStats() {
    levelEl.innerText = playerLevel;
    xpTextEl.innerText = `${playerXP} / ${xpNeeded}`;
    xpBarFill.style.width = `${(playerXP / xpNeeded) * 100}%`;
}

function levelUp() {
    playerLevel++;
    playerXP -= xpNeeded;
    updateStats();
    document.body.style.boxShadow = "inset 0 0 100px var(--xp-color)";
    setTimeout(() => { document.body.style.boxShadow = "none"; }, 500);
}

function levelDown() {
    if (playerLevel > 1) playerLevel--;
    playerXP = 0; 
    updateStats();
}

function updateDailyProgress() {
    dailyProgressText.innerText = `${tasksCompletedToday}/${dailyGoal}`;
    let pct = (tasksCompletedToday / dailyGoal) * 100;
    if (pct > 100) pct = 100;
    dailyBarFill.style.width = `${pct}%`;
    
    if (tasksCompletedToday === dailyGoal) {
        setTimeout(() => alert("SYSTEM: DAILY QUEST COMPLETED!"), 500);
    }
}

dailyGoalInput.addEventListener('change', (e) => {
    dailyGoal = parseInt(e.target.value) || 1;
    updateDailyProgress();
});

// Character customization
genderSelect.addEventListener('change', (e) => {
    gender = e.target.value;
    updateAvatar();
});

skinColorInput.addEventListener('input', (e) => {
    skinColor = e.target.value;
    document.documentElement.style.setProperty('--skin-color', skinColor);
});

function updateAvatar() {
    const avatar = document.getElementById('avatar');
    avatar.className = `avatar ${gender}`;
    if (gender === 'female') {
        avatar.style.transform = 'scale(0.9) scaleX(0.9)'; // Slightly slimmer
    } else {
        avatar.style.transform = 'scale(1)';
    }

    const avArmor = document.getElementById('av-armor');
    const avWeapon = document.getElementById('av-weapon');
    
    if (equipped.armor) {
        avArmor.innerText = equipped.armor.icon;
        avArmor.style.fontSize = '60px';
        avArmor.style.display = 'flex';
        avArmor.style.justifyContent = 'center';
        avArmor.style.alignItems = 'center';
        avArmor.style.lineHeight = '70px';
    } else {
        avArmor.innerText = '';
    }

    if (equipped.weapon) {
        avWeapon.innerText = equipped.weapon.icon;
    } else {
        avWeapon.innerText = '';
    }
}

// Inventory System
function renderInventory() {
    inventoryGrid.innerHTML = '';
    inventory.forEach((invItem, idx) => {
        const item = invItem.item;
        const div = document.createElement('div');
        const isEquipped = (equipped.weapon?.id === item.id) || (equipped.armor?.id === item.id);
        
        div.className = `inv-item item-rarity-${item.rarity} ${isEquipped ? 'equipped' : ''}`;
        div.innerText = item.icon;
        div.title = `${item.name} (${item.rarity})`;
        div.onclick = () => equipItem(invItem.type, item);
        
        inventoryGrid.appendChild(div);
    });

    eqWeaponEl.innerText = equipped.weapon ? `${equipped.weapon.icon} ${equipped.weapon.name}` : '🗡️ None';
    eqArmorEl.innerText = equipped.armor ? `${equipped.armor.icon} ${equipped.armor.name}` : '👕 None';
}

function equipItem(type, item) {
    equipped[type] = item;
    renderInventory();
    updateAvatar();
}

window.unequip = function(type) {
    equipped[type] = null;
    renderInventory();
    updateAvatar();
}

function rollLoot() {
    // 50% chance to drop loot
    if (Math.random() < 0.5) {
        const types = ['weapon', 'armor'];
        const type = types[Math.floor(Math.random() * types.length)];
        const pool = lootDB[type];
        
        // Rarity weighting
        let roll = Math.random();
        let rarityFilter = 'common';
        if (roll > 0.9) rarityFilter = 'epic';
        else if (roll > 0.6) rarityFilter = 'rare';

        let available = pool.filter(i => i.rarity === rarityFilter);
        if (available.length === 0) available = pool; // fallback

        const droppedItem = available[Math.floor(Math.random() * available.length)];
        
        inventory.push({ type: type, item: droppedItem });
        renderInventory();
        return droppedItem;
    }
    return null;
}

function loseProgress() {
    // Lose most recent item
    if (inventory.length > 0) {
        const lost = inventory.pop();
        if (equipped.weapon?.id === lost.item.id) equipped.weapon = null;
        if (equipped.armor?.id === lost.item.id) equipped.armor = null;
        renderInventory();
        updateAvatar();
    }
    // Lose tasks completed today
    tasksCompletedToday = 0;
    updateDailyProgress();
}

function playJumpscareSound(duration) {
    initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(50, audioCtx.currentTime); 
    osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.2); 
    
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1; 
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1500;
    
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(3, audioCtx.currentTime);
    
    noise.connect(filter);
    filter.connect(gainNode);
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    noise.start();
    osc.start();
    
    setTimeout(() => { noise.stop(); osc.stop(); }, duration * 1000);
}

function triggerJumpscare() {
    if (jumpscareActive) return;
    jumpscareActive = true;
    
    tasks = [];
    renderTasks();
    
    levelDown();
    loseProgress();
    
    jumpscareOverlay.classList.remove('hidden');
    jumpscareOverlay.classList.add('active');
    
    playJumpscareSound(20);
    
    setTimeout(() => {
        jumpscareOverlay.classList.add('hidden');
        jumpscareOverlay.classList.remove('active');
        jumpscareActive = false;
    }, 20000);
}

function showUpgradeAnimation(loot) {
    document.getElementById('upgrade-title').innerText = "QUEST COMPLETE";
    
    if (loot) {
        document.getElementById('upgrade-desc').innerText = `ACQUIRED: ${loot.name}`;
        const lootDisplay = document.getElementById('loot-display');
        lootDisplay.innerText = loot.icon;
        lootDisplay.style.color = loot.color;
    } else {
        document.getElementById('upgrade-desc').innerText = "XP GRANTED";
        document.getElementById('loot-display').innerText = "";
    }

    upgradeOverlay.classList.remove('hidden');
    upgradeOverlay.classList.add('active');
    setTimeout(() => {
        upgradeOverlay.classList.add('hidden');
        upgradeOverlay.classList.remove('active');
    }, 4000);
}

function completeTask(id) {
    if (jumpscareActive) return;
    
    const index = tasks.findIndex(t => t.id === id);
    if (index > -1) {
        tasks.splice(index, 1);
        playerXP += 25; 
        if (playerXP >= xpNeeded) levelUp();
        else updateStats();
        
        tasksCompletedToday++;
        updateDailyProgress();

        const loot = rollLoot();
        renderTasks();
        showUpgradeAnimation(loot);
    }
}

function addTask() {
    initAudio(); 
    const name = taskInput.value.trim();
    let minutes = parseInt(timeInput.value);
    const unit = document.getElementById('time-unit').value;
    
    if (!name || isNaN(minutes) || minutes <= 0) {
        alert("Please enter a valid task name and time.");
        return;
    }

    if (unit === 'hr') {
        minutes = minutes * 60;
    }
    
    tasks.push({
        id: Date.now().toString(),
        name: name,
        endTime: Date.now() + minutes * 60 * 1000,
        urgent: minutes <= 5
    });
    
    taskInput.value = '';
    timeInput.value = '';
    renderTasks();
    
    if (!globalTimer) startTimer();
}

window.setQuickTask = function(name, time, unit) {
    document.getElementById('task-input').value = name;
    document.getElementById('time-input').value = time;
    document.getElementById('time-unit').value = unit;
}

function formatTime(ms) {
    if (ms <= 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function renderTasks() {
    taskListEl.innerHTML = '';
    tasks.forEach(task => {
        let remaining = isPaused ? (task.timeRemaining || 0) : (task.endTime - Date.now());
        const isUrgent = remaining < 60000; 
        
        const div = document.createElement('div');
        div.className = `task-item ${isUrgent ? 'urgent' : ''}`;
        
        div.innerHTML = `
            <div class="task-info">
                <span class="task-name">${task.name}</span>
                <span class="task-timer" id="timer-${task.id}">${formatTime(remaining)}</span>
            </div>
            <button class="complete-btn" onclick="completeTask('${task.id}')">COMPLETE</button>
        `;
        taskListEl.appendChild(div);
    });
}

function startTimer() {
    globalTimer = setInterval(() => {
        if (jumpscareActive || isPaused) return;
        const now = Date.now();
        
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            const remaining = task.endTime - now;
            
            if (remaining <= 0) {
                triggerJumpscare();
                return; 
            }
            
            const timerEl = document.getElementById(`timer-${task.id}`);
            if (timerEl) {
                timerEl.innerText = formatTime(remaining);
                if (remaining < 60000 && !timerEl.parentElement.parentElement.classList.contains('urgent')) {
                    timerEl.parentElement.parentElement.classList.add('urgent');
                }
            }
        }
    }, 1000);
}

function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        breakBtn.innerText = "RESUME";
        breakBtn.style.color = "#00e676";
        breakBtn.style.borderColor = "#00e676";
        tasks.forEach(task => task.timeRemaining = task.endTime - Date.now());
    } else {
        breakBtn.innerText = "TAKE A BREAK";
        breakBtn.style.color = "#ffab00";
        breakBtn.style.borderColor = "#ffab00";
        tasks.forEach(task => task.endTime = Date.now() + task.timeRemaining);
    }
}

addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });
breakBtn.addEventListener('click', togglePause);

// Init
document.documentElement.style.setProperty('--skin-color', skinColor);
updateStats();
updateDailyProgress();
updateAvatar();
renderInventory();
