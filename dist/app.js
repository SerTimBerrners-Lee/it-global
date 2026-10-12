import { services } from './services.js';
import { calculateCosts } from './calculator.js';
import { contact } from './config.js';
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const money = value => Math.round(value).toLocaleString('ru-RU') + ' ₽';
const decimal = value => value.toLocaleString('ru-RU', { maximumFractionDigits: 1 });
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const selected = new Set();
let activeService;
let category = 'all';
let lastCalculation;
let previousOpener;
function openDialog(id, opener) {
  previousOpener = opener || document.activeElement;
  $$('dialog[open]').forEach(dialog => dialog.close());
  closeMenu();
  $(id).showModal();
}
function closeMenu() {
  $('#mobile-nav').hidden = true;
  $('.menu-toggle').setAttribute('aria-expanded', 'false');
  $('.menu-toggle').setAttribute('aria-label', 'Открыть меню');
}
function renderCatalog() {
  $('#catalog-grid').innerHTML = services.filter(s => category === 'all' || s.category === category).map(s =>
    '<article class="catalog-card' + (selected.has(s.id) ? ' selected' : '') + '"><span class="product-name">' + escape(s.product) + '</span><h3>' + escape(s.title) + '</h3><p>' + escape(s.description) + '</p><button class="button" type="button" data-details="' + s.id + '">Подробнее →</button>' + (selected.has(s.id) ? '<span class="catalog-selected">В заявке ✓</span>' : '') + '</article>'
  ).join('');
}
function syncSelections() {
  $$('[name="services"]').forEach(input => { input.checked = selected.has(input.value); });
  $$('[data-selection-count]').forEach(el => { el.textContent = selected.size ? ' · ' + selected.size : ''; });
  renderCatalog();
}
function showService(id, opener) {
  const s = services.find(item => item.id === id);
  if (!s) return;
  activeService = s;
  $('#service-dialog-title').textContent = s.title;
  $('#service-dialog-product').textContent = s.product;
  $('#service-dialog-detail').textContent = s.detail;
  $('#service-dialog-limitation').textContent = s.limitation;
  $('#service-dialog-license').textContent = 'Лицензия: ' + s.license;
  $('#service-dialog-link').href = s.url;
  $('#select-service').textContent = selected.has(id) ? 'Убрать из заявки −' : 'Добавить в заявку +';
  openDialog('#service-dialog', opener);
}
document.addEventListener('click', event => {
  const b = event.target.closest('button');
  if (!b) return;
  if (b.hasAttribute('data-close')) b.closest('dialog').close();
  if (b.hasAttribute('data-details')) showService(b.dataset.details, b);
  if (b.hasAttribute('data-request')) { $('#form-status').textContent = ''; openDialog('#request-dialog', b); }
  if (b.hasAttribute('data-catalog')) openDialog('#catalog-dialog', b);
  if (b.hasAttribute('data-journey')) openDialog('#journey-dialog', b);
  if (b.hasAttribute('data-calculator')) openDialog('#calculator-dialog', b);
  if (b.hasAttribute('data-filter')) {
    category = b.dataset.filter;
    $$('[data-filter]').forEach(el => { el.classList.toggle('active', el === b); el.setAttribute('aria-pressed', String(el === b)); });
    renderCatalog();
  }
  if (b.hasAttribute('data-package')) {
    b.closest('.plan-options').querySelectorAll('button').forEach(el => { el.classList.toggle('active', el === b); el.setAttribute('aria-pressed', String(el === b)); });
  }
  if (b.hasAttribute('data-plan')) {
    const active = b.closest('.plan-card').querySelector('[data-package].active');
    active.dataset.package.split(',').forEach(id => selected.add(id));
    syncSelections(); openDialog('#request-dialog', b);
  }
  if (b.hasAttribute('data-billing')) {
    const monthly = b.dataset.billing === 'monthly';
    $$('[data-billing]').forEach(el => { el.classList.toggle('active', el === b); el.setAttribute('aria-pressed', String(el === b)); });
    $('.plans-section').classList.toggle('billing-monthly', monthly);
    $$('.plan-label').forEach(el => { el.textContent = monthly ? 'Без платы за бесплатное ядро' : 'Состав внедрения'; });
    $$('.plan-cta').forEach(el => { el.innerHTML = monthly ? 'Сервер + обслуживание<small>Без обязательной подписки IT Global</small>' : 'Обсудить внедрение<small>Разовая стоимость по смете</small>'; });
  }
});
$('#select-service').addEventListener('click', () => {
  if (!activeService) return;
  selected.has(activeService.id) ? selected.delete(activeService.id) : selected.add(activeService.id);
  syncSelections();
  $('#select-service').textContent = selected.has(activeService.id) ? 'Убрать из заявки −' : 'Добавить в заявку +';
});
$('#request-options').innerHTML = services.map(s => '<label class="service-choice"><input name="services" type="checkbox" value="' + s.id + '"><span>' + escape(s.title) + '</span></label>').join('');
$('#request-options').addEventListener('change', event => {
  if (event.target.checked) selected.add(event.target.value); else selected.delete(event.target.value);
  syncSelections();
});
$('.menu-toggle').addEventListener('click', () => {
  const open = $('.menu-toggle').getAttribute('aria-expanded') !== 'true';
  $('.menu-toggle').setAttribute('aria-expanded', String(open));
  $('.menu-toggle').setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  $('#mobile-nav').hidden = !open;
});
$('#mobile-nav').addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
window.matchMedia('(min-width: 851px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
$$('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    requestAnimationFrame(() => {
      if (!$('dialog[open]') && previousOpener?.isConnected && !previousOpener.closest('dialog')) previousOpener.focus({ preventScroll: true });
    });
  });
});
$('.security-next').addEventListener('click', () => {
  const track = $('#security-track');
  const end = track.scrollWidth - track.clientWidth;
  const next = track.scrollLeft >= end - 5 ? 0 : Math.min(end, track.scrollLeft + track.querySelector('article').getBoundingClientRect().width + 12);
  track.scrollTo({ left: next, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
});
const fields = { current: $('#current-cost'), server: $('#server-cost'), extra: $('#extra-cost'), setup: $('#setup-cost') };
function updateCalculator() {
  const c = calculateCosts(Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, input.value])));
  lastCalculation = c;
  $('#before-display').textContent = money(c.before);
  $('#after-display').textContent = money(c.after);
  $('#after-small').textContent = money(c.after);
  $('#annual-savings').textContent = money(c.firstYearSavings);
  $('#first-year').textContent = money(c.firstYear);
  $('#payback').textContent = c.payback === null ? 'Не окупается' : c.setup === 0 ? 'Без разовых затрат' : decimal(Math.ceil(c.payback * 10) / 10) + ' мес.';
  $('#result-factor').textContent = c.after === 0 && c.before > 0 ? 'Нет регулярных расходов в этом расчёте' : c.before === c.after ? 'Регулярные расходы не меняются' : c.after > c.before ? 'Расходы вырастут на ' + money(c.after - c.before) : 'Снижение регулярных расходов: ' + decimal(c.factor) + '×';
  $('#bar-after').style.width = (c.before > 0 ? Math.min(100, c.after / c.before * 100) : c.after > 0 ? 100 : 0) + '%';
  $('#current-range').value = Math.min(300000, c.before);
}
Object.values(fields).forEach(input => input.addEventListener('input', updateCalculator));
$('#current-range').addEventListener('input', event => { fields.current.value = event.target.value; updateCalculator(); });
$('#reset-calc').addEventListener('click', () => {
  fields.current.value = 100000; fields.server.value = 5000; fields.extra.value = 5000; fields.setup.value = 120000; updateCalculator();
});
const emailReady = typeof contact.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email);
$('#request-submit').textContent = emailReady ? 'Открыть письмо ↗' : 'Скачать заявку ↓';
$('#request-note').textContent = emailReady ? 'Откроется почтовый клиент с готовым письмом. Отправьте его самостоятельно. Данные на сайте не сохраняются.' : 'Заявка сохранится в текстовый файл. Отправка по email будет подключена позже; данные из формы на сайте не сохраняются.';
function downloadBrief(text) {
  const url = URL.createObjectURL(new Blob(['\ufeff' + text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'it-global-request.txt'; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
$('#request-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const list = services.filter(s => selected.has(s.id)).map(s => '• ' + s.title + ' (' + s.product + ')').join('\n') || 'Нужна помощь с подбором сервисов.';
  const c = lastCalculation;
  const brief = ['Заявка на внедрение корпоративных сервисов — ' + contact.brand, '', 'Имя: ' + data.get('name'), 'Email: ' + data.get('email'), 'Компания: ' + (data.get('company') || 'Не указана'), 'Команда: ' + data.get('team'), '', 'Нужные сервисы:', list, '', 'Текущие сервисы и задача:', data.get('message') || 'Не указаны.', '', 'Предварительный расчёт (допущения посетителя, не коммерческое предложение):', 'Подписки сейчас: ' + money(c.before) + '/мес.', 'После перехода: ' + money(c.after) + '/мес.', 'Разовое внедрение: ' + money(c.setup), 'Первый год после: ' + money(c.firstYear), 'Экономия за первый год: ' + money(c.firstYearSavings), '', 'Нужно проверить функции, интеграции, нагрузку, ограничения лицензий и объём миграции.'].join('\n');
  if (emailReady) {
    const link = document.createElement('a');
    link.href = 'mailto:' + contact.email + '?subject=' + encodeURIComponent('Заявка на переход — ' + (data.get('company') || data.get('name'))) + '&body=' + encodeURIComponent(brief); link.click();
    $('#form-status').textContent = 'Письмо подготовлено. Отправьте его из почтового клиента.';
  } else { downloadBrief(brief); $('#form-status').textContent = 'Заявка подготовлена и скачана. В ней — выбранные сервисы, ваша задача и предварительный расчёт.'; }
});
renderCatalog();
updateCalculator();
