    class Player {
      constructor() {
        this.profit = 100;
        this.users = 1000;
        this.trust = 100;
        this.review = 4.8;
        this.flame = 0;
        this.regulation = 0;
        this.turn = 1;
        this.flameEvents = 0;
        this.history = [{ turn: 1, profit: 100, trust: 100, users: 1000, review: 4.8, flame: 0, regulation: 0 }];
      }

      clampStats() {
        this.trust = Math.max(0, Math.min(150, this.trust));
        this.review = Math.max(0, Math.min(5, Math.round(this.review * 100) / 100));
        this.users = Math.max(0, Math.round(this.users));
        this.flame = Math.max(0, Math.min(100, Math.round(this.flame)));
        this.regulation = Math.max(0, Math.min(120, Math.round(this.regulation)));
      }

      applyCard(card) {
        this.profit += card.profit;
        this.trust += card.trust;
        this.flame += card.flame;
        this.regulation += card.regulation;
        this.review += card.review;
        if (card.flame > 0) this.flameEvents += 1;
        this.clampStats();
      }

      applyLongTerm() {
        const trustPenalty = Math.max(0, 90 - this.trust);
        const userDelta = Math.round((this.trust - 100) * 0.25 - trustPenalty * 0.03);
        this.users += userDelta;
        this.profit -= Math.max(0, trustPenalty * 0.35);
        this.review -= Math.max(0, (90 - this.trust) * 0.01);
        this.review -= Math.max(0, (this.flame - 20) * 0.005);
        this.review = Math.min(5, this.review);
        this.clampStats();
        return { userDelta, longTermProfit: Math.max(0, trustPenalty * 0.35) };
      }

      pushHistory() {
        this.history.push({
          turn: this.turn,
          profit: this.profit,
          trust: this.trust,
          users: this.users,
          review: this.review,
          flame: this.flame,
          regulation: this.regulation,
        });
      }
    }

    class UIState {
      constructor() {
        this.reset();
      }

      reset() {
        this.title = t('productName');
        this.description = t('subscriptionText');
        this.buttonText = t('purchaseButton');
        this.buttonLarge = false;
        this.stock = null;
        this.countdown = null;
        this.reviewStars = null;
        this.checkbox = null;
        this.popup = null;
        this.recommendation = false;
        this.unsubscribeSmall = false;
        this.fakeReview = false;
        this.closeButtonSmall = false;
      }

      clone() {
        const copy = new UIState();
        Object.assign(copy, this);
        return copy;
      }

      applyOption(option) {
        if (option.applyState) {
          option.applyState(this);
        }
      }
    }

    class Option {
      constructor(config) {
        Object.assign(this, config);
      }
    }

    class Event {
      constructor({ label, text, chance, effect }) {
        this.label = label;
        this.text = text;
        this.chance = chance;
        this.effect = effect;
      }
    }

    class Game {
      constructor() {
        this.player = new Player();
        this.currentUI = new UIState();
        this.initialUI = this.currentUI.clone();
        this.options = this.createOptions();
        this.availableOptions = [...this.options];
        this.appliedOptions = [];
        this.events = this.createEvents();
        this.isBusy = false;
        this.init();
      }

      createOptions() {
        return [
          new Option({
            id: 'buttonLarge',
            titleKey: 'buttonLarge',
            descriptionKey: 'buttonLargeDesc',
            title: t('buttonLarge'),
            description: t('buttonLargeDesc'),
            profit: 5, trust: -1, flame: 0, regulation: 0, review: 0,
            cvr: '5.2%',
            highlightKey: 'buttonLarge',
            applyState: (state) => { state.buttonLarge = true; },
          }),
          new Option({
            id: 'stockNotification',
            titleKey: 'stockNotification',
            descriptionKey: 'stockNotificationDesc',
            title: t('stockNotification'),
            description: t('stockNotificationDesc'),
            profit: 10, trust: -4, flame: 3, regulation: 0, review: 0,
            cvr: '6.1%',
            highlightKey: 'stock',
            applyState: (state) => { state.stock = t('stockNotification'); },
          }),
          new Option({
            id: 'countdownTimer',
            titleKey: 'countdownTimer',
            descriptionKey: 'countdownTimerDesc',
            title: t('countdownTimer'),
            description: t('countdownTimerDesc'),
            profit: 12, trust: -6, flame: 5, regulation: 0, review: 0,
            cvr: '7.1%',
            highlightKey: 'countdown',
            applyState: (state) => { state.countdown = t('timerBadge'); },
          }),
          new Option({
            id: 'reviewStars',
            titleKey: 'reviewStars',
            descriptionKey: 'reviewStarsDesc',
            title: t('reviewStars'),
            description: t('reviewStarsDesc'),
            profit: 4, trust: -1, flame: 0, regulation: 0, review: 0,
            cvr: '5.8%',
            highlightKey: 'reviewStars',
            applyState: (state) => { state.reviewStars = '★★★★★'; },
          }),
          new Option({
            id: 'checkboxOn',
            titleKey: 'checkboxOn',
            descriptionKey: 'checkboxOnDesc',
            title: t('checkboxOn'),
            description: t('checkboxOnDesc'),
            profit: 8, trust: -5, flame: 2, regulation: 0, review: 0,
            cvr: '6.5%',
            highlightKey: 'checkbox',
            applyState: (state) => { state.checkbox = t('checkboxOn'); },
          }),
          new Option({
            id: 'unsubscribeSmall',
            titleKey: 'unsubscribeSmall',
            descriptionKey: 'unsubscribeSmallDesc',
            title: t('unsubscribeSmall'),
            description: t('unsubscribeSmallDesc'),
            profit: 15, trust: -10, flame: 6, regulation: 4, review: 0,
            cvr: '7.4%',
            highlightKey: 'unsubscribeSmall',
            applyState: (state) => { state.unsubscribeSmall = true; },
          }),
          new Option({
            id: 'popupAd',
            titleKey: 'popupAd',
            descriptionKey: 'popupAdDesc',
            title: t('popupAd'),
            description: t('popupAdDesc'),
            profit: 7, trust: -4, flame: 0, regulation: 0, review: -0.2,
            cvr: '6.8%',
            highlightKey: 'popup',
            applyState: (state) => { state.popup = t('discountBadge'); },
          }),
          new Option({
            id: 'recommendationLabel',
            titleKey: 'recommendationLabel',
            descriptionKey: 'recommendationLabelDesc',
            title: t('recommendationLabel'),
            description: t('recommendationLabelDesc'),
            profit: 6, trust: -2, flame: 0, regulation: 0, review: 0,
            cvr: '5.4%',
            highlightKey: 'recommendation',
            applyState: (state) => { state.recommendation = true; },
          }),
          new Option({
            id: 'fakeReviewNote',
            titleKey: 'fakeReview',
            descriptionKey: 'fakeReviewDesc',
            title: t('fakeReview'),
            description: t('fakeReviewDesc'),
            profit: 9, trust: -8, flame: 4, regulation: 0, review: -0.1,
            cvr: '6.9%',
            highlightKey: 'fakeReview',
            applyState: (state) => { state.fakeReview = true; },
          }),
          new Option({
            id: 'closeButtonSmall',
            titleKey: 'closeButtonSmall',
            descriptionKey: 'closeButtonSmallDesc',
            title: t('closeButtonSmall'),
            description: t('closeButtonSmallDesc'),
            profit: 5, trust: -3, flame: 1, regulation: 0, review: 0,
            cvr: '5.7%',
            highlightKey: 'closeButtonSmall',
            applyState: (state) => { state.closeButtonSmall = true; },
          }),
        ];
      }

      updateTranslations() {
        if (!this.options) return;
        this.options.forEach(opt => {
          if (opt.titleKey) opt.title = t(opt.titleKey);
          if (opt.descriptionKey) opt.description = t(opt.descriptionKey);
        });
        if (this.currentUI) {
          this.currentUI.title = t('productName');
          this.currentUI.description = t('subscriptionText');
          this.currentUI.buttonText = t('purchaseButton');
        }
        if (this.initialUI) {
          this.initialUI.title = this.currentUI.title;
          this.initialUI.description = this.currentUI.description;
          this.initialUI.buttonText = this.currentUI.buttonText;
        }
      }

      createEvents() {
        return [
          new Event({ label: t('snsBurn'), text: t('snsBurnText'), chance: 0.18, effect: (player) => { player.trust -= 8; player.review -= 0.2; player.users -= 25; return t('snsBurn'); } }),
          new Event({ label: t('reviewDrop'), text: t('reviewDropText'), chance: 0.15, effect: (player) => { player.review -= 0.4; player.users -= 40; return t('reviewDrop'); } }),
          new Event({ label: t('switchToCompetitor'), text: t('switchToCompetitorText'), chance: 0.14, effect: (player) => { player.users -= 50; player.profit -= 6; return t('switchToCompetitor'); } }),
          new Event({ label: t('consumerComplaint'), text: t('consumerComplaintText'), chance: 0.12, effect: (player) => { player.trust -= 6; player.regulation += 6; return t('consumerComplaint'); } }),
          new Event({ label: t('mediaFeature'), text: t('mediaFeatureText'), chance: 0.13, effect: (player) => { player.trust -= 5; player.users -= 20; player.review -= 0.2; return t('mediaFeature'); } }),
          new Event({ label: t('regulationWarning'), text: t('regulationWarningText'), chance: 0.1, effect: (player) => { player.regulation += 8; return t('regulationWarning'); } }),
          new Event({ label: t('appRating'), text: t('appRatingText'), chance: 0.12, effect: (player) => { player.review -= 0.3; player.users -= 15; return t('appRating'); } }),
        ];
      }

      init() {
        this.topStats = document.getElementById('topStats');
        this.appliedElements = document.getElementById('appliedElements');
        this.optionContainer = document.getElementById('optionContainer');
        this.rightStats = document.getElementById('rightStats');
        this.logContainer = document.getElementById('logContainer');
        this.abOverlay = document.getElementById('abOverlay');
        this.abCard = document.getElementById('abCard');
        this.messageOverlay = document.getElementById('messageOverlay');
        this.messageCard = document.getElementById('messageCard');
        this.currentPair = this.choosePair();
        this.render();
        this.addLog(t('gameStart'), t('gameStartNote'));
      }

      choosePair() {
        const pool = this.availableOptions.length >= 2 ? [...this.availableOptions] : [...this.options];
        const firstIndex = Math.floor(Math.random() * pool.length);
        const first = pool.splice(firstIndex, 1)[0];
        const secondIndex = Math.floor(Math.random() * pool.length);
        const second = pool.splice(secondIndex, 1)[0];
        return [first, second];
      }

      render() {
        this.renderTopStats();
        this.renderOptions();
        this.renderRightStats();
        this.renderAppliedList();
      }

      renderTopStats() {
        if (!this.topStats) return;
        const p = this.player;
        const items = [
          { label: t('profit'), value: `${t('profitUnit')}${p.profit}` },
          { label: t('trust'), value: `${p.trust}` },
          { label: t('review'), value: `${p.review.toFixed(1)}` },
          { label: t('users'), value: `${p.users}` },
          { label: t('flameRisk'), value: `${p.flame}` },
          { label: t('regulationRisk'), value: `${p.regulation}` },
          { label: t('turn'), value: `${p.turn}` },
        ];
        this.topStats.innerHTML = items.map(item => `
          <div class="stat-pill">
            <strong>${item.label}</strong>
            <div class="value">${item.value}</div>
          </div>
        `).join('');
      }

      renderOptions() {
        if (!this.optionContainer) return;
        this.optionContainer.innerHTML = this.currentPair.map((option, index) => {
          const previewState = this.currentUI.clone();
          previewState.applyOption(option);
          const mode = index === 0 ? 'clear' : 'soft';
          return `
            <div class="option-card" onclick="game.handleOptionSelected(${index})" tabindex="0">
              <div class="option-title">${index === 0 ? t('choice1') : t('choice2')}: ${option.title}</div>
              <p class="option-desc">${option.description}</p>
              <div class="sim-panel">${this.renderUIState(previewState, [option.highlightKey], mode)}</div>
              <div class="option-actions">
                <div class="hint">${t('selectChoice')}</div>
                <div style="display:flex; align-items:center; gap:10px; color:#94a3b8;">A: ${this.currentPair[0].cvr} / B: ${this.currentPair[1].cvr}</div>
              </div>
            </div>
          `;
        }).join('');
      }

      renderRightStats() {
        if (!this.rightStats) return;
        const p = this.player;
        this.rightStats.innerHTML = `
          <div class="small-stat"><label>${t('profit')}</label><div class="value">${t('profitUnit')}${p.profit}</div></div>
          <div class="small-stat"><label>${t('trust')}</label><div class="value">${p.trust}</div><div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100, p.trust)}%"></div></div></div>
          <div class="small-stat"><label>${t('review')}</label><div class="value">${p.review.toFixed(1)}</div></div>
          <div class="small-stat"><label>${t('users')}</label><div class="value">${p.users}</div></div>
          <div class="small-stat"><label>${t('flameRisk')}</label><div class="value">${p.flameEvents}</div></div>
          <div class="small-stat"><label>${t('regulationRisk')}</label><div class="value">${p.regulation}</div></div>
        `;
      }

      renderAppliedList() {
        this.appliedElements.innerHTML = this.appliedOptions.length > 0
          ? this.appliedOptions.map(id => {
              const opt = this.options.find(o => o.id === id);
              return `<li>${opt ? opt.title : id}</li>`;
            }).join('')
          : `<li>${t('noChanges')}</li>`;
      }

      renderUIState(state, highlightKeys, mode = 'clear') {
        const isClear = mode === 'clear';
        const products = [
          { title: '限定セット', price: `${t('profitUnit')}39.80`, badge: t('flameRisk') },
          { title: 'フルスペック版', price: `${t('profitUnit')}59.80`, badge: t('users') },
          { title: 'お試しプラン', price: `${t('profitUnit')}19.80`, badge: t('profit') },
        ];
        const productMarkup = (product, index) => `
          <div class="selection-item">
            <div class="item-thumb">${index + 1}</div>
            <div class="item-body">
              <div class="item-name">${product.title}</div>
              <div class="item-price">${product.price}</div>
            </div>
            <button class="select-pill">${t('select')}</button>
          </div>
        `;
        const adMarkup = `
          <div class="ad-slot ${isClear ? 'mode-clear' : 'mode-soft'}">
            <div class="ad-badge">${t('adTag')}</div>
            <div class="ad-copy">${t('discountBadge')}</div>
            <div class="ad-note">${t('limited')}</div>
          </div>
        `;
        const listMarkup = `${productMarkup(products[0], 0)}${adMarkup}${productMarkup(products[1], 1)}${productMarkup(products[2], 2)}`;

        return `
          <div class="selection-page ${isClear ? 'mode-clear' : 'mode-soft'}">
            <div class="selection-top">
              <div>${t('productSelection')}</div>
              <div>${t('recommendedTag')}</div>
            </div>
            <div class="selection-list">
              ${listMarkup}
            </div>
          </div>
        `;
      }

      handleOptionSelected(index) {
        if (this.isBusy || this.isGameOver()) return;
        this.isBusy = true;
        const chosenOption = this.currentPair[index];
        this.showABTest(chosenOption, index);
      }

      showABTest(chosen, chosenIndex) {
        this.abOverlay.classList.remove('hidden');
        this.abCard.innerHTML = `
          <div class="ab-title">${t('abTestResult')}</div>
          <div class="ab-grid">
            <div class="ab-card"><h3>A${t('choice1')}</h3><p>${this.currentPair[0].title}</p><p>CVR ${this.currentPair[0].cvr}</p></div>
            <div class="ab-card"><h3>B${t('choice2')}</h3><p>${this.currentPair[1].title}</p><p>CVR ${this.currentPair[1].cvr}</p></div>
          </div>
          <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:center; gap:14px;">
            <div class="winner">${t('winner')}${parseFloat(this.currentPair[0].cvr) > parseFloat(this.currentPair[1].cvr) ? t('versionA') : t('versionB')}</div>
            <div style="color:#475569;">${t('yourChoice')}${chosenIndex === 0 ? t('choice1') : t('choice2')}</div>
          </div>
          <div style="margin-top:20px; display:flex; gap:12px;"><button class="button secondary" id="skipButton">${t('confirmResult')}</button></div>
        `;
        const skipButton = document.getElementById('skipButton');
        skipButton.addEventListener('click', () => {
          this.abOverlay.classList.add('hidden');
          this.applySelectedOption(chosen);
        });
        setTimeout(() => {
          if (!this.abOverlay.classList.contains('hidden')) {
            this.abOverlay.classList.add('hidden');
            this.applySelectedOption(chosen);
          }
        }, 2400);
      }

      applySelectedOption(option) {
        this.currentUI.applyOption(option);
        this.appliedOptions.push(option.id);
        this.availableOptions = this.availableOptions.filter(o => o.id !== option.id);
        const previousProfit = this.player.profit;
        const previousTrust = this.player.trust;
        this.player.applyCard(option);
        const longTerm = this.player.applyLongTerm();
        this.player.pushHistory();
        this.render();
        this.addLog(option.title, `${t('adoptionLog')}${option.description}${t('shortTermProfit')}${option.profit}${t('trustChange')}${option.trust > 0 ? '+' : ''}${option.trust}${t('longTermEffect')}${longTerm.userDelta >= 0 ? '+' : ''}${longTerm.userDelta}${t('profitDecline')}${Math.round(longTerm.longTermProfit)}.`);
        this.handleRandomEvent();
        this.player.turn += 1;
        this.currentPair = this.choosePair();
        this.render();
        this.isBusy = false;
        if (this.isGameOver()) {
          this.showGameOver();
        }
      }

      handleRandomEvent() {
        const chance = Math.random();
        const event = this.events.find(e => chance < e.chance);
        if (!event) return;
        const message = event.effect(this.player);
        this.player.clampStats();
        this.addLog(event.label, `${event.text} ${message}`);
        this.showMessage(event.label, event.text);
      }

      addLog(title, text) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerHTML = `<strong>${title}</strong><div>${text}</div>`;
        this.logContainer.prepend(entry);
        while (this.logContainer.children.length > 7) {
          this.logContainer.removeChild(this.logContainer.lastChild);
        }
      }

      showMessage(title, text) {
        this.messageCard.innerHTML = `
          <h3>${title}</h3>
          <p>${text}</p>
          <button class="button primary" id="closeMessage">${t('close')}</button>
        `;
        this.messageOverlay.classList.remove('hidden');
        document.getElementById('closeMessage').addEventListener('click', () => {
          this.messageOverlay.classList.add('hidden');
        });
      }

      isGameOver() {
        return this.player.trust <= 0 || this.player.users < 100 || this.player.regulation >= 100;
      }

      showGameOver() {
        const initialUIHtml = this.renderUIState(this.initialUI, []);
        const finalUIHtml = this.renderUIState(this.currentUI, []);
        const appliedList = this.appliedOptions.length > 0
          ? this.appliedOptions.map(id => {
              const opt = this.options.find(o => o.id === id);
              return `<li>${opt ? opt.title : id}</li>`;
            }).join('')
          : `<li>${t('noChanges')}</li>`;
        const historyTable = this.player.history.map(entry => `<li>${t('turn')} ${entry.turn}: ${t('profit')} ${t('profitUnit')}${entry.profit}, ${t('trust')} ${entry.trust}, ${t('users')} ${entry.users}, ${t('review')} ${entry.review.toFixed(1)}, ${t('flameRisk')} ${entry.flame}</li>`).join('');
        this.messageCard.innerHTML = `
          <h3>${t('gameOverTitle')}</h3>
          <p>${t('gameOverNote')}</p>
          <div class="summary-grid">
            <div class="summary-card"><h4>${t('initialUI')}</h4>${initialUIHtml}</div>
            <div class="summary-card"><h4>${t('finalUI')}</h4>${finalUIHtml}</div>
          </div>
          <div class="summary-card">
            <h4>${t('appliedElementsLabel')}</h4>
            <ul class="summary-list">${appliedList}</ul>
          </div>
          <div class="summary-card">
            <h4>${t('transitions')}</h4>
            <ul class="summary-list">${historyTable}</ul>
          </div>
          <button class="button primary" id="restartButton">${t('retryGame')}</button>
        `;
        this.messageOverlay.classList.remove('hidden');
        document.getElementById('restartButton').addEventListener('click', () => {
          this.reset();
          this.messageOverlay.classList.add('hidden');
        });
      }

      reset() {
        this.player = new Player();
        this.currentUI = new UIState();
        this.initialUI = this.currentUI.clone();
        this.availableOptions = [...this.options];
        this.appliedOptions = [];
        this.currentPair = this.choosePair();
        this.logContainer.innerHTML = '';
        this.render();
        this.addLog(t('gameRestart'), t('gameRestartNote'));
        this.isBusy = false;
      }
    }

    const game = new Game();
    initLanguageButtons();
    // Apply saved/initial language to update all texts
    setLanguage(currentLanguage);
