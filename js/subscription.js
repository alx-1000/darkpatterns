(() => {
  const state = { timer: false, campaign: false, emphasis: false, ad: false };
  const preview = document.getElementById('branchPreview');
  const chart = document.getElementById('branchChart');
  const finishButton = document.getElementById('finishMetricsButton');
  const overlay = document.getElementById('metricsOverlay');
  const popup = document.getElementById('metricsPopupContent');
  const closeButton = document.getElementById('closeMetricsButton');
  const draggables = [...document.querySelectorAll('.subscription-drag-item')];
  const details = {
    timer: ['タイマー', 8, -0.3, 16],
    campaign: ['キャンペーン', 12, -0.2, 11],
    emphasis: ['強調', 15, -0.5, 22],
    ad: ['広告', 10, -0.4, 20],
  };

  function metrics() {
    const active = Object.keys(state).filter((key) => state[key]);
    const result = active.reduce((total, key) => ({
      sales: total.sales + details[key][1],
      rating: total.rating + details[key][2],
      risk: total.risk + details[key][3],
    }), { sales: 100, rating: 4.7, risk: 6 });
    return { ...result, active };
  }

  function metricMarkup(data, detailed = false) {
    const rows = [['売上', `${data.sales}%`, data.sales / 1.4], ['ユーザ評価', `${data.rating.toFixed(1)} / 5`, data.rating * 20], ['炎上リスク', `${data.risk}%`, data.risk]];
    const bars = rows.map(([label, value, width]) => `<div class="subscription-metric"><label><span>${label}</span><strong>${value}</strong></label><div class="subscription-metric-track"><div class="subscription-metric-fill" style="width:${Math.min(100, width)}%;background:${scoreColor(width)}"></div></div></div>`).join('');
    const summary = data.active.length ? `追加要素: ${data.active.map((key) => details[key][0]).join('・')}。短期的には売上が伸びますが、分かりづらい表示ほど評価と信頼を損ないます。` : '初期状態です。要素を追加すると、短期的な売上とユーザ評価・炎上リスクの変化を比較できます。';
    return `<div class="subscription-metric-list">${bars}</div>${detailed ? `<p class="subscription-summary">${summary}</p>` : ''}`;
  }

  function scoreColor(value) {
    const ratio = Math.max(0, Math.min(1, value / 100));
    const start = [148, 163, 184];
    const end = [185, 28, 28];
    const color = start.map((channel, index) => Math.round(channel + ((end[index] - channel) * ratio)));
    return `rgb(${color.join(', ')})`;
  }

  function render() {
    const menu = state.emphasis ? 'overmenu.png' : 'simplemenu.png';
    preview.innerHTML = `<img class="subscription-canvas" src="../assets/images/base_umbrella.png" alt="サブスクサービスの初期画面"><div class="subscription-layer">${state.campaign ? '<img class="subscription-campaign" src="../assets/images/campaign.png" alt="">' : ''}${state.timer ? '<img class="subscription-timer" src="../assets/images/timer.png" alt="">' : ''}<img class="subscription-menu${state.timer ? ' with-timer' : ''}" src="../assets/images/${menu}" alt="プラン選択メニュー">${state.ad ? `<div class="subscription-ad${state.timer ? ' with-timer' : ''}"><img src="../assets/images/ad.png" alt="広告"></div>` : ''}</div>`;
    chart.innerHTML = metricMarkup(metrics());
    draggables.forEach((element) => { const placed = state[element.dataset.kind]; element.classList.toggle('placed', placed); element.draggable = !placed; });
  }

  draggables.forEach((element) => element.addEventListener('dragstart', (event) => { event.dataTransfer.setData('text/plain', element.dataset.kind); event.dataTransfer.effectAllowed = 'copy'; }));
  preview.addEventListener('dragover', (event) => { event.preventDefault(); preview.classList.add('drag-over'); });
  preview.addEventListener('dragleave', () => preview.classList.remove('drag-over'));
  preview.addEventListener('drop', (event) => { event.preventDefault(); preview.classList.remove('drag-over'); const kind = event.dataTransfer.getData('text/plain'); if (kind in state && !state[kind]) { state[kind] = true; render(); } });
  finishButton.addEventListener('click', () => { popup.innerHTML = metricMarkup(metrics(), true); overlay.classList.remove('hidden'); });
  closeButton.addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.addEventListener('click', (event) => { if (event.target === overlay) overlay.classList.add('hidden'); });
  render();
})();
