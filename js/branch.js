    const branchState = {
      price: 'original',
      ad: 'distinct',
      timer: 'off',
      emphasis: 'none',
      saleBadge: false,
      subscriptionSwitch: false,
      productNotice: false,
      premiumDelivery: false,
      noWrapping: false,
      promoEmail: false,
      intrusiveAd: false,
      terms: false,
      termsAccepted: false,
    };

    const branchPreview = document.getElementById('branchPreview');
    const branchMetricsContent = document.getElementById('branchMetricsContent');
    const branchChart = document.getElementById('branchChart');
    const finishMetricsButton = document.getElementById('finishMetricsButton');
    const metricsOverlay = document.getElementById('metricsOverlay');
    const metricsPopupContent = document.getElementById('metricsPopupContent');
    const closeMetricsButton = document.getElementById('closeMetricsButton');
    const branchDraggables = Array.from(document.querySelectorAll('[data-kind][draggable="true"]'));
    const branchCard = document.querySelector('.branch-card');
    let selectedPlacementWidget = null;

    const CHECKBOX_KEYS = ['productNotice', 'premiumDelivery', 'noWrapping', 'promoEmail'];
    const CHECKBOX_LABELS = {
      ja: {
        productNotice: '弊社からの製品に関するお知らせを希望しない',
        premiumDelivery: '常に上質配送(有料)を希望する',
        noWrapping: '常にラッピング(有料)を希望しない',
        promoEmail: 'プロモーションメールを配信を希望する',
      },
      en: {
        productNotice: 'Do not receive product updates from us',
        premiumDelivery: 'Always choose premium delivery (paid)',
        noWrapping: 'Do not choose wrapping (paid)',
        promoEmail: 'Receive promotional emails',
      },
    };

    const OPTION_IMPACTS = {
      timer: {
        isActive: () => branchState.timer === 'on',
        buyers: 40,
        profit: 6,
        userRatingPenalty: 0.34,
        flameRisk: 18,
      },
      discount: {
        isActive: () => branchState.price === 'discount',
        buyers: 34,
        profit: 4,
        userRatingPenalty: 0.22,
        flameRisk: 13,
      },
      saleBadge: {
        isActive: () => branchState.saleBadge,
        buyers: 54,
        profit: 7,
        userRatingPenalty: 0.26,
        flameRisk: 14,
      },
      subscriptionSwitch: {
        isActive: () => branchState.subscriptionSwitch,
        buyers: 26,
        profit: 5,
        userRatingPenalty: 0.3,
        flameRisk: 17,
      },
      intrusiveAd: {
        isActive: () => branchState.intrusiveAd,
        buyers: 42,
        profit: 8,
        userRatingPenalty: 0.44,
        flameRisk: 26,
      },
      terms: {
        isActive: () => branchState.terms,
        buyers: 12,
        profit: 3,
        userRatingPenalty: 0.2,
        flameRisk: 12,
      },
      termsAccepted: {
        isActive: () => branchState.termsAccepted,
        buyers: 10,
        profit: 2,
        userRatingPenalty: 0.14,
        flameRisk: 8,
      },
    };

    const DRAGGABLE_STATE = {
      timer: () => branchState.timer === 'on',
      discount: () => branchState.price === 'discount',
      saleBadge: () => branchState.saleBadge,
      subscriptionSwitch: () => branchState.subscriptionSwitch,
      intrusiveAd: () => branchState.intrusiveAd,
      terms: () => branchState.terms,
    };

    const DROP_ACTIONS = {
      timer: () => {
        branchState.timer = 'on';
        selectedPlacementWidget = null;
      },
      discount: () => {
        branchState.price = 'discount';
        selectedPlacementWidget = null;
      },
      saleBadge: () => {
        branchState.saleBadge = true;
        selectedPlacementWidget = null;
      },
      subscriptionSwitch: () => {
        branchState.subscriptionSwitch = true;
        selectedPlacementWidget = 'checkboxes';
      },
      intrusiveAd: () => {
        branchState.intrusiveAd = true;
        selectedPlacementWidget = 'intrusiveAd';
      },
      terms: () => {
        branchState.terms = true;
        selectedPlacementWidget = 'terms';
      },
    };

    const WIDGET_ROLE_TO_TYPE = {
      'timer-widget': 'timer',
      'discount-widget': 'discount',
      'sale-badge-widget': 'saleBadge',
      'checkbox-widget': 'checkboxes',
      'intrusive-ad-widget': 'intrusiveAd',
      'terms-widget': 'terms',
    };

    function isSelectedPlacement(widgetType) {
      return selectedPlacementWidget === widgetType;
    }

    function getSelectedPlacementClass(widgetType) {
      return isSelectedPlacement(widgetType) ? 'selected' : '';
    }

    function renderRemovalButton(className, widgetType, ariaLabel = '削除') {
      return isSelectedPlacement(widgetType)
        ? `<button class="${className}" type="button" aria-label="${ariaLabel}">×</button>`
        : '';
    }

    function attachDragStartHandler(element, dropType) {
      if (!element) {
        return;
      }
      element.addEventListener('dragstart', (event) => {
        if (element.classList.contains('placed')) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.setData('text/plain', dropType);
        event.dataTransfer.effectAllowed = 'copy';
      });
    }

    function getWidgetTypeFromElement(widget) {
      return WIDGET_ROLE_TO_TYPE[widget.dataset.role] || null;
    }

    function getCheckboxLabel(key) {
      const language = currentLanguage === 'en' ? 'en' : 'ja';
      return CHECKBOX_LABELS[language][key] || '';
    }

    function getCheckboxCount() {
      return CHECKBOX_KEYS.filter((key) => branchState[key]).length;
    }

    function getCheckboxItems() {
      return CHECKBOX_KEYS.map((key) => ({
        key,
        label: getCheckboxLabel(key),
        checked: branchState[key],
      }));
    }

    function updateBranchSelection(type) {
      const action = DROP_ACTIONS[type];
      if (!action) {
        return;
      }
      if (DRAGGABLE_STATE[type]?.()) {
        return;
      }
      action();
      renderBranchPreview();
    }

    function syncBranchWidgetStates() {
      branchDraggables.forEach((element) => {
        const isPlaced = DRAGGABLE_STATE[element.dataset.kind]?.() || false;
        element.classList.toggle('placed', isPlaced);
        element.setAttribute('aria-disabled', String(isPlaced));
        element.draggable = !isPlaced;
      });
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
      if (kind === 'userRating') {
        return { high: '高', mid: '中', low: '低' }[level];
      }
      return { high: '大', mid: '中', low: '小' }[level];
    }

    function getFlameRiskLevel(ratio) {
      if (ratio >= 0.6) return 'high';
      if (ratio >= 0.28) return 'mid';
      return 'low';
    }

    function computeBranchMetrics() {
      const activeImpacts = getActiveOptionImpacts();
      const impactTotals = activeImpacts.reduce((totals, impact) => ({
        buyers: totals.buyers + impact.buyers,
        profit: totals.profit + impact.profit,
        userRatingPenalty: totals.userRatingPenalty + impact.userRatingPenalty,
        flameRisk: totals.flameRisk + impact.flameRisk,
      }), { buyers: 0, profit: 0, userRatingPenalty: 0, flameRisk: 0 });
      const implementationCount = activeImpacts.length;
      const checkboxCount = getCheckboxCount();
      const baseBuyers = 980 + (branchState.ad === 'distinct' ? 12 : 0);
      const buyers = Math.min(1380, Math.round(
        baseBuyers
        + impactTotals.buyers
        + (checkboxCount * 10)
        + (implementationCount * 8)
      ));
      const userRating = Math.max(1.4, Math.min(4.7, Number((
        4.6
        - impactTotals.userRatingPenalty
        - (checkboxCount * 0.12)
        - Math.max(0, implementationCount - 1) * 0.08
      ).toFixed(1))));
      const profit = 68
        + Math.round(buyers * 0.055)
        + Math.round(impactTotals.profit * 1.2)
        + (checkboxCount * 3)
        + implementationCount
        + (branchState.ad === 'distinct' ? 2 : 0);
      const flameRisk = Math.min(100, Math.round(
        8
        + impactTotals.flameRisk
        + (checkboxCount * 7)
        + (implementationCount * 5)
      ));

      return [
        { label: t('buyersLabel'), value: buyers, max: 1400, suffix: t('buyersSuffix'), color: '#2563eb', decimals: 0, display: 'number' },
        { label: t('profitLabel'), value: Math.min(220, profit), max: 220, suffix: t('profitSuffix'), color: '#8b5cf6', decimals: 0, display: 'number' },
        { label: t('userRatingLabel'), value: userRating, max: 5, suffix: t('userRatingSuffix'), color: '#f59e0b', decimals: 1, display: 'stars' },
        { label: t('flameRisk'), value: flameRisk, max: 100, suffix: t('riskSuffix'), color: '#ef4444', decimals: 0, display: 'number' },
      ];
    }

    function getMetricRatio(metric) {
      return metric.max > 0 ? Math.max(0, Math.min(1, metric.value / metric.max)) : 0;
    }

    function getResultSummary(metrics) {
      const [, profitMetric, userRatingMetric, flameRiskMetric] = metrics;
      const profitRatio = getMetricRatio(profitMetric);
      const userRatingRatio = getMetricRatio(userRatingMetric);
      const flameRiskRatio = getMetricRatio(flameRiskMetric);
      const profitText = profitRatio >= 0.82
        ? '利益はとても大きい結果です'
        : profitRatio >= 0.62
          ? '利益は十分に伸びています'
          : profitRatio >= 0.48
            ? '利益はそこそこ出ています'
            : '利益の伸びはまだ控えめです';
      const ratingText = userRatingRatio >= 0.82
        ? 'ユーザの評判は良好です'
        : userRatingRatio >= 0.62
          ? 'ユーザの評判には賛否があります'
          : 'ユーザの評判は悪化しています';
      const flameText = flameRiskRatio >= 0.68
        ? '炎上リスクはかなり高い状態です。'
        : flameRiskRatio >= 0.28
          ? '炎上リスクは無視できない水準です。'
          : '炎上リスクはまだ低めです。';
      return `${profitText}。${ratingText}。${flameText}`;
    }

    function getImplementationCount() {
      return getActiveOptionImpacts().length;
    }

    function getActiveOptionImpacts() {
      const impacts = Object.values(OPTION_IMPACTS).filter((impact) => impact.isActive());
      const checkboxCount = getCheckboxCount();
      if (checkboxCount > 0) {
        impacts.push({
          buyers: 12 * checkboxCount,
          profit: 3 * checkboxCount,
          userRatingPenalty: 0.14 * checkboxCount,
          flameRisk: 8 * checkboxCount,
        });
      }
      return impacts;
    }

    function resetBranchState() {
      branchState.price = 'original';
      branchState.ad = 'distinct';
      branchState.timer = 'off';
      branchState.emphasis = 'none';
      branchState.saleBadge = false;
      branchState.subscriptionSwitch = false;
      branchState.intrusiveAd = false;
      branchState.terms = false;
      branchState.termsAccepted = false;
      CHECKBOX_KEYS.forEach((key) => {
        branchState[key] = false;
      });
      selectedPlacementWidget = null;
      renderBranchPreview();
    }

    function setupResetButton() {
      if (!branchCard || branchCard.querySelector('[data-branch-reset]')) {
        return;
      }
      const resetButton = document.createElement('button');
      resetButton.type = 'button';
      resetButton.className = 'branch-reset-button';
      resetButton.dataset.branchReset = 'true';
      resetButton.textContent = 'リセット';
      resetButton.addEventListener('click', resetBranchState);
      branchCard.appendChild(resetButton);
    }

    function buildReviewEntries() {
      const language = currentLanguage === 'en' ? 'en' : 'ja';
      const reviews = [];
      const copy = {
        ja: {
          author: '購入者',
          activeSize: [
            ['想像より小さかった', '35Lの超巨大という見出しを見て大きめを期待しましたが、届いたら普通に小型でした。置き場所には困らないものの、家族用には物足りません。'],
            ['写真より控えめなサイズ感', '商品名の勢いで選びましたが、実物は一人暮らし向けという印象です。サイズ表をよく見ればよかったです。'],
          ],
          inactiveSize: [
            ['小さい分安くて良い', '大きすぎない冷蔵庫を探していたので、サイズと価格のバランスはちょうどよかったです。サブ用として使いやすいです。'],
            ['コンパクトで扱いやすい', '小さい分だけ設置しやすく、値段も抑えられていて納得感があります。必要最低限で十分な人には合うと思います。'],
          ],
          activeDiscountSale: [
            ['割引表示が疑わしい', 'あたかも割引しているように見えますが、本当に値下げされているのかは少し疑わしいです。お得感の見せ方が強すぎます。'],
            ['元からこの値段では？', 'SALE表示に惹かれましたが、調べてみると元からこの値段だったようにも見えます。急いで買う必要はなかったかもしれません。'],
            ['画面がうるさくて見づらい', 'SALEの文字が多く、価格や商品説明より先に派手な表示ばかり目に入ります。落ち着いて比較しにくい画面でした。'],
          ],
          activeDiscount: [
            ['値引きの根拠が分かりにくい', '割引バッジは目立ちますが、元の価格や比較条件が見えづらく、本当に安いのか判断しにくかったです。'],
            ['お得そうだが少し不安', '安く見えるのは良いものの、表示の作り方が強くて、あとから別の条件が出てこないか気になりました。'],
          ],
          activeSale: [
            ['SALE表示が主張しすぎ', '商品よりもSALEの文字が目立っていて、ページ全体が少し騒がしいです。もう少し静かな表示の方が買いやすいです。'],
            ['情報が頭に入ってこない', 'バナーが派手で、肝心のサイズや機能を読む前に気が散りました。何を確認すればいいのか分かりにくかったです。'],
          ],
          inactiveDiscountSale: [
            ['見やすくて比較しやすい', '余計な割引演出がないので、価格と商品の特徴をそのまま確認できました。落ち着いて判断しやすいです。'],
            ['表示がすっきりしている', '画面が見やすく、価格も分かりやすいです。派手な売り文句が少ないので安心して読めました。'],
          ],
          activeOptions: [
            ['メールが多すぎる', '購入後のお知らせメールが想像以上に多く、必要な連絡まで埋もれてしまいました。チェック欄をもっと分かりやすくしてほしいです。'],
            ['有料オプションを見落とした', '有料のラッピングや配送に関する項目を見落として損した気分です。最終金額の変化をもっと目立たせてほしいです。'],
            ['チェック項目が紛らわしい', '希望する/しないの表現が混ざっていて、どれを選んだ状態なのか分かりにくかったです。注文前に何度も確認しました。'],
          ],
          inactiveOptions: [
            ['追加項目が少なくて安心', '余計なチェック項目が出てこないので、必要な内容だけ確認して購入できました。手続きがすっきりしています。'],
          ],
          activeAd: [
            ['広告が邪魔でした', '商品を見ている途中で大きな案内が入り、買い物の流れが止まりました。特別感よりも煩わしさが勝ちました。'],
          ],
          activeTerms: [
            ['条件を探しにくい', '規約自体は読めますが、文章量が多くて重要な条件を探すのに時間がかかりました。要点を別にまとめてほしいです。'],
          ],
        },
        en: {
          author: 'Buyer',
          activeSize: [
            ['Smaller than expected', 'The headline made it sound much larger, but the actual unit feels compact. It is fine for a small room, not for a family.'],
            ['The size felt overstated', 'I expected more capacity from the product name. The item itself works, but the wording made my expectations too high.'],
          ],
          inactiveSize: [
            ['Small, affordable, and useful', 'The compact size keeps the price reasonable. It works well as a secondary fridge or for a small apartment.'],
            ['Easy to place anywhere', 'It is not oversized, which made installation simple. The price feels fair for the capacity.'],
          ],
          activeDiscountSale: [
            ['The discount looks suspicious', 'It looks discounted, but I could not tell whether the price was actually reduced. The deal framing felt overdone.'],
            ['Was this always the price?', 'The sale sign caught my eye, but it felt like the item may have been this price from the start.'],
            ['The page is too noisy', 'The sale text dominates the page and makes the details harder to read. It is difficult to compare calmly.'],
          ],
          activeDiscount: [
            ['Unclear discount basis', 'The discount badge stands out, but the original price and comparison basis are hard to verify.'],
            ['Looks cheap, but uncertain', 'The price looks appealing, yet the presentation made me wonder if there were hidden catches.'],
          ],
          activeSale: [
            ['Too much sale noise', 'The sale banner gets more attention than the product details. A calmer page would be easier to trust.'],
            ['Hard to focus on details', 'The banner is loud enough that I had to reread the product information several times.'],
          ],
          inactiveDiscountSale: [
            ['Clean and easy to read', 'Without extra sale effects, the price and product details are easy to compare.'],
            ['The page feels straightforward', 'The display is simple and readable, which makes the purchase feel more comfortable.'],
          ],
          activeOptions: [
            ['Too many emails', 'After ordering, the amount of promotional email felt excessive. The checkbox wording should be clearer.'],
            ['Missed a paid add-on', 'I missed a paid wrapping or delivery-related option and felt like I paid more than expected.'],
            ['Confusing checkboxes', 'The wording mixes opt-in and opt-out language, so I had to reread the selections several times.'],
          ],
          inactiveOptions: [
            ['Fewer add-ons felt safer', 'There were not many extra checkbox choices, so checkout felt simple and predictable.'],
          ],
          activeAd: [
            ['The ad interrupted shopping', 'A large offer interrupted the flow while I was checking the product. It felt more annoying than helpful.'],
          ],
          activeTerms: [
            ['Hard to find key terms', 'The terms are available, but important conditions are buried in a lot of text. A short summary would help.'],
          ],
        },
      };
      const reviewCopy = copy[language];
      const dates = ['2026/07/20', '2026/07/19', '2026/07/18', '2026/07/17', '2026/07/16'];
      const add = (stars, pair) => {
        reviews.push({
          stars,
          title: pair[0],
          body: pair[1],
          author: reviewCopy.author,
          date: dates[reviews.length % dates.length],
        });
      };
      const addMany = (stars, list) => {
        list.forEach((pair) => add(stars, pair));
      };

      if (branchState.timer === 'on') {
        addMany(2, reviewCopy.activeSize);
      } else {
        addMany(5, reviewCopy.inactiveSize);
      }

      if (branchState.price === 'discount' && branchState.saleBadge) {
        addMany(2, reviewCopy.activeDiscountSale);
      } else if (branchState.price === 'discount') {
        addMany(3, reviewCopy.activeDiscount);
      } else if (branchState.saleBadge) {
        addMany(2, reviewCopy.activeSale);
      } else {
        addMany(5, reviewCopy.inactiveDiscountSale);
      }

      if (branchState.subscriptionSwitch) {
        addMany(2, reviewCopy.activeOptions);
      } else {
        addMany(5, reviewCopy.inactiveOptions);
      }

      if (branchState.intrusiveAd) {
        addMany(2, reviewCopy.activeAd);
      }
      if (branchState.terms) {
        addMany(3, reviewCopy.activeTerms);
      }

      if (branchState.subscriptionSwitch) {
        const optionTitles = new Set(reviewCopy.activeOptions.map((pair) => pair[0]));
        const optionReviews = reviews.filter((review) => optionTitles.has(review.title));
        const otherReviews = reviews.filter((review) => !optionTitles.has(review.title));
        return [
          ...otherReviews.slice(0, 3),
          ...optionReviews.slice(0, 2),
        ].slice(0, 5);
      }

      return reviews.slice(0, 5);
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

      root.querySelectorAll('[data-flame-risk-pie]').forEach((node) => {
        const targetProgress = Number(node.dataset.targetProgress || '0');
        requestAnimationFrame(() => {
          node.style.setProperty('--result-pie-progress', `${targetProgress}%`);
        });
      });
    }

    function buildPredictionItems(metrics) {
      const [buyersMetric, profitMetric, userRatingMetric, flameRiskMetric] = metrics;
      const buyersLevel = getStageLevel(buyersMetric.value / buyersMetric.max);
      const profitLevel = getStageLevel(profitMetric.value / profitMetric.max);
      const userRatingLevel = getStageLevel(userRatingMetric.value / userRatingMetric.max);
      const flameLevel = getFlameRiskLevel(flameRiskMetric.value / flameRiskMetric.max);

      return [
        { label: t('buyersForecast'), stage: getStageWord('generic', buyersLevel), level: buyersLevel, direction: 'positive' },
        { label: t('profitForecast'), stage: getStageWord('generic', profitLevel), level: profitLevel, direction: 'positive' },
        { label: t('userRatingForecast'), stage: getStageWord('userRating', userRatingLevel), level: userRatingLevel, direction: 'positive' },
        { label: t('flameForecast'), stage: getStageWord('generic', flameLevel), level: flameLevel, direction: 'negative' },
      ];
    }

    function renderBranchMetricPanels() {
      const metrics = computeBranchMetrics();
      const [buyersMetric, profitMetric, userRatingMetric, flameRiskMetric] = metrics;
      const predictionItems = buildPredictionItems(metrics);
      const reviewItems = buildReviewEntries(metrics);
      const predictionMarkup = `
        <div class="prediction-grid">
          ${predictionItems.map((item) => `
            <div class="prediction-item ${item.direction}-${item.level}">
              <div>
                <div class="prediction-label">${item.label}</div>
              </div>
              <span class="prediction-pill ${item.direction}-${item.level}">${item.stage}</span>
            </div>
          `).join('')}
        </div>
      `;
      const summaryText = getResultSummary(metrics);
      const userRatingPercent = Math.max(0, Math.min(100, Math.round(getMetricRatio(userRatingMetric) * 100)));
      const flameRiskPercent = Math.max(0, Math.min(100, Math.round(getMetricRatio(flameRiskMetric) * 100)));

      const resultMarkup = `
        <div class="result-layout">
          <div class="result-summary">
            <div class="result-summary-label">総評</div>
            <div class="result-summary-text">${summaryText}</div>
          </div>
          <div class="result-grid">
            <section class="result-card result-bar-card">
              <div class="result-card-head">
                <h4>${buyersMetric.label}</h4>
              </div>
              <div class="result-bar-wrap">
                <div class="result-bar buyers">
                  <div class="result-bar-fill buyers" data-result-bar-fill data-target-scale="${getMetricRatio(buyersMetric)}"></div>
                </div>
                <div class="result-bar-value" data-animate-number data-target-value="${buyersMetric.value}" data-decimals="${buyersMetric.decimals}" data-suffix="${buyersMetric.suffix}">0${buyersMetric.suffix}</div>
              </div>
            </section>
            <section class="result-card result-bar-card">
              <div class="result-card-head">
                <h4>${profitMetric.label}</h4>
              </div>
              <div class="result-bar-wrap">
                <div class="result-bar profit">
                  <div class="result-bar-fill profit" data-result-bar-fill data-target-scale="${getMetricRatio(profitMetric)}"></div>
                </div>
                <div class="result-bar-value" data-animate-number data-target-value="${profitMetric.value}" data-decimals="${profitMetric.decimals}" data-suffix="${profitMetric.suffix}">0${profitMetric.suffix}</div>
              </div>
            </section>
            <section class="result-card">
              <div class="result-card-head">
                <h4>${userRatingMetric.label}</h4>
              </div>
              <div class="result-stars-wrap">
                <div class="result-stars" aria-label="${userRatingMetric.label} ${userRatingMetric.value.toFixed(userRatingMetric.decimals)}${userRatingMetric.suffix}">
                  <span class="result-stars-base">★★★★★</span>
                  <span class="result-stars-fill" data-rating-fill data-target-width="${userRatingPercent}" style="width: 0%">★★★★★</span>
                </div>
              </div>
            </section>
            <section class="result-card">
              <div class="result-card-head">
                <h4>${flameRiskMetric.label}</h4>
              </div>
              <div class="result-flame-risk-wrap">
                <div class="result-pie result-pie-risk" data-flame-risk-pie data-target-progress="${flameRiskPercent}" style="--result-pie-progress: 0%">
                  <div class="result-pie-center">
                    <div class="result-pie-value" data-animate-number data-target-value="${flameRiskMetric.value}" data-decimals="${flameRiskMetric.decimals}" data-suffix="${flameRiskMetric.suffix}">0${flameRiskMetric.suffix}</div>
                    <div class="result-pie-label">${flameRiskMetric.label}</div>
                  </div>
                </div>
              </div>
            </section>
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
      const checkboxItems = getCheckboxItems();

      const checkboxMarkup = branchState.subscriptionSwitch ? `
        <div class="subscription-widget-shell ${getSelectedPlacementClass('checkboxes')}" data-role="checkbox-widget">
          <div class="consent-checklist-items">
            ${checkboxItems.map((item) => `
              <label class="consent-checkbox-item ${item.checked ? 'checked' : ''}">
                <input type="checkbox" data-consent-key="${item.key}" ${item.checked ? 'checked' : ''} />
                <span>${item.label}</span>
              </label>
            `).join('')}
          </div>
          ${renderRemovalButton('subscription-remove', 'checkboxes')}
        </div>
      ` : '';
      const termsMarkup = branchState.terms ? `
        <div class="terms-widget-shell ${getSelectedPlacementClass('terms')}" data-role="terms-widget">
          <div class="terms-widget-title">利用規約</div>
          <iframe class="terms-frame" src="../terms.txt" title="利用規約"></iframe>
          <label class="terms-agree-row ${branchState.termsAccepted ? 'checked' : ''}">
            <input type="checkbox" data-terms-agree ${branchState.termsAccepted ? 'checked' : ''} />
            <span>同意します</span>
          </label>
          ${renderRemovalButton('terms-remove', 'terms')}
        </div>
      ` : '';
      const saleBadgeMarkup = branchState.saleBadge ? `
        <div class="sale-badge sale-marquee ${getSelectedPlacementClass('saleBadge')}" data-role="sale-badge-widget">
          <p><span>SALE! SALE! SALE! SALE! SALE! SALE!</span><span aria-hidden="true">SALE! SALE! SALE! SALE! SALE! SALE!</span></p> 
          ${renderRemovalButton('sale-badge-remove', 'saleBadge')}
        </div>
      ` : '';
      const adBannerMarkup = branchState.intrusiveAd ? `
        <div class="intrusive-ad-banner ${getSelectedPlacementClass('intrusiveAd')}" data-role="intrusive-ad-widget">
          <div class="intrusive-ad-label">${t('intrusiveAdLabel')}</div>
          <div class="intrusive-ad-copy">${t('intrusiveAdCopy')}</div>
          <div class="intrusive-ad-note">${t('intrusiveAdNote')}</div>
          ${renderRemovalButton('intrusive-ad-remove', 'intrusiveAd')}
        </div>
      ` : '';
      const exaggeratedTitleText = branchState.timer === 'on' ? '35Lの超巨大冷蔵庫!!' : t('productName');
      const productTitleMarkup = branchState.timer === 'on'
        ? `<div class="product-title-wrap ${getSelectedPlacementClass('timer')}" data-role="timer-widget">
            <div class="campaign-label">業界No.1シェア突破記念キャンペーン中</div>
            <h3 class="product-title">${exaggeratedTitleText}</h3>
            ${renderRemovalButton('timer-remove', 'timer')}
          </div>`
        : `<h3 class="product-title">${exaggeratedTitleText}</h3>`;
      const discountInlineMarkup = branchState.price === 'discount'
        ? `<div class="promo-badge discount-inline ${getSelectedPlacementClass('discount')}" data-role="discount-widget">
            <img src="../assets/images/discount.png"  height="100" alt="割引バッジ" />
            ${renderRemovalButton('discount-remove', 'discount')}
          </div>`
        : '';

      branchPreview.innerHTML = `
        <div class = "ec-inner-page">
          <div class="ec-header">
            <h1>${t('storeName')}</h1>
          </div>  
          ${saleBadgeMarkup}
          <div class="product-card">
            <div class="product-text">
              ${productTitleMarkup}
              <div class="product-features">
                <div class="feature-item">${t('feature1')}</div>
                <div class="feature-item">${t('feature2')}</div>
                <div class="feature-item">${t('feature3')}</div>
                <div class="feature-item">${t('feature4')}</div>
              </div>
            </div>
            <img src="../assets/images/fridge.png" width="40%" height="40%" style="margin: 50px 0px 50px 0px;" alt="${t('productName')}" />
          </div>

          <div class="price-section">
            ${discountInlineMarkup}
            <p class="price-main">${t('normalPrice')}</p>
          </div>
          ${adBannerMarkup}
          <div class="promo-badges"></div>
          <button class="purchaseButton">${t('purchaseButton')}</button>
          ${checkboxMarkup}
          ${termsMarkup}
        </div>
      `;

      syncBranchWidgetStates();
      renderBranchMetricPanels();
    }

    branchDraggables.forEach((element) => {
      attachDragStartHandler(element, element.dataset.kind);
    });

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
      updateBranchSelection(droppedType);
    });

    branchPreview.addEventListener('change', (event) => {
      const checkbox = event.target.closest('[data-consent-key]');
      const termsAgree = event.target.closest('[data-terms-agree]');
      if (!checkbox && !termsAgree) {
        return;
      }
      if (termsAgree) {
        branchState.termsAccepted = termsAgree.checked;
        renderBranchPreview();
        return;
      }
      const checkboxKey = checkbox.dataset.consentKey;
      if (checkboxKey in branchState) {
        branchState[checkboxKey] = checkbox.checked;
        renderBranchPreview();
      }
    });

    branchPreview.addEventListener('click', (event) => {
      const widget = event.target.closest('[data-role]');
      if (!widget) {
        const clickedInsidePreview = event.target.closest('.branch-preview');
        const clickedInteractiveElement = event.target.closest('button, a, input, textarea, select');
        if (clickedInsidePreview && !clickedInteractiveElement) {
          selectedPlacementWidget = null;
          renderBranchPreview();
        }
        return;
      }
      const widgetType = getWidgetTypeFromElement(widget);
      if (!widgetType) {
        return;
      }
      if (event.target.closest('.timer-remove, .discount-remove')) {
        switch (widgetType) {
          case 'discount':
            branchState.price = 'original';
            break;
          case 'timer':
          default:
            branchState.timer = 'off';
            break;
        }
        selectedPlacementWidget = null;
        renderBranchPreview();
        return;
      }
      const removalActions = {
        'sale-badge-remove': () => {
          branchState.saleBadge = false;
        },
        'intrusive-ad-remove': () => {
          branchState.intrusiveAd = false;
        },
        'subscription-remove': () => {
          branchState.subscriptionSwitch = false;
          CHECKBOX_KEYS.forEach((key) => {
            branchState[key] = false;
          });
        },
        'terms-remove': () => {
          branchState.terms = false;
          branchState.termsAccepted = false;
        },
      };
      const removalSelector = Object.keys(removalActions).find((selector) => event.target.closest(`.${selector}`));
      if (removalSelector) {
        removalActions[removalSelector]();
        selectedPlacementWidget = null;
        renderBranchPreview();
        return;
      }
      if (widgetType === 'checkboxes') {
        selectedPlacementWidget = 'checkboxes';
        renderBranchPreview();
        return;
      }
      if (widgetType === 'terms') {
        selectedPlacementWidget = 'terms';
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

    setupResetButton();
    renderBranchPreview();
    syncBranchWidgetStates();
