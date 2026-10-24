'use strict';

/* ---- Mobile navigation ---- */
function setNavOpen(isOpen) {
  var menu = document.getElementById('navMobile');
  var toggle = document.getElementById('navToggle');
  if (!menu || !toggle) return;

  menu.hidden = !isOpen;
  menu.classList.toggle('open', isOpen);
  toggle.setAttribute('aria-expanded', String(isOpen));

  var label = toggle.querySelector('.brand-menu-toggle-label');
  var icon = toggle.querySelector('.brand-menu-toggle-icon');
  if (label) label.textContent = isOpen ? 'Close' : 'Menu';
  if (icon) icon.textContent = isOpen ? '\u00d7' : '+';
}

function toggleNav() {
  var menu = document.getElementById('navMobile');
  if (menu) setNavOpen(menu.hidden);
}

(function () {
  var menu = document.getElementById('navMobile');
  var toggle = document.getElementById('navToggle');
  if (!menu || !toggle) return;

  menu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      setNavOpen(false);
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !menu.hidden) {
      setNavOpen(false);
      toggle.focus();
    }
  });
}());

/* ---- Event checklist progress ---- */
(function () {
  var checklistPage = document.querySelector('.checklist-page');
  if (!checklistPage) return;

  var checkboxes = Array.prototype.slice.call(
    checklistPage.querySelectorAll('.checklist-items input[type="checkbox"]')
  );
  var resetButton = document.getElementById('resetChecklist');
  var progressElement = document.getElementById('checklistProgress');
  var saveStatusElement = document.getElementById('checklistSaveStatus');
  var storageKey = 'sjft-event-checklist-progress-v1';

  if (!checkboxes.length) return;

  function setProgress() {
    var complete = checkboxes.filter(function (checkbox) {
      return checkbox.checked;
    }).length;
    if (progressElement) {
      progressElement.textContent = complete + ' of ' + checkboxes.length + ' items complete';
    }
  }

  function setSaveStatus(message) {
    if (saveStatusElement) saveStatusElement.textContent = message;
  }

  function readProgress() {
    try {
      var saved = JSON.parse(window.localStorage.getItem(storageKey) || '{}');
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return;
      checkboxes.forEach(function (checkbox) {
        checkbox.checked = saved[checkbox.id] === true;
      });
    } catch (error) {
      setSaveStatus('Progress will remain only for this visit because device storage is unavailable.');
    }
  }

  function saveProgress() {
    var progress = {};
    checkboxes.forEach(function (checkbox) {
      progress[checkbox.id] = checkbox.checked;
    });

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(progress));
      setSaveStatus('Progress saves on this device only.');
    } catch (error) {
      setSaveStatus('Progress will remain only for this visit because device storage is unavailable.');
    }
  }

  function resetProgress() {
    checkboxes.forEach(function (checkbox) {
      checkbox.checked = false;
    });
    try {
      window.localStorage.removeItem(storageKey);
      setSaveStatus('Checklist reset. Progress saves on this device only.');
    } catch (error) {
      setSaveStatus('Checklist reset for this visit. Device storage is unavailable.');
    }
    setProgress();
  }

  readProgress();
  setProgress();

  checkboxes.forEach(function (checkbox) {
    checkbox.addEventListener('change', function () {
      saveProgress();
      setProgress();
    });
  });

  if (resetButton) {
    resetButton.addEventListener('click', function () {
      resetProgress();
      resetButton.focus();
    });
  }
}());

