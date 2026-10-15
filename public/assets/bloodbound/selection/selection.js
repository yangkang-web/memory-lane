const data = await fetch('./data.json').then(response => {
  if (!response.ok) throw new Error('素材清单加载失败，请刷新重试。');
  return response.json();
});
const items = [...data.references, ...data.assets];
const byId = new Map(items.map(item => [item.id, item]));
const key = 'memory-lane-art-shortlist-v1';
let selected = new Set();
try {
  const saved = JSON.parse(localStorage.getItem(key) || '[]');
  if (Array.isArray(saved)) selected = new Set(saved.filter(id => typeof id === 'string' && byId.has(id)));
} catch {}
const escape = text => String(text).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const pick = item => `<button class="pick" data-pick="${item.id}" aria-pressed="false" aria-label="加入候选 ${item.id}">加入候选 +</button>`;
const picture = item => `<button class="image-button" data-zoom="${item.id}" aria-label="放大 ${item.id} ${escape(item.title)}"><img src="${escape(item.file || item.thumb)}" alt="${escape(item.title)}" width="${item.kind === 'environment' ? 2560 : 1536}" height="${item.kind === 'environment' ? 1440 : 2048}" loading="${item.id === 'P1' || item.id === 'P2' || item.id === 'P3' ? 'eager' : 'lazy'}"><span class="corner">${item.id}</span><span class="enlarge">查看大图 ↗</span></button>`;
const reference = item => `<article>${picture(item)}<div class="card-head"><h3>${escape(item.title)}</h3>${item.recommend ? '<span class="recommend">评审推荐</span>' : ''}</div><p class="note">${escape(item.note)}</p>${pick(item)}<p class="type-label">AI 生成 · 2D 美术参考</p></article>`;
document.querySelector('#portrait-grid').innerHTML = data.references.filter(item => ['P1', 'P2', 'P3'].includes(item.id)).map(reference).join('');
const costume = byId.get('P4');
document.querySelector('#costume').innerHTML = `${picture(costume)}<div><p class="eyebrow">P4 / COSTUME STUDY</p><h3>${escape(costume.title)}</h3><p class="note">${escape(costume.note)}<br>这张只确认衣摆、比例和材质方向；定妆选定后还需要统一人物身份。</p>${pick(costume)}<p class="type-label">AI 生成 · 全身造型参考</p></div>`;
document.querySelector('#environment-grid').innerHTML = data.references.filter(item => item.kind === 'environment').map(reference).join('');
document.querySelector('#asset-grid').innerHTML = data.assets.map(item => `<article class="asset-card">${picture(item)}<h3>${item.id} · ${escape(item.title)}</h3><p class="source-title">${escape(item.name)}</p><p class="asset-status">${escape(item.status)}</p><p class="note">${escape(item.note)}</p><div class="asset-actions">${pick(item)}<a href="${escape(item.url)}" target="_blank" rel="noopener noreferrer">官方 3D 预览 ↗</a></div><p class="source-credit">作者 ${escape(item.author)}<br>官方展示图 · 文件尚未导入验收</p></article>`).join('');
const label = document.querySelector('#selected-label');
const copyButton = document.querySelector('#copy-selection');
const clearButton = document.querySelector('#clear-selection');
const toast = message => {
  const node = document.querySelector('#toast');
  node.textContent = message;
  node.hidden = false;
  setTimeout(() => { node.hidden = true; }, 2600);
};
const sync = () => {
  for (const button of document.querySelectorAll('[data-pick]')) {
    const active = selected.has(button.dataset.pick);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', `${active ? '移出候选' : '加入候选'} ${button.dataset.pick}`);
    button.textContent = active ? '已加入 ✓' : '加入候选 +';
  }
  label.textContent = selected.size ? Array.from(selected).map(id => `${id} ${byId.get(id).title}`).join(' · ') : '还没有候选';
  copyButton.disabled = clearButton.disabled = selected.size === 0;
  try { localStorage.setItem(key, JSON.stringify(Array.from(selected))); } catch { toast('无法保存到浏览器，本次选择仍有效。'); }
};
const dialog = document.querySelector('#lightbox');
let lastZoom;
document.addEventListener('click', event => {
  const button = event.target.closest('[data-pick], [data-zoom]');
  if (!button) return;
  if (button.dataset.pick) {
    const id = button.dataset.pick;
    selected.has(id) ? selected.delete(id) : selected.add(id);
    sync();
  } else {
    const item = byId.get(button.dataset.zoom);
    lastZoom = button;
    document.querySelector('#lightbox-title').textContent = `${item.id} · ${item.title}`;
    const image = document.createElement('img');
    image.src = item.file || item.thumb;
    image.alt = item.title;
    document.querySelector('#lightbox-content').replaceChildren(image);
    document.querySelector('#lightbox-note').textContent = `${item.file ? '2D 美术参考' : '官方模型展示图，打开原页面可查看 3D'} · ${item.note}`;
    dialog.showModal();
    document.querySelector('#close-lightbox').focus();
  }
});
document.querySelector('#close-lightbox').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => lastZoom?.focus());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
copyButton.addEventListener('click', async () => {
  const text = Array.from(selected).map(id => {
    const item = byId.get(id);
    return `${id} · ${item.title}${item.url ? `\n${item.url}` : '（2D 参考）'}`;
  }).join('\n\n');
  try { await navigator.clipboard.writeText(text); toast('候选清单已复制，可以直接发给我。'); }
  catch { toast('复制失败；直接告诉我候选编号也可以。'); }
});
clearButton.addEventListener('click', () => { selected.clear(); sync(); });
sync();
