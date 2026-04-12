(function () {
    'use strict';

    const chartText = { color: 'rgba(255, 255, 255, 0.82)' };
    const gridColor = 'rgba(255, 255, 255, 0.1)';

    let pieChart = null;
    let lineChart = null;

    let startDate = '';
    let endDate = '';
    let granularity = 'day';
    let selectedSubject = '';

    function padRange(days) {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - (days - 1));
        startDate = start.toISOString().slice(0, 10);
        endDate = end.toISOString().slice(0, 10);
        document.getElementById('startDate').value = startDate;
        document.getElementById('endDate').value = endDate;
    }

    function chartOverlay(id, mode) {
        const el = document.getElementById(id);
        if (!el) return;
        if (mode === 'hide') {
            el.style.display = 'none';
            return;
        }
        el.style.display = 'flex';
        el.textContent = mode === 'load' ? '加载中…' : '暂无数据';
    }

    function granularityLabel() {
        if (granularity === 'week') return '按周';
        if (granularity === 'month') return '按月';
        return '按天';
    }

    function palette(n) {
        const base = [
            'rgba(129, 199, 132, 0.85)',
            'rgba(100, 181, 246, 0.85)',
            'rgba(255, 183, 77, 0.85)',
            'rgba(186, 104, 200, 0.85)',
            'rgba(239, 83, 80, 0.85)',
            'rgba(77, 208, 225, 0.85)',
            'rgba(255, 213, 79, 0.85)',
            'rgba(165, 214, 167, 0.85)',
        ];
        const out = base.slice(0, n);
        while (out.length < n) {
            const h = (out.length * 47) % 360;
            out.push(`hsla(${h}, 65%, 58%, 0.85)`);
        }
        return out;
    }

    function destroyChart(ref) {
        if (ref) ref.destroy();
        return null;
    }

    function fillSubjectSelect(options, preserve) {
        const sel = document.getElementById('subjectSelect');
        const prev = preserve ? sel.value : '';
        sel.innerHTML = '<option value="">全部</option>';
        (options || []).forEach((name) => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            sel.appendChild(opt);
        });
        if (prev && options && options.includes(prev)) {
            sel.value = prev;
            selectedSubject = prev;
        } else {
            sel.value = '';
            selectedSubject = '';
        }
    }

    function renderPie(rows) {
        const ctx = document.getElementById('chartPie').getContext('2d');
        pieChart = destroyChart(pieChart);

        if (!rows || !rows.length) return;

        const labels = rows.map((r) => r.name);
        const data = rows.map((r) => r.duration_hours || 0);
        const total = data.reduce((a, b) => a + b, 0);
        const colors = palette(labels.length);

        pieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels,
                datasets: [
                    {
                        data,
                        backgroundColor: colors,
                        borderColor: 'rgba(20, 24, 28, 0.9)',
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: window.innerWidth < 960 ? 'bottom' : 'right',
                        labels: { color: chartText.color, padding: 6, font: { size: 9 }, boxWidth: 10 },
                    },
                    tooltip: {
                        callbacks: {
                            label(ctx) {
                                const v = ctx.parsed || 0;
                                const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0';
                                return `${ctx.label}: ${Number(v).toFixed(2)} 小时 (${pct}%)`;
                            },
                        },
                    },
                },
            },
        });
    }

    function renderLine(rows, lineLabel) {
        const ctx = document.getElementById('chartLine').getContext('2d');
        lineChart = destroyChart(lineChart);

        if (!rows || !rows.length) return;

        const labels = rows.map((r) => r.label);
        const data = rows.map((r) => Number((r.duration_hours || 0).toFixed(2)));

        lineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: lineLabel,
                        data,
                        borderColor: 'rgba(129, 199, 132, 1)',
                        backgroundColor: 'rgba(129, 199, 132, 0.12)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: chartText.color },
                    },
                    tooltip: {
                        callbacks: {
                            label(ctx) {
                                return `${ctx.dataset.label}: ${ctx.parsed.y} 小时`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '时间',
                            color: chartText.color,
                            font: { size: 11 },
                        },
                        ticks: { color: chartText.color, maxRotation: 45 },
                        grid: { color: gridColor },
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '学习时长（小时）',
                            color: chartText.color,
                            font: { size: 11 },
                        },
                        ticks: {
                            color: chartText.color,
                            callback: (v) => v + ' h',
                        },
                        grid: { color: gridColor },
                    },
                },
            },
        });
    }

    function resizeCharts() {
        requestAnimationFrame(() => {
            if (lineChart) lineChart.resize();
            if (pieChart) pieChart.resize();
        });
        setTimeout(() => {
            if (lineChart) lineChart.resize();
            if (pieChart) pieChart.resize();
        }, 120);
    }

    function syncGranularityButtons() {
        document.querySelectorAll('.gran-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.getAttribute('data-granularity') === granularity);
        });
    }

    async function loadCharts() {
        chartOverlay('loadPie', 'load');
        chartOverlay('loadLine', 'load');
        pieChart = destroyChart(pieChart);
        lineChart = destroyChart(lineChart);

        const subQs = selectedSubject ? `&subject=${encodeURIComponent(selectedSubject)}` : '';

        try {
            const url =
                `/api/statistics/charts?start=${encodeURIComponent(startDate)}` +
                `&end=${encodeURIComponent(endDate)}` +
                `&granularity=${encodeURIComponent(granularity)}` +
                subQs;

            const res = await fetch(url);
            if (!res.ok) throw new Error('请求失败');
            const data = await res.json();

            if (data.granularity) granularity = data.granularity;
            syncGranularityButtons();

            fillSubjectSelect(data.subject_options || [], true);

            const pieRows = data.pie || [];
            const lineRows = data.line || [];

            const lineLabel = selectedSubject
                ? `「${selectedSubject}」时长（${granularityLabel()}）`
                : `全部科目合计（${granularityLabel()}）`;

            document.getElementById('lineSub').textContent =
                `横轴：${granularityLabel()} · 纵轴：学习时长（小时）` +
                (selectedSubject ? ` · 当前科目：${selectedSubject}` : ' · 全部科目合计');

            document.getElementById('pieSub').textContent =
                `区间 ${startDate} ~ ${endDate} · 各科总时长占比（与折线共用日期范围；切换「按天/周/月」会同时刷新两图，折线横轴随之变化）`;

            renderLine(lineRows, lineLabel);
            renderPie(pieRows);
            resizeCharts();

            chartOverlay('loadLine', lineRows.length ? 'hide' : 'empty');
            chartOverlay('loadPie', pieRows.length ? 'hide' : 'empty');
        } catch (e) {
            console.error(e);
            chartOverlay('loadLine', 'empty');
            chartOverlay('loadPie', 'empty');
            document.getElementById('loadLine').textContent = '加载失败';
            document.getElementById('loadPie').textContent = '加载失败';
            alert('加载统计失败，请稍后重试');
        }
    }

    function bind() {
        document.getElementById('btnApply').addEventListener('click', () => {
            startDate = document.getElementById('startDate').value;
            endDate = document.getElementById('endDate').value;
            if (!startDate || !endDate) {
                alert('请选择起止日期');
                return;
            }
            if (startDate > endDate) {
                alert('开始日期不能晚于结束日期');
                return;
            }
            loadCharts();
        });

        document.querySelectorAll('.quick-range .quick').forEach((btn) => {
            btn.addEventListener('click', () => {
                const d = parseInt(btn.getAttribute('data-days'), 10);
                if (d > 0) {
                    padRange(d);
                    loadCharts();
                }
            });
        });

        document.querySelectorAll('.gran-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                granularity = btn.getAttribute('data-granularity') || 'day';
                syncGranularityButtons();
                loadCharts();
            });
        });

        document.getElementById('subjectSelect').addEventListener('change', () => {
            selectedSubject = document.getElementById('subjectSelect').value;
            loadCharts();
        });

        window.addEventListener('resize', () => resizeCharts());
    }

    document.addEventListener('DOMContentLoaded', () => {
        padRange(30);
        syncGranularityButtons();
        bind();
        loadCharts();
    });
})();