/* ---- Directory search & filter ---- */
(function () {
  var searchInput = document.getElementById('dirSearch');
  var countyBtns = document.querySelectorAll('.filter-btn[data-county]');
  var cuisineBtns = document.querySelectorAll('.filter-btn[data-cuisine]');
  var sortBtns = document.querySelectorAll('.filter-btn[data-sort]');
  var grid = document.getElementById('truckGrid');
  var countEl = document.getElementById('dirCount');
  var clearFiltersBtn = document.getElementById('clearDirFilters');
  var copyLinkBtn = document.getElementById('copyDirLink');
  var shareStatus = document.getElementById('dirShareStatus');
  var shareFallback = document.getElementById('dirShareFallback');
  var shareUrlInput = document.getElementById('dirShareUrl');
  var shareAttempt = 0;

  if (!searchInput) return;

  var activeCounty = '';
  var activeCuisine = '';
  var activeSort = 'default';
  var searchHistoryTimer = null;
  var searchHistoryOpen = false;

  // Capture original DOM order once
  var cards = Array.prototype.slice.call(document.querySelectorAll('.truck-card[data-name]'));
  var originalOrder = cards.slice();

  function normalize(s) { return (s || '').toLowerCase(); }

  function directoryUrl() {
    var params = new URLSearchParams(window.location.search);
    params.delete('q');
    params.delete('county');
    params.delete('cuisine');
    params.delete('sort');
    if (searchInput.value.trim()) params.set('q', searchInput.value.trim());
    if (activeCounty) params.set('county', activeCounty);
    if (activeCuisine) params.set('cuisine', activeCuisine);
    if (activeSort !== 'default') params.set('sort', activeSort);
    var query = params.toString();
    return window.location.pathname + (query ? '?' + query : '') + window.location.hash;
  }

  function syncDirectoryUrl(mode) {
    var nextUrl = directoryUrl();
    var currentUrl = window.location.pathname + window.location.search + window.location.hash;
    if (nextUrl === currentUrl) return;
    window.history[mode + 'State']({ directoryFilters: true }, '', nextUrl);
  }

  function setPressed(buttons, activeValue, dataKey) {
    buttons.forEach(function (btn) {
      var active = Boolean(activeValue) && btn.dataset[dataKey] === activeValue;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function hasActiveFilters() {
    return Boolean(searchInput.value.trim() || activeCounty || activeCuisine || activeSort !== 'default');
  }

  function updateClearFiltersButton() {
    if (clearFiltersBtn) clearFiltersBtn.hidden = !hasActiveFilters();
    if (copyLinkBtn) {
      copyLinkBtn.hidden = !hasActiveFilters();
      copyLinkBtn.disabled = false;
    }
    shareAttempt++;
    if (shareStatus) shareStatus.textContent = '';
    if (shareFallback) shareFallback.hidden = true;
    if (shareUrlInput) shareUrlInput.value = '';
  }

  function resetSearchHistorySession() {
    searchHistoryOpen = false;
    if (searchHistoryTimer) {
      window.clearTimeout(searchHistoryTimer);
      searchHistoryTimer = null;
    }
  }

  function restoreDirectoryState() {
    var params = new URLSearchParams(window.location.search);
    activeCounty = params.get('county') || '';
    activeCuisine = params.get('cuisine') || '';
    activeSort = params.get('sort') === 'recently-verified' ? 'recently-verified' : 'default';
    searchInput.value = params.get('q') || '';
    setPressed(countyBtns, activeCounty, 'county');
    setPressed(cuisineBtns, activeCuisine, 'cuisine');
    setPressed(sortBtns, activeSort, 'sort');
    applyFilters();
  }

  function applyFilters() {
    var q = normalize(searchInput.value);
    var shown = 0;

    // Determine card order based on sort
    var ordered;
    if (activeSort === 'recently-verified') {
      ordered = cards.slice().sort(function (a, b) {
        var da = a.dataset.lastVerified || '';
        var db = b.dataset.lastVerified || '';
        if (db > da) return 1;
        if (db < da) return -1;
        return 0;
      });
    } else {
      ordered = originalOrder.slice();
    }

    // Re-insert cards in the sorted order (before noResults sentinel)
    var noResults = document.getElementById('noResults');
    ordered.forEach(function (c) {
      grid.insertBefore(c, noResults);
    });

    // Apply visibility
    ordered.forEach(function (c) {
      var name = normalize(c.dataset.name || '');
      var county = normalize(c.dataset.county || '');
      var cuisine = normalize(c.dataset.cuisine || '');
      var city = normalize(c.dataset.city || '');
      var matchQ = !q || name.includes(q) || county.includes(q) || cuisine.includes(q) || city.includes(q);
      var matchCounty = !activeCounty || county === normalize(activeCounty);
      var matchCuisine = !activeCuisine || cuisine === normalize(activeCuisine);
      var visible = matchQ && matchCounty && matchCuisine;
      c.classList.toggle('hidden', !visible);
      if (visible) shown++;
    });

    var noResultsEl = document.getElementById('noResults');
    if (noResultsEl) noResultsEl.classList.toggle('hidden', shown > 0);

    if (countEl) {
      countEl.textContent = shown + ' truck' + (shown !== 1 ? 's' : '') + ' found';
    }
    updateClearFiltersButton();
  }

  searchInput.addEventListener('input', function () {
    applyFilters();
    if (!searchHistoryOpen) {
      window.history.pushState({ directoryFilters: true }, '', window.location.pathname + window.location.search + window.location.hash);
      searchHistoryOpen = true;
    }
    syncDirectoryUrl('replace');
    if (searchHistoryTimer) window.clearTimeout(searchHistoryTimer);
    searchHistoryTimer = window.setTimeout(resetSearchHistorySession, 500);
  });

  countyBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      resetSearchHistorySession();
      countyBtns.forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      if (activeCounty === btn.dataset.county) {
        activeCounty = '';
      } else {
        activeCounty = btn.dataset.county;
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      }
      applyFilters();
      syncDirectoryUrl('push');
    });
  });

  cuisineBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      resetSearchHistorySession();
      cuisineBtns.forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      if (activeCuisine === btn.dataset.cuisine) {
        activeCuisine = '';
      } else {
        activeCuisine = btn.dataset.cuisine;
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      }
      applyFilters();
      syncDirectoryUrl('push');
    });
  });

  sortBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      resetSearchHistorySession();
      sortBtns.forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      activeSort = btn.dataset.sort;
      applyFilters();
      syncDirectoryUrl('push');
    });
  });

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', function () {
      resetSearchHistorySession();
      activeCounty = '';
      activeCuisine = '';
      activeSort = 'default';
      searchInput.value = '';
      setPressed(countyBtns, activeCounty, 'county');
      setPressed(cuisineBtns, activeCuisine, 'cuisine');
      setPressed(sortBtns, activeSort, 'sort');
      applyFilters();
      syncDirectoryUrl('push');
      clearFiltersBtn.focus();
    });
  }

  if (copyLinkBtn && shareStatus && shareFallback && shareUrlInput) {
    copyLinkBtn.addEventListener('click', async function () {
      if (!hasActiveFilters()) return;
      var attempt = ++shareAttempt;
      var url = new URL(directoryUrl(), window.location.href).href;
      copyLinkBtn.disabled = true;
      shareFallback.hidden = true;
      shareStatus.textContent = 'Copying link…';
      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
          throw new Error('Clipboard unavailable');
        }
        await navigator.clipboard.writeText(url);
        if (attempt === shareAttempt) shareStatus.textContent = 'Link copied!';
      } catch (error) {
        if (attempt !== shareAttempt) return;
        shareStatus.textContent = 'Automatic copy is unavailable. Copy the selected link below.';
        shareFallback.hidden = false;
        shareUrlInput.value = url;
        shareUrlInput.focus();
        shareUrlInput.select();
      } finally {
        if (attempt === shareAttempt) copyLinkBtn.disabled = false;
      }
    });
    shareUrlInput.addEventListener('click', function () { shareUrlInput.select(); });
  }

  window.addEventListener('popstate', function () {
    resetSearchHistorySession();
    restoreDirectoryState();
  });

  restoreDirectoryState();

  // Hero search redirect
  var heroForm = document.getElementById('heroSearchForm');
  if (heroForm) {
    heroForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var val = document.getElementById('heroSearchInput').value.trim();
      window.location.href = '/directory' + (val ? '?q=' + encodeURIComponent(val) : '');
    });
  }
}());

