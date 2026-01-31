let timer;
let secondsElapsed = 0;
let isRunning = false;
let recordedDates = []; // 存储有记录的日期
let isTimerSave = false;
let playMode = 'sequence';

function getToday() {
    return new Date().toLocaleDateString('en-CA');
}



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
        isTimerSave = true;   // ✅ 标记：这是计时器保存
    } else {
        clearInterval(timer);
        isRunning = false;
        btn.innerText = "开始学习";
        btn.style.background = "#4CAF50";

        await saveStudyData();

        document.getElementById('task-panel').classList.add('active');
        secondsElapsed = 0;
        display.innerText = "00:00";
        isTimerSave = false;
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

    const durationSec = secondsElapsed;
    const durationMin = Math.floor(durationSec / 60);

    if (durationSec < 60 && durationSec > 0) {
        if (!confirm("学习时间不到1分钟，确定要记录吗？")) return;
    }

    const localDate = getToday();
    const selectedDate = document.getElementById('calendarPicker').value;

    const data = {
        task_name: taskName || "未命名任务",
        duration_sec: durationSec,          // ✅ 秒
        duration_min: durationMin,          // 兼容旧后端可留
        note: note,
        date: isTimerSave ? localDate : (selectedDate || localDate)
    };

    const response = await fetch('/api/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (response.ok) {
        await updateCalendarData();
        loadRecords(data.date);
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
                <span style="color:#4CAF50;">
            ${formatDuration(r.duration_sec)}
                </span>
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

function formatDuration(sec) {
    if (sec < 60) return `${sec}s`;

    const m = Math.floor(sec / 60);
    const s = sec % 60;

    return s === 0 ? `${m}min` : `${m}m ${s}s`;
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

const volumeSlider = document.getElementById('volume-slider');
const muteBtn = document.getElementById('mute-btn');

// 1. 初始化获取歌单
async function initMusic() {
    try {
        const resp = await fetch('/api/music_list');
        musicFiles = await resp.json();
        renderMusicList();

        // --- 在这里初始化音量逻辑 ---
        const volumeSlider = document.getElementById('volume-slider');
        const muteBtn = document.getElementById('mute-btn');

        if (volumeSlider && muteBtn) {
            // 设置初始音量（0.8 比较柔和）
            audio.volume = 0.8;
            volumeSlider.value = 0.8;

            volumeSlider.oninput = (e) => {
                const val = e.target.value;
                audio.volume = val;
                if (val == 0) muteBtn.innerText = "🔇";
                else if (val < 0.5) muteBtn.innerText = "🔉";
                else muteBtn.innerText = "🔊";
            };

            muteBtn.onclick = () => {
                if (audio.volume > 0) {
                    audio.dataset.lastVolume = audio.volume;
                    audio.volume = 0;
                    volumeSlider.value = 0;
                    muteBtn.innerText = "🔇";
                } else {
                    const lastVol = parseFloat(audio.dataset.lastVolume || 0.8);
                    audio.volume = lastVol;
                    volumeSlider.value = lastVol;
                    muteBtn.innerText = lastVol < 0.5 ? "🔉" : "🔊";
                }
            };
        }
    } catch (e) {
        console.error("加载歌单失败:", e);
    }
}

function removeExt(filename) {
    return filename.replace(/\.[^/.]+$/, '');
}


// 2. 渲染歌单 (只展示文件名)
function renderMusicList() {
    const list = document.querySelector('.music-list');
    if (!list) return;

    list.innerHTML = musicFiles.map((file, index) => `
        <div class="music-item" id="music-${index}" onclick="playMusic(${index})">
            ${removeExt(file)}
        </div>
    `).join('');
}



// 3. 播放逻辑优化
function playMusic(index) {
    currentMusicIndex = index;
    const fileName = musicFiles[index];

    // 1️⃣ 彻底停止当前音频
    audio.pause();
    audio.currentTime = 0;

    // 2️⃣ 设置新音源
    const musicUrl = `/static/music/${fileName}?t=${Date.now()}`;
    audio.src = encodeURI(musicUrl);

    // 3️⃣ 强制播放（保证切歌即播放）
    audio.play().catch(() => {});

    // 4️⃣ 同步 UI（只在一个地方做）
    document.getElementById('song-title').innerText = removeExt(fileName);

    document.querySelectorAll('.music-item')
        .forEach(item => item.classList.remove('active-song'));

    const currentItem = document.getElementById(`music-${index}`);
    if (currentItem) currentItem.classList.add('active-song');

    syncPlayUI(true);
}

// 唯一 UI 同步函数
function syncPlayUI(isPlaying) {
    const btn = document.getElementById('play-pause');
    const musicPanel = document.getElementById('music-panel');

    if (isPlaying) {
        musicPanel.classList.add('playing');
        btn.innerText = "⏸";
    } else {
        musicPanel.classList.remove('playing');
        btn.innerText = "▶";
    }
}



function togglePlay() {
    if (!audio.src) {
        playMusic(0);
        return;
    }

    if (audio.paused) {
        audio.play();
        syncPlayUI(true);
    } else {
        audio.pause();
        syncPlayUI(false);
    }
}

audio.onplay = () => syncPlayUI(true);
audio.onpause = () => syncPlayUI(false);


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
// 2. 修改切歌逻辑 (核心修改点)
function nextMusic() {
    if (musicFiles.length === 0) return;

    if (playMode === 'random') {
        // 随机逻辑：生成一个不等于当前索引的随机数
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * musicFiles.length);
        } while (newIndex === currentMusicIndex && musicFiles.length > 1);
        currentMusicIndex = newIndex;
    } else {
        // 顺序逻辑
        currentMusicIndex = (currentMusicIndex + 1) % musicFiles.length;
    }

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

// 1. 切换模式的函数
function togglePlayMode() {
    const modeBtn = document.getElementById('play-mode-btn');
    if (playMode === 'sequence') {
        playMode = 'random';
        modeBtn.innerText = "🔀"; // 随机图标
        modeBtn.title = "随机播放";
    } else {
        playMode = 'sequence';
        modeBtn.innerText = "🔁"; // 顺序图标
        modeBtn.title = "顺序播放";
    }
}

// 加载文件列表
async function loadAdminFiles() {
    const type = document.getElementById('file-type-select').value;

    // 添加加载中的视觉反馈（可选）
    const list = document.getElementById('admin-file-list');
    list.innerHTML = '<tr><td colspan="2" style="text-align:center;opacity:0.5;">读取中...</td></tr>';

    try {
        const resp = await fetch(`/api/files/${type}`);
        if (!resp.ok) throw new Error('网络请求失败');
        const files = await resp.json();

        if (files.length === 0) {
            list.innerHTML = '<tr><td colspan="2" style="text-align:center;opacity:0.5;">文件夹空空如也</td></tr>';
            return;
        }

        // 使用类名 action-group 和 btn-delete 匹配我们刚才写的 CSS
        list.innerHTML = files.map(file => `
            <tr>
                <td class="file-name-cell">${file}</td>
                <td class="action-group">
                    <button onclick="renameFile('${type}', '${file}')">更名</button>
                    <button class="btn-delete" onclick="deleteFile('${type}', '${file}')">删除</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error("加载文件列表出错:", error);
        list.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#ff6b6b;">加载失败，请检查登录状态</td></tr>';
    }
}

// 上传文件
async function handleUpload() {
    const type = document.getElementById('file-type-select').value;
    const input = document.getElementById('file-upload-input');
    if (!input.files[0]) return alert("请选择文件");

    const formData = new FormData();
    formData.append('file', input.files[0]);

    const resp = await fetch(`/api/upload/${type}`, { method: 'POST', body: formData });
    if (resp.ok) {
        alert("上传成功");
        loadAdminFiles();
        if(type === 'music') initMusic(); // 刷新播放列表
    }
}

// 删除文件
async function deleteFile(type, filename) {
    if (!confirm(`确定删除 ${filename} 吗？`)) return;
    const resp = await fetch(`/api/file/${type}/${filename}`, { method: 'DELETE' });
    if (resp.ok) {
        loadAdminFiles();
        if(type === 'music') initMusic();
    }
}

// 重命名文件
async function renameFile(type, oldName) {
    const newName = prompt("请输入新文件名（带后缀）:", oldName);
    if (!newName || newName === oldName) return;

    const resp = await fetch(`/api/rename/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName })
    });
    if (resp.ok) {
        loadAdminFiles();
        if(type === 'music') initMusic();
    }
}

