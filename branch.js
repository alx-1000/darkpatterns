    const branchState = {
      subscription: 'clear',
      price: 'original',
      ad: 'distinct',
      timer: 'off',
    };

    const branchPreview = document.getElementById('branchPreview');
    const branchMetricsContent = document.getElementById('branchMetricsContent');
    const branchSummary = document.getElementById('branchSummary');
    const branchChart = document.getElementById('branchChart');
    const branchScoreNote = document.getElementById('branchScoreNote');
    const finishMetricsButton = document.getElementById('finishMetricsButton');
    const metricsOverlay = document.getElementById('metricsOverlay');
    const metricsPopupContent = document.getElementById('metricsPopupContent');
    const closeMetricsButton = document.getElementById('closeMetricsButton');
    const timerDraggable = document.getElementById('timerDraggable');
    const discountDraggable = document.getElementById('discountDraggable');
    const COUNTDOWN_START_SECONDS = 5 * 60;
    let branchCountdownSeconds = COUNTDOWN_START_SECONDS;
    let branchCountdownTimerId = null;
    let branchCountdownFinished = false;
    let selectedPlacementWidget = null;

    function syncBranchWidgetStates(timerLabelText = 'この価格で買えるのは残り 05:00') {
      if (timerDraggable) {
        timerDraggable.classList.toggle('placed', branchState.timer === 'on');
        const timerTextNode = timerDraggable.querySelector('span:nth-child(2)');
        if (timerTextNode) {
          timerTextNode.textContent = timerLabelText;
        }
      }
      if (discountDraggable) {
        discountDraggable.classList.toggle('placed', branchState.price === 'discount');
      }
    }

    function formatCountdown(seconds) {
      const safeSeconds = Math.max(0, seconds);
      const minutes = Math.floor(safeSeconds / 60);
      const remainingSeconds = safeSeconds % 60;
      return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    function stopBranchCountdown(reset = false, finished = false) {
      if (branchCountdownTimerId !== null) {
        clearInterval(branchCountdownTimerId);
        branchCountdownTimerId = null;
      }
      if (reset) {
        branchCountdownSeconds = COUNTDOWN_START_SECONDS;
      }
      branchCountdownFinished = finished;
    }

    function getStageLevel(ratio, reverse = false) {
      if (!reverse) {
        if (ratio >= 0.78) return 'high';
        if (ratio >= 0.55) return 'mid';
        return 'low';
      }
      if (ratio <= 0.22) return 'high';
      if (ratio <= 0.45) return 'mid';
      return 'low';
    }

    function getStageWord(kind, level) {
      if (currentLanguage === 'en') {
        return { high: 'High', mid: 'Medium', low: 'Low' }[level];
      }
      if (kind === 'trust') {
        return { high: '高', mid: '中', low: '低' }[level];
      }
      return { high: '大', mid: '中', low: '小' }[level];
    }

    function computeBranchMetrics() {
      const buyers = 980
        + (branchState.subscription === 'clear' ? 90 : 15)
        + (branchState.price === 'discount' ? 70 : 12)
        + (branchState.ad === 'distinct' ? 55 : 10)
        + (branchState.timer === 'on' ? 40 : 6);
      const reputation = 4.3
        + (branchState.subscription === 'clear' ? 0.18 : 0.03)
        + (branchState.price === 'discount' ? -0.22 : 0.02)
        + (branchState.ad === 'distinct' ? 0.11 : 0.02)
        + (branchState.timer === 'on' ? -0.2 : 0.01);
      const trust = 86
        + (branchState.subscription === 'clear' ? 5 : -2)
        + (branchState.price === 'discount' ? -7 : -1)
        + (branchState.ad === 'distinct' ? 3 : 1)
        + (branchState.timer === 'on' ? -8 : 0);
      const profit = 124
        + (branchState.subscription === 'clear' ? 24 : 8)
        + (branchState.price === 'discount' ? 20 : 6)
        + (branchState.ad === 'distinct' ? 16 : 4)
        + (branchState.timer === 'on' ? 12 : 3);

      return [
        { label: t('buyersLabel'), value: buyers, max: 1400, suffix: t('buyersSuffix'), color: '#2563eb', decimals: 0, display: 'number' },
        { label: t('reputationLabel'), value: Number(reputation.toFixed(1)), max: 5, suffix: t('reputationSuffix'), color: '#16a34a', decimals: 1, display: 'stars' },
        { label: t('trustLabel'), value: trust, max: 120, suffix: t('trustSuffix'), color: '#f59e0b', decimals: 0, display: 'number' },
        { label: t('profitLabel'), value: profit, max: 220, suffix: t('profitSuffix'), color: '#8b5cf6', decimals: 0, display: 'number' },
      ];
    }

    function getMetricRatio(metric) {
      return metric.max > 0 ? Math.max(0, Math.min(1, metric.value / metric.max)) : 0;
    }

    function getResultSummary(metrics) {
      const [buyersMetric, reputationMetric, trustMetric, profitMetric] = metrics;
      const compositeScore = (
        getMetricRatio(buyersMetric) * 0.27
        + getMetricRatio(reputationMetric) * 0.25
        + getMetricRatio(trustMetric) * 0.24
        + getMetricRatio(profitMetric) * 0.24
      );
      const summaries = [
        '短期の押し出しは強いですが、信頼は少し落ちやすいです。',
        '購入者数は伸びやすく、利益も取りやすい結果です。',
        '見た目は強めでも、評価の維持には少し注意が必要です。',
        '全体としては攻めた結果で、購入意欲は上げやすいです。',
        'かなり強い訴求ですが、長期の信頼は削られやすいです。',
      ];
      const index = Math.min(summaries.length - 1, Math.max(0, Math.floor(compositeScore * summaries.length)));
      return summaries[index];
    }

    function formatMetricValue(value, decimals = 0) {
      if (decimals > 0) {
        return value.toFixed(decimals);
      }
      return Math.round(value).toLocaleString('ja-JP');
    }

    function animateMetricNumber(node) {
      const targetValue = Number(node.dataset.targetValue || '0');
      const decimals = Number(node.dataset.decimals || '0');
      const suffix = node.dataset.suffix || '';
      const duration = 900;
      const startTime = performance.now();

      const step = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentValue = targetValue * eased;
        node.textContent = `${formatMetricValue(currentValue, decimals)}${suffix}`;
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };

      node.textContent = `${formatMetricValue(0, decimals)}${suffix}`;
      requestAnimationFrame(step);
    }

    function animateBranchMetricDisplays(root) {
      root.querySelectorAll('[data-animate-number]').forEach((node) => {
        animateMetricNumber(node);
      });

      root.querySelectorAll('[data-result-bar-fill]').forEach((node) => {
        const targetScale = Number(node.dataset.targetScale || '0');
        requestAnimationFrame(() => {
          node.style.transform = `scaleY(${targetScale})`;
        });
      });

      root.querySelectorAll('[data-rating-fill]').forEach((node) => {
        const targetWidth = Number(node.dataset.targetWidth || '0');
        requestAnimationFrame(() => {
          node.style.width = `${targetWidth}%`;
        });
      });

      root.querySelectorAll('[data-trust-pie]').forEach((node) => {
        const targetProgress = Number(node.dataset.targetProgress || '0');
        requestAnimationFrame(() => {
          node.style.setProperty('--result-pie-progress', `${targetProgress}%`);
        });
      });
    }

    function buildPredictionItems(metrics) {
      const [buyersMetric, reputationMetric, trustMetric, profitMetric] = metrics;
      const buyersLevel = getStageLevel(buyersMetric.value / buyersMetric.max);
      const flameLevel = getStageLevel((120 - trustMetric.value) / 120, true);
      const trustLevel = getStageLevel(trustMetric.value / trustMetric.max);
      const profitLevel = getStageLevel(profitMetric.value / profitMetric.max);

      return [
        { label: t('buyersForecast'), stage: getStageWord('generic', buyersLevel), level: buyersLevel },
        { label: t('flameForecast'), stage: getStageWord('generic', flameLevel), level: flameLevel },
        { label: t('trustForecast'), stage: getStageWord('trust', trustLevel), level: trustLevel },
        { label: t('profitForecast'), stage: getStageWord('generic', profitLevel), level: profitLevel },
      ];
    }

    function renderBranchMetricPanels() {
      const metrics = computeBranchMetrics();
      const [buyersMetric, reputationMetric, trustMetric, profitMetric] = metrics;
      const predictionItems = buildPredictionItems(metrics);
      const predictionMarkup = `
        <div class="prediction-grid">
          ${predictionItems.map((item) => `
            <div class="prediction-item ${item.level}">
              <div>
                <div class="prediction-label">${item.label}</div>
              </div>
              <span class="prediction-pill ${item.level}">${item.stage}</span>
            </div>
          `).join('')}
        </div>
      `;
      const summaryText = getResultSummary(metrics);
      const reputationPercent = Math.max(0, Math.min(100, Math.round(getMetricRatio(reputationMetric) * 100)));
      const trustPercent = Math.max(0, Math.min(100, Math.round(getMetricRatio(trustMetric) * 100)));

      const resultMarkup = `
        <div class="result-layout">
          <div class="result-summary">
            <div class="result-summary-label">総評</div>
            <div class="result-summary-text">${summaryText}</div>
          </div>
          <div class="result-grid">
            <div class="result-column">
              <div class="result-bars-row">
                <section class="result-card result-bar-card">
                  <div class="result-card-head">
                    <h4>${buyersMetric.label}</h4>
                    <div class="result-card-sub">棒グラフ</div>
                  </div>
                  <div class="result-bar-wrap">
                    <div class="result-bar">
                      <div class="result-bar-fill buyers" data-result-bar-fill data-target-scale="${getMetricRatio(buyersMetric)}"></div>
                    </div>
                    <div class="result-bar-value" data-animate-number data-target-value="${buyersMetric.value}" data-decimals="${buyersMetric.decimals}" data-suffix="${buyersMetric.suffix}">0${buyersMetric.suffix}</div>
                  </div>
                </section>
                <section class="result-card result-bar-card">
                  <div class="result-card-head">
                    <h4>${profitMetric.label}</h4>
                    <div class="result-card-sub">棒グラフ</div>
                  </div>
                  <div class="result-bar-wrap">
                    <div class="result-bar">
                      <div class="result-bar-fill profit" data-result-bar-fill data-target-scale="${getMetricRatio(profitMetric)}"></div>
                    </div>
                    <div class="result-bar-value" data-animate-number data-target-value="${profitMetric.value}" data-decimals="${profitMetric.decimals}" data-suffix="${profitMetric.suffix}">0${profitMetric.suffix}</div>
                  </div>
                </section>
              </div>
            </div>
            <div class="result-column">
              <section class="result-card">
                <div class="result-card-head">
                  <h4>${reputationMetric.label}</h4>
                  <div class="result-card-sub">星のみ</div>
                </div>
                <div class="result-stars-wrap">
                  <div class="result-stars" aria-label="${reputationMetric.label} ${reputationMetric.value.toFixed(reputationMetric.decimals)}${reputationMetric.suffix}">
                    <span class="result-stars-base">★★★★★</span>
                    <span class="result-stars-fill" data-rating-fill data-target-width="${reputationPercent}" style="width: 0%">★★★★★</span>
                  </div>
                </div>
              </section>
              <section class="result-card">
                <div class="result-card-head">
                  <h4>${trustMetric.label}</h4>
                  <div class="result-card-sub">円グラフ</div>
                </div>
                <div class="result-trust-wrap">
                  <div class="result-pie" data-trust-pie data-target-progress="${trustPercent}" style="--result-pie-progress: 0%">
                    <div class="result-pie-center">
                      <div class="result-pie-value" data-animate-number data-target-value="${trustMetric.value}" data-decimals="${trustMetric.decimals}" data-suffix="${trustMetric.suffix}">0${trustMetric.suffix}</div>
                      <div class="result-pie-label">${trustMetric.label}</div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      `;
      branchChart.innerHTML = predictionMarkup;
      if (metricsPopupContent) {
        metricsPopupContent.innerHTML = resultMarkup;
        animateBranchMetricDisplays(metricsPopupContent);
      }
    }

    function renderBranchPreview() {
      const subscriptionVariant = branchState.subscription === 'clear' ? 'clear' : 'hidden';
      const subscriptionTextMarkup = branchState.subscription === 'clear'
        ? '⚠︎ 月1回の定期便です / 毎月15日に引き落とし'
        : '定期便';
      const timerText = branchState.timer === 'on'
        ? formatCountdown(branchCountdownSeconds)
        : '';

      if (branchState.timer === 'on') {
        if (branchCountdownTimerId === null && !branchCountdownFinished) {
          branchCountdownTimerId = setInterval(() => {
            if (branchState.timer !== 'on') {
              stopBranchCountdown(true);
              renderBranchPreview();
              return;
            }
            if (branchCountdownSeconds > 0) {
              branchCountdownSeconds -= 1;
            }
            if (branchCountdownSeconds === 0) {
              stopBranchCountdown(false, true);
            }
            renderBranchPreview();
          }, 1000);
        }
      } else {
        stopBranchCountdown(true, false);
      }

      const subscriptionMarkup = `<button type="button" class="subscription-callout ${subscriptionVariant} ${selectedPlacementWidget === 'subscription' ? 'selected' : ''}" data-role="subscription-widget" aria-label="定期便の表示を切り替える">
        <span class="subscription-change-mark">⇄</span>
        <span class="subscription-callout-text">${subscriptionTextMarkup}</span>
      </button>`;
      const timerInlineLabel = `この価格で買えるのは残り ${timerText || '05:00'}`;
      const timerInlineMarkup = branchState.timer === 'on'
        ? `<span class="timer-inline ${selectedPlacementWidget === 'timer' ? 'selected' : ''}" data-role="timer-widget">
            <span>⏱</span>
            <span>${timerInlineLabel}</span>
            ${selectedPlacementWidget === 'timer' ? '<button class="timer-remove" type="button" aria-label="削除">×</button>' : ''}
          </span>`
        : '';
      const discountInlineMarkup = branchState.price === 'discount'
        ? `<div class="promo-badge discount-inline ${selectedPlacementWidget === 'discount' ? 'selected' : ''}" data-role="discount-widget">
            <span>🏷</span>
            <span>${t('discountBadge')}</span>
            ${selectedPlacementWidget === 'discount' ? '<button type="button" class="discount-remove" aria-label="削除">×</button>' : ''}
          </div>`
        : '';

      branchPreview.innerHTML = `
        <div class="branch-preview-card">
          <div class="preview-top">
            <span class="preview-tag">${branchState.subscription === 'clear' ? t('subscriptionTag') : t('normalPurchaseTag')}</span>
            <span class="preview-subtle">${branchState.ad === 'distinct' ? t('adTag') : t('recommendedTag')}</span>
          </div>
          <h3 class="product-title">${t('productName')}</h3>
          <div class="price-row">
            <span class="price-main">${t('normalPrice')}</span>
            ${branchState.price === 'discount' ? `<span class="price-original">${t('originalPrice')}</span>` : ''}
            ${discountInlineMarkup}
            ${timerInlineMarkup}
          </div>
          ${subscriptionMarkup}
          <div class="promo-badges"></div>
          <button class="preview-cta">${t('purchaseButton')}</button>
        </div>
      `;

      syncBranchWidgetStates(timerInlineLabel);
    }

    if (timerDraggable) {
      timerDraggable.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', 'timer');
        event.dataTransfer.effectAllowed = 'copy';
      });
    }
    if (discountDraggable) {
      discountDraggable.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', 'discount');
        event.dataTransfer.effectAllowed = 'copy';
      });
    }

    branchPreview.addEventListener('dragover', (event) => {
      event.preventDefault();
      branchPreview.classList.add('drag-over');
    });

    branchPreview.addEventListener('dragleave', () => {
      branchPreview.classList.remove('drag-over');
    });

    branchPreview.addEventListener('drop', (event) => {
      event.preventDefault();
      branchPreview.classList.remove('drag-over');
      const droppedType = event.dataTransfer.getData('text/plain');
      if (droppedType === 'timer') {
        branchState.timer = 'on';
        selectedPlacementWidget = null;
        renderBranchPreview();
      }
      if (droppedType === 'discount') {
        branchState.price = 'discount';
        selectedPlacementWidget = null;
        renderBranchPreview();
      }
    });

    branchPreview.addEventListener('click', (event) => {
      const widget = event.target.closest('[data-role="timer-widget"], [data-role="discount-widget"], [data-role="subscription-widget"]');
      if (!widget) {
        const clickedInsidePreview = event.target.closest('.branch-preview-card, .branch-preview');
        const clickedInteractiveElement = event.target.closest('button, a, input, textarea, select');
        if (clickedInsidePreview && !clickedInteractiveElement) {
          selectedPlacementWidget = null;
          renderBranchPreview();
        }
        return;
      }
      const widgetType = widget.dataset.role === 'discount-widget'
        ? 'discount'
        : widget.dataset.role === 'subscription-widget'
          ? 'subscription'
          : 'timer';
      if (event.target.closest('.timer-remove, .discount-remove')) {
        if (widgetType === 'timer') {
          branchState.timer = 'off';
        } else if (widgetType === 'discount') {
          branchState.price = 'original';
        } else {
          branchState.timer = 'off';
        }
        selectedPlacementWidget = null;
        renderBranchPreview();
        return;
      }
      if (widgetType === 'subscription') {
        if (event.target.closest('.subscription-change-mark')) {
          branchState.subscription = branchState.subscription === 'clear' ? 'hidden' : 'clear';
          selectedPlacementWidget = 'subscription';
          renderBranchPreview();
          return;
        }
        selectedPlacementWidget = 'subscription';
        renderBranchPreview();
        return;
      }
      selectedPlacementWidget = widgetType;
      renderBranchPreview();
    });

    finishMetricsButton.addEventListener('click', () => {
      renderBranchMetricPanels();
      metricsOverlay.classList.remove('hidden');
    });

    closeMetricsButton.addEventListener('click', () => {
      metricsOverlay.classList.add('hidden');
    });

    metricsOverlay.addEventListener('click', (event) => {
      if (event.target === metricsOverlay) {
        metricsOverlay.classList.add('hidden');
      }
    });

    document.querySelectorAll('.branch-options').forEach((group) => {
      group.addEventListener('click', (event) => {
        const button = event.target.closest('.branch-option');
        if (!button) return;
        const key = group.dataset.key;
        branchState[key] = button.dataset.value;
        group.querySelectorAll('.branch-option').forEach((option) => option.classList.toggle('active', option === button));
        renderBranchPreview();
      });
    });

    renderBranchPreview();
    syncBranchWidgetStates();
