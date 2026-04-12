// 学习数据统计 JavaScript

let periodChart = null;
let subjectChart = null;
let subjectTrendChart = null;
let currentPeriod = 'weekday';
let currentSubject = '';
let startDate = null;
let endDate = null;

const MODAL_TITLES = {
    period: '📊 学习时长',
    subject: '📚 科目分布',
    trend: '📈 科目按日趋势',
    list: '📋 科目明细'
};

function subjectQueryParam() {
    return currentSubject ? `&subject=${encodeURIComponent(currentSubject)}` : '';
}

function setDateRangeDays(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    startDate = start.toISOString().split('T')[0];
    endDate = end.toISOString().split('T')[0];
    document.getElementById('startDate').value = startDate;
    document.getElementById('endDate').value = endDate;
}

function initStatistics() {
    setDateRangeDays(7);

    bindEvents();
    loadAllData();
}

function bindEvents() {
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentPeriod = this.dataset.period;
            loadPeriodData();
        });
    });

    document.getElementById('applyDateRange').addEventListener('click', function () {
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

    document.querySelectorAll('.quick-date-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const days = parseInt(this.dataset.days, 10);
            if (!days || days < 1) return;
            setDateRangeDays(days);
            loadAllData();
        });
    });

    document.getElementById('subjectSelect').addEventListener('change', function () {
        currentSubject = this.value;
        loadAllData();
    });

    const modal = document.getElementById('chartModal');
    document.getElementById('chartModalClose').addEventListener('click', closeChartModal);
    document.getElementById('chartModalBackdrop').addEventListener('click', closeChartModal);

    document.querySelectorAll('.chart-open-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            openChartModal(this.dataset.openChart);
        });
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('open')) {
            closeChartModal();
        }
    });
}

function openChartModal(which) {
    const modal = document.getElementById('chartModal');
    const titleEl = document.getElementById('chartModalTitle');

    if (which === 'trend' && !currentSubject) {
        alert('请先在「科目」中选择具体科目，再查看按日趋势。');
        return;
    }

    titleEl.textContent = MODAL_TITLES[which] || '图表';

    document.querySelectorAll('.modal-chart-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(
        which === 'period' ? 'modalPanelPeriod'
            : which === 'subject' ? 'modalPanelSubject'
            : which === 'trend' ? 'modalPanelTrend'
            : 'modalPanelList'
    );
    if (panel) panel.classList.add('active');

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');

    resizeVisibleCharts();
}

