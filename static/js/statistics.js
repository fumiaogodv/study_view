// 学习数据统计 JavaScript

// 全局变量
let periodChart = null;
let subjectChart = null;
let subjectTrendChart = null;
let currentPeriod = 'day';
let currentSubject = '';
let startDate = null;
let endDate = null;
let allSubjects = [];

// 初始化函数
function initStatistics() {
    // 设置默认日期范围（最近30天）
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    startDate = thirtyDaysAgo.toISOString().split('T')[0];
    endDate = today.toISOString().split('T')[0];
    
    document.getElementById('startDate').value = startDate;
    document.getElementById('endDate').value = endDate;
    
    // 绑定事件
    bindEvents();
    
    // 加载数据
    loadAllData();
}

// 绑定事件
function bindEvents() {
    // 周期选择按钮
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentPeriod = this.dataset.period;
            loadPeriodData();
        });
    });
    
    // 日期范围应用按钮
    document.getElementById('applyDateRange').addEventListener('click', function() {
        startDate = document.getElementById('startDate').value;
        endDate = document.getElementById('endDate').value;
        
        if (!startDate || !endDate) {
            alert('请选择完整的日期范围');
            return;
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            alert('开始日期不能晚于结束日期');
            return;
        }
        
        loadAllData();
    });
    
    // 科目选择
    document.getElementById('subjectSelect').addEventListener('change', function() {
        currentSubject = this.value;
        if (currentSubject) {
            loadSubjectTrendData();
        } else {
            hideChart('trendLoading');
            if (subjectTrendChart) {
                subjectTrendChart.destroy();
                subjectTrendChart = null;
            }
        }
    });
}

// 加载所有数据
async function loadAllData() {
    try {
        // 加载科目列表
        await loadSubjects();
        
        // 加载统计数据
        await loadStatistics();
        
        // 加载周期数据
        await loadPeriodData();
        
        // 加载科目分布数据
        await loadSubjectDistribution();
        
        // 如果有选中的科目，加载趋势数据
        if (currentSubject) {
            await loadSubjectTrendData();
        }
        
    } catch (error) {
        console.error('加载数据失败:', error);
        alert('加载数据失败，请检查网络连接');
    }
}

// 加载科目列表
async function loadSubjects() {
    try {
        const response = await fetch(`/api/statistics/subjects?start=${startDate}&end=${endDate}`);
        const subjects = await response.json();
        
        allSubjects = subjects;
        
        const select = document.getElementById('subjectSelect');
        // 清空除第一个选项外的所有选项
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // 添加科目选项
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.name;
            option.textContent = subject.name;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('加载科目列表失败:', error);
    }
}

// 加载统计数据
async function loadStatistics() {
    try {
        const response = await fetch(`/api/statistics/summary?start=${startDate}&end=${endDate}`);
        const stats = await response.json();
        
        // 更新统计卡片
        document.getElementById('totalDuration').textContent = 
            `${(stats.total_duration_hours || 0).toFixed(1)} 小时`;
        document.getElementById('subjectCount').textContent = stats.subject_count || 0;
        document.getElementById('studyDays').textContent = stats.study_days || 0;
        
    } catch (error) {
        console.error('加载统计数据失败:', error);
    }
}

// 加载周期数据
async function loadPeriodData() {
    showChartLoading('periodLoading');
    
    try {
        const response = await fetch(
            `/api/statistics/period?period=${currentPeriod}&start=${startDate}&end=${endDate}`
        );
        const data = await response.json();
        
        hideChart('periodLoading');
        renderPeriodChart(data);
        
    } catch (error) {
        console.error('加载周期数据失败:', error);
        hideChart('periodLoading');
    }
}

// 加载科目分布数据
async function loadSubjectDistribution() {
    showChartLoading('subjectLoading');
    
    try {
        const response = await fetch(`/api/statistics/subject-distribution?start=${startDate}&end=${endDate}`);
        const data = await response.json();
        
        hideChart('subjectLoading');
        renderSubjectChart(data);
        renderSubjectList(data);
        
    } catch (error) {
        console.error('加载科目分布数据失败:', error);
        hideChart('subjectLoading');
    }
}

// 加载特定科目趋势数据
async function loadSubjectTrendData() {
    if (!currentSubject) return;
    
    showChartLoading('trendLoading');
    
    try {
        const response = await fetch(
            `/api/statistics/subject-trend?subject=${encodeURIComponent(currentSubject)}&start=${startDate}&end=${endDate}`
        );
        const data = await response.json();
        
        hideChart('trendLoading');
        renderSubjectTrendChart(data);
        
    } catch (error) {
        console.error('加载科目趋势数据失败:', error);
        hideChart('trendLoading');
    }
}

