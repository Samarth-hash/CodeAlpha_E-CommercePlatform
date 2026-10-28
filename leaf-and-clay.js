/*
 * Leaf & Clay – complete e-commerce store in ONE file.
 *
 * Run in the VS Code terminal:
 *   npm init -y
 *   npm install express
 *   node leaf-and-clay.js      ->  http://localhost:3000
 *
 * Features: product listing (search + filter), product details,
 * shopping cart, checkout with server-side order processing.
 * Orders are saved to orders.json next to this file.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ORDERS_FILE = path.join(__dirname, 'orders.json');
app.use(express.json());

// ======================= PRODUCT CATALOGUE =======================
// PRODUCTS_START
const PRODUCTS = [
  { id: 1, name: 'Monstera Deliciosa', category: 'Plants', price: 34, stock: 12, emoji: '🌿', color: '#cfe3d4', description: 'A fast-growing climber with split, glossy leaves. Happy in bright, indirect light; water when the top 5 cm of soil is dry.' },
  { id: 2, name: 'Snake Plant', category: 'Plants', price: 22.5, stock: 20, emoji: '🪴', color: '#d9e6c9', description: 'Nearly impossible to kill. Tolerates low light and irregular watering.' },
  { id: 3, name: 'Fiddle Leaf Fig', category: 'Plants', price: 48, stock: 6, emoji: '🌳', color: '#c5dcd0', description: 'A statement tree with large violin-shaped leaves. Likes a steady spot near a bright window.' },
  { id: 4, name: 'Cactus Trio', category: 'Plants', price: 18, stock: 15, emoji: '🌵', color: '#e3e8c4', description: 'Three small desert cacti in 6 cm pots. Water once a month and give them all the sun you have.' },
  { id: 5, name: 'Stoneware Planter', category: 'Pots', price: 26, stock: 18, emoji: '🏺', color: '#e8d9cc', description: 'Hand-glazed 18 cm stoneware pot with a drainage hole and matching saucer.' },
  { id: 6, name: 'Brass Watering Can', category: 'Tools', price: 29, stock: 9, emoji: '🫖', color: '#efe2b8', description: 'A long-spout 1 litre can that reaches under leaves and into tight corners.' },
  { id: 7, name: 'Pruning Shears', category: 'Tools', price: 16.5, stock: 25, emoji: '✂️', color: '#d8dde3', description: 'Stainless steel bypass shears with a locking blade and a comfortable grip.' },
  { id: 8, name: 'Potting Mix, 10 L', category: 'Supplies', price: 11, stock: 40, emoji: '🪱', color: '#d9cfc4', description: 'Peat-free, well-draining mix for indoor plants. Enough to repot three medium plants.' }
];
// PRODUCTS_END

// ======================= ORDERS (JSON file) =======================
let orders = [];
try { orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8')); } catch (e) { orders = []; }
const saveOrders = () => fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
const round2 = n => Math.round(n * 100) / 100;
const SHIPPING = 5.99, FREE_OVER = 50;

// ======================= API =======================
app.get('/api/products', (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim(), cat = req.query.category || '';
  res.json(PRODUCTS.filter(p => (!cat || p.category === cat) &&
    (!q || (p.name + ' ' + p.description).toLowerCase().includes(q))));
});

app.get('/api/products/:id', (req, res) => {
  const p = PRODUCTS.find(p => p.id === Number(req.params.id));
  p ? res.json(p) : res.status(404).json({ error: 'Product not found.' });
});

app.post('/api/orders', (req, res) => {
  const { customer, items } = req.body || {};
  if (!customer || !customer.name || !/^\S+@\S+\.\S+$/.test(customer.email || '') || !customer.address)
    return res.status(400).json({ error: 'Enter your name, a valid email and a delivery address.' });
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Your cart is empty.' });

  const wanted = new Map(); // merge duplicates so stock can't be bypassed
  for (const it of items) {
    const id = Number(it.id), qty = Math.floor(Number(it.qty));
    if (!(qty > 0)) return res.status(400).json({ error: 'Invalid quantity in cart.' });
    wanted.set(id, (wanted.get(id) || 0) + qty);
  }
  const lines = [];
  for (const [id, qty] of wanted) {
    const p = PRODUCTS.find(p => p.id === id);
    if (!p) return res.status(400).json({ error: 'An item in your cart no longer exists.' });
    if (qty > p.stock) return res.status(409).json({ error: `Only ${p.stock} of "${p.name}" left in stock.` });
    lines.push({ id, name: p.name, price: p.price, qty }); // price always from the server
  }
  lines.forEach(l => { PRODUCTS.find(p => p.id === l.id).stock -= l.qty; });
  const subtotal = round2(lines.reduce((s, l) => s + l.price * l.qty, 0));
  const shipping = subtotal >= FREE_OVER ? 0 : SHIPPING;
  const order = {
    id: 'ORD-' + Date.now().toString(36).toUpperCase(), status: 'processing', createdAt: new Date().toISOString(),
    customer: { name: customer.name.trim(), email: customer.email.trim(), address: customer.address.trim() },
    items: lines, subtotal, shipping, total: round2(subtotal + shipping)
  };
  orders.push(order); saveOrders();
  res.status(201).json(order);
});

app.get('/api/orders/:id', (req, res) => {
  const o = orders.find(o => o.id === req.params.id);
  o ? res.json(o) : res.status(404).json({ error: 'Order not found.' });
});

// ======================= FRONTEND: CSS =======================
const CSS = String.raw`
:root{--bg:#f5f6f2;--ink:#17302a;--muted:#5d6f68;--line:#d9dfd8;--card:#fff;--acc:#17302a;--onacc:#fff;--hi:#e9c84a;--err:#a3321f}
@media (prefers-color-scheme:dark){:root{--bg:#101a17;--ink:#e8efe9;--muted:#9fb3aa;--line:#2b3b36;--card:#17251f;--acc:#e9c84a;--onacc:#17302a;--err:#ff9a86}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
h1,h2,.brand,.price{font-family:Georgia,"Iowan Old Style",serif}
h1{font-size:clamp(1.8rem,4vw,2.6rem);line-height:1.15;margin:0 0 1.2rem}
a{color:inherit}:focus-visible{outline:3px solid var(--hi);outline-offset:2px}
.top{display:flex;justify-content:space-between;align-items:center;padding:1rem clamp(1rem,4vw,3rem);border-bottom:1px solid var(--line);background:var(--card);position:sticky;top:0;z-index:5}
.brand{font-size:1.5rem;font-weight:700;text-decoration:none}.cartlink{text-decoration:none;font-weight:600}
#badge{display:inline-block;min-width:1.5em;padding:0 .4em;border-radius:1em;background:var(--hi);color:#17302a;text-align:center;font-size:.85rem}
main{max-width:1100px;margin:0 auto;padding:2rem clamp(1rem,4vw,3rem) 4rem}
.controls{display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:1.5rem}
input,select,textarea,button{font:inherit}
input,select,textarea{padding:.6rem .8rem;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--ink);width:100%}
.controls input{flex:1 1 240px;width:auto}.controls select{width:auto}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:1.25rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden;display:flex;flex-direction:column}
.thumb{display:grid;place-items:center;font-size:4.5rem;aspect-ratio:4/3;text-decoration:none}
.card .body{padding:1rem;display:flex;flex-direction:column;gap:.35rem;flex:1}
.card h2{font-size:1.15rem;margin:0}.card h2 a{text-decoration:none}
.meta{color:var(--muted);font-size:.9rem}.price{font-size:1.2rem;font-weight:700}
.row{margin-top:auto;display:flex;justify-content:space-between;align-items:center;padding-top:.6rem}
.btn{background:var(--acc);color:var(--onacc);border:0;border-radius:6px;padding:.6rem 1.1rem;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block}
.btn:hover{filter:brightness(1.15)}.btn[disabled]{opacity:.5;cursor:not-allowed}
.back{display:inline-block;margin-bottom:1.5rem;color:var(--muted)}
.detail{display:grid;grid-template-columns:1fr 1fr;gap:2.5rem;align-items:start}
.big{font-size:9rem;border-radius:10px;aspect-ratio:1;display:grid;place-items:center}
.detail .price{font-size:1.8rem;margin:.5rem 0}.detail .btn{margin-left:.75rem}
.qty{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:6px;background:var(--card)}
.qty button{border:0;background:none;color:var(--ink);width:2.2rem;height:2.2rem;cursor:pointer;font-size:1.1rem}
.qty span{min-width:2rem;text-align:center}.low{color:var(--err)}
.layout{display:grid;grid-template-columns:1.6fr 1fr;gap:2rem;align-items:start}
.line{display:grid;grid-template-columns:64px 1fr auto;gap:1rem;align-items:center;padding:1rem 0;border-bottom:1px solid var(--line)}
.line .t{width:64px;height:64px;border-radius:8px;display:grid;place-items:center;font-size:2rem}
.link{background:none;border:0;color:var(--muted);text-decoration:underline;cursor:pointer;padding:0}
.panel{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:1.25rem}
.panel h2{margin:0 0 .75rem;font-size:1.25rem}
.sum{display:flex;justify-content:space-between;padding:.2rem 0}.total{font-weight:700;border-top:1px solid var(--line);margin-top:.5rem;padding-top:.6rem}
label{display:block;margin:.8rem 0 .25rem;font-weight:600;font-size:.95rem}
.error{color:var(--err);margin:.75rem 0 0}.done{max-width:560px}
.toast{position:fixed;bottom:1.25rem;left:50%;transform:translateX(-50%);background:var(--acc);color:var(--onacc);padding:.7rem 1.2rem;border-radius:6px;opacity:0;pointer-events:none;transition:opacity .2s}
.toast.show{opacity:1}
@media(max-width:760px){.detail,.layout{grid-template-columns:1fr}.big{font-size:6rem}}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
`;

// ======================= FRONTEND: JS (runs in the browser) =======================
// CLIENT_START
function client() {
  const $ = s => document.querySelector(s), app = $('#app');
  const money = n => '$' + Number(n).toFixed(2);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SHIP = 5.99, FREE = 50; // display only; the server recalculates

  let mem = []; try { mem = JSON.parse(localStorage.getItem('cart')) || []; } catch (e) {}
  const badge = () => { $('#badge').textContent = mem.reduce((n, l) => n + l.qty, 0); };
  const Cart = {
    save(c) { mem = c; try { localStorage.setItem('cart', JSON.stringify(c)); } catch (e) {} badge(); },
    add(id, n = 1) { const c = mem.map(l => ({ ...l })), l = c.find(x => x.id === id); l ? l.qty += n : c.push({ id, qty: n }); this.save(c); },
    set(id, n) { this.save(mem.map(l => l.id === id ? { ...l, qty: n } : l).filter(l => l.qty > 0)); },
    qty: id => (mem.find(l => l.id === Number(id)) || { qty: 0 }).qty
  };
  let timer;
  const toast = m => {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
    t.textContent = m; t.classList.add('show'); clearTimeout(timer); timer = setTimeout(() => t.classList.remove('show'), 1800);
  };
  const api = async (u, o) => {
    const r = await fetch(u, o), d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Something went wrong.');
    return d;
  };

  const filters = { q: '', cat: '' };
  let view = ['home'], catalogue = {};
  const go = (...v) => { view = v; window.scrollTo(0, 0); render(); };
  const render = () => { badge(); ({ home, product, cart })[view[0]](view[1]); };

  const card = p => `
    <article class="card">
      <a class="thumb" href="#" data-go="product:${p.id}" style="background:${p.color}" aria-label="${esc(p.name)}">${p.emoji}</a>
      <div class="body">
        <h2><a href="#" data-go="product:${p.id}">${esc(p.name)}</a></h2>
        <span class="meta">${esc(p.category)}</span>
        <div class="row"><span class="price">${money(p.price)}</span>
          <button class="btn" data-add="${p.id}" ${p.stock ? '' : 'disabled'}>${p.stock ? 'Add to cart' : 'Sold out'}</button></div>
      </div>
    </article>`;

  async function home() {
    const all = await api('/api/products');
    app.innerHTML = `<h1>Plants that forgive beginners</h1>
      <div class="controls"><input id="q" type="search" placeholder="Search plants, pots, tools" aria-label="Search products" value="${esc(filters.q)}">
      <select id="cat" aria-label="Category"><option value="">All categories</option>${[...new Set(all.map(p => p.category))].map(c => `<option ${c === filters.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
      <div id="grid" class="grid"></div>`;
    const load = async () => {
      filters.q = $('#q').value; filters.cat = $('#cat').value;
      const list = await api(`/api/products?q=${encodeURIComponent(filters.q)}&category=${encodeURIComponent(filters.cat)}`);
      $('#grid').innerHTML = list.length ? list.map(card).join('') : '<p>No products match. Try another word or category.</p>';
    };
    $('#q').oninput = load; $('#cat').onchange = load; load();
  }

  async function product(id) {
    try {
      const p = await api('/api/products/' + encodeURIComponent(id));
      app.innerHTML = `<a class="back" href="#" data-go="home">Back to shop</a>
        <div class="detail"><div class="big" style="background:${p.color}">${p.emoji}</div>
        <div><span class="meta">${esc(p.category)}</span><h1>${esc(p.name)}</h1>
          <div class="price">${money(p.price)}</div><p>${esc(p.description)}</p>
          <p class="meta ${p.stock < 8 ? 'low' : ''}">${p.stock ? p.stock + ' in stock' : 'Sold out'}</p>
          <div class="qty"><button id="minus" aria-label="Decrease">−</button><span id="n">1</span><button id="plus" aria-label="Increase">+</button></div>
          <button class="btn" id="add" ${p.stock ? '' : 'disabled'}>Add to cart</button></div></div>`;
      let n = 1; const show = () => { $('#n').textContent = n; };
      $('#minus').onclick = () => { n = Math.max(1, n - 1); show(); };
      $('#plus').onclick = () => { n = Math.min(p.stock, n + 1); show(); };
      $('#add').onclick = () => { Cart.add(p.id, n); toast(n + ' added to cart'); };
    } catch (e) { app.innerHTML = `<p>${esc(e.message)} <a href="#" data-go="home">Browse all products</a></p>`; }
  }

  async function cart() {
    catalogue = Object.fromEntries((await api('/api/products')).map(p => [p.id, p]));
    const lines = mem.filter(l => catalogue[l.id]);
    if (!lines.length) { app.innerHTML = '<h1>Your cart</h1><p>Your cart is empty. <a href="#" data-go="home">Find something green</a>.</p>'; return; }
    const sub = lines.reduce((s, l) => s + catalogue[l.id].price * l.qty, 0), ship = sub >= FREE ? 0 : SHIP;
    app.innerHTML = `<h1>Your cart</h1><div class="layout"><div>${lines.map(l => { const p = catalogue[l.id]; return `
      <div class="line"><div class="t" style="background:${p.color}">${p.emoji}</div>
        <div><a href="#" data-go="product:${p.id}"><strong>${esc(p.name)}</strong></a><br><span class="meta">${money(p.price)} each</span><br>
          <button class="link" data-rm="${p.id}">Remove</button></div>
        <div style="text-align:right"><div class="qty"><button data-dec="${p.id}" aria-label="Decrease">−</button><span>${l.qty}</span><button data-inc="${p.id}" aria-label="Increase">+</button></div>
          <div class="price">${money(p.price * l.qty)}</div></div></div>`; }).join('')}</div>
      <div class="panel"><h2>Checkout</h2>
        <div class="sum"><span>Subtotal</span><span>${money(sub)}</span></div>
        <div class="sum"><span>Shipping</span><span>${ship ? money(ship) : 'Free'}</span></div>
        <div class="sum total"><span>Total</span><span>${money(sub + ship)}</span></div>
        <form id="f" novalidate>
          <label for="name">Full name</label><input id="name" autocomplete="name">
          <label for="email">Email</label><input id="email" type="email" autocomplete="email">
          <label for="addr">Delivery address</label><textarea id="addr" rows="3" autocomplete="street-address"></textarea>
          <p class="error" id="err" role="alert"></p>
          <button class="btn" style="width:100%;margin-top:1rem">Place order</button>
        </form></div></div>`;
    $('#f').onsubmit = async e => {
      e.preventDefault();
      const btn = e.target.querySelector('button'); btn.disabled = true;
      try {
        const o = await api('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer: { name: $('#name').value, email: $('#email').value, address: $('#addr').value }, items: mem }) });
        Cart.save([]);
        app.innerHTML = `<div class="done panel"><h2>Order placed</h2><p>Thanks, ${esc(o.customer.name)}. Your order <strong>${esc(o.id)}</strong> is being processed.</p>
          <p>Total: <strong>${money(o.total)}</strong></p><a class="btn" href="#" data-go="home">Keep shopping</a></div>`;
      } catch (err) { $('#err').textContent = err.message; btn.disabled = false; }
    };
  }

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-go],[data-add],[data-rm],[data-inc],[data-dec]');
    if (!el) return;
    e.preventDefault();
    const d = el.dataset;
    if (d.go) return go(...d.go.split(':'));
    if (d.add) { Cart.add(Number(d.add)); return toast('Added to cart'); }
    if (d.rm) Cart.set(Number(d.rm), 0);
    if (d.inc) Cart.set(Number(d.inc), Math.min(catalogue[d.inc].stock, Cart.qty(d.inc) + 1));
    if (d.dec) Cart.set(Number(d.dec), Cart.qty(d.dec) - 1);
    render();
  });
  render();
}
// CLIENT_END

// ======================= PAGE + START =======================
const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Leaf &amp; Clay – Plants and pots</title>
<style>${CSS}</style></head><body>
<header class="top"><a class="brand" href="#" data-go="home">Leaf &amp; Clay</a><a class="cartlink" href="#" data-go="cart">Cart <span id="badge">0</span></a></header>
<main id="app"></main>
<script>(${client})()</script></body></html>`;

app.get('/', (req, res) => res.type('html').send(PAGE));
app.listen(PORT, () => console.log(`Store running at http://localhost:${PORT}`));
