let timer;
let taskList = []; // 任务列表管理
let secondsElapsed = 0;
let isRunning = false;
let recordedDates = []; // 存储有记录的日期
let isTimerSave = false;
let playMode = 'sequence';

let startTime; // 新增：记录开始的时间戳

// 一 计时器与核心逻辑 (Timer & Core Logic)

//获取本地当前日期（格式：YYYY-MM-DD），用于存储和比对。
function getToday() {
    return new Date().toLocaleDateString('en-CA');
}

// 切换指定面板（如任务、音乐等）的显示或隐藏状态。
function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    panel.classList.toggle('active');
}

// 加载任务列表
async function loadTaskList() {
    try {
        // 尝试从本地存储获取任务列表
        const savedTasks = localStorage.getItem('studyTasks');
        if (savedTasks) {
            taskList = JSON.parse(savedTasks);
        } else {
            // 如果本地存储没有，使用默认任务列表
            taskList = ['高等数学', '英语学习', '编程练习', '阅读书籍'];
            localStorage.setItem('studyTasks', JSON.stringify(taskList));
        }
        updateTaskSelect();
    } catch (error) {
        console.error('加载任务列表失败:', error);
        taskList = ['高等数学', '英语学习', '编程练习', '阅读书籍'];
        updateTaskSelect();
    }
}

// 更新任务下拉框
function updateTaskSelect() {
    const taskSelect = document.getElementById('taskName');
    if (!taskSelect) return;
    
    // 保存当前选中的值
    const currentValue = taskSelect.value;
    
    // 清空下拉框
    taskSelect.innerHTML = '';
    
    // 添加任务选项
    taskList.forEach(task => {
        const option = document.createElement('option');
        option.value = task;
        option.textContent = task;
        taskSelect.appendChild(option);
    });
    
    // 添加"添加新任务"选项
    const newOption = document.createElement('option');
    newOption.value = 'new';
    newOption.textContent = '+ 添加新任务';
    taskSelect.appendChild(newOption);
    
    // 恢复之前选中的值，如果不存在则选择第一个
    if (currentValue && taskList.includes(currentValue)) {
        taskSelect.value = currentValue;
    } else if (taskList.length > 0) {
        taskSelect.value = taskList[0];
    }
}

// 添加新任务
async function addNewTask() {
    const taskName = prompt('请输入新任务名称:', '');
    if (!taskName || taskName.trim() === '') return;
    
    const trimmedName = taskName.trim();
    
    // 检查是否已存在
    if (taskList.includes(trimmedName)) {
        alert('该任务已存在！');
        return;
    }
    
    // 添加到本地列表
    taskList.push(trimmedName);
    
    // 保存到本地存储
    localStorage.setItem('studyTasks', JSON.stringify(taskList));
    
    // 更新下拉框
    updateTaskSelect();
    
    // 选中新添加的任务
    document.getElementById('taskName').value = trimmedName;
}

// 监听任务选择变化
function setupTaskSelectListener() {
    const taskSelect = document.getElementById('taskName');
    if (!taskSelect) return;
    
    taskSelect.addEventListener('change', function() {
        if (this.value === 'new') {
            addNewTask();
            // 重置为第一个任务
            setTimeout(() => {
                if (taskList.length > 0) {
                    this.value = taskList[0];
                }
            }, 100);
        }
    });
}

// 主计时按钮逻辑，处理开始计时与停止保存的循环。
async function handleTimerClick() {
    const btn = document.getElementById('startBtn');
    const display = document.getElementById('display');
    const taskSelect = document.getElementById('taskName');
    
    // 检查是否选择了有效的任务
    if (taskSelect.value === 'new') {
        alert('请先选择一个任务或添加新任务！');
        return;
    }

    if (!isRunning) {
        // 关键修改：记录点击开始时的确切时间戳（单位：毫秒）
        startTime = Date.now();

        display.innerText = "00:00";
        timer = setInterval(updateTimer, 1000); // 这里的 1000ms 仅用于更新 UI 显示

        btn.innerText = "停止并保存";
        btn.style.background = "#f44336";
        isRunning = true;
        isTimerSave = true;
    } else {
        // 停止逻辑保持不变...
        clearInterval(timer);
        isRunning = false;
        btn.innerText = "开始学习";
        btn.style.background = "#4CAF50";

        await saveStudyData();

        document.getElementById('task-panel').classList.add('active');
        display.innerText = "00:00";
        isTimerSave = false;
    }
}