// 渲染周期图表
function renderPeriodChart(data) {
    const ctx = document.getElementById('periodChart').getContext('2d');
    
    // 销毁现有图表
    if (periodChart) {
        periodChart.destroy();
    }
    
    // 准备数据
    const labels = data.map(item => item.label);
    const durations = data.map(item => (item.duration_hours || 0).toFixed(2));
    
    // 确定周期单位
    let periodUnit = '天';
    if (currentPeriod === 'week') periodUnit = '周';
    if (currentPeriod === 'month') periodUnit = '月';
    
    periodChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `学习时长（小时/${periodUnit}）`,
                data: durations,
                backgroundColor: 'rgba(76, 175, 80, 0.6)',
                borderColor: 'rgba(76, 175, 80, 1)',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: 'rgba(255, 255, 255, 0.8)'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `学习时长: ${context.parsed.y} 小时`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        maxRotation: 45
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        callback: function(value) {
                            return value + ' 小时';
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

// 渲染科目分布图表
function renderSubjectChart(data) {
    const ctx = document.getElementById('subjectChart').getContext('2d');
    
    // 销毁现有图表
    if (subjectChart) {
        subjectChart.destroy();
    }
    
    // 准备数据
    const labels = data.map(item => item.name);
    const durations = data.map(item => item.duration_hours || 0);
    
    // 计算百分比
    const total = durations.reduce((sum, duration) => sum + duration, 0);
    const percentages = durations.map(duration => 
        total > 0 ? ((duration / total) * 100).toFixed(1) : 0
    );
    
    // 生成颜色数组
    const colors = generateColors(data.length);
    
    subjectChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: durations,
                backgroundColor: colors,
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const percentage = percentages[context.dataIndex] || 0;
                            return `${label}: ${value.toFixed(2)} 小时 (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 渲染科目趋势图表
function renderSubjectTrendChart(data) {
    const ctx = document.getElementById('subjectTrendChart').getContext('2d');
    
    // 销毁现有图表
    if (subjectTrendChart) {
        subjectTrendChart.destroy();
    }
    
    // 准备数据
    const labels = data.map(item => item.date);
    const durations = data.map(item => (item.duration_hours || 0).toFixed(2));
    
    subjectTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${currentSubject} 学习时长（小时）`,
                data: durations,
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderColor: 'rgba(76, 175, 80, 1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: 'rgba(255, 255, 255, 0.8)'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `学习时长: ${context.parsed.y} 小时`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        maxRotation: 45
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        callback: function(value) {
                            return value + ' 小时';
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

// 渲染科目列表
function renderSubjectList(data) {
    const container = document.getElementById('subjectList');
    
    // 计算总时长
    const total = data.reduce((sum, item) => sum + (item.duration_hours || 0), 0);
    
    // 生成HTML
    let html = '';
    data.forEach(item => {
        const percentage = total > 0 ? ((item.duration_hours / total) * 100).toFixed(1) : 0;
        
        html += `
            <div class="subject-item">
                <div class="subject-name">${item.name}</div>
                <div class="subject-duration">${item.duration_hours.toFixed(2)} 小时</div>
                <div class="subject-percentage">${percentage}%</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 生成颜色数组
function generateColors(count) {
    const colors = [
        'rgba(76, 175, 80, 0.8)',    // 绿色
        'rgba(33, 150, 243, 0.8)',   // 蓝色
        'rgba(255, 152, 0, 0.8)',    // 橙色
        'rgba(156, 39, 176, 0.8)',   // 紫色
        'rgba(244, 67, 54, 0.8)',    // 红色
        'rgba(0, 188, 212, 0.8)',    // 青色
        'rgba(255, 193, 7, 0.8)',    // 黄色
        'rgba(96, 125, 139, 0.8)',   // 蓝灰色
    ];
    
    // 如果需要的颜色比预设的多，生成随机颜色
    if (count > colors.length) {
        for (let i = colors.length; i < count; i++) {
            const hue = Math.floor(Math.random() * 360);
            colors.push(`hsla(${hue}, 70%, 60%, 0.8)`);
        }
    }
    
    return colors.slice(0, count);
}

// 显示图表加载状态
function showChartLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'block';
    }
}

// 隐藏图表加载状态
function hideChart(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
    }
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', initStatistics);

// 监听窗口大小变化，重新调整图表
window.addEventListener('resize', function() {
    if (periodChart) periodChart.resize();
    if (subjectChart) subjectChart.resize();
    if (subjectTrendChart) subjectTrendChart.resize();
});