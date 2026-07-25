(() => {
  const contractState = { timer: false, campaign: false, emphasis: false, ad: false, cancel: false };
  const cancellationState = { plans: false, benefit: false, virus: false, removeStep: false, removeCaution: false };
  const preview = document.getElementById('branchPreview');
  const chart = document.getElementById('branchChart');
  const optionPanel = document.getElementById('subscriptionOptions');
  const finishButton = document.getElementById('finishMetricsButton');
  const overlay = document.getElementById('metricsOverlay');
  const popup = document.getElementById('metricsPopupContent');
  const closeButton = document.getElementById('closeMetricsButton');
  const screenToggleButton = document.getElementById('screenToggleButton');
  let screen = 'contract';
  let cancellationVisited = false;

  const contractDetails = {
    timer: ['タイマー', 8, -0.3, 8], campaign: ['キャンペーン', 12, -0.2, 5], emphasis: ['強調', 15, -0.5, 11], ad: ['広告', 10, -0.4, 10], cancel: ['解約をわかりにくくする', 5, -0.6, 12],
  };
  const cancellationDetails = {
    plans: ['プラン変更', 8, -0.2, 5], benefit: ['特典', 12, -0.3, 8], virus: ['広告', 10, -0.5, 12], removeStep: ['進行バーの削除', 5, -0.4, 10], removeCaution: ['注意の削除', 6, -0.5, 13],
  };

  function currentState() { return screen === 'contract' ? contractState : cancellationState; }
  function currentDetails() { return screen === 'contract' ? contractDetails : cancellationDetails; }

  function optionMarkup() {
    if (screen === 'contract') {
      return `<h2>カスタマイズ</h2>
        <section>オプション1: タイマー</section><div class="item subscription-drag-item" data-kind="timer" draggable="true"><img src="../assets/images/timer.png" alt="タイマー"></div>
        <section>オプション2: キャンペーン</section><div class="item subscription-drag-item" data-kind="campaign" draggable="true"><img src="../assets/images/campaign.png" alt="キャンペーン"></div>
        <section>オプション3: 強調</section><div class="item subscription-drag-item" data-kind="emphasis" draggable="true"><img src="../assets/images/overmenu.png" alt="強調されたメニュー"></div>
        <section>オプション4: 広告</section><div class="item subscription-drag-item" data-kind="ad" draggable="true"><img src="../assets/images/ad.png" alt="広告"></div>
        <section>オプション5: 解約をわかりにくくする</section><div class="item subscription-drag-item subscription-cancel-sample" data-kind="cancel" draggable="true"><span>解約は<a>こちら</a>から</span></div>
        <button type="button" class="branch-reset-button" data-reset>リセット</button>`;
    }
    return `<h2>カスタマイズ</h2>
      <section>オプション1: 特典</section><div class="item subscription-drag-item" data-kind="benefit" draggable="true"><img src="../assets/images/benefit.png" alt="特典"></div>
      <section>オプション2: プラン変更</section><div class="item subscription-drag-item" data-kind="plans" draggable="true"><img src="../assets/images/plans.png" alt="プラン変更"></div>
      <section>オプション3: 広告</section><div class="item subscription-drag-item" data-kind="virus" draggable="true"><img src="../assets/images/virus.png" alt="広告"></div>
      <section>オプション4: 進行バーの削除</section><div class="item subscription-drag-item cancellation-remove-sample" data-kind="removeStep" draggable="true"><img src="../assets/images/step.png" alt="進行バー"><span class="remove-cross" aria-hidden="true"></span></div>
      <section>オプション5: 注意の削除</section><div class="item subscription-drag-item cancellation-remove-sample" data-kind="removeCaution" draggable="true"><img src="../assets/images/caution.png" alt="解約時の注意"><span class="remove-cross" aria-hidden="true"></span></div>
      <button type="button" class="branch-reset-button" data-reset>リセット</button>`;
  }

  function metrics() {
    const active = [
      ...Object.keys(contractState).filter((key) => contractState[key]).map((key) => ({ key, detail: contractDetails[key] })),
      ...Object.keys(cancellationState).filter((key) => cancellationState[key]).map((key) => ({ key, detail: cancellationDetails[key] })),
    ];
    const result = active.reduce((total, item) => ({
      rating: total.rating + item.detail[2],
      risk: total.risk + item.detail[3],
    }), { rating: 4.7, risk: 6 });
    return {
      subscribers: Math.min(500, 10 + (active.length * 49)),
      salesYen: Math.min(2000000, 25000 + (active.length * 197500)),
      rating: Math.max(1, result.rating),
      risk: Math.min(100, result.risk),
      active,
    };
  }

  function scoreColor(value) {
    const ratio = Math.max(0, Math.min(1, value / 100));
    const start = [148, 163, 184], end = [185, 28, 28];
    return `rgb(${start.map((channel, index) => Math.round(channel + ((end[index] - channel) * ratio))).join(', ')})`;
  }

  function metricMarkup(data, detailed = false) {
    const subscriberPercent = data.subscribers / 5;
    const salesPercent = data.salesYen / 20000;
    const ratingPercent = data.rating * 20;
    const personIcon = '<svg class="subscription-person-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="6" r="4"></circle><path d="M5 22c0-4 3.1-8 7-8s7 4 7 8H5z"></path></svg>';
    const subscriberIcons = personIcon.repeat(10);
    const subscriberRow = personIcon.repeat(5);
    const subscriberFirstRow = Math.min(100, subscriberPercent * 2);
    const subscriberSecondRow = Math.max(0, (subscriberPercent - 50) * 2);
    const coinIcon = '<svg class="subscription-result-large-icon" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42"></circle><circle cx="50" cy="50" r="31" fill="none" stroke="currentColor" stroke-width="5"></circle><text x="50" y="65" text-anchor="middle" fill="#fff" font-size="52" font-weight="800">C</text></svg>';
    const flameIcon = '<svg class="subscription-result-large-icon" viewBox="0 0 100 100" aria-hidden="true"><path d="M52 5C56 28 31 33 31 57c0 18 13 33 31 33s31-13 31-31c0-21-16-33-25-45 2 18-5 28-16 35 2-15-9-25 0-44z"></path></svg>';
    const stars = '★★★★★';
    const bar = (label, value, percent) => `<div class="subscription-metric"><label><span>${label}</span><strong>${value}</strong></label><div class="subscription-metric-track"><div class="subscription-metric-fill" style="width:${Math.min(100, percent)}%;background:${scoreColor(percent)}"></div></div></div>`;
    const subscribers = `<div class="subscription-metric"><label><span>登録者数</span><strong>${data.subscribers}人</strong></label><div class="subscription-icon-scale" aria-label="登録者数 ${data.subscribers}人"><span class="subscription-icon-base">${subscriberIcons}</span><span class="subscription-icon-fill" style="width:${subscriberPercent}%;color:${scoreColor(subscriberPercent)}">${subscriberIcons}</span></div></div>`;
    const rating = `<div class="subscription-metric"><label><span>ユーザ評価</span><strong>${data.rating.toFixed(1)} / 5</strong></label><div class="subscription-star-scale" aria-label="ユーザ評価 ${data.rating.toFixed(1)} / 5"><span class="subscription-star-base">${stars}</span><span class="subscription-star-fill" style="width:${ratingPercent}%;color:${ratingColor(data.rating)}">${stars}</span></div></div>`;
    const summary = data.active.length ? `追加要素: ${data.active.map((item) => item.detail[0]).join('・')}。短期的には売上が伸びますが、分かりづらい表示ほど評価と信頼を損ないます。` : '初期状態です。要素を追加すると、短期的な売上とユーザ評価・炎上リスクの変化を比較できます。';
    const resultSummary = getResultSummary(data);
    const reviews = getResultReviews(data);
    if (!detailed) {
      return `<div class="subscription-metric-list">${subscribers}${bar('売上', formatYen(data.salesYen), salesPercent)}${rating}${bar('炎上リスク', `${data.risk}点`, data.risk)}</div>`;
    }
    return `<section class="subscription-result-summary"><h4>総評</h4><p>${resultSummary}</p></section><div class="subscription-result-grid">
      <section class="result-card subscription-result-card"><div class="result-card-head"><h4>登録者数</h4></div><div class="subscription-result-subscriber-wrap"><div class="subscription-result-subscriber-scale" aria-label="登録者数 ${data.subscribers}人"><span class="subscription-result-subscriber-row"><span class="subscription-result-subscriber-base">${subscriberRow}</span><span class="subscription-result-subscriber-fill" data-result-icon-fill data-target-width="${subscriberFirstRow}" style="color:${scoreColor(subscriberPercent)};width:0">${subscriberRow}</span></span><span class="subscription-result-subscriber-row"><span class="subscription-result-subscriber-base">${subscriberRow}</span><span class="subscription-result-subscriber-fill" data-result-icon-fill data-target-width="${subscriberSecondRow}" style="color:${scoreColor(subscriberPercent)};width:0">${subscriberRow}</span></span></div><div class="result-bar-value">${data.subscribers}人</div></div></section>
      <section class="result-card subscription-result-card"><div class="result-card-head"><h4>売上</h4></div><div class="subscription-result-large-icon-wrap"><div class="subscription-result-large-icon-scale"><span class="subscription-result-large-icon-base">${coinIcon}</span><span class="subscription-result-large-icon-fill coin" data-result-vertical-icon-fill data-target-height="${salesPercent}" style="height:0">${coinIcon}</span></div><div class="result-bar-value">${formatYen(data.salesYen)}</div></div></section>
      <section class="result-card"><div class="result-card-head"><h4>ユーザ評価</h4></div><div class="result-stars-wrap"><div class="result-stars" aria-label="ユーザ評価 ${data.rating.toFixed(1)} / 5"><span class="result-stars-base">${stars}</span><span class="result-stars-fill" data-result-star-fill data-target-width="${ratingPercent}" style="width:0;color:${ratingColor(data.rating)}">${stars}</span></div><div class="result-bar-value">${data.rating.toFixed(1)} / 5</div></div></section>
      <section class="result-card subscription-result-card"><div class="result-card-head"><h4>炎上リスク</h4></div><div class="subscription-result-large-icon-wrap"><div class="subscription-result-large-icon-scale"><span class="subscription-result-large-icon-base">${flameIcon}</span><span class="subscription-result-large-icon-fill flame" data-result-vertical-icon-fill data-target-height="${data.risk}" style="height:0">${flameIcon}</span></div><div class="result-bar-value">${data.risk}点</div></div></section>
    </div><section class="result-card subscription-result-review"><div class="result-card-head"><h4>登録者レビュー</h4><span class="result-card-sub">${reviews.length}件</span></div><div class="result-reviews">${reviews.map((review) => `<article class="review-item"><div class="review-item-head"><div><div class="review-stars" aria-label="${review.stars}/5">${'★'.repeat(review.stars)}${'☆'.repeat(5 - review.stars)}</div><div class="review-meta">${review.author} ・ ${review.date}</div></div><div class="review-score">${review.stars}.0</div></div><div class="review-title">${review.title}</div><p class="review-body">${review.body}</p></article>`).join('')}</div></section>`;
  }

  function getResultSummary(data) {
    const labels = data.active.map((item) => item.detail[0]);
    if (!labels.length) return '分かりやすい導線を保った初期設定です。売上は控えめですが、ユーザーからの信頼と長期的な利用継続が見込めます。';
    const applied = labels.join('・');
    if (data.risk >= 70) return `${applied}によって短期売上と登録者数は大きく伸びています。一方で、利用者の不満が積み重なり、評価の低下と炎上がブランドを傷つける状態です。`;
    if (data.risk >= 35) return `${applied}により成果は伸びていますが、導線の分かりにくさを指摘する声も増え始めています。売上とユーザー体験のバランスに注意が必要です。`;
    return `${applied}によって指標は上向いています。現時点の不満は限定的ですが、表示の分かりやすさを保つことが長期的な信頼につながります。`;
  }

  function getResultReviews(data) {
    const keys = new Set(data.active.map((item) => item.key));
    const stars = Math.max(1, Math.min(5, Math.round(data.rating)));
    const clampStars = (value) => Math.max(1, Math.min(5, value));
    const reviews = [];
    if (keys.has('cancel')) reviews.push({ stars: clampStars(stars - 2), title: '解約場所が見つからない', body: '手続きをしたいのに入口が目立たず、かなり探しました。もっと分かりやすくしてほしいです。' });
    if (keys.has('ad') || keys.has('virus')) reviews.push({ stars: clampStars(stars - 1), title: '広告が操作の邪魔', body: '画面上の広告が目に入り続けて、必要な操作に集中できませんでした。' });
    if (keys.has('timer')) reviews.push({ stars: clampStars(stars - 1), title: '急かされている感じがする', body: '残り時間の表示で考える余裕がなく、安心して選べませんでした。' });
    if (keys.has('removeStep') || keys.has('removeCaution')) reviews.push({ stars: clampStars(stars - 2), title: '手続きの状況が分かりにくい', body: 'どの段階にいるのか、注意事項を見落としていないか不安になりました。' });
    if (keys.has('plans') || keys.has('benefit')) reviews.push({ stars: clampStars(stars - 1), title: '解約前の案内が長い', body: '別プランや特典の提案が続き、解約手続きに進むまで少し疲れました。' });
    if (keys.has('campaign') || keys.has('emphasis')) reviews.push({ stars: clampStars(stars - 1), title: '表示が少し強すぎる', body: '強調表示が多く、何を基準に選べばよいか迷いました。' });
    if (!reviews.length) reviews.push({ stars: 5, title: '分かりやすく選べた', body: '必要な情報が整理されていて、安心して手続きを進められました。' }, { stars: 4, title: '迷わず利用できた', body: '画面の流れが自然で、必要な手続きをスムーズに終えられました。' });
    reviews.push({ stars: clampStars(stars + 1), title: '基本的には使いやすい', body: data.rating >= 4 ? '手順が自然で、迷わず利用できました。' : '便利なサービスですが、表示の意図が少し分かりにくいです。' });
    const dates = ['2026/07/26', '2026/07/25', '2026/07/24', '2026/07/23'];
    const distributions = data.rating >= 3.5 ? null
      : data.rating >= 2.5 ? [2, 3, 2, 3]
        : data.rating >= 1.75 ? [1, 2, 2, 3]
          : data.rating >= 1.25 ? [1, 2, 1, 2]
            : [1, 1, 1, 2];
    return reviews.slice(0, 4).map((review, index) => ({
      ...review,
      stars: distributions?.[index] ?? review.stars,
      author: '登録者',
      date: dates[index],
    }));
  }

  function animateResultDisplays(root) {
    root.querySelectorAll('[data-result-icon-fill], [data-result-star-fill]').forEach((node) => {
      requestAnimationFrame(() => { node.style.width = `${node.dataset.targetWidth}%`; });
    });
    root.querySelectorAll('[data-result-bar-fill]').forEach((node) => {
      requestAnimationFrame(() => { node.style.transform = `scaleY(${node.dataset.targetScale})`; });
    });
    root.querySelectorAll('[data-result-vertical-icon-fill]').forEach((node) => {
      requestAnimationFrame(() => { node.style.height = `${node.dataset.targetHeight}%`; });
    });
  }

  function formatYen(yen) {
    return `${Math.floor(yen / 10000)}万${Math.floor((yen % 10000) / 1000)}千円`;
  }

  function ratingColor(rating) {
    const ratio = Math.max(0, Math.min(1, (5 - rating) / 4));
    const yellow = [245, 158, 11], red = [185, 28, 28];
    return `rgb(${yellow.map((channel, index) => Math.round(channel + ((red[index] - channel) * ratio))).join(', ')})`;
  }

  function contractMarkup() {
    const menu = contractState.emphasis ? 'overmenu.png' : 'simplemenu.png';
    return `<img class="subscription-canvas" src="../assets/images/base_umbrella.png" alt="契約画面"><div class="subscription-layer">${contractState.campaign ? '<img class="subscription-campaign" src="../assets/images/campaign.png" alt="">' : ''}${contractState.timer ? '<img class="subscription-timer" src="../assets/images/timer.png" alt="">' : ''}<img class="subscription-menu${contractState.timer ? ' with-timer' : ''}" src="../assets/images/${menu}" alt="プラン選択メニュー">${contractState.cancel ? '<p class="subscription-cancel-link">解約は<a href="#">こちら</a>から</p>' : '<img class="subscription-cancel-button" src="../assets/images/cancel.png" alt="解約">'}${contractState.ad ? `<div class="subscription-ad${contractState.timer ? ' with-timer' : ''}"><img src="../assets/images/ad.png" alt="広告"></div>` : ''}</div>`;
  }

  function cancellationMarkup() {
    const insertions = Number(cancellationState.plans) + Number(cancellationState.benefit);
    return `<img class="subscription-canvas" src="../assets/images/base_cancellation.png" alt="解約画面"><div class="subscription-layer cancellation-layer insertions-${insertions}">${cancellationState.virus ? '<img class="cancellation-virus" src="../assets/images/virus.png" alt="広告">' : ''}${cancellationState.removeStep ? '' : '<img class="cancellation-step" src="../assets/images/step.png" alt="進行バー">'}${cancellationState.benefit ? '<img class="cancellation-benefit" src="../assets/images/benefit.png" alt="特典">' : ''}${cancellationState.plans ? `<img class="cancellation-plans${cancellationState.benefit ? ' after-benefit' : ''}" src="../assets/images/plans.png" alt="プラン変更">` : ''}<img class="cancellation-reason" src="../assets/images/reason.png" alt="解約理由">${cancellationState.removeCaution ? '' : '<img class="cancellation-caution" src="../assets/images/caution.png" alt="解約時の注意">'}</div>`;
  }

  function syncOptionStates() {
    const state = currentState();
    optionPanel.querySelectorAll('.subscription-drag-item').forEach((element) => { const placed = state[element.dataset.kind]; element.classList.toggle('placed', placed); element.draggable = !placed; });
  }

  function render() {
    preview.innerHTML = screen === 'contract' ? contractMarkup() : cancellationMarkup();
    optionPanel.innerHTML = optionMarkup();
    screenToggleButton.textContent = screen === 'contract' ? '解約画面の設定へ' : '契約画面の設定へ';
    finishButton.disabled = !cancellationVisited;
    chart.innerHTML = metricMarkup(metrics());
    syncOptionStates();
  }

  optionPanel.addEventListener('dragstart', (event) => {
    const item = event.target.closest('.subscription-drag-item');
    if (!item || item.classList.contains('placed')) return;
    event.dataTransfer.setData('text/plain', item.dataset.kind);
    event.dataTransfer.effectAllowed = 'copy';
  });
  optionPanel.addEventListener('click', (event) => {
    if (event.target.closest('[data-reset]')) { Object.keys(currentState()).forEach((key) => { currentState()[key] = false; }); render(); return; }
    const item = event.target.closest('.subscription-drag-item');
    if (item && currentState()[item.dataset.kind]) { currentState()[item.dataset.kind] = false; render(); }
  });
  preview.addEventListener('dragover', (event) => { event.preventDefault(); preview.classList.add('drag-over'); });
  preview.addEventListener('dragleave', () => preview.classList.remove('drag-over'));
  preview.addEventListener('drop', (event) => { event.preventDefault(); preview.classList.remove('drag-over'); const kind = event.dataTransfer.getData('text/plain'); const state = currentState(); if (kind in state && !state[kind]) { state[kind] = true; render(); } });
  finishButton.addEventListener('click', () => { popup.innerHTML = metricMarkup(metrics(), true); overlay.classList.remove('hidden'); animateResultDisplays(popup); });
  closeButton.addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.addEventListener('click', (event) => { if (event.target === overlay) overlay.classList.add('hidden'); });
  screenToggleButton.addEventListener('click', () => { screen = screen === 'contract' ? 'cancellation' : 'contract'; if (screen === 'cancellation') cancellationVisited = true; render(); });
  render();
})();
