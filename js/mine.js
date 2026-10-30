// Экран «Мои»: объявления с этого телефона, их статус, предложения цены, «Мастер найден».
import { icon, kindById } from './icons.js';
import { esc, ago, money, priceText } from './util.js';
import { photo } from './ui.js';
import { offersBlock } from './board.js';
import * as store from './store.js';

const STATE = {
  wait: ['state-wait', 'На проверке'],
  ok: ['state-ok', 'На доске'],
  no: ['state-no', 'Не прошло проверку'],
  off: ['state-off', 'Снято с доски'],
  done: ['state-done', 'Мастер найден'],
};

function item(x) {
  const k = kindById(x.kind);
  const isReq = x.type === 'requests';
  const [cls, label] = STATE[x.status] || STATE.wait;
  const acts = [];
  if (isReq && x.status === 'ok') acts.push(`<button class="btn btn-ink" data-act="found" data-id="${x.id}">Мастер найден</button>`);
  acts.push(`<button class="btn btn-line" data-act="del" data-type="${x.type}" data-id="${x.id}">Удалить</button>`);
  const cost = isReq ? (x.budget ? `до ${money(x.budget)}` : 'договорная') : priceText(x, true);
  return `<li class="mine-item">
    ${photo(x.photos?.[0], k, '', 160)}</div>
    <p class="mine-kind">${isReq ? 'Заявка' : 'Услуга'} · ${k.name} · ${ago(x.at)}</p>
    <h3>${esc(isReq ? x.text : x.title)} <span class="num">· ${cost}</span></h3>
    <p><span class="state ${cls}">${label}</span></p>
    ${isReq && x.status !== 'wait' ? `<div class="offers-wrap">${offersBlock(x)}</div>` : ''}
    <div class="mine-acts">${acts.join('')}</div>
  </li>`;
}

export function mineScreen() {
  const list = store.mine();
  return `<div class="scr">
    <h1>Мои объявления</h1>
    <p class="scr-lead">Объявления, которые вы разместили с этого телефона.</p>
    ${list.length ? `<ul class="mine">${list.map(item).join('')}</ul>` : `<div class="empty-mine">
      <p>Вы пока ничего не разместили.</p>
      <a class="btn btn-ink" href="#/razmestit">Разместить ${icon('arrow')}</a>
    </div>`}
  </div>`;
}