// 计时器的递增逻辑，实时更新页面上的时间显示。
function updateTimer() {
    // 关键修改：计算当前时间与开始时间的差值
    const currentTime = Date.now();
    const diffMs = currentTime - startTime; // 毫秒差

    // 将毫秒转为秒
    secondsElapsed = Math.floor(diffMs / 1000);

    const mins = Math.floor(secondsElapsed / 60);
    const secs = secondsElapsed % 60;

    document.getElementById('display').innerText =
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 二 数据存储与管理 (Data Management)

//收集任务名、备注、时长和日期，通过 API 发送到后端保存。
// 修改原有的 saveStudyData，提取出通用的 performSave
// 修改原有的 saveStudyData，提取出通用的 performSave
async function saveStudyData() {
    const durationSec = secondsElapsed;
    if (durationSec < 60 && durationSec > 0) {
        if (!confirm("学习时间不到1分钟，确定要记录吗？")) return;
    }

    const taskSelect = document.getElementById('taskName');
    const selectedTask = taskSelect.value;
    
    // 确保不是选择了"添加新任务"
    if (selectedTask === 'new') {
        alert('请先选择一个有效的任务！');
        return;
    }

    const data = {
        task_name: selectedTask || "未命名任务",
        duration_sec: durationSec,
        note: document.getElementById('note').value
    };

    await performSave(data);
}

// 通用的保存执行函数
async function performSave(customData) {
    const localDate = getToday();
    const selectedDate = document.getElementById('calendarPicker').value;

    const finalData = {
        task_name: customData.task_name,
        duration_sec: customData.duration_sec,
        duration_min: Math.floor(customData.duration_sec / 60),
        note: customData.note,
        // 如果是计时器停止触发，用当天；如果是手动补录，用日历选中的日期
        date: isTimerSave ? localDate : (selectedDate || localDate)
    };

    try {
        const response = await fetch('/api/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalData)
        });

        if (response.ok) {
            alert("记录已保存");
            await updateCalendarData();
            loadRecords(finalData.date);
            // 只清空备注，不清空任务选择框
            document.getElementById('note').value = "";
        }
    } catch (error) {
        console.error("保存失败:", error);
    }
}




//  加载记录 (增加删除按钮) 根据指定日期从后端拉取学习记录，并渲染到列表中。
async function loadRecords(selectedDate) {
    let date = selectedDate;

    if (!date) {
        date = new Date().toLocaleDateString('en-CA');
        const picker = document.getElementById('calendarPicker');
        if(picker) picker.value = date;
    }

    const response = await fetch(`/api/records/${date}`);
    const records = await response.json();

    // 计算当天总时长（秒）
    const totalSeconds = records.reduce((sum, record) => sum + record.duration_sec, 0);
    const totalDuration = formatDuration(totalSeconds);
    
    // 更新总时长显示
    const totalDurationElement = document.getElementById('totalDurationValue');
    const totalDurationDisplay = document.getElementById('totalDurationDisplay');
    
    if (totalDurationElement) {
        totalDurationElement.textContent = totalDuration;
        
        // 更新标题显示（如果是今天显示"今日总时长"，否则显示日期）
        const today = new Date().toLocaleDateString('en-CA');
        const titleSpan = totalDurationDisplay.querySelector('span span:not(:first-child)');
        if (titleSpan) {
            if (date === today) {
                titleSpan.textContent = '今日总时长';
            } else {
                titleSpan.textContent = `${date} 总时长`;
            }
        }
    }
    
    const list = document.getElementById('recordList');
    
    // 创建记录列表HTML
    const recordsHtml = records.length ? records.map(r => `
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
    
    // 更新记录列表
    list.innerHTML = recordsHtml;
}

// 5. 删除功能 根据 ID 删除单条学习记录，并刷新当前视图。
async function deleteItem(id, date) {
    if (!confirm("确定要删除这条记录吗？")) return;
    const response = await fetch(`/api/record/${id}`, { method: 'DELETE' });
    if (response.ok) {
        await updateCalendarData();
        loadRecords(date);
    }
}

// 6. 日历渲染逻辑 (彻底修复时区)  从后端获取所有“有记录的日期”，用于在日历上标记小圆点。
async function updateCalendarData() {
    const resp = await fetch('/api/recorded_dates');
    recordedDates = await resp.json();
    initCalendar(); // 重新初始化以刷新样式
}

// 7. 手动添加记录逻辑
// 手动添加记录逻辑 - 全自定义版
async function handleManualAdd() {
    // 1. 定义任务名称
    const taskName = prompt("请输入任务名称:", "手动补录任务");
    if (taskName === null) return; // 用户取消

    // 2. 定义学习时长
    const inputMin = prompt(`[${taskName}] 学习了多久？(请输入分钟数):`, "25");
    if (inputMin === null) return;
    const mins = parseInt(inputMin);
    if (isNaN(mins) || mins <= 0) {
        alert("请输入有效的时长数字");
        return;
    }

    // 3. 定义备注
    const note = prompt(`给 [${taskName}] 加点备注吧:`, "");
    if (note === null) return; // 用户取消

    // 4. 准备数据
    isTimerSave = false; // 标记为手动，确保使用日历选中的日期
    const manualData = {
        task_name: taskName,
        duration_sec: mins * 60,
        note: note || "手动补录"
    };

    // 5. 执行保存
    await performSave(manualData);
}

// 通用的保存执行函数 (保持不变)
async function performSave(customData) {
    const localDate = getToday();
    const selectedDate = document.getElementById('calendarPicker').value;

    const finalData = {
        task_name: customData.task_name,
        duration_sec: customData.duration_sec,
        duration_min: Math.floor(customData.duration_sec / 60),
        note: customData.note,
        date: isTimerSave ? localDate : (selectedDate || localDate)
    };

    const response = await fetch('/api/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData)
    });

    if (response.ok) {
        await updateCalendarData();
        loadRecords(finalData.date);
    } else {
        alert("保存失败，请检查网络");
    }
}

// 三 日历与格式化 (UI & Calendar)
//  将学习时长（秒）格式化为更易读的 Xh Ym Ys 字符串。
function formatDuration(sec) {
    if (sec < 60) return `${sec}s`;

    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;

    if (hours > 0) {
        if (minutes === 0 && seconds === 0) {
            return `${hours}h`;
        } else if (seconds === 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${hours}h ${minutes}m ${seconds}s`;
        }
    } else {
        // 小于1小时的情况
        if (seconds === 0) {
            return `${minutes}min`;
        } else {
            return `${minutes}m ${seconds}s`;
        }
    }
}

