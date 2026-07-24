    const branchState = {
      subscription: 'subscription',
      price: 'original',
      ad: 'distinct',
      timer: 'off',
      purchaseNotice: false,
      subscriptionSwitch: false,
      intrusiveAd: false,
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
    let purchaseModeAutoRevertTimerId = null;
    let purchaseModeAutoRevertConsumed = false;

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
      const purchaseNoticeDraggable = document.getElementById('purchaseNoticeDraggable');
      if (purchaseNoticeDraggable) {
        purchaseNoticeDraggable.classList.toggle('placed', branchState.purchaseNotice);
      }
      const subscriptionSwitchDraggable = document.getElementById('subscriptionSwitchDraggable');
      if (subscriptionSwitchDraggable) {
        subscriptionSwitchDraggable.classList.toggle('placed', branchState.subscriptionSwitch);
      }
      const intrusiveAdDraggable = document.getElementById('intrusiveAdDraggable');
      if (intrusiveAdDraggable) {
        intrusiveAdDraggable.classList.toggle('placed', branchState.intrusiveAd);
      }
    }

    function clearPurchaseModeAutoRevertTimer() {
      if (purchaseModeAutoRevertTimerId !== null) {
        clearTimeout(purchaseModeAutoRevertTimerId);
        purchaseModeAutoRevertTimerId = null;
      }
    }

    function setPurchaseMode(mode, shouldScheduleAutoRevert = false) {
      clearPurchaseModeAutoRevertTimer();
      branchState.subscription = mode;
      if (mode === 'one-time' && shouldScheduleAutoRevert && !purchaseModeAutoRevertConsumed) {
        purchaseModeAutoRevertTimerId = setTimeout(() => {
          purchaseModeAutoRevertTimerId = null;
          purchaseModeAutoRevertConsumed = true;
          branchState.subscription = 'subscription';
          renderBranchPreview();
        }, 10000);
      }
    }

    function formatTodayPurchasedMessage(count) {
      return currentLanguage === 'en'
        ? `${count} people bought today!`
        : `今日 ${count} 人が購入しました！`;
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
      const implementationCount = getImplementationCount();
      const buyers = 980
        + (branchState.subscription === 'subscription' ? 12 : 24)
        + (branchState.price === 'discount' ? 22 : 6)
        + (branchState.purchaseNotice ? 70 : 0)
        + (branchState.subscriptionSwitch ? 60 : 0)
        + (branchState.intrusiveAd ? 48 : 0)
        + (branchState.timer === 'on' ? 34 : 5)
        + (branchState.subscriptionSwitch && branchState.subscription === 'one-time' ? 18 : 0);
      const reputation = 4.3
        - (implementationCount * 0.18)
        - (branchState.subscriptionSwitch && branchState.subscription === 'one-time' ? 0.15 : 0)
        - (branchState.price === 'discount' ? 0.08 : 0);
      const trust = 86
        - (implementationCount * 6)
        - (branchState.subscriptionSwitch && branchState.subscription === 'one-time' ? 5 : 0)
        - (branchState.price === 'discount' ? 4 : 0)
        + (branchState.ad === 'distinct' ? 2 : -2);
      const profit = 72
        + Math.round(buyers * 0.08)
        - (implementationCount * 2)
        - (branchState.subscriptionSwitch && branchState.subscription === 'one-time' ? 2 : 0)
        - (branchState.price === 'discount' ? 1 : 0)
        + (branchState.ad === 'distinct' ? 2 : 0);

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
        (1 - getMetricRatio(reputationMetric)) * 0.28
        + (1 - getMetricRatio(trustMetric)) * 0.34
        + (1 - getMetricRatio(profitMetric)) * 0.18
        + getMetricRatio(buyersMetric) * 0.2
      );
      const summaries = [
        'まだ軽い段階ですが、違和感はすでに出始めています。',
        '短期の購入は伸びますが、信頼は目に見えて削れます。',
        '演出が増えるほど、評価と継続率はかなり危うくなります。',
        '強引さが前面に出て、長期のブランド価値は落ちやすいです。',
        'ダークパターンが濃く、スコアはかなり低い状態です。',
      ];
      const index = Math.min(summaries.length - 1, Math.max(0, Math.floor(compositeScore * summaries.length)));
      return summaries[index];
    }

    function getImplementationCount() {
      return [
        branchState.timer === 'on',
        branchState.price === 'discount',
        branchState.purchaseNotice,
        branchState.subscriptionSwitch,
        branchState.intrusiveAd,
        branchState.subscriptionSwitch && branchState.subscription === 'one-time',
      ].filter(Boolean).length;
    }

    function buildReviewEntries(metrics) {
      const [, reputationMetric, trustMetric] = metrics;
      const implementationCount = getImplementationCount();
      const reputationRatio = getMetricRatio(reputationMetric);
      const trustRatio = getMetricRatio(trustMetric);
      const intensePattern = implementationCount >= 5 || reputationRatio < 0.35 || trustRatio < 0.4;
      const badPattern = implementationCount >= 3 || reputationRatio < 0.62 || trustRatio < 0.66;
      const mixedPattern = implementationCount >= 2 || reputationRatio < 0.82 || trustRatio < 0.82;
      const language = currentLanguage === 'en' ? 'en' : 'ja';

      const reviewPools = {
        ja: {
          excellent: [
            { stars: 5, title: '梱包も丁寧で安心でした', body: '説明どおりの商品で、届くまでの流れも分かりやすかったです。定期便の案内も明確で、気持ちよく買い物できました。', author: '購入者', date: '2026/07/20' },
            { stars: 5, title: '想像以上に満足', body: '値段に対して内容がしっかりしていて、無駄な押し売り感もありませんでした。家族にも勧めやすいです。', author: '購入者', date: '2026/07/19' },
            { stars: 5, title: '見やすくて買いやすい', body: '注文画面がシンプルで、必要な情報だけが自然にまとまっていました。初めてでも迷わず購入できました。', author: '購入者', date: '2026/07/18' },
            { stars: 5, title: 'また買いたいです', body: '発送も早く、問い合わせへの返答も丁寧でした。余計な表示が少なく、安心感のあるショップだと思います。', author: '購入者', date: '2026/07/17' },
            { stars: 5, title: '期待以上でした', body: '商品の品質だけでなく、表示や案内も誠実で好印象でした。友人にもすすめたいと思える内容です。', author: '購入者', date: '2026/07/16' },
          ],
          mixed: [
            { stars: 4, title: '商品は良いが少し気になる', body: '使い心地は満足ですが、案内がやや強めに感じる部分がありました。もう少し落ち着いた表示だとさらに良いです。', author: '購入者', date: '2026/07/20' },
            { stars: 4, title: '概ね満足', body: '届いた商品には満足しています。定期便の説明がもう少し分かりやすければ、もっと安心して買えたと思います。', author: '購入者', date: '2026/07/19' },
            { stars: 3, title: '便利だけど少し不安', body: '内容は悪くないのですが、急かされるような表示が多くて落ち着いて選べませんでした。購入前の確認は必須です。', author: '購入者', date: '2026/07/18' },
            { stars: 4, title: '価格と品質は悪くない', body: '商品そのものは良かったです。ただ、見せ方が少し強いので、人によっては警戒するかもしれません。', author: '購入者', date: '2026/07/17' },
            { stars: 3, title: '表示がやや分かりづらい', body: '届いたあとに確認したら、思っていたより説明が細かくて少し戸惑いました。購入前にしっかり読んだ方がいいです。', author: '購入者', date: '2026/07/16' },
          ],
          bad: [
            { stars: 2, title: '定期便の表示が分かりにくい', body: '一回だけ買うつもりでしたが、あとから定期便だと気づいて驚きました。注文前にもっと分かりやすくしてほしいです。', author: '購入者', date: '2026/07/20' },
            { stars: 1, title: '騙された気分です', body: '購入ボタンばかり目立っていて、定期便の説明を見落としました。解約の導線も分かりづらく、かなり不満です。', author: '購入者', date: '2026/07/19' },
            { stars: 2, title: '強引な見せ方が気になる', body: 'レビュー風の表示で安心したのに、実際は案内が多くて混乱しました。普通の買い物のつもりだったので残念です。', author: '購入者', date: '2026/07/18' },
            { stars: 1, title: '勝手に定期便になっていた', body: '注文後に明細を見て気づきました。定期便の説明が目立たず、解約方法も分かりにくいのでおすすめできません。', author: '購入者', date: '2026/07/17' },
            { stars: 2, title: 'クレームを入れたいレベル', body: '表示が紛らわしく、購入したのに安心できませんでした。問い合わせても分かりにくく、かなりストレスが残りました。', author: '購入者', date: '2026/07/16' },
          ],
          critical: [
            { stars: 1, title: '完全に騙された', body: '普通の買い切りだと思って注文したら、実際は定期便でした。説明が見つけにくく、かなり悪質だと感じました。', author: '購入者', date: '2026/07/20' },
            { stars: 1, title: '解約が面倒すぎる', body: '勝手に定期便に入れられたように感じます。解約ページも分かりにくく、買い物としては最悪でした。', author: '購入者', date: '2026/07/19' },
            { stars: 1, title: '二度と買いません', body: '星1も付けたくないです。購入前の表示が分かりづらく、問い合わせてもたらい回しで不快でした。', author: '購入者', date: '2026/07/18' },
            { stars: 1, title: 'だまし要素が多すぎる', body: 'タイマーやおすすめ表示で急かされ、内容を冷静に確認できませんでした。届いてから後悔する典型例です。', author: '購入者', date: '2026/07/17' },
            { stars: 1, title: 'クレーム案件です', body: '定期便の有無が分かりにくく、返品や解約の説明も不親切でした。こんな売り方は信頼できません。', author: '購入者', date: '2026/07/16' },
          ],
        },
        en: {
          excellent: [
            { stars: 5, title: 'Careful packaging and reassuring', body: 'The product matched the description, and the whole flow was easy to understand. The subscription notice was clear, so I could buy with confidence.', author: 'Buyer', date: '2026/07/20' },
            { stars: 5, title: 'Better than expected', body: 'The value for the price is solid, and there was no pushy sales pressure. It is easy to recommend to family and friends.', author: 'Buyer', date: '2026/07/19' },
            { stars: 5, title: 'Easy to order', body: 'The checkout page was simple and the important details were arranged naturally. Even first-time buyers would not get lost.', author: 'Buyer', date: '2026/07/18' },
            { stars: 5, title: 'Would buy again', body: 'Shipping was fast and support was polite. The page avoided unnecessary clutter, which made the store feel trustworthy.', author: 'Buyer', date: '2026/07/17' },
            { stars: 5, title: 'Excellent overall', body: 'Not only the product, but the labeling and guidance felt honest. This is the kind of shop I would return to.', author: 'Buyer', date: '2026/07/16' },
          ],
          mixed: [
            { stars: 4, title: 'Good product, a bit noisy', body: 'I am happy with the item itself, but a few messages felt a little too strong. A calmer presentation would make it better.', author: 'Buyer', date: '2026/07/20' },
            { stars: 4, title: 'Mostly satisfied', body: 'The product arrived as expected. The subscription details could be clearer, which would make the purchase feel safer.', author: 'Buyer', date: '2026/07/19' },
            { stars: 3, title: 'Useful, but slightly uneasy', body: 'The content is not bad, but there were many rush cues that made it hard to compare calmly. I would double-check before ordering.', author: 'Buyer', date: '2026/07/18' },
            { stars: 4, title: 'Price and quality are fine', body: 'The product itself is good. The presentation is a bit aggressive, so some shoppers may hesitate.', author: 'Buyer', date: '2026/07/17' },
            { stars: 3, title: 'The labeling was unclear', body: 'After checking the order, I realized the details were more complicated than I thought. Read everything carefully before purchasing.', author: 'Buyer', date: '2026/07/16' },
          ],
          bad: [
            { stars: 2, title: 'Subscription details were hard to spot', body: 'I only wanted a one-time purchase, but later found out it was a subscription. The disclosure should be much clearer.', author: 'Buyer', date: '2026/07/20' },
            { stars: 1, title: 'Felt misleading', body: 'Only the buy button stood out, while the subscription explanation was easy to miss. Canceling was also hard to find.', author: 'Buyer', date: '2026/07/19' },
            { stars: 2, title: 'Too pushy for my taste', body: 'The review-style display made the store look reassuring, but the actual checkout felt confusing. I expected a normal purchase.', author: 'Buyer', date: '2026/07/18' },
            { stars: 1, title: 'It turned into a subscription', body: 'I noticed from the receipt that it was a subscription. The cancellation steps were not obvious, so I cannot recommend it.', author: 'Buyer', date: '2026/07/17' },
            { stars: 2, title: 'Worth a complaint', body: 'The labeling was confusing, and I did not feel safe after ordering. Support did not make things clearer either.', author: 'Buyer', date: '2026/07/16' },
          ],
          critical: [
            { stars: 1, title: 'Completely misleading', body: 'I thought I was buying a regular item, but it turned out to be a subscription. The explanation was hidden too well.', author: 'Buyer', date: '2026/07/20' },
            { stars: 1, title: 'Canceling was a hassle', body: 'It felt like I was signed up for a subscription by default. The cancellation page was hard to find and the experience was awful.', author: 'Buyer', date: '2026/07/19' },
            { stars: 1, title: 'Never again', body: 'I would not even give this one star. The purchase screen was misleading and support bounced me around.', author: 'Buyer', date: '2026/07/18' },
            { stars: 1, title: 'Too many dark patterns', body: 'Timer pressure and recommendation labels pushed me too hard. I could not calmly review the terms and regretted ordering.', author: 'Buyer', date: '2026/07/17' },
            { stars: 1, title: 'A real complaint case', body: 'The subscription terms and cancellation info were not clear at all. This kind of sales tactic destroys trust.', author: 'Buyer', date: '2026/07/16' },
          ],
        },
      };

      const tier = intensePattern ? 'critical' : (badPattern ? 'bad' : (mixedPattern ? 'mixed' : 'excellent'));
      return reviewPools[language][tier].slice(0, 5);
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
      const reviewItems = buildReviewEntries(metrics);
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
        <section class="result-card result-review-card">
          <div class="result-card-head">
            <h4>${t('customerReviews')}</h4>
            <div class="result-card-sub">${reviewItems.length}件</div>
          </div>
          <div class="result-reviews">
            ${reviewItems.map((review) => `
              <article class="review-item">
                <div class="review-item-head">
                  <div>
                    <div class="review-stars" aria-label="${review.stars}/5">${'★'.repeat(review.stars)}${'☆'.repeat(5 - review.stars)}</div>
                    <div class="review-meta">${review.author} ・ ${review.date}</div>
                  </div>
                  <div class="review-score">${review.stars}.0</div>
                </div>
                <div class="review-title">${review.title}</div>
                <p class="review-body">${review.body}</p>
              </article>
            `).join('')}
          </div>
        </section>
      `;
      branchChart.innerHTML = predictionMarkup;
      if (metricsPopupContent) {
        metricsPopupContent.innerHTML = resultMarkup;
        animateBranchMetricDisplays(metricsPopupContent);
      }
    }

    function renderBranchPreview() {
      const subscriptionVariant = branchState.subscription === 'subscription' ? 'subscription' : 'one-time';
      const subscriptionTextMarkup = branchState.subscription === 'subscription'
        ? '⚠︎ 月1回の定期便です / 毎月15日に引き落とし'
        : '一回限りの購入';
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

      const subscriptionMarkup = branchState.subscriptionSwitch ? `
        <div class="subscription-widget-shell ${selectedPlacementWidget === 'subscription' ? 'selected' : ''}" data-role="subscription-widget">
          <button type="button" class="subscription-callout ${subscriptionVariant}" aria-label="定期便の表示を切り替える">
            <span class="subscription-change-mark">⇄</span>
            <span class="subscription-callout-text">${subscriptionTextMarkup}</span>
          </button>
          ${selectedPlacementWidget === 'subscription' ? '<button class="subscription-remove" type="button" aria-label="削除">×</button>' : ''}
        </div>
      ` : '';
      const purchaseModeMarkup = branchState.subscriptionSwitch ? `
        <div class="purchase-mode-switch" role="group" aria-label="購入方法の切り替え">
          <button type="button" class="purchase-mode-button ${branchState.subscription === 'subscription' ? 'active' : ''}" data-purchase-mode="subscription">
            <span class="purchase-mode-dot">◎</span>
            <span>${t('purchaseModeSubscription')}</span>
          </button>
          <button type="button" class="purchase-mode-button ${branchState.subscription === 'one-time' ? 'active' : ''}" data-purchase-mode="one-time">
            <span class="purchase-mode-dot">◎</span>
            <span>${t('purchaseModeOneTime')}</span>
          </button>
        </div>
        <div class="purchase-mode-note ${branchState.subscription === 'one-time' ? 'visible' : ''}">
          ${branchState.subscription === 'one-time' && !purchaseModeAutoRevertConsumed ? t('purchaseModeAutoRevert') : '&nbsp;'}
        </div>
      ` : '';
      const todayPurchasedCount = 108
        + (branchState.purchaseNotice ? 58 : 0)
        + (branchState.subscriptionSwitch ? 42 : 0)
        + (branchState.subscriptionSwitch && branchState.subscription === 'one-time' ? 16 : 0)
        + (branchState.intrusiveAd ? 30 : 0)
        + (branchState.price === 'discount' ? 10 : 0)
        + (branchState.timer === 'on' ? 8 : 0);
      const socialProofMarkup = branchState.purchaseNotice ? `
        <div class="social-proof-popup" aria-label="購入者数の通知">
          <div class="social-proof-badge">${t('socialProofBadge')}</div>
          <div class="social-proof-text">${formatTodayPurchasedMessage(todayPurchasedCount)}</div>
          <div class="social-proof-subtext">${t('socialProofSubtext')}</div>
          ${selectedPlacementWidget === 'purchaseNotice' ? '<button class="social-proof-remove" type="button" aria-label="削除">×</button>' : ''}
        </div>
      ` : '';
      const adBannerMarkup = branchState.intrusiveAd ? `
        <div class="intrusive-ad-banner ${selectedPlacementWidget === 'intrusiveAd' ? 'selected' : ''}">
          <div class="intrusive-ad-label">${t('intrusiveAdLabel')}</div>
          <div class="intrusive-ad-copy">${t('intrusiveAdCopy')}</div>
          <div class="intrusive-ad-note">${t('intrusiveAdNote')}</div>
          ${selectedPlacementWidget === 'intrusiveAd' ? '<button class="intrusive-ad-remove" type="button" aria-label="削除">×</button>' : ''}
        </div>
      ` : '';
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
        <div class = "ec-inner-page">
          ${socialProofMarkup}

          <div class="ec-header">
            <h1>${t('storeName')}</h1>
          </div>  

          <div class="product-card">
            <div class="product-text">
              <h3>${t('productName')}</h3>
              <div class="product-features">
                <div class="feature-item">${t('feature1')}</div>
                <div class="feature-item">${t('feature2')}</div>
                <div class="feature-item">${t('feature3')}</div>
                <div class="feature-item">${t('feature4')}</div>
              </div>
            </div>
            <img src="../assets/images/fridge.png" width="50%" height="50%" alt="${t('productName')}" />
          </div>

          <div class="price-row">
            <span class="price-main">${t('normalPrice')}</span>
            ${branchState.price === 'discount' ? `<span class="price-original">${t('originalPrice')}</span>` : ''}
            ${discountInlineMarkup}
            ${timerInlineMarkup}
          </div>
          ${adBannerMarkup}
          ${purchaseModeMarkup}
          ${subscriptionMarkup}
          <div class="promo-badges"></div>
          <button>${t('purchaseButton')}</button>
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
    const purchaseNoticeDraggable = document.getElementById('purchaseNoticeDraggable');
    if (purchaseNoticeDraggable) {
      purchaseNoticeDraggable.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', 'purchaseNotice');
        event.dataTransfer.effectAllowed = 'copy';
      });
    }
    const subscriptionSwitchDraggable = document.getElementById('subscriptionSwitchDraggable');
    if (subscriptionSwitchDraggable) {
      subscriptionSwitchDraggable.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', 'subscriptionSwitch');
        event.dataTransfer.effectAllowed = 'copy';
      });
    }
    const intrusiveAdDraggable = document.getElementById('intrusiveAdDraggable');
    if (intrusiveAdDraggable) {
      intrusiveAdDraggable.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', 'intrusiveAd');
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
      if (droppedType === 'purchaseNotice') {
        branchState.purchaseNotice = true;
        selectedPlacementWidget = 'purchaseNotice';
        renderBranchPreview();
      }
      if (droppedType === 'subscriptionSwitch') {
        branchState.subscriptionSwitch = true;
        selectedPlacementWidget = 'subscription';
        renderBranchPreview();
      }
      if (droppedType === 'intrusiveAd') {
        branchState.intrusiveAd = true;
        selectedPlacementWidget = 'intrusiveAd';
        renderBranchPreview();
      }
    });

    branchPreview.addEventListener('click', (event) => {
      const purchaseModeButton = event.target.closest('[data-purchase-mode]');
      if (purchaseModeButton) {
        const selectedMode = purchaseModeButton.dataset.purchaseMode;
        if (selectedMode === 'subscription') {
          setPurchaseMode('subscription');
        } else if (selectedMode === 'one-time') {
          setPurchaseMode('one-time', !purchaseModeAutoRevertConsumed);
        }
        selectedPlacementWidget = null;
        renderBranchPreview();
        return;
      }
      const isPurchaseNotice = event.target.closest('.social-proof-popup');
      const isIntrusiveAd = event.target.closest('.intrusive-ad-banner');
      const widget = event.target.closest('[data-role="timer-widget"], [data-role="discount-widget"], [data-role="subscription-widget"], .social-proof-popup, .intrusive-ad-banner');
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
          : widget.classList.contains('social-proof-popup')
            ? 'purchaseNotice'
            : widget.classList.contains('intrusive-ad-banner')
              ? 'intrusiveAd'
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
      if (event.target.closest('.social-proof-remove')) {
        branchState.purchaseNotice = false;
        selectedPlacementWidget = null;
        renderBranchPreview();
        return;
      }
      if (event.target.closest('.intrusive-ad-remove')) {
        branchState.intrusiveAd = false;
        selectedPlacementWidget = null;
        renderBranchPreview();
        return;
      }
      if (event.target.closest('.subscription-remove')) {
        branchState.subscriptionSwitch = false;
        branchState.subscription = 'subscription';
        clearPurchaseModeAutoRevertTimer();
        purchaseModeAutoRevertConsumed = false;
        selectedPlacementWidget = null;
        renderBranchPreview();
        return;
      }
      if (widgetType === 'subscription') {
        if (event.target.closest('.subscription-change-mark')) {
          const nextMode = branchState.subscription === 'subscription' ? 'one-time' : 'subscription';
          setPurchaseMode(nextMode, nextMode === 'one-time' && !purchaseModeAutoRevertConsumed);
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
