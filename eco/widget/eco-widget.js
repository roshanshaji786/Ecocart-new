/* Eco website chat bubble. Add to ecocart.co.in with:
   <script src="https://YOUR-ECO-DOMAIN/widget/eco-widget.js" data-endpoint="https://YOUR-ECO-DOMAIN/chat" defer></script> */
(function () {
  var me = document.currentScript;
  var endpoint = me && me.getAttribute('data-endpoint');
  if (!endpoint) return;
  var KEY = 'eco_session';
  var session = '';
  try { session = localStorage.getItem(KEY) || ''; } catch (e) {}

  var css = '#eco-btn{position:fixed;right:16px;bottom:88px;z-index:99999;width:56px;height:56px;border-radius:50%;border:0;background:#2e7d32;color:#fff;font:600 15px/1 system-ui;box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer}' +
    '#eco-box{position:fixed;right:16px;bottom:152px;z-index:99999;width:min(360px,calc(100vw - 32px));height:min(480px,70vh);background:#fff;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden;font:14px/1.45 system-ui;color:#1b1b1b}' +
    '#eco-box.open{display:flex}#eco-head{background:#2e7d32;color:#fff;padding:12px 14px;font-weight:600}#eco-head small{display:block;font-weight:400;opacity:.85}' +
    '#eco-log{flex:1;overflow-y:auto;padding:12px;background:#f4f7f2}.eco-m{max-width:85%;margin:0 0 8px;padding:8px 11px;border-radius:12px;white-space:pre-wrap;word-wrap:break-word}' +
    '.eco-u{margin-left:auto;background:#dcf3d6}.eco-b{background:#fff;border:1px solid #e3e8e0}.eco-m a{color:#1b5e20}' +
    '#eco-form{display:flex;border-top:1px solid #e3e8e0}#eco-in{flex:1;border:0;padding:12px;font:inherit;outline:none;color:#1b1b1b;background:#fff}#eco-send{border:0;background:#2e7d32;color:#fff;padding:0 16px;font:inherit;cursor:pointer}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var btn = document.createElement('button'); btn.id = 'eco-btn'; btn.type = 'button'; btn.textContent = 'Eco'; btn.setAttribute('aria-label', 'Chat with Eco');
  var box = document.createElement('div'); box.id = 'eco-box';
  box.innerHTML = '<div id="eco-head">Eco from EcoCart<small>Ask me about gifts, honey, offers or your order</small></div><div id="eco-log"></div><form id="eco-form"><input id="eco-in" autocomplete="off" placeholder="Type a message..." maxlength="800"><button id="eco-send">Send</button></form>';
  document.body.appendChild(btn); document.body.appendChild(box);
  var log = box.querySelector('#eco-log'), form = box.querySelector('#eco-form'), input = box.querySelector('#eco-in');

  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function add(text, who) {
    var d = document.createElement('div'); d.className = 'eco-m ' + (who === 'u' ? 'eco-u' : 'eco-b');
    d.innerHTML = esc(text).replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
  }
  btn.onclick = function () {
    box.classList.toggle('open');
    if (!log.childNodes.length) add('Hi! I am Eco 🌿 Looking for a gift, Kerala honey or something plastic-free? New here? Use FIRST50 for Rs 50 off above Rs 499.', 'b');
    input.focus();
  };
  form.onsubmit = function (e) {
    e.preventDefault();
    var text = input.value.trim(); if (!text) return;
    input.value = ''; add(text, 'u');
    var wait = add('Eco is typing...', 'b');
    fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, session: session }) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        wait.remove(); if (d.session) { session = d.session; try { localStorage.setItem(KEY, session); } catch (e) {} }
        add(d.reply || 'Sorry, please try again.', 'b');
      })
      .catch(function () { wait.remove(); add('Connection problem. WhatsApp us at +91 70120 45854.', 'b'); });
  };
})();
