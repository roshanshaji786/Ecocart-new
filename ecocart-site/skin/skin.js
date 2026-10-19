/* EcoCart skin helpers for theme pages. Vanilla JS, no jQuery (LiteSpeed delays jQuery until first tap). */
(function(){
  var WA='917012045854';
  function ready(f){document.readyState!=='loading'?f():document.addEventListener('DOMContentLoaded',f)}
  ready(function(){
    var b=document.body;if(!b||b.dataset.ecSkin)return;b.dataset.ecSkin=1;

    // Cookie notice: short text and a real privacy link (theme default links to "#")
    var gd=document.querySelector('.site-gdpr .gdpr-text');
    if(gd)gd.innerHTML='We use cookies to give you a better shopping experience. <a href="/privacy-policy-2/">Privacy policy</a>';

    // Trending searches: replace leftover demo words with real products
    var kw=[['Honey','honey'],['Virgin coconut oil','coconut oil'],['Thobes','thobe'],['Gift hampers','hamper'],['Ghee','ghee'],['Spices','masala']];
    document.querySelectorAll('.search-keywords').forEach(function(ul){
      ul.innerHTML=kw.map(function(k){return '<li><a href="/?post_type=product&s='+encodeURIComponent(k[1])+'">'+k[0]+'</a></li>'}).join('')});

    // Product page: WhatsApp order button + trust strip
    if(b.classList.contains('single-product')){
      var form=document.querySelector('.product-detail form.cart');
      var title=(document.querySelector('.product_title')||{}).textContent||document.title;
      if(form&&!document.querySelector('.ec-wa')){
        var t=document.createElement('div');t.className='ec-trust';
        t.innerHTML='<span><b>🔒</b>Secure Razorpay payment</span><span><b>🚚</b>Delivered across India</span><span><b>★</b>5-star rated on Google</span>';
        var a=document.createElement('a');a.className='ec-wa';a.target='_blank';a.rel='noopener';
        a.href='https://wa.me/'+WA+'?text='+encodeURIComponent('Hi EcoCart, I want to order: '+title.trim()+'\n'+location.href.split('?')[0]);
        a.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>Order on WhatsApp';
        var anchor=document.querySelector('.product-detail .shiprocket-headless')||form;
        anchor.parentNode.insertBefore(a,anchor.nextSibling);
        a.parentNode.insertBefore(t,a.nextSibling);
      }
    }

    // Shop filters: collapse long lists (sizes, colours) behind "Show all"
    document.querySelectorAll('.widget ul').forEach(function(ul){
      if(ul.children.length<=8||ul.classList.contains('ec-collapsed')||ul.closest('.site-header,.site-footer,.site-drawer'))return;
      ul.classList.add('ec-collapsed');
      var btn=document.createElement('button');btn.type='button';btn.className='ec-more';btn.textContent='Show all ('+ul.children.length+')';
      btn.addEventListener('click',function(){ul.classList.remove('ec-collapsed');btn.remove()});
      ul.parentNode.insertBefore(btn,ul.nextSibling);
    });
  });
})();