function closeChartModal() {
    const modal = document.getElementById('chartModal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
}

function resizeVisibleCharts() {
    requestAnimationFrame(() => {
        setTimeout(() => {
            if (periodChart) periodChart.resize();
            if (subjectChart) subjectChart.resize();
            if (subjectTrendChart) subjectTrendChart.resize();
        }, 80);
    });
}

async function loadAllData() {
    try {
        const prevSubject = currentSubject;
        await loadSubjects();
        const select = document.getElementById('subjectSelect');
        if (prevSubject && Array.from(select.options).some(o => o.value === prevSubject)) {
            select.value = prevSubject;
            currentSubject = prevSubject;
        } else {
            select.value = '';
            currentSubject = '';
        }

        await loadStatistics();
        await loadPeriodData();
        await loadSubjectDistribution();

        if (currentSubject) {
            await loadSubjectTrendData();
        } else {
            hideChart('trendLoading');
            if (subjectTrendChart) {
                subjectTrendChart.destroy();
                subjectTrendChart = null;
            }
            const tl = document.getElementById('trendLoading');
            if (tl) {
                tl.textContent = '请选择科目后查看按日曲线';
                tl.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('加载数据失败:', error);
        alert('加载数据失败，请检查网络连接');
    }
}

async function loadSubjects() {
    try {
        const response = await fetch(`/api/statistics/subjects?start=${startDate}&end=${endDate}`);
        const subjects = await response.json();

        const select = document.getElementById('subjectSelect');
        select.innerHTML = '';
        const optAll = document.createElement('option');
        optAll.value = '';
        optAll.textContent = '全部科目（默认）';
        select.appendChild(optAll);

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

async function loadStatistics() {
    try {
        const response = await fetch(
            `/api/statistics/summary?start=${startDate}&end=${endDate}${subjectQueryParam()}`
        );
        const stats = await response.json();

        document.getElementById('totalDuration').textContent =
            `${(stats.total_duration_hours || 0).toFixed(1)} 小时`;
        document.getElementById('subjectCount').textContent = stats.subject_count || 0;
        document.getElementById('studyDays').textContent = stats.study_days || 0;
        document.getElementById('avgDailyDuration').textContent =
            `${(stats.avg_daily_hours || 0).toFixed(2)} 小时`;

        const desc = document.querySelector('#totalDuration').closest('.stat-card').querySelector('.stat-desc');
        if (desc) {
            desc.textContent = currentSubject
                ? `所选时间内科目「${currentSubject}」`
                : '所选时间段内的总学习时间';
        }
    } catch (error) {
        console.error('加载统计数据失败:', error);
    }
}

async function loadPeriodData() {
    showChartLoading('periodLoading');

    try {
        const response = await fetch(
            `/api/statistics/period?period=${currentPeriod}&start=${startDate}&end=${endDate}${subjectQueryParam()}`
        );
        const data = await response.json();

        hideChart('periodLoading');
        renderPeriodChart(data);
    } catch (error) {
        console.error('加载周期数据失败:', error);
        hideChart('periodLoading');
    }
}

async function loadSubjectDistribution() {
    showChartLoading('subjectLoading');

    try {
        const response = await fetch(
            `/api/statistics/subject-distribution?start=${startDate}&end=${endDate}${subjectQueryParam()}`
        );
        const data = await response.json();

        hideChart('subjectLoading');
        renderSubjectChart(data);
        renderSubjectList(data);
    } catch (error) {
        console.error('加载科目分布数据失败:', error);
        hideChart('subjectLoading');
    }
}

async function loadSubjectTrendData() {
    if (!currentSubject) return;

    showChartLoading('trendLoading');
    const tl = document.getElementById('trendLoading');
    if (tl) tl.textContent = '加载中...';

    try {
        const response = await fetch(
            `/api/statistics/subject-trend?subject=${encodeURIComponent(currentSubject)}&start=${startDate}&end=${endDate}`
        );
        const data = await response.json();

        if (!data.length) {
            if (subjectTrendChart) {
                subjectTrendChart.destroy();
                subjectTrendChart = null;
            }
            const tl = document.getElementById('trendLoading');
            if (tl) {
                tl.textContent = '该时间段内暂无该科目的按日记录';
                tl.style.display = 'block';
            }
            return;
        }

        hideChart('trendLoading');
        renderSubjectTrendChart(data);
    } catch (error) {
        console.error('加载科目趋势数据失败:', error);
        hideChart('trendLoading');
    }
}

function renderPeriodChart(data) {
    const ctx = document.getElementById('periodChart').getContext('2d');

    if (periodChart) {
        periodChart.destroy();
    }

    const labels = data.map(item => item.label);
    const durations = data.map(item => Number((item.duration_hours || 0).toFixed(2)));

    let periodUnit = '天';
    if (currentPeriod === 'week') periodUnit = '周';
    if (currentPeriod === 'month') periodUnit = '月';
    if (currentPeriod === 'weekday') periodUnit = '星期';

    const scope = currentSubject ? `「${currentSubject}」` : '全部科目';

    periodChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `${scope} · 学习时长（小时/${periodUnit}）`,
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
                        label: function (context) {
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
                        callback: function (value) {
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

function renderSubjectChart(data) {
    const ctx = document.getElementById('subjectChart').getContext('2d');

    if (subjectChart) {
        subjectChart.destroy();
    }

    const labels = data.map(item => item.name);
    const durations = data.map(item => item.duration_hours || 0);
    const total = durations.reduce((sum, duration) => sum + duration, 0);
    const percentages = durations.map(duration =>
        total > 0 ? ((duration / total) * 100).toFixed(1) : 0
    );
    const colors = generateColors(data.length);

    const legendPos = window.innerWidth < 640 ? 'bottom' : 'right';

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
                    position: legendPos,
                    labels: {
                        color: 'rgba(255, 255, 255, 0.8)',
                        padding: 12,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const percentage = percentages[context.dataIndex] || 0;
                            return `${label}: ${Number(value).toFixed(2)} 小时 (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderSubjectTrendChart(data) {
    const ctx = document.getElementById('subjectTrendChart').getContext('2d');

    if (subjectTrendChart) {
        subjectTrendChart.destroy();
    }

    const labels = data.map(item => item.date);
    const durations = data.map(item => Number((item.duration_hours || 0).toFixed(2)));

    subjectTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${currentSubject} · 每日时长（小时）`,
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
                        label: function (context) {
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
                        callback: function (value) {
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

function renderSubjectList(data) {
    const container = document.getElementById('subjectList');
    const total = data.reduce((sum, item) => sum + (item.duration_hours || 0), 0);

    if (!data.length) {
        container.innerHTML = '<p style="opacity:0.8;margin:0;">该条件下暂无记录</p>';
        return;
    }

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

function generateColors(count) {
    const colors = [
        'rgba(76, 175, 80, 0.8)',
        'rgba(33, 150, 243, 0.8)',
        'rgba(255, 152, 0, 0.8)',
        'rgba(156, 39, 176, 0.8)',
        'rgba(244, 67, 54, 0.8)',
        'rgba(0, 188, 212, 0.8)',
        'rgba(255, 193, 7, 0.8)',
        'rgba(96, 125, 139, 0.8)'
    ];

    if (count > colors.length) {
        for (let i = colors.length; i < count; i++) {
            const hue = Math.floor(Math.random() * 360);
            colors.push(`hsla(${hue}, 70%, 60%, 0.8)`);
        }
    }

    return colors.slice(0, count);
}

function showChartLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'block';
    }
}

function hideChart(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
    }
}

window.addEventListener('DOMContentLoaded', initStatistics);

window.addEventListener('resize', function () {
    if (periodChart) periodChart.resize();
    if (subjectChart) subjectChart.resize();
    if (subjectTrendChart) subjectTrendChart.resize();
});