// 初始化 Flatpickr 日历控件，处理日期标记和点击切换逻辑。
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

function removeExt(filename) {
    return filename.replace(/\.[^/.]+$/, '');
}

window.onload = () => {
    loadTaskList();
    setupTaskSelectListener();
    updateCalendarData();
    loadRecords();
};

let musicFiles = [];
let currentMusicIndex = 0;
const audio = document.getElementById('main-audio');
const musicPanel = document.getElementById('music-panel');

const volumeSlider = document.getElementById('volume-slider');
const muteBtn = document.getElementById('mute-btn');

// 四 音乐播放器功能 (Music Player)

// 1. 初始化获取歌单 初始化音乐列表，并绑定音量调节、静音等交互事件。
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




// 2. 渲染歌单 (只展示文件名)  将获取到的音乐文件渲染到 UI 的播放列表中。
function renderMusicList() {
    const list = document.querySelector('.music-list');
    if (!list) return;

    list.innerHTML = musicFiles.map((file, index) => `
        <div class="music-item" id="music-${index}" onclick="playMusic(${index})">
            ${removeExt(file)}
        </div>
    `).join('');
}



// 3. 播放逻辑优化 加载并播放指定索引的音乐文件，处理音频源切换。
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

// 唯一 UI 同步函数  同步播放器 UI（如播放按钮图标、面板动画状态）。
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


// 控制音频的“播放/暂停”状态切换。
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

