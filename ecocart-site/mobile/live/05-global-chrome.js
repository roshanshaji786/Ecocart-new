/* EcoCart mobile: global chrome helpers. Vanilla JS, no jQuery, safe to run twice. */
(function(){
  function ready(f){document.readyState!=='loading'?f():document.addEventListener('DOMContentLoaded',f)}
  ready(function(){
    var b=document.body;if(!b||b.dataset.ecMobileChrome)return;b.dataset.ecMobileChrome='1';
    var X='<svg viewBox="0 0 22 22" aria-hidden="true"><path d="M1.705.294.291 1.71l19.997 19.997 1.414-1.415L1.705.294Z"/><path d="M20.288.294.29 20.291l1.414 1.415L21.702 1.709 20.288.294Z"/></svg>';

    // 1. Bottom bar: mark the tab for the current page
    var here=location.pathname.replace(/\/+$/,'')||'/';
    document.querySelectorAll('.klb-mobile-bottom .mobile-menu a[href]').forEach(function(a){
      var h=a.getAttribute('href');if(!h||h.charAt(0)==='#')return;
      var u;try{u=new URL(h,location.href)}catch(e){return}
      if(u.host!==location.host)return;
      var p=u.pathname.replace(/\/+$/,'')||'/';
      if(p===here||(p!=='/'&&here.indexOf(p+'/')===0)){a.classList.add('ec-current');a.setAttribute('aria-current','page')}
    });

    // 2. Search: header icon + close button inside the full-screen search
    var bar=document.querySelector('.klb-mobile-bottom a.search'),panel=document.querySelector('.klb-mobile-search');
    function toggleSearch(){
      var was=b.classList.contains('mobile-search-active');
      bar.click(); // theme handler (if loaded) toggles body.mobile-search-active
      if(b.classList.contains('mobile-search-active')===was){b.classList.toggle('mobile-search-active',!was);bar.classList.toggle('active',!was)}
      if(!was){var i=panel.querySelector('input[type=search]');if(i)try{i.focus({preventScroll:true})}catch(e){}}
    }
    var left=document.querySelector('.header-mobile .header-inner > .col:first-child');
    if(left&&!left.querySelector('.ec-hsearch')){
      var s=document.createElement('a');s.className='ec-hsearch';s.href='/?post_type=product&s=';s.setAttribute('role','button');s.setAttribute('aria-label','Search products');
      s.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
      s.addEventListener('click',function(e){if(bar&&panel){e.preventDefault();toggleSearch()}});
      left.appendChild(s);
    }
    var head=panel&&panel.querySelector('.mobile-search-header');
    if(head&&bar&&!head.querySelector('.ec-sclose')){
      var c=document.createElement('button');c.type='button';c.className='ec-sclose';c.setAttribute('aria-label','Close search');c.innerHTML=X;
      c.addEventListener('click',function(){if(b.classList.contains('mobile-search-active'))toggleSearch()});
      head.insertBefore(c,head.firstChild);
    }

    // 3. Drawer: hide an empty "Browse Categories" block; flag the drawer as open when the
    //    bottom-bar Categories button opens it (the theme only sets drawer-active for the menu button)
    document.querySelectorAll('.site-drawer .drawer-menu').forEach(function(n){
      if(n.children.length)return;n.classList.add('ec-empty');
      var h=n.previousElementSibling;if(h&&h.classList.contains('drawer-heading'))h.classList.add('ec-empty');
    });
    var cat=document.querySelector('.klb-mobile-bottom a.categories'),drawer=document.querySelector('.site-drawer');
    if(cat&&drawer)cat.addEventListener('click',function(){
      setTimeout(function(){if(+getComputedStyle(drawer).opacity>0)b.classList.add('drawer-active')},80);
    });

    // 4. Cookie notice: short button label so the strip stays one row
    var gb=document.querySelector('.site-gdpr .gdpr-button .button');
    if(gb&&/accept cookies/i.test(gb.textContent))gb.textContent='Accept';
  });
})();
