let timer;
let secondsElapsed = 0;
let isRunning = false;
let recordedDates = []; // 存储有记录的日期

// 1. 面板显示/隐藏
function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    panel.classList.toggle('active');
}

// 2. 计时器：开始 -> 结束并重置
async function handleTimerClick() {
    const btn = document.getElementById('startBtn');
    const display = document.getElementById('display');

    if (!isRunning) {
        secondsElapsed = 0;
        display.innerText = "00:00";
        timer = setInterval(updateTimer, 1000);
        btn.innerText = "停止并保存";
        btn.style.background = "#f44336";
        isRunning = true;
    } else {
        clearInterval(timer);
        isRunning = false;
        btn.innerText = "开始学习";
        btn.style.background = "#4CAF50";

        await saveStudyData(); // 保存

        document.getElementById('task-panel').classList.add('active');
        secondsElapsed = 0;
        display.innerText = "00:00";
    }
}

function updateTimer() {
    secondsElapsed++;
    const mins = Math.floor(secondsElapsed / 60);
    const secs = secondsElapsed % 60;
    document.getElementById('display').innerText =
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 3. 保存数据 (修复日期偏移)
async function saveStudyData() {
    const taskName = document.getElementById('taskName').value;
    const note = document.getElementById('note').value;
    const duration = Math.floor(secondsElapsed / 60);

    if (duration < 1 && secondsElapsed > 0) {
        if (!confirm("学习时间不到1分钟，确定要记录吗？")) return;
    }

    // 获取本地 YYYY-MM-DD
    const localDate = new Date().toLocaleDateString('en-CA');

    const data = {
        task_name: taskName || "未命名任务",
        duration: duration,
        note: note,
        date: document.getElementById('calendarPicker').value || localDate
    };

    const response = await fetch('/api/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (response.ok) {
        await updateCalendarData(); // 刷新日历标记
        loadRecords(data.date);    // 刷新明细
    }
}

// 4. 加载记录 (增加删除按钮)
async function loadRecords(selectedDate) {
    let date = selectedDate;

    if (!date) {
        date = new Date().toLocaleDateString('en-CA');
        const picker = document.getElementById('calendarPicker');
        if(picker) picker.value = date;
    }

    const response = await fetch(`/api/records/${date}`);
    const records = await response.json();

    const list = document.getElementById('recordList');
    list.innerHTML = records.length ? records.map(r => `
        <div class="record-item" style="position:relative;">
            <div style="display:flex; justify-content:space-between; font-weight:bold; padding-right:25px;">
                <span>${r.task_name}</span>
                <span style="color:#4CAF50;">${r.duration} min</span>
            </div>
            <p style="font-size:0.8em; margin:5px 0 0; opacity:0.8;">${r.note || '无备注'}</p>
            <span onclick="deleteItem(${r.id}, '${r.date}')" 
                  style="position:absolute; top:10px; right:10px; cursor:pointer; opacity:0.5;">❌</span>
        </div>
    `).join('') : '<div style="padding:20px;text-align:center;opacity:0.5;">该日暂无记录</div>';
}

// 5. 删除功能
async function deleteItem(id, date) {
    if (!confirm("确定要删除这条记录吗？")) return;
    const response = await fetch(`/api/record/${id}`, { method: 'DELETE' });
    if (response.ok) {
        await updateCalendarData();
        loadRecords(date);
    }
}

// 6. 日历渲染逻辑 (彻底修复时区)
async function updateCalendarData() {
    const resp = await fetch('/api/recorded_dates');
    recordedDates = await resp.json();
    initCalendar(); // 重新初始化以刷新样式
}

function initCalendar() {
    flatpickr("#calendarPicker", {
        inline: true,
        dateFormat: "Y-m-d",
        defaultDate: document.getElementById('calendarPicker').value || "today",
        onDayCreate: function(dObj, dStr, fp, dayElem) {
            // 使用本地年/月/日拼装字符串，避免 ISOString 的时区坑
            const date = dayElem.dateObj;
            const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

            if (recordedDates.includes(dateStr)) {
                dayElem.classList.add("has-record");
            }
        },
        onChange: function(selectedDates, dateStr) {
            loadRecords(dateStr);
        }
    });
}

window.onload = () => {
    updateCalendarData();
    loadRecords();

};

let musicFiles = [];
let currentMusicIndex = 0;
const audio = document.getElementById('main-audio');
const musicPanel = document.getElementById('music-panel');

// 1. 初始化获取歌单
async function initMusic() {
    try {
        const resp = await fetch('/api/music_list');
        musicFiles = await resp.json();
        renderMusicList();
    } catch (e) {
        console.error("加载歌单失败:", e);
    }
}

// 2. 渲染歌单 (只展示文件名)
function renderMusicList() {
    const list = document.querySelector('.music-list');
    if (!list) return;
    list.innerHTML = musicFiles.map((file, index) => `
        <div class="music-item" id="music-${index}" onclick="playMusic(${index})">
            ${file.replace('.aac', '')}
        </div>
    `).join('');
}

// 3. 播放逻辑优化
function playMusic(index) {
    currentMusicIndex = index;
    const fileName = musicFiles[index];

    // 1. 避开 IDM 后缀扫描：在路径后加一个随机查询字符串
    // 这样 IDM 可能会认为这是一个动态 API 流而非静态文件
    const musicUrl = `/static/music/${fileName}?t=${new Date().getTime()}`;
    audio.src = encodeURI(musicUrl);

    document.getElementById('song-title').innerText = fileName.replace('.aac', '');

    document.querySelectorAll('.music-item').forEach(item => item.classList.remove('active-song'));
    const currentItem = document.getElementById(`music-${index}`);
    if (currentItem) currentItem.classList.add('active-song');

    // 2. 预加载元数据，确保时长能被读取
    audio.load();

    // 3. 异步播放处理
    audio.play().then(() => {
        musicPanel.classList.add('playing');
        document.getElementById('play-pause').innerText = "⏸";
    }).catch(e => {
        console.warn("自动播放受限或被拦截:", e);
        // 如果还是被拦截，尝试静音播放再取消静音（浏览器的安全策略）
        audio.muted = true;
        audio.play().then(() => {
            setTimeout(() => { audio.muted = false; }, 100);
        });
    });
}

function togglePlay() {
    const btn = document.getElementById('play-pause');
    if (audio.paused) {
        if (!audio.src || audio.src.includes('undefined')) {
            playMusic(0);
        } else {
            audio.play();
            musicPanel.classList.add('playing');
            btn.innerText = "⏸";
        }
    } else {
        audio.pause();
        musicPanel.classList.remove('playing');
        btn.innerText = "▶";
    }
}

// --- 4. 进度条与时间更新核心逻辑 ---

// 当音频元数据（时长等）加载完成时
audio.onloadedmetadata = () => {
    document.getElementById('total-time').innerText = formatTime(audio.duration);
};

// 播放时实时更新进度条
audio.ontimeupdate = () => {
    if (!isNaN(audio.duration)) {
        const progressPercent = (audio.currentTime / audio.duration) * 100;
        document.getElementById('progress').value = progressPercent;
        document.getElementById('current-time').innerText = formatTime(audio.currentTime);
    }
};

// 允许用户拖动进度条
document.getElementById('progress').oninput = (e) => {
    if (!isNaN(audio.duration)) {
        const seekTime = (e.target.value / 100) * audio.duration;
        audio.currentTime = seekTime;
    }
};

// 时间格式化辅助函数
function formatTime(sec) {
    if (isNaN(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// 切歌逻辑
function nextMusic() {
    currentMusicIndex = (currentMusicIndex + 1) % musicFiles.length;
    playMusic(currentMusicIndex);
}

function prevMusic() {
    currentMusicIndex = (currentMusicIndex - 1 + musicFiles.length) % musicFiles.length;
    playMusic(currentMusicIndex);
}

audio.onended = nextMusic;

// 页面加载启动
window.onload = () => {
    initMusic();
    if (typeof updateCalendarData === 'function') updateCalendarData();
    if (typeof loadRecords === 'function') loadRecords();
};