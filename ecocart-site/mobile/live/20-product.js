/* EcoCart mobile: single product pages (area product2). Vanilla JS, no jQuery, safe to run twice. */
(function(){
  function ready(f){document.readyState!=='loading'?f():document.addEventListener('DOMContentLoaded',f)}
  ready(function(){
    var b=document.body;if(!b||!b.classList.contains('single-product')||b.dataset.ecProd)return;b.dataset.ecProd=1;
    var mq=window.matchMedia('(max-width:767px)');

    // 1. Shipping is a flat Rs 55: hide checklist lines that promise free/complimentary shipping.
    document.querySelectorAll('.product-detail .product-checklist li,.woocommerce-product-details__short-description li').forEach(function(li){
      if(/free\s+shipping|complimentary\s+shipping|free\s+delivery/i.test(li.textContent)){var u=li.parentNode;(u&&u.children.length===1&&u.tagName==='UL'?u:li).style.display='none'}
    });

    // 2. Long description: clamp on phones with a "Read more" button (text stays in the page).
    var d=document.getElementById('tab-description');
    if(d&&mq.matches&&d.scrollHeight>900&&!document.querySelector('.ec-more-desc')){
      d.classList.add('ec-clamp');
      var m=document.createElement('button');m.type='button';m.className='ec-more-desc';m.textContent='Read full description';
      m.addEventListener('click',function(){d.classList.remove('ec-clamp');m.remove()});
      d.parentNode.insertBefore(m,d.nextSibling);
      document.querySelectorAll('.woocommerce-tabs .tabs a').forEach(function(a){a.addEventListener('click',function(){
        var on=a.getAttribute('href')==='#tab-description'&&d.classList.contains('ec-clamp');m.style.display=on?'':'none'})});
    }

    // 3. Slim sticky buy bar above the bottom bar, shown only while the real buttons are off screen.
    var real=document.querySelector('.product-detail form.cart .single_add_to_cart_button:not(#buyNowBtn)');
    var form=real&&real.closest('form.cart');
    if(!real||document.querySelector('.ec-sbar')||!('IntersectionObserver' in window))return;
    var title=((document.querySelector('.product_title')||{}).textContent||'').trim();
    var bar=document.createElement('div');bar.className='ec-sbar';bar.setAttribute('aria-hidden','true');
    bar.innerHTML='<div class="ec-sbar__info"><span class="ec-sbar__t"></span><span class="ec-sbar__p"></span></div><button type="button" class="ec-sbar__b" tabindex="-1"></button>';
    bar.querySelector('.ec-sbar__t').textContent=title;
    var btn=bar.querySelector('.ec-sbar__b'),pr=bar.querySelector('.ec-sbar__p');
    function needsChoice(){return real.classList.contains('disabled')||real.classList.contains('wc-variation-selection-needed')}
    function sync(){
      var v=document.querySelector('.product-detail .single_variation .price');
      var p=(v&&v.offsetParent&&v.textContent.trim())?v:document.querySelector('.product-detail .product-price .price,.product-detail .summary .price,.product-detail>.price');
      pr.innerHTML=p?p.innerHTML:'';
      btn.textContent=needsChoice()?'Choose options':(real.textContent.trim()||'Add to basket');
    }
    btn.addEventListener('click',function(){
      sync();
      if(needsChoice()){(form.querySelector('.variations')||form).scrollIntoView({behavior:'smooth',block:'center'});return}
      real.click();
    });
    b.appendChild(bar);sync();
    if(form)form.addEventListener('change',function(){setTimeout(sync,80)});
    if(form)form.addEventListener('click',function(){setTimeout(sync,120)});
    var seen=false;
    new IntersectionObserver(function(es){es.forEach(function(e){seen=e.isIntersecting;b.classList.toggle('ec-sbar-on',!seen&&mq.matches);if(!seen)sync()})},{rootMargin:'0px 0px -60px 0px'}).observe(form);
    // drawers/popups of the theme add classes on body or html; hide the bar while one is open
    var dr=document.querySelector('.site-drawer');
    if(dr&&'MutationObserver' in window)new MutationObserver(function(){b.classList.toggle('ec-drawer-open',dr.classList.contains('active')||dr.classList.contains('open'))}).observe(dr,{attributes:true,attributeFilter:['class']});
  });
})();
