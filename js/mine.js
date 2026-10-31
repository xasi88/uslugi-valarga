// Экран «Мои»: объявления с этого телефона, их статус, «Нашёл человека» у работы, «Продано» у товара.
import { icon, kindOf } from './icons.js';
import { esc, ago, priceText, payText } from './util.js';
import { photo, SIZES } from './ui.js';
import * as store from './store.js';

const STATE = {
  wait: ['state-wait', 'На проверке'],
  ok: ['state-ok', 'На доске'],
  no: ['state-no', 'Не прошло проверку'],
  off: ['state-off', 'Снято с доски'],
  done: ['state-done', 'Человек найден'],
};

// Товар снят хозяином: продан или куплен
const DONE = { sell: 'Продано', buy: 'Куплено' };
const LABEL = { masters: 'Услуга', requests: 'Работа', goods: 'Товар' };

function item(x) {
  const k = kindOf(x.type, x.kind);
  const isReq = x.type === 'requests';
  const isGood = x.type === 'goods';
  const deal = x.deal === 'buy' ? 'buy' : 'sell';
  let [cls, label] = STATE[x.status] || STATE.wait;
  if (isGood && x.status === 'done') label = DONE[deal];
  const acts = [];
  if ((isReq || isGood) && x.status === 'ok') acts.push(`<button class="btn btn-ink" data-act="found" data-type="${x.type}" data-id="${x.id}">${isGood ? DONE[deal] : 'Нашёл человека'}</button>`);
  acts.push(`<button class="btn btn-line" data-act="del" data-type="${x.type}" data-id="${x.id}">Удалить</button>`);
  const cost = isReq ? payText(x) : priceText(x, true);
  return `<li class="mine-item">
    ${photo(x.photos?.[0], k, '', SIZES.thumb)}</div>
    <p class="mine-kind">${isGood && deal === 'buy' ? 'Куплю' : LABEL[x.type]} · ${k.name} · ${ago(x.at)}</p>
    <h3>${esc(isReq ? x.text : x.title)} <span class="num">· ${cost}</span></h3>
    <p><span class="state ${cls}">${label}</span></p>
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