/* ---- FAQ accordion ---- */
(function () {
  var questions = document.querySelectorAll('.faq-question');
  function setExpanded(button, expanded) {
    button.classList.toggle('open', expanded);
    button.setAttribute('aria-expanded', String(expanded));
    if (button.nextElementSibling) {
      button.nextElementSibling.classList.toggle('open', expanded);
      button.nextElementSibling.hidden = !expanded;
    }
  }
  questions.forEach(function (btn, index) {
    var answer = btn.nextElementSibling;
    if (!answer) return;
    answer.id = answer.id || 'faq-answer-' + index;
    btn.setAttribute('aria-controls', answer.id);
    setExpanded(btn, false);
    btn.addEventListener('click', function () {
      var isOpen = btn.classList.contains('open');
      questions.forEach(function (button) { setExpanded(button, false); });
      if (!isOpen) setExpanded(btn, true);
    });
  });
}());

/* ---- Site-content assistant ---- */
(function () {
  var launcher = document.getElementById('assistantLauncher');
  var panel = document.getElementById('assistantPanel');
  var closeButton = document.getElementById('assistantClose');
  var clearButton = document.getElementById('assistantClear');
  var form = document.getElementById('assistantForm');
  var input = document.getElementById('assistantInput');
  var sendButton = document.getElementById('assistantSend');
  var messagesElement = document.getElementById('assistantMessages');
  var statusElement = document.getElementById('assistantStatus');
  if (!launcher || !panel || !form || !input || !messagesElement) return;

  var history = [];
  var loadingElement = null;
  var isLoading = false;

  function scrollMessages() {
    messagesElement.scrollTop = messagesElement.scrollHeight;
  }

  function appendMessage(role, text, sources) {
    var item = document.createElement('div');
    item.className = 'assistant-message assistant-message-' + role;

    var label = document.createElement('span');
    label.className = 'assistant-message-label';
    label.textContent = role === 'user' ? 'You' : 'Guide assistant';
    item.appendChild(label);

    var copy = document.createElement('p');
    copy.textContent = text;
    item.appendChild(copy);

    if (role === 'assistant' && Array.isArray(sources) && sources.length) {
      var sourceWrap = document.createElement('div');
      sourceWrap.className = 'assistant-sources';
      var sourceLabel = document.createElement('span');
      sourceLabel.textContent = 'Related site pages';
      sourceWrap.appendChild(sourceLabel);
      var sourceList = document.createElement('ul');
      sources.forEach(function (source) {
        if (!source || typeof source.title !== 'string' || !/^\/(?!\/)/.test(source.url || '')) return;
        var listItem = document.createElement('li');
        var link = document.createElement('a');
        link.href = source.url;
        link.textContent = source.title;
        listItem.appendChild(link);
        sourceList.appendChild(listItem);
      });
      if (sourceList.children.length) {
        sourceWrap.appendChild(sourceList);
        item.appendChild(sourceWrap);
      }
    }

    messagesElement.appendChild(item);
    scrollMessages();
  }

  function renderWelcome() {
    appendMessage('assistant', 'Hi! Ask me about food trucks, cuisines, counties, or planning an event in South Jersey.');
  }

  function setOpen(open) {
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
    launcher.classList.toggle('is-hidden', open);
    if (open) {
      if (!messagesElement.children.length) renderWelcome();
      window.setTimeout(function () { input.focus(); }, 0);
    } else {
      launcher.focus();
    }
  }

  function setLoading(loading) {
    isLoading = loading;
    input.disabled = loading;
    sendButton.disabled = loading;
    clearButton.disabled = loading;
    if (loading) {
      loadingElement = document.createElement('div');
      loadingElement.className = 'assistant-message assistant-message-assistant assistant-loading';
      loadingElement.textContent = 'Looking through the site content…';
      messagesElement.appendChild(loadingElement);
      statusElement.textContent = 'The guide assistant is finding an answer.';
      scrollMessages();
    } else {
      if (loadingElement) loadingElement.remove();
      loadingElement = null;
      statusElement.textContent = '';
      input.disabled = false;
      sendButton.disabled = false;
      clearButton.disabled = false;
    }
  }

  launcher.addEventListener('click', function () { setOpen(true); });
  closeButton.addEventListener('click', function () { setOpen(false); });

  clearButton.addEventListener('click', function () {
    history = [];
    messagesElement.textContent = '';
    statusElement.textContent = 'Chat cleared.';
    renderWelcome();
    input.value = '';
    input.focus();
  });

  input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (form.requestSubmit) form.requestSubmit();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !panel.hidden) setOpen(false);
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (isLoading) return;
    var question = input.value.trim();
    if (!question) {
      input.focus();
      return;
    }

    var requestHistory = history.slice(-8);
    appendMessage('user', question);
    history.push({ role: 'user', content: question });
    input.value = '';
    setLoading(true);

    fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ message: question, history: requestHistory })
    })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (body) {
          if (!response.ok) throw new Error(body.error || 'The assistant is unavailable right now.');
          return body;
        });
      })
      .then(function (body) {
        setLoading(false);
        var answer = typeof body.answer === 'string' && body.answer.trim()
          ? body.answer.trim()
          : 'I could not find enough information on this site to answer that.';
        appendMessage('assistant', answer, body.sources);
        history.push({ role: 'assistant', content: answer });
        history = history.slice(-8);
        statusElement.textContent = 'Answer received.';
        input.focus();
      })
      .catch(function (error) {
        setLoading(false);
        appendMessage('assistant', error.message || 'The assistant is unavailable right now. Please try again.');
        statusElement.textContent = 'The assistant could not answer. Please try again.';
        input.focus();
      });
  });
}());