// 时间格式化辅助函数  辅助函数，将秒数格式化为 00:00 格式。
function formatTime(sec) {
    if (isNaN(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// 切歌逻辑
// 2. 修改切歌逻辑 (核心修改点) 切歌逻辑，根据播放模式（顺序/随机）决定下一首
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

// 切换回上一首音乐。
function prevMusic() {
    currentMusicIndex = (currentMusicIndex - 1 + musicFiles.length) % musicFiles.length;
    playMusic(currentMusicIndex);
}

audio.onended = nextMusic;

// 页面加载启动
window.onload = () => {
    loadTaskList();
    setupTaskSelectListener();
    initMusic();
    if (typeof updateCalendarData === 'function') updateCalendarData();
    if (typeof loadRecords === 'function') loadRecords();
};

// 1. 切换模式的函数 在“顺序播放”和“随机播放”模式之间切换。
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

// 五 后台管理功能 (Admin Operations)
// 加载文件列表 按类型（音乐/背景等）读取服务器上的文件列表并显示在管理表格中。
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

// 上传文件 处理文件上传逻辑，将本地选中的文件发送至服务器。
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

// 删除文件 在管理后台删除特定的服务器文件。
async function deleteFile(type, filename) {
    if (!confirm(`确定删除 ${filename} 吗？`)) return;
    const resp = await fetch(`/api/file/${type}/${filename}`, { method: 'DELETE' });
    if (resp.ok) {
        loadAdminFiles();
        if(type === 'music') initMusic();
    }
}

// 重命名文件 弹出对话框并处理服务器文件的重命名操作。
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

// --- 背景视频逻辑 ---
let publicVideoFiles = [];
let currentVideoIndex = 0;
let cachedVideo = null; // 缓存的下一个视频
let autoSwitchTimer = null; // 自动切换定时器

/**
 * initPublicVideos: 首页启动时获取公开视频列表
 */
async function initPublicVideos() {
    try {
        const resp = await fetch('/api/public/videos');
        publicVideoFiles = await resp.json();
        console.log("背景列表已加载:", publicVideoFiles);
        
        if (publicVideoFiles.length > 0) {
            // 预加载第一个视频
            preloadNextVideo();
            
            // 启动自动切换定时器（10分钟）
            startAutoSwitchTimer();
        }
    } catch (e) {
        console.error("加载背景视频列表失败:", e);
    }
}

/**
 * preloadNextVideo: 预加载下一个视频
 */
function preloadNextVideo() {
    if (publicVideoFiles.length <= 1) return;
    
    // 随机选择下一个视频（排除当前视频）
    let nextIndex;
    do {
        nextIndex = Math.floor(Math.random() * publicVideoFiles.length);
    } while (nextIndex === currentVideoIndex && publicVideoFiles.length > 1);
    
    const nextFileName = publicVideoFiles[nextIndex];
    const videoUrl = `/static/videos/${nextFileName}?t=${Date.now()}`;
    
    // 创建隐藏的视频元素进行预加载
    cachedVideo = document.createElement('video');
    cachedVideo.src = videoUrl;
    cachedVideo.preload = 'auto'; // 自动预加载
    cachedVideo.style.display = 'none';
    document.body.appendChild(cachedVideo);
    
    console.log(`预加载视频: ${nextFileName}`);
}

/**
 * nextBackground: 切换下一个视频（无卡顿版本）
 */
function nextBackground() {
    if (publicVideoFiles.length === 0) return;

    const video = document.getElementById('bg-video');
    const source = document.getElementById('video-source');
    
    // 如果有缓存的视频，直接使用
    if (cachedVideo && cachedVideo.src) {
        // 1. 更新当前视频索引
        const cachedUrl = cachedVideo.src;
        const fileNameMatch = cachedUrl.match(/\/static\/videos\/([^?]+)/);
        if (fileNameMatch) {
            const fileName = fileNameMatch[1];
            currentVideoIndex = publicVideoFiles.indexOf(fileName);
            if (currentVideoIndex === -1) {
                // 如果找不到，使用下一个索引
                currentVideoIndex = (currentVideoIndex + 1) % publicVideoFiles.length;
            }
        }
        
        // 2. 平滑切换：先淡出当前视频
        video.style.opacity = '0';
        
        // 3. 短暂延迟后切换视频源
        setTimeout(() => {
            // 使用缓存的视频源
            source.src = cachedVideo.src;
            video.load();
            
            // 4. 播放并淡入
            video.play().then(() => {
                video.style.opacity = '1';
                console.log(`切换到视频: ${source.src.split('/').pop()}`);
                
                // 5. 清理旧的缓存视频
                if (cachedVideo && cachedVideo.parentNode) {
                    cachedVideo.parentNode.removeChild(cachedVideo);
                }
                
                // 6. 预加载下一个视频
                preloadNextVideo();
            }).catch(err => {
                console.log("播放被拦截:", err);
                video.style.opacity = '1';
            });
        }, 300); // 300ms淡出动画
    } else {
        // 没有缓存，使用原来的逻辑
        let nextIndex;
        do {
            nextIndex = Math.floor(Math.random() * publicVideoFiles.length);
        } while (nextIndex === currentVideoIndex && publicVideoFiles.length > 1);
        
        currentVideoIndex = nextIndex;
        const fileName = publicVideoFiles[currentVideoIndex];
        const videoUrl = `/static/videos/${fileName}?t=${Date.now()}`;
        
        video.style.opacity = '0';
        
        setTimeout(() => {
            video.pause();
            source.src = videoUrl;
            video.load();
            video.play().then(() => {
                video.style.opacity = '1';
                console.log(`切换到视频: ${fileName}`);
                
                // 预加载下一个视频
                preloadNextVideo();
            }).catch(err => {
                console.log("播放被拦截:", err);
                video.style.opacity = '1';
            });
        }, 300);
    }
}

/**
 * startAutoSwitchTimer: 启动自动切换定时器
 */
function startAutoSwitchTimer() {
    // 清除现有定时器
    if (autoSwitchTimer) {
        clearInterval(autoSwitchTimer);
    }
    
    // 每10分钟（600000毫秒）自动切换背景
    autoSwitchTimer = setInterval(() => {
        console.log('10分钟已到，自动切换背景');
        nextBackground();
    }, 10 * 60 * 1000); // 10分钟
    
    console.log('自动背景切换已启动，每10分钟切换一次');
}

/**
 * stopAutoSwitchTimer: 停止自动切换定时器
 */
function stopAutoSwitchTimer() {
    if (autoSwitchTimer) {
        clearInterval(autoSwitchTimer);
        autoSwitchTimer = null;
        console.log('自动背景切换已停止');
    }
}

// --- 在页面加载时启动 ---
// 找到你现有的 window.onload，确保它调用了初始化
window.addEventListener('load', () => {
    initPublicVideos(); // 获取公开视频列表
});

/**
 * toggleFullScreen: 切换网页全屏状态
 */
function toggleFullScreen() {
    if (!document.fullscreenElement &&    // 当前不在全屏
        !document.mozFullScreenElement &&
        !document.webkitFullscreenElement &&
        !document.msFullscreenElement) {

        // 进入全屏
        const docElm = document.documentElement;
        if (docElm.requestFullscreen) {
            docElm.requestFullscreen();
        } else if (docElm.mozRequestFullScreen) {
            docElm.mozRequestFullScreen();
        } else if (docElm.webkitRequestFullScreen) {
            docElm.webkitRequestFullScreen();
        } else if (docElm.msRequestFullscreen) {
            docElm.msRequestFullscreen();
        }

        document.getElementById('btn-fullscreen').innerText = "❌"; // 切换图标
    } else {
        // 退出全屏
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }

        document.getElementById('btn-fullscreen').innerText = "⛶";
    }
}

// 监听全屏变化（处理用户按 ESC 退出全屏的情况）
document.addEventListener('fullscreenchange', updateFullscreenBtn);
document.addEventListener('webkitfullscreenchange', updateFullscreenBtn);
document.addEventListener('mozfullscreenchange', updateFullscreenBtn);
document.addEventListener('MSFullscreenChange', updateFullscreenBtn);

function updateFullscreenBtn() {
    const btn = document.getElementById('btn-fullscreen');
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        btn.innerText = "❌";
    } else {
        btn.innerText = "⛶";
    }
}

function updateOrientation() {
    const isPortrait = window.innerHeight > window.innerWidth;

    if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (isPortrait) {
            // 竖屏时旋转
            document.body.style.width = '100vh';  // 宽度等于视口高度
            document.body.style.height = '100vw'; // 高度等于视口宽度
            document.body.style.transform = `translate(-50%, -50%) rotate(90deg)`;
            // 关键：强制身体充满，防止缩放导致的缝隙
            document.body.style.backgroundSize = 'cover';
        } else {
            // 横屏时恢复
            document.body.style.width = '100vw';
            document.body.style.height = '100vh';
            document.body.style.transform = 'none';
        }
        document.body.style.position = 'fixed';
        document.body.style.top = '50%';
        document.body.style.left = '50%';
    } else {
        // 重置
        document.body.style.cssText = "";
    }
}

// 修改你的 toggleFullScreen 函数，加入逻辑
async function toggleFullScreen() {
    if (!document.fullscreenElement) {
        const docElm = document.documentElement;
        try {
            if (docElm.requestFullscreen) await docElm.requestFullscreen();
            // 延时执行，等待全屏生效后计算长宽
            setTimeout(updateOrientation, 100);
        } catch (err) {
            console.error(err);
        }
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}

// 监听窗口大小变化（如旋转手机时）
window.addEventListener('resize', updateOrientation);