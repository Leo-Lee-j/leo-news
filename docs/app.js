(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { data: null, filter: 'all', query: '' };
  const categoryNames = {};
  const toast = (message) => {
    let node = $('.toast');
    if (!node) { node = document.createElement('div'); node.className = 'toast'; node.setAttribute('role', 'status'); document.body.appendChild(node); }
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 2100);
  };
  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (value = '') => {
    try { const url = new URL(value, window.location.href); return ['http:', 'https:'].includes(url.protocol) ? url.href : '#'; }
    catch { return '#'; }
  };
  const flatItems = () => state.data.sections.flatMap(section => section.items.map(item => ({ ...item, sectionId: section.id, sectionTitle: section.title, shortTitle: section.shortTitle })));
  const filteredItems = () => flatItems().filter(item => {
    const categoryMatch = state.filter === 'all' || item.sectionId === state.filter;
    const haystack = [item.title, item.summary, item.source, item.language, ...(item.tags || [])].join(' ').toLowerCase();
    return categoryMatch && (!state.query || haystack.includes(state.query.toLowerCase()));
  });
  const formatDate = (dateString) => {
    const date = new Date(`${dateString}T12:00:00`);
    if (Number.isNaN(date.getTime())) return dateString || '';
    return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: '2-digit', year: 'numeric' }).format(date).toUpperCase();
  };
  const itemHref = (item) => safeUrl(item.url || item.sourceUrl || '#');
  const typeBadge = (item) => `<span class="type-label">${escapeHtml(item.shortTitle || item.sectionTitle || 'UPDATE')}</span>`;
  const tagsHtml = (tags = []) => tags.length ? `<div class="topic-tags">${tags.map(tag => `<span class="topic-tag">${escapeHtml(tag)}</span>`).join('')}</div>` : '';

  function renderHeader() {
    const data = state.data;
    $('#editionDate').textContent = formatDate(data.date);
    $('#dailyIntro').textContent = data.intro || '收集重要更新，保持简洁，持续归档。';
    $('#readTime').textContent = data.readTime || `约 ${Math.max(1, Math.round(flatItems().length * 0.45))} 分钟阅读`;
    $('#itemCount').textContent = `${flatItems().length} 条精选内容`;
    $('#issueNumber').textContent = data.issue || String(new Date(data.date).getDate()).padStart(3, '0');
    $('#metricTopics').textContent = String(data.sections.length).padStart(2, '0');
    $('#metricEntries').textContent = String(flatItems().length).padStart(2, '0');
    $('#metricTasks').textContent = String((data.tasks || []).length).padStart(2, '0');
    $('#allCount').textContent = flatItems().length;
    $('#updatedAt').textContent = data.updatedAt || '今日更新';
    $('#metricNoteText').textContent = data.isDemo ? '当前展示样例数据 · 接入任务后自动更新' : '每日更新 · 按主题归档 · 持续扩展';
    document.title = `Muse Daily — ${data.date || '每日技术简报'}`;
  }

  function renderFilters() {
    const counts = Object.fromEntries(state.data.sections.map(section => [section.id, section.items.length]));
    const tabs = [`<button class="filter-tab ${state.filter === 'all' ? 'is-selected' : ''}" data-filter="all" type="button">全部内容 <span class="tab-count" id="allCount">${flatItems().length}</span></button>`];
    state.data.sections.forEach(section => {
      categoryNames[section.id] = section.shortTitle || section.title;
      tabs.push(`<button class="filter-tab ${state.filter === section.id ? 'is-selected' : ''}" data-filter="${escapeHtml(section.id)}" type="button">${escapeHtml(section.shortTitle || section.title)} <span class="tab-count">${counts[section.id]}</span></button>`);
    });
    $('#filterTabs').innerHTML = tabs.join('');
    $$('#filterTabs [data-filter]').forEach(button => button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      renderFilters(); renderContent();
    }));
  }

  function renderFeatured(items) {
    const feature = items.find(item => item.featured) || items[0];
    const section = $('#featuredSection');
    if (!feature || state.query || (state.filter !== 'all' && state.filter !== feature.sectionId)) { section.hidden = true; return; }
    section.hidden = false;
    $('#featuredCard').innerHTML = `
      <div class="featured-content">
        <div class="content-labels">${typeBadge(feature)}<span class="rank-label">TODAY'S PICK</span></div>
        <h2 class="featured-title">${escapeHtml(feature.title)}</h2>
        <p class="featured-summary">${escapeHtml(feature.summary)}</p>
        <div class="story-footer"><span class="source-line"><span class="source-dot"></span>${escapeHtml(feature.source || feature.sectionTitle)}</span><a class="story-link" href="${itemHref(feature)}" target="_blank" rel="noopener noreferrer">查看项目 <span>↗</span></a></div>
      </div>
      <div class="featured-art" aria-hidden="true"><div class="art-glyph">{ }</div><div class="art-caption">OPEN / EXPLORE</div></div>`;
  }

  function renderStory(item, index) {
    const meta = [];
    if (item.language) meta.push(`<span class="meta-chip lang"><span class="mini-dot"></span>${escapeHtml(item.language)}</span>`);
    if (item.stars) meta.push(`<span class="meta-chip">☆ ${escapeHtml(item.stars)} stars</span>`);
    if (item.trend) meta.push(`<span class="meta-chip">↗ ${escapeHtml(item.trend)} today</span>`);
    if (item.source) meta.push(`<span class="meta-chip">${escapeHtml(item.source)}</span>`);
    return `<article class="story-card">
      <div class="story-rank">${escapeHtml(item.rank || String(index + 1).padStart(2, '0'))}</div>
      <div class="story-main">
        <h3 class="story-title"><a href="${itemHref(item)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3>
        <p class="story-summary">${escapeHtml(item.summary || '')}</p>
        <div class="story-meta">${meta.join('')}</div>
        ${tagsHtml(item.tags || [])}
      </div>
    </article>`;
  }

  function renderSections(items) {
    const grouped = new Map();
    state.data.sections.forEach(section => grouped.set(section.id, { section, items: [] }));
    items.forEach(item => { if (grouped.has(item.sectionId)) grouped.get(item.sectionId).items.push(item); });
    const html = [];
    let visibleSectionIndex = 0;
    for (const [id, group] of grouped.entries()) {
      if (!group.items.length) continue;
      if (!state.query && (state.filter === 'all' || group.items.some(item => item.featured)) && group.items.some(item => item.featured)) {
        const remaining = group.items.filter(item => !item.featured);
        if (!remaining.length) continue;
        group.items = remaining;
      }
      visibleSectionIndex += 1;
      html.push(`<section class="content-section" id="${escapeHtml(id)}">
        <div class="content-section-heading"><div><div class="section-title-wrap"><span class="section-index">${String(visibleSectionIndex).padStart(2, '0')}</span><h2>${escapeHtml(group.section.title)}</h2></div><p class="section-description">${escapeHtml(group.section.description || '')}</p></div><span class="section-count">${group.items.length} ITEMS</span></div>
        <div class="story-list">${group.items.map((item, i) => renderStory(item, i)).join('')}</div>
      </section>`);
    }
    $('#sectionsContainer').innerHTML = html.join('');
  }

  function renderSidebar() {
    const digest = state.data.digest || [];
    $('#digestList').innerHTML = digest.slice(0, 3).map((item, index) => `<div class="digest-item"><span class="digest-num">0${index + 1}</span><p class="digest-copy"><strong>${escapeHtml(item.title)}</strong><br />${escapeHtml(item.text)}</p></div>`).join('');
    $('#taskList').innerHTML = (state.data.tasks || []).map(task => `<div class="task-item"><div class="task-icon">${escapeHtml(task.icon || '·')}</div><div><p class="task-name">${escapeHtml(task.name)}</p><div class="task-detail">${escapeHtml(task.detail || '')}</div></div><span class="task-time">${escapeHtml(task.time || '—')}</span></div>`).join('');
  }

  function renderContent() {
    const items = filteredItems();
    renderFeatured(items);
    renderSections(items);
    renderToc();
    const hasItems = items.length > 0;
    $('#emptyState').hidden = hasItems;
    if (!hasItems) { $('#featuredSection').hidden = true; $('#sectionsContainer').innerHTML = ''; }
  }

  function renderToc() {
    const nav = $('#tocList');
    if (!nav || !state.data) return;
    nav.innerHTML = state.data.sections.map(s =>
      `<a class="toc-link" href="#${escapeHtml(s.id)}" data-section="${escapeHtml(s.id)}">` +
      `<span class="toc-dot"></span><span class="toc-name">${escapeHtml(s.shortTitle || s.title)}</span>` +
      `<span class="toc-count">${s.items.length}</span></a>`
    ).join('');
    if (renderToc.observer) renderToc.observer.disconnect();
    const links = [...nav.querySelectorAll('.toc-link')];
    const byId = Object.fromEntries(links.map(a => [a.dataset.section, a]));
    renderToc.observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          links.forEach(a => a.classList.remove('is-active'));
          const link = byId[entry.target.id];
          if (link) link.classList.add('is-active');
        }
      });
    }, { rootMargin: '-25% 0px -65% 0px' });
    state.data.sections.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) renderToc.observer.observe(el);
    });
  }

  async function init() {
    const renderAll = () => { renderHeader(); renderFilters(); renderSidebar(); renderContent(); };
    const loadJson = async (path) => {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    };
    try {
      state.data = await loadJson('./data/daily.json');
      renderAll();
      try {
        const index = await loadJson('./data/archive/index.json');
        const dates = [...new Set(index.dates || [])].sort().reverse();
        const select = $('#archiveSelect');
        if (dates.length) {
          select.innerHTML = dates.map(d => `<option value="${d}">${d}</option>`).join('');
          if (state.data.date && dates.includes(state.data.date)) select.value = state.data.date;
          select.hidden = false;
          select.addEventListener('change', async () => {
            try {
              state.data = await loadJson(`./data/archive/${select.value}.json`);
              state.filter = 'all'; state.query = ''; $('#searchInput').value = '';
              renderAll(); toast(`已切换到 ${select.value} 的日报`);
            } catch (e) { toast(`历史日报载入失败：${e && e.message ? e.message : e}`); }
          });
        }
      } catch (e) { /* archive not available yet */ }
    } catch (error) {
      console.error('Unable to load daily.json:', error);
      $('#dailyIntro').textContent = '暂时无法载入日报数据。请确认 data/daily.json 已提交到 GitHub Pages。';
      $('#sectionsContainer').innerHTML = '<div class="empty-state"><div class="empty-symbol">!</div><h3>日报数据暂不可用</h3><p>请检查 data/daily.json 路径和 JSON 格式。</p></div>';
    }
  }

  $('#searchInput').addEventListener('input', (event) => { state.query = event.target.value.trim(); renderContent(); });
  $('#clearSearch').addEventListener('click', () => { state.query = ''; state.filter = 'all'; $('#searchInput').value = ''; renderFilters(); renderContent(); });
  $('#refreshButton').addEventListener('click', async () => { await init(); toast('已重新载入日报数据'); });
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); $('#searchInput').focus(); }
    if (event.key === 'Escape' && document.activeElement === $('#searchInput')) { $('#searchInput').value = ''; state.query = ''; renderContent(); $('#searchInput').blur(); }
  });
  init();
})();
