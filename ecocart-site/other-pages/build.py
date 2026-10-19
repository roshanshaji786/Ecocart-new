#!/usr/bin/env python3
"""EcoCart static pages (about, contact, FAQ, policies, landing pages, blog CTAs).

Writes out/<id>.json, one per page: {"id", "kind", "elementor": [...], "content": "..."}.
publish.py pushes them over the WP REST API. Light pages in the cream skin, forest + honey accents.
Facts used here come from the live site and WooCommerce settings on 18 Oct 2026:
  Razorpay only (UPI, cards, net banking), no COD; India zone flat rate Rs 55, free shipping off;
  address Bindu Manzil, Thiruvallam PO, Pachaloor, Thiruvananthapuram, Kerala 695027;
  Call or WhatsApp +91 70120 45854 (8891906342 retired 19 Oct 2026), contact@ecocart.co.in; since 2021; 5-star Google rating.
"""
import json, os, random, html as H

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
os.makedirs(OUT, exist_ok=True)
SITE = 'https://ecocart.co.in'
UP = SITE + '/wp-content/uploads'
WA_NUM = '917012045854'
IG = 'https://www.instagram.com/ecocart.co.in'
YT = 'https://www.youtube.com/@ecocrafts5291'
EMAIL = 'contact@ecocart.co.in'
UPDATED = '18 October 2026'


def wa(msg):
    from urllib.parse import quote
    return f'https://wa.me/{WA_NUM}?text=' + quote(msg)


# ---------- icons (lucide-style, stroke) ----------
def svg(p):
    return ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>')

I = {
    'truck': svg('<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>'),
    'shield': svg('<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="m9 12 2 2 4-4"/>'),
    'chat': svg('<path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z"/>'),
    'leaf': svg('<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.4 5.2-6.1"/>'),
    'pin': svg('<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>'),
    'mail': svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
    'phone': svg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
    'clock': svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    'return': svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
    'box': svg('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>'),
    'gift': svg('<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v9H5v-9M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>'),
    'star': svg('<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>'),
    'card': svg('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>'),
    'heart': svg('<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 12 5 5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>'),
    'users': svg('<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3"/>'),
    'arrow': svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    'search': svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'),
    'file': svg('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'),
    'sparkle': svg('<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/>'),
}
WA_ICON = ('<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>')

CSS = r'''
.ecp{--bg:#faf8f2;--card:#fff;--ink:#0d2318;--mute:#4d5f53;--dim:#7a887d;--line:rgba(13,35,24,.1);--forest:#06120c;--forest2:#0d2318;--leaf:#1f8f4e;--leaf2:#4ade80;--lime:#bef264;--honey:#f5b941;--cream:#f3efe3;
font-family:"Inter Tight",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);font-size:17px;line-height:1.65;-webkit-font-smoothing:antialiased;padding:24px 0 72px;overflow-x:clip}
.ecp *,.ecp *::before,.ecp *::after{box-sizing:border-box}
.ecp h1,.ecp h2,.ecp h3,.ecp h4,.ecp p,.ecp ul,.ecp ol,.ecp figure,.ecp blockquote{margin:0;padding:0;font-family:inherit;text-transform:none}
.ecp a{color:inherit;text-decoration:none}
.ecp img{max-width:100%;height:auto;display:block}
.ecp svg{width:20px;height:20px;flex:none}
.ecp .wrap{max-width:1180px;margin:0 auto;padding:0 20px}
.ecp .serif{font-family:"Fraunces",Georgia,serif;font-style:italic;font-weight:400;letter-spacing:-.01em}
.ecp .grad{background:linear-gradient(100deg,#d9f99d 0%,#4ade80 45%,#f5b941 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
/* hero */
.ecp .hero{position:relative;background:var(--forest);color:var(--cream);border-radius:28px;padding:clamp(36px,6vw,72px) clamp(22px,5vw,64px);overflow:hidden;isolation:isolate}
.ecp .hero::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(600px 300px at 85% 10%,rgba(74,222,128,.22),transparent 70%),radial-gradient(500px 280px at 10% 100%,rgba(245,185,65,.16),transparent 70%)}
.ecp .hero::after{content:"";position:absolute;right:-60px;bottom:-60px;width:260px;height:260px;z-index:-1;opacity:.08;background:no-repeat center/contain url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f3efe3' stroke-width='1'%3E%3Cpath d='M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z'/%3E%3Cpath d='M2 21c0-3 1.9-5.4 5.2-6.1'/%3E%3C/svg%3E")}
.ecp .eyebrow{display:inline-flex;align-items:center;gap:10px;font-size:13px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--honey)}
.ecp .eyebrow::before{content:"";width:28px;height:1px;background:currentColor}
.ecp .hero h1{margin-top:16px;font-size:clamp(34px,5.4vw,60px);line-height:1.04;font-weight:750;letter-spacing:-.035em;color:var(--cream);max-width:16ch}
.ecp .hero h1 .serif{font-weight:400}
.ecp .hero .lede{margin-top:18px;max-width:58ch;color:#c4cfc1;font-size:clamp(16px,1.6vw,19px)}
.ecp .ctas{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
.ecp .ecbtn{display:inline-flex;align-items:center;gap:10px;padding:14px 22px;border-radius:999px;font-weight:650;font-size:16px;line-height:1;background:var(--honey);color:var(--forest)!important;border:1px solid var(--honey);transition:transform .2s,background .2s,box-shadow .2s}
.ecp .ecbtn:hover{transform:translateY(-2px);box-shadow:0 10px 24px -10px rgba(245,185,65,.7)}
.ecp .ecbtn.wa{background:#1f8f4e;border-color:#1f8f4e;color:#fff!important}
.ecp .ecbtn.wa:hover{box-shadow:0 10px 24px -10px rgba(31,143,78,.7)}
.ecp .ecbtn.ghost{background:transparent;color:var(--cream)!important;border-color:rgba(243,239,227,.3)}
.ecp .ecbtn.ghost:hover{border-color:var(--lime);color:var(--lime)!important;box-shadow:none}
.ecp .ecbtn.dark{background:var(--forest);border-color:var(--forest);color:var(--cream)!important}
.ecp .ecbtn.line{background:transparent;color:var(--ink)!important;border-color:var(--line)}
.ecp .ecbtn.line:hover{border-color:var(--leaf);color:var(--leaf)!important;box-shadow:none}
.ecp .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}
.ecp .chips span,.ecp .chips a{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;border:1px solid rgba(243,239,227,.16);color:#d6dfd3;font-size:14px}
.ecp .chips svg{width:16px;height:16px;color:var(--lime)}
/* trust strip */
.ecp .trust{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:18px}
.ecp .trust div{display:flex;gap:14px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:20px;padding:18px}
.ecp .trust i,.ecp .ico{display:grid;place-items:center;width:42px;height:42px;border-radius:14px;background:#e9f5ec;color:var(--leaf);flex:none;font-style:normal}
.ecp .trust b{display:block;font-size:15.5px;line-height:1.3}
.ecp .trust small{display:block;color:var(--mute);font-size:13.5px;line-height:1.4;margin-top:3px}
/* sections */
.ecp .sec{margin-top:clamp(48px,7vw,88px)}
.ecp .kick{font-size:13px;font-weight:650;letter-spacing:.14em;text-transform:uppercase;color:var(--leaf)}
.ecp h2{font-size:clamp(28px,3.6vw,42px);line-height:1.1;font-weight:750;letter-spacing:-.03em;margin-top:10px;color:var(--ink)}
.ecp h2 .serif{color:var(--leaf)}
.ecp .sub{color:var(--mute);margin-top:12px;max-width:62ch}
.ecp .head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;margin-bottom:28px}
.ecp .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.ecp .cards.c4{grid-template-columns:repeat(4,1fr)}
.ecp .cards.c2{grid-template-columns:repeat(2,1fr)}
.ecp .card{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:24px;transition:transform .25s,box-shadow .25s,border-color .25s}
.ecp a.card:hover{transform:translateY(-3px);box-shadow:0 18px 40px -24px rgba(13,35,24,.35);border-color:rgba(31,143,78,.35)}
.ecp .card h3{font-size:19px;line-height:1.25;font-weight:700;letter-spacing:-.015em;margin-top:14px}
.ecp .card p{color:var(--mute);font-size:15.5px;margin-top:8px}
.ecp .card .go{display:inline-flex;align-items:center;gap:6px;margin-top:14px;color:var(--leaf);font-weight:650;font-size:15px}
.ecp .card .go svg{width:16px;height:16px}
.ecp .card .n{font-family:"Fraunces",serif;font-style:italic;font-size:40px;line-height:1;color:var(--leaf)}
/* split */
.ecp .split{display:grid;grid-template-columns:1.05fr 1fr;gap:clamp(24px,5vw,64px);align-items:center}
.ecp .split .pic{border-radius:24px;overflow:hidden;aspect-ratio:4/5;background:#e7e2d3}
.ecp .split .pic img{width:100%;height:100%;object-fit:cover}
.ecp .split .pic video{width:100%;height:100%;object-fit:cover;display:block}
.ecp .ticks{list-style:none;margin-top:18px;display:grid;gap:10px}
.ecp .ticks li{position:relative;padding-left:32px}
.ecp .ticks li::before{content:"";position:absolute;left:0;top:4px;width:20px;height:20px;border-radius:50%;background:#e9f5ec url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231f8f4e' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 12 4 4 8-8'/%3E%3C/svg%3E") no-repeat center/12px}
.ecp .prose .ticks li::before{top:5px}
/* prose / policy */
.ecp .doc{display:grid;grid-template-columns:260px 1fr;gap:clamp(24px,4vw,56px);align-items:start}
.ecp .toc{position:sticky;top:110px;background:var(--card);border:1px solid var(--line);border-radius:20px;padding:20px}
.ecp .toc b{display:block;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);margin-bottom:10px}
.ecp .toc a{display:block;padding:7px 0;color:var(--mute);font-size:15px;border-top:1px solid var(--line)}
.ecp .toc a:first-of-type{border-top:0}
.ecp .toc a:hover{color:var(--leaf)}
.ecp .prose{max-width:760px}
.ecp .prose h2{font-size:clamp(22px,2.4vw,27px);margin-top:44px;scroll-margin-top:110px}
.ecp .prose h2:first-child{margin-top:0}
.ecp .prose h3{font-size:18px;font-weight:700;margin-top:24px}
.ecp .prose p,.ecp .prose ul,.ecp .prose ol{margin-top:14px;color:#2b3d32}
.ecp .prose ul,.ecp .prose ol{padding-left:22px}
.ecp .prose li{margin-top:6px}
.ecp .prose a{color:var(--leaf);text-decoration:underline;text-underline-offset:3px}
.ecp .prose strong{color:var(--ink)}
.ecp .glance{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:0 0 36px}
.ecp .glance div{background:#f0ede2;border-radius:18px;padding:18px}
.ecp .glance b{display:block;font-size:22px;letter-spacing:-.02em;line-height:1.15}
.ecp .glance span{display:block;color:var(--mute);font-size:14px;margin-top:4px;line-height:1.4}
.ecp .note{margin-top:22px;background:#fff7e3;border:1px solid #f3dfa6;border-radius:16px;padding:16px 18px;font-size:15.5px;color:#5b4710}
.ecp .updated{display:block;margin-top:14px;color:#a9b5a6;font-size:14px}
/* faq */
.ecp .faq{display:grid;gap:10px}
.ecp .faq details{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:0 22px;transition:border-color .2s}
.ecp .faq details[open]{border-color:rgba(31,143,78,.35)}
.ecp .faq summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 0;font-weight:650;font-size:17px;line-height:1.35}
.ecp .faq summary::-webkit-details-marker{display:none}
.ecp .faq summary::after{content:"+";flex:none;display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#e9f5ec;color:var(--leaf);font-size:20px;font-weight:500;transition:transform .2s}
.ecp .faq details[open] summary::after{transform:rotate(45deg)}
.ecp .faq .a{padding:0 0 20px;color:var(--mute)}
.ecp .faq .a p+p{margin-top:10px}
.ecp .faq .a a{color:var(--leaf);text-decoration:underline;text-underline-offset:3px}
.ecp .faq-group{margin-top:40px}
.ecp .faq-group h2{font-size:clamp(22px,2.4vw,28px);margin-bottom:16px;scroll-margin-top:110px}
/* cta band */
.ecp .band{position:relative;background:var(--forest);color:var(--cream);border-radius:28px;padding:clamp(32px,5vw,56px);display:flex;justify-content:space-between;align-items:center;gap:24px;flex-wrap:wrap;overflow:hidden;isolation:isolate}
.ecp .band::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(520px 260px at 90% 0%,rgba(245,185,65,.2),transparent 70%),radial-gradient(420px 260px at 0% 100%,rgba(74,222,128,.16),transparent 70%)}
.ecp .band h2{color:var(--cream);margin:0;font-size:clamp(26px,3.2vw,38px);max-width:22ch}
.ecp .band p{color:#c4cfc1;margin-top:10px;max-width:52ch}
.ecp .band .ctas{margin-top:0}
/* contact */
.ecp .contact{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.ecp .way{display:flex;gap:16px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:22px;padding:22px;transition:transform .25s,box-shadow .25s,border-color .25s}
.ecp a.way:hover{transform:translateY(-3px);box-shadow:0 18px 40px -24px rgba(13,35,24,.35);border-color:rgba(31,143,78,.35)}
.ecp .way b{display:block;font-size:17px}
.ecp .way span{display:block;color:var(--ink);font-weight:600;margin-top:2px;word-break:break-word}
.ecp .way small{display:block;color:var(--mute);font-size:14px;margin-top:4px}
.ecp .way.hot{background:#0f2a1c;border-color:#0f2a1c;color:var(--cream)}
.ecp .way.hot b,.ecp .way.hot span{color:var(--cream)}
.ecp .way.hot small{color:#b7c2b4}
.ecp .way.hot .ico{background:#1f8f4e;color:#fff}
.ecp .formcard{background:var(--card);border:1px solid var(--line);border-radius:24px;padding:clamp(22px,3vw,36px)}
/* team */
.ecp .team{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.ecp .team figure{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:22px;text-align:center}
.ecp .team img{width:112px;height:112px;border-radius:50%;object-fit:cover;margin:0 auto;border:4px solid #f0ede2}
.ecp .team b{display:block;margin-top:14px;font-size:17px}
.ecp .team small{display:block;color:var(--mute);font-size:14px}
/* reviews */
.ecp .reviews{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px;scrollbar-width:thin}
.ecp .reviews figure{flex:0 0 min(70%,280px);scroll-snap-align:start;border-radius:20px;overflow:hidden;border:1px solid var(--line);background:#fff}
.ecp blockquote{font-family:"Fraunces",Georgia,serif;font-style:italic;font-size:clamp(20px,2.2vw,26px);line-height:1.4;color:var(--ink)}
.ecp blockquote cite{display:block;margin-top:12px;font-family:"Inter Tight",system-ui,sans-serif;font-style:normal;font-size:14px;color:var(--mute)}
.ecp .stars{color:var(--honey);letter-spacing:3px;font-size:20px}
/* steps */
.ecp .steps{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;counter-reset:s}
.ecp .steps div{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:20px;counter-increment:s}
.ecp .steps div::before{content:counter(s,decimal-leading-zero);display:block;font-family:"Fraunces",serif;font-style:italic;font-size:30px;color:var(--leaf);line-height:1}
.ecp .steps b{display:block;margin-top:10px}
.ecp .steps p{color:var(--mute);font-size:15px;margin-top:4px}
/* form shortcode area (outside .ecp so plugin markup keeps its own spacing) */
.ecp-form{max-width:1180px;margin:20px auto 0;padding:0 20px;font-family:"Inter Tight",system-ui,sans-serif}
.ecp-form .in{background:#fff;border:1px solid rgba(13,35,24,.1);border-radius:24px;padding:clamp(22px,3vw,36px);max-width:820px}
.ecp-form label{font-weight:600;font-size:15px;color:#0d2318}
.ecp-form input[type=text],.ecp-form input[type=email],.ecp-form input[type=tel],.ecp-form textarea{width:100%;border:1px solid rgba(13,35,24,.16)!important;border-radius:14px!important;padding:12px 16px!important;background:#faf8f2!important;font:inherit;color:#0d2318}
.ecp-form textarea{min-height:140px}
.ecp-form input:focus,.ecp-form textarea:focus{outline:2px solid #4ade80;outline-offset:1px;border-color:#1f8f4e!important}
.ecp-form input[type=submit],.ecp-form button[type=submit],.ecp-form .button{background:#06120c!important;color:#f3efe3!important;border:0!important;border-radius:999px!important;padding:14px 26px!important;font-weight:650;cursor:pointer}
.ecp-form input[type=submit]:hover,.ecp-form button[type=submit]:hover,.ecp-form .button:hover{background:#1f8f4e!important}
.ecp-form .woocommerce-form-track-order p{margin:0 0 14px}
/* product shortcode area */
.ecp-products{max-width:1180px;margin:0 auto;padding:0 20px}
.ecp-products .woocommerce{margin-top:6px}
@media (max-width:1024px){.ecp .trust{grid-template-columns:repeat(2,1fr)}.ecp .cards.c4,.ecp .team,.ecp .steps{grid-template-columns:repeat(2,1fr)}.ecp .doc{grid-template-columns:1fr}.ecp .toc{position:static;display:flex;flex-wrap:wrap;gap:8px;padding:14px}.ecp .toc b{width:100%;margin-bottom:2px}.ecp .toc a,.ecp .toc a:first-of-type{border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:14px}}
/* ---------- phones (mobile-first pass, 18 Oct night) ---------- */
@media (max-width:760px){
.ecp{font-size:16px;padding:10px 0 64px}
.ecp .wrap,.ecp-products,.ecp-form{padding:0 14px}
.ecp .hero{border-radius:20px;padding:26px 20px 24px}
.ecp .hero::after{width:150px;height:150px;right:-40px;bottom:-40px}
.ecp .eyebrow{font-size:12.5px;letter-spacing:.11em;gap:8px}
.ecp .eyebrow::before{width:18px}
.ecp .hero h1{font-size:clamp(28px,8.6vw,36px);line-height:1.08;margin-top:12px;max-width:none}
.ecp .hero .lede{font-size:15.5px;line-height:1.55;margin-top:12px}
.ecp .ctas{margin-top:20px;gap:10px}
.ecp .ecbtn{padding:14px 18px;font-size:16px;min-height:50px}
.ecp .ctas .ecbtn{flex:1 1 100%;justify-content:center}
.ecp .chips{flex-wrap:nowrap;overflow-x:auto;margin:18px -20px 0;padding:0 20px 2px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.ecp .chips::-webkit-scrollbar,.ecp .toc::-webkit-scrollbar{display:none}
.ecp .chips span,.ecp .chips a{flex:none;white-space:nowrap;font-size:13.5px;padding:8px 14px;min-height:40px}
.ecp .trust{grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.ecp .trust div{flex-direction:column;gap:8px;padding:13px;border-radius:16px}
.ecp .trust i{width:34px;height:34px;border-radius:11px}
.ecp .trust i svg{width:18px;height:18px}
.ecp .trust b{font-size:14.5px}
.ecp .trust small{font-size:13px}
.ecp .sec{margin-top:44px}
.ecp h2{font-size:clamp(24px,7.2vw,30px)}
.ecp .head{margin-bottom:18px;gap:14px}
.ecp .head .ecbtn{width:100%;justify-content:center}
.ecp .sub{font-size:15.5px}
.ecp .cards,.ecp .cards.c2,.ecp .cards.c4:not(.gal),.ecp .split,.ecp .contact{grid-template-columns:1fr;gap:10px}
.ecp .cards.gal{grid-template-columns:1fr 1fr;gap:8px}
.ecp .card{padding:18px;border-radius:18px}
.ecp .card h3{font-size:18px;margin-top:10px}
.ecp .card .n{font-size:32px}
.ecp .card .go{min-height:40px;margin-top:6px}
.ecp .split{gap:22px}
.ecp .split .pic{aspect-ratio:1/1;border-radius:18px}
.ecp .ticks{gap:8px}
.ecp .steps{grid-template-columns:1fr 1fr;gap:8px}
.ecp .steps div{padding:14px;border-radius:16px}
.ecp .steps div::before{font-size:24px}
.ecp .steps b{font-size:15.5px;margin-top:6px}
.ecp .steps p{font-size:14px}
.ecp .team{grid-template-columns:1fr 1fr;gap:8px}
.ecp .team figure{padding:16px 10px;border-radius:18px}
.ecp .team img{width:84px;height:84px}
.ecp .team b{font-size:15.5px;margin-top:10px}
.ecp .reviews figure{flex-basis:80%}
.ecp blockquote{font-size:19px}
.ecp .doc{gap:18px}
.ecp .toc{display:flex;flex-wrap:nowrap;overflow-x:auto;gap:8px;margin:0 -14px;padding:2px 14px 6px;background:transparent;border:0;border-radius:0;scrollbar-width:none}
.ecp .toc b{display:none}
.ecp .toc a,.ecp .toc a:first-of-type{flex:none;white-space:nowrap;display:inline-flex;align-items:center;min-height:40px;padding:8px 14px;border:1px solid var(--line);border-radius:999px;background:#fff;font-size:14px;color:var(--ink)}
.ecp .glance{grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:28px}
.ecp .glance div{padding:12px 10px;border-radius:14px}
.ecp .glance b{font-size:16.5px}
.ecp .glance span{font-size:13px}
.ecp .prose h2{font-size:21px;margin-top:32px}
.ecp .prose p,.ecp .prose ul,.ecp .prose ol{font-size:16px}
.ecp .faq-group{margin-top:30px}
.ecp .faq details{padding:0 16px;border-radius:16px}
.ecp .faq summary{font-size:16px;padding:15px 0;min-height:56px}
.ecp .faq summary::after{width:28px;height:28px}
.ecp .way{padding:16px;border-radius:18px;gap:14px}
.ecp .band{border-radius:20px;padding:26px 20px;gap:18px}
.ecp .band h2{font-size:clamp(23px,6.6vw,28px)}
.ecp .band .ctas{width:100%}
.ecp-form{margin-top:14px}
.ecp-form .in{padding:20px 16px;border-radius:18px}
.ecp-form input[type=text],.ecp-form input[type=email],.ecp-form input[type=tel],.ecp-form textarea{font-size:16px!important}
.ecp-form input[type=submit],.ecp-form button[type=submit],.ecp-form .button{width:100%;min-height:50px}
}
@media (max-width:359px){.ecp .glance{grid-template-columns:1fr}.ecp .trust,.ecp .steps{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.ecp *{transition:none!important}}
'''.strip()


def style():
    return '<style id="ecp-css">' + CSS + '</style>'


def trust():
    return ('<div class="trust">'
            f'<div><i>{I["truck"]}</i><span><b>Delivery across India</b><small>Flat ₹55 shipping per order</small></span></div>'
            f'<div><i>{I["shield"]}</i><span><b>Secure checkout</b><small>UPI, cards and net banking via Razorpay</small></span></div>'
            f'<div><i>{I["leaf"]}</i><span><b>Right from source</b><small>Small Kerala makers, chemical-free goods</small></span></div>'
            f'<div><i>{I["chat"]}</i><span><b>Real people on WhatsApp</b><small>+91 70120 45854</small></span></div>'
            '</div>')


def hero(eyebrow, h1, lede, ctas='', chips=''):
    return (f'<section class="hero"><span class="eyebrow">{eyebrow}</span><h1>{h1}</h1>'
            f'<p class="lede">{lede}</p>{ctas}{chips}</section>')


def btn(href, label, cls='', icon='arrow', ext=False):
    ic = WA_ICON if cls == 'wa' else (I[icon] if icon else '')
    tgt = ' target="_blank" rel="noopener"' if ext else ''
    return f'<a class="ecbtn {cls}" href="{href}"{tgt}>{label}{ic}</a>' if cls != 'wa' else f'<a class="ecbtn wa" href="{href}"{tgt}>{ic}{label}</a>'


def band(title, text, ctas):
    return f'<section class="sec band"><div><h2>{title}</h2><p>{text}</p></div><div class="ctas">{ctas}</div></section>'


SHOP_BAND = lambda msg='Hi EcoCart, I have a question': band(
    'Ready to shop <span class="serif">greener?</span>',
    'Pure honey, coconut goods, spices, natural soaps, handmade gifts and thobes, packed with care and sent across India.',
    btn(f'{SITE}/shop/', 'Shop all products') + btn(wa(msg), 'Chat on WhatsApp', 'wa', ext=True))


def page(inner):
    return f'{style()}<div class="ecp"><div class="wrap">{inner}</div></div>'


def doc(sections, glance=''):
    toc = '<nav class="toc" aria-label="On this page"><b>On this page</b>' + ''.join(
        f'<a href="#{sid}">{H.escape(t)}</a>' for sid, t, _ in sections) + '</nav>'
    body = ''.join(f'<h2 id="{sid}">{H.escape(t)}</h2>{c}' for sid, t, c in sections)
    return f'<section class="sec doc">{toc}<div class="prose">{glance}{body}</div></section>'


# ---------- Elementor helpers ----------
def eid():
    return '%07x' % random.randrange(16 ** 7)


def w_html(h):
    return {'id': eid(), 'elType': 'widget', 'settings': {'html': h}, 'elements': [], 'widgetType': 'html'}


def w_short(sc):
    return {'id': eid(), 'elType': 'widget', 'settings': {'shortcode': sc}, 'elements': [], 'widgetType': 'shortcode'}


def section(widgets):
    return {'id': eid(), 'elType': 'section',
            'settings': {'layout': 'full_width', 'gap': 'no',
                         'padding': {'unit': 'px', 'top': '0', 'right': '0', 'bottom': '0', 'left': '0', 'isLinked': True}},
            'elements': [{'id': eid(), 'elType': 'column', 'settings': {'_column_size': 100, '_inline_size': None,
                          'padding': {'unit': 'px', 'top': '0', 'right': '0', 'bottom': '0', 'left': '0', 'isLinked': True}},
                          'elements': widgets, 'isInner': False}], 'isInner': False}


PAGES = {}


def add(pid, slug, parts, kind='page'):
    """parts: list of ('html', str) | ('sc', shortcode, wrapper_open, wrapper_close)."""
    widgets, plain = [], []
    for p in parts:
        if p[0] == 'html':
            widgets.append(w_html(p[1])); plain.append(p[1])
        else:
            widgets.append(w_short(p[1])); plain.append(p[1])
    PAGES[pid] = {'id': pid, 'slug': slug, 'kind': kind, 'elementor': [section(widgets)],
                  'content': '\n'.join('<!-- wp:html -->\n' + x + '\n<!-- /wp:html -->' if not x.startswith('[') else
                                       '<!-- wp:shortcode -->\n' + x + '\n<!-- /wp:shortcode -->' for x in plain)}


# helpers for pages that wrap a shortcode inside the layout
def open_ecp(inner=''):
    return f'{style()}<div class="ecp" style="padding-bottom:0"><div class="wrap">{inner}</div></div>'


def FORM(sc):
    return f'<div class="ecp-form"><div class="in">{sc}</div></div>'


def close_ecp(inner):
    return f'<div class="ecp" style="padding-top:0"><div class="wrap">{inner}</div></div>'


# =====================================================================
# ABOUT (1735)  H1 keeps "Do you want to know us?"
# =====================================================================
TEAM = [
    ('Roshan Shaji', 'Founder', f'{UP}/2024/07/WhatsApp-Image-2024-07-02-at-8.49.13-AM.jpeg'),
    ('Mohammed Sinan', 'Product Head', f'{UP}/2024/05/IMG_1451-1-modified.png'),
    ('Anoop Krishnan', 'E-commerce Manager', f'{UP}/2024/05/WhatsApp-Image-2024-05-19-at-12.05.19_7cb55663-scaled.jpg'),
    ('Sruthi A', 'Merchant Chief', f'{UP}/2024/05/WhatsApp-Image-2024-05-19-at-11.58.39_4b1b25d4.jpg'),
]
REVIEW_IMGS = [f'{UP}/2024/08/Neutral-Minimalist-Testimonials-Instagram-{i}-768x768.jpg' for i in (1, 2, 3, 4, 7)]

about = page(
    hero('About EcoCart',
         'Do you want to know us? <span class="serif grad">Hello, we’re EcoCart.</span>',
         'Welcome to EcoCart! We’re dedicated to offering eco-friendly products that make sustainable living easy and accessible. '
         'Join us in our mission to create a greener, healthier planet, one purchase at a time.',
         '<div class="ctas">' + btn(f'{SITE}/shop/', 'Shop eco products') + btn(f'#ecp-story', 'Read our story', 'ghost', icon=None) + '</div>',
         f'<div class="chips"><span>{I["leaf"]}Since 2021</span><span>{I["pin"]}Thiruvananthapuram, Kerala</span><span>{I["star"]}5-star Google rating</span></div>')
    + trust()
    + f'''<section class="sec split" id="ecp-story">
<div class="pic"><img src="{UP}/2024/05/WhatsApp-Image-2024-05-17-at-1.14.53-AM-2-1.jpeg" alt="EcoCart eco-friendly products packed for delivery" loading="lazy" decoding="async" width="768" height="960"></div>
<div><span class="kick">Our story</span><h2>Sustainable living, made <span class="serif">easy</span>.</h2>
<p class="sub">At EcoCart, we are passionate about making sustainable living easy and accessible for everyone. Our mission is to offer eco-friendly products that reduce environmental impact without sacrificing quality or convenience.</p>
<p class="sub">We believe every small step towards sustainability makes a real difference. That’s why we choose products that are good for you and kind to the planet, and why we proudly give small-scale entrepreneurs and local crafters a place to sell their handmade work.</p>
<ul class="ticks"><li>Chemical-free honey, coconut goods, spices and natural soaps</li><li>Handmade coconut-shell craft from local artisans</li><li>Personalised gift hampers for every occasion</li><li>Secure Razorpay checkout and delivery across India</li></ul>
<div class="ctas">{btn(f"{SITE}/product-category/eco-goods/", "Shop eco goods", "dark")}{btn(f"{SITE}/product-category/gift/", "Explore gifts", "line", icon=None)}</div></div>
</section>
<section class="sec"><div class="head"><div><span class="kick">What you’ll find at EcoCart</span><h2>Four ways to shop <span class="serif">greener</span></h2></div></div>
<div class="cards c4">
<a class="card" href="{SITE}/product-category/eco-goods/"><span class="ico">{I["leaf"]}</span><h3>EcoGoods</h3><p>Pure honey, GreenNuts coconut products, sprouted flours, palm sugar, A2 ghee, natural soaps and bamboo tissue.</p><span class="go">Shop eco goods {I["arrow"]}</span></a>
<a class="card" href="{SITE}/product-category/men/thobes-shirts-2/"><span class="ico">{I["sparkle"]}</span><h3>Clothes</h3><p>Premium thobes for men and the SEY and NIDA collections for women, chosen to look good while doing good.</p><span class="go">Shop clothing {I["arrow"]}</span></a>
<a class="card" href="{SITE}/product-category/gift/"><span class="ico">{I["gift"]}</span><h3>Gifts</h3><p>Thoughtful gifts for birthdays and anniversaries: Red Mountain KitKat towers, hampers, bouquets and customised wallets.</p><span class="go">Find a gift {I["arrow"]}</span></a>
<a class="card" href="{SITE}/product-category/coconut-shell-products/"><span class="ico">{I["heart"]}</span><h3>Crafts by local crafters</h3><p>Handcrafted coconut-shell bowls, cups and lamps that support small makers and keep plastic out of your home.</p><span class="go">See the crafts {I["arrow"]}</span></a>
</div></section>
<section class="sec"><div class="head"><div><span class="kick">Why people buy from us</span><h2>What we promise every order</h2></div></div>
<div class="cards">
<div class="card"><span class="n">01</span><h3>Healthy products</h3><p>Chemical-free, pure and farm-sourced, for better health at home.</p></div>
<div class="card"><span class="n">02</span><h3>We promote small business</h3><p>Every order supports small entrepreneurs and artisans in Kerala.</p></div>
<div class="card"><span class="n">03</span><h3>Sustainability</h3><p>Less plastic, natural materials and products made to last.</p></div>
</div></section>
<section class="sec"><div class="head"><div><span class="kick">Meet the team</span><h2>The people behind <span class="serif">EcoCart</span></h2></div></div>
<div class="team">''' + ''.join(
        f'<figure><img src="{u}" alt="{n}, {r} at EcoCart" loading="lazy" decoding="async" width="112" height="112"><b>{n}</b><small>{r}</small></figure>'
        for n, r, u in TEAM) + f'''</div></section>
<section class="sec split"><div><span class="kick">#Trustme</span><div class="stars" aria-label="5 out of 5 stars" style="margin-top:12px">★★★★★</div>
<h2 style="font-size:clamp(24px,2.8vw,34px)">We are proud to hold a 5-star rating on Google.</h2>
<blockquote style="margin-top:22px">“The product was worth the money. Tasty and healthy. Quality nuts and honey. Variety taste. Delivered before expected date. Very happy!”<cite>Nivedita, EcoCart customer</cite></blockquote>
<div class="ctas"><a class="ecbtn line" href="{IG}" target="_blank" rel="noopener">See us on Instagram{I["arrow"]}</a></div></div>
<div class="reviews">''' + ''.join(
        f'<figure><img src="{u}" alt="EcoCart customer review {n}" width="768" height="768" loading="lazy" decoding="async"></figure>'
        for n, u in enumerate(REVIEW_IMGS, 1)) + '</div></section>'
    + SHOP_BAND('Hi EcoCart, I would like to know more about your products'))
add(1735, 'about-us', [('html', about)])

# =====================================================================
# CONTACT (2299)  H1 keeps "You can ask us questions"
# =====================================================================
contact_top = open_ecp(
    hero('Contact EcoCart',
         'You can ask us questions. <span class="serif grad">We reply fast.</span>',
         'Contact us for all your questions about products, orders, gifts or bulk buying. WhatsApp is the quickest way to reach a real person.',
         '<div class="ctas">' + btn(wa('Hi EcoCart, I have a question'), 'Chat on WhatsApp', 'wa', ext=True)
         + btn('tel:+917012045854', 'Call 7012045854', 'ghost', icon='phone') + '</div>')
    + f'''<section class="sec"><div class="contact">
<a class="way hot" href="{wa("Hi EcoCart, I have a question")}" target="_blank" rel="noopener"><span class="ico">{WA_ICON}</span><span><b>WhatsApp</b><span>+91 70120 45854</span><small>Quickest replies on orders, gifts and product questions</small></span></a>
<a class="way" href="tel:+917012045854"><span class="ico">{I["phone"]}</span><span><b>Call us</b><span>7012045854</span><small>Monday to Friday, 9 AM to 6 PM</small></span></a>
<a class="way" href="mailto:{EMAIL}"><span class="ico">{I["mail"]}</span><span><b>Email</b><span>{EMAIL}</span><small>For orders, invoices and partnerships</small></span></a>
<a class="way" href="https://www.google.com/maps/search/?api=1&query=Thiruvallam+Thiruvananthapuram+Kerala+695027" target="_blank" rel="noopener"><span class="ico">{I["pin"]}</span><span><b>Address</b><span>Bindu Manzil, Thiruvallam PO, Pachaloor</span><small>Thiruvananthapuram, Kerala 695027</small></span></a>
</div></section>
<section class="sec"><div class="head" style="margin-bottom:8px"><div><span class="kick">Please write to us</span><h2>Get in <span class="serif">touch</span></h2>
<p class="sub">Send us a message and we’ll reply by email. About an order you’ve placed? Include your order number, or <a href="{SITE}/order-tracking/" style="color:var(--leaf);text-decoration:underline;text-underline-offset:3px">track your order here</a>.</p></div></div></section>''')
contact_bottom = close_ecp(
    f'''<section class="sec"><div class="head"><div><span class="kick">Good to know</span><h2>Before you ask</h2></div><a class="ecbtn line" href="{SITE}/faq/">Read all FAQs{I["arrow"]}</a></div>
<div class="cards">
<a class="card" href="{SITE}/shipping-and-delivery/"><span class="ico">{I["truck"]}</span><h3>Shipping</h3><p>Flat ₹55 per order anywhere in India. Orders reach you in 4 to 10 days.</p><span class="go">Shipping policy {I["arrow"]}</span></a>
<a class="card" href="{SITE}/refund_returns-2/"><span class="ico">{I["return"]}</span><h3>Returns and refunds</h3><p>Damaged or wrong item? Tell us within 2 days of delivery and we’ll make it right.</p><span class="go">Refund policy {I["arrow"]}</span></a>
<a class="card" href="{SITE}/faq/"><span class="ico">{I["card"]}</span><h3>Payments</h3><p>Pay securely with UPI, credit or debit card, or net banking through Razorpay.</p><span class="go">Payment FAQs {I["arrow"]}</span></a>
</div></section>
<section class="sec"><div class="prose" style="max-width:none"><h2 style="font-size:22px">Business details</h2>
<p><strong>Merchant:</strong> EcoCart (ecocart.co.in)<br><strong>Registered and operational address:</strong> Bindu Manzil, Thiruvallam PO, Pachaloor, Thiruvananthapuram, Kerala 695027, India<br><strong>Telephone and WhatsApp:</strong> <a href="tel:+917012045854">+91 70120 45854</a> (<a href="{wa("Hi EcoCart")}">chat on WhatsApp</a>)<br><strong>Email:</strong> <a href="mailto:{EMAIL}">{EMAIL}</a></p>
<span class="updated">Last updated on {UPDATED}</span></div></section>
''' + SHOP_BAND())
add(2299, 'contact', [('html', contact_top), ('sc', FORM('[contact-form-7 id="2343"]')), ('html', contact_bottom)])

# =====================================================================
# FAQ (2724)
# =====================================================================
FAQ = [
    ('orders', 'Orders and payment', [
        ('How do I place an order?', f'<p>Add products to your cart and check out on the site. You can pay with UPI, credit or debit card, or net banking. Prefer to order by chat? <a href="{wa("Hi EcoCart, I want to place an order")}">Message us on WhatsApp</a> and we’ll help you.</p>'),
        ('Which payment methods do you accept?', '<p>We accept UPI (Google Pay, PhonePe, Paytm and others), credit and debit cards, and net banking. Payments are processed securely by Razorpay, so we never see or store your card details.</p>'),
        ('Do you offer cash on delivery?', '<p>Not at the moment. All orders are prepaid through Razorpay, which keeps checkout quick and secure.</p>'),
        ('Can I change or cancel my order?', f'<p>Yes, if you ask within 2 days of placing the order and before it has shipped. Message us on WhatsApp or email <a href="mailto:{EMAIL}">{EMAIL}</a> with your order number. Food items can’t be cancelled once they are packed. See our <a href="{SITE}/refund_returns-2/">cancellation and refund policy</a>.</p>'),
        ('Do you take bulk or corporate orders?', f'<p>Yes. For bulk honey, coconut products or corporate gift hampers, <a href="{wa("Hi EcoCart, I want to discuss a bulk order")}">message us on WhatsApp</a> with what you need and the quantity.</p>'),
    ]),
    ('shipping', 'Shipping and delivery', [
        ('How much is shipping?', '<p>Shipping is a flat ₹55 per order anywhere in India, whatever you buy.</p>'),
        ('How long will delivery take?', f'<p>Orders are delivered within 4 to 10 days, or by the date agreed when your order is confirmed. Delivery is through registered courier partners or India Post. More in our <a href="{SITE}/shipping-and-delivery/">shipping policy</a>.</p>'),
        ('Do you ship outside India?', f'<p>Online orders ship within India only. For an international order, <a href="{wa("Hi EcoCart, I want to order from outside India")}">ask us on WhatsApp</a> and we’ll tell you what’s possible.</p>'),
        ('How do I track my order?', f'<p>Use the <a href="{SITE}/order-tracking/">order tracking page</a> with your order ID and billing email. You can also message us on WhatsApp for an update.</p>'),
    ]),
    ('returns', 'Returns and refunds', [
        ('What if my product arrives damaged or wrong?', '<p>Tell us within 2 days of delivery with a photo or short video of the item and packaging. Once we’ve checked it, we’ll send a replacement or refund you.</p>'),
        ('Can I return food items like honey or coconut oil?', '<p>Food and other perishable items can’t be returned for change of mind. If the quality isn’t right when it reaches you, tell us within 2 days and we’ll replace it or refund you.</p>'),
        ('How long do refunds take?', '<p>Approved refunds are processed within 3 to 5 days to your original payment method. Your bank may take a few more days to show it.</p>'),
    ]),
    ('products', 'Products and gifts', [
        ('Are your products natural and chemical-free?', '<p>Our food and personal-care range is chosen to be pure and chemical-free, sourced from small Kerala makers wherever we can. Each product page lists what’s inside, so check there for the details of a specific item.</p>'),
        ('What is Better Honey?', f'<p>Our top seller: pure honey blended with premium dry fruits like almonds, cashews, walnuts and raisins. Great on toast, in yoghurt or straight from the spoon. <a href="{SITE}/better-honey/">See Better Honey</a>.</p>'),
        ('Can I personalise a gift hamper?', f'<p>Yes. Many of our hampers, Red Mountain KitKat towers and wallets can be customised. <a href="{wa("Hi EcoCart, I want a customised gift")}">Tell us on WhatsApp</a> the occasion, budget and delivery date.</p>'),
        ('How do I choose my thobe size?', f'<p>Each thobe page lists the available sizes. If you’re unsure, <a href="{wa("Hi EcoCart, I need help with a thobe size")}">send us your height and chest size on WhatsApp</a> and we’ll suggest the right fit.</p>'),
        ('I make handmade products. Can I sell on EcoCart?', f'<p>We love supporting small makers. Email <a href="mailto:{EMAIL}">{EMAIL}</a> or WhatsApp us with photos of your products and prices.</p>'),
    ]),
]
faq_html = page(
    hero('Help centre', 'FAQ: <span class="serif grad">answers in one place</span>',
         'Quick answers about orders, payments, shipping, returns and our products. Can’t find what you need? Ask us on WhatsApp.',
         '<div class="ctas">' + btn(wa('Hi EcoCart, I have a question'), 'Ask on WhatsApp', 'wa', ext=True)
         + btn(f'{SITE}/shop/', 'Shop now', 'ghost') + '</div>',
         '<div class="chips">' + ''.join(f'<a href="#{gid}">{t}</a>' for gid, t, _ in FAQ) + '</div>')
    + ''.join(f'<section class="faq-group"><h2 id="{gid}">{t}</h2><div class="faq">' + ''.join(
        f'<details{" open" if gi == 0 and qi == 0 else ""}><summary>{q}</summary><div class="a">{a}</div></details>'
        for qi, (q, a) in enumerate(items)) + '</div></section>' for gi, (gid, t, items) in enumerate(FAQ))
    + band('Still have a question?', 'Message us on WhatsApp or call 7012045854 (Monday to Friday, 9 AM to 6 PM).',
           btn(wa('Hi EcoCart, I have a question'), 'Chat on WhatsApp', 'wa', ext=True) + btn(f'{SITE}/contact/', 'Contact page', 'ghost')))
add(2724, 'faq', [('html', faq_html)])

# =====================================================================
# SHIPPING (5354)
# =====================================================================
ship = page(
    hero('Policy', 'Shipping &amp; Delivery Policy',
         'Flat ₹55 shipping on every order, delivered anywhere in India by trusted courier partners.',
         '<div class="ctas">' + btn(f'{SITE}/shop/', 'Start shopping') + btn(f'{SITE}/order-tracking/', 'Track an order', 'ghost', icon='box') + '</div>')
    + doc([
        ('rates', 'Shipping charges', '<p>We charge a <strong>flat ₹55 per order</strong> for delivery anywhere in India, however many items you buy. The shipping charge is shown at checkout before you pay.</p>'),
        ('where', 'Where we deliver', f'<p>We deliver to addresses across India. Online orders are not shipped outside India. For an international enquiry, please <a href="{wa("Hi EcoCart, I want to order from outside India")}">message us on WhatsApp</a>.</p>'),
        ('time', 'Delivery time', '<p>Orders are shipped through registered domestic courier companies and/or India Post (Speed Post). Orders are delivered within <strong>4 to 10 days</strong>, or as per the delivery date agreed at the time of order confirmation, subject to courier company or post office norms.</p><p>Customised gifts and made-to-order items may need extra time to prepare. We’ll confirm the date with you when you order.</p>'),
        ('tracking', 'Order confirmation and tracking', f'<p>You’ll get an order confirmation on the email address you give at checkout. Once your order ships, you can follow it on our <a href="{SITE}/order-tracking/">order tracking page</a> or ask us on WhatsApp.</p>'),
        ('address', 'Delivery address', '<p>All orders are delivered to the address given by the buyer at checkout. Please check your address, pin code and phone number carefully. If a parcel is returned to us because of an incorrect address or because nobody was available, we’ll contact you to arrange re-delivery, and the courier charge for re-delivery may apply.</p>'),
        ('delays', 'Delays', '<p>We hand every order to the courier company or postal service within the time above. EcoCart is not liable for delays caused by the courier company or postal authorities, but we will always help you follow up.</p>'),
        ('damaged', 'Damaged parcels', f'<p>If your parcel arrives damaged, please take a photo or short video while opening it and tell us within 2 days of delivery. See our <a href="{SITE}/refund_returns-2/">cancellation and refund policy</a> for what happens next.</p>'),
        ('help', 'Need help?', f'<p>For any delivery question, contact our help desk on <a href="{wa("Hi EcoCart, I have a delivery question")}">WhatsApp</a> or call <a href="tel:+917012045854">+91 70120 45854</a>, or email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p><span class="updated">Last updated on {UPDATED}</span>'),
    ], glance='<div class="glance"><div><b>₹55 flat</b><span>per order, anywhere in India</span></div><div><b>4–10 days</b><span>delivery by courier or India Post</span></div><div><b>Tracked</b><span>follow your parcel online or on WhatsApp</span></div></div>')
    + SHOP_BAND('Hi EcoCart, I have a delivery question'))
add(5354, 'shipping-and-delivery', [('html', ship)])

# =====================================================================
# REFUND (2677)
# =====================================================================
refund = page(
    hero('Policy', 'Cancellation &amp; Refund Policy',
         'Something not right? Tell us within 2 days and we’ll replace it or refund you. Here’s exactly how it works.',
         '<div class="ctas">' + btn(wa('Hi EcoCart, I need help with my order'), 'Report a problem on WhatsApp', 'wa', ext=True) + '</div>')
    + doc([
        ('cancel', 'Cancelling an order', '<p>EcoCart believes in helping its customers as far as possible, and so has a liberal cancellation policy:</p><ul><li>Cancellations are accepted if you ask <strong>within 2 days of placing the order</strong>.</li><li>A cancellation may not be possible once the order has been handed to the seller or courier for shipping.</li><li>We don’t accept cancellations for perishable items such as food and flowers once they are packed. A refund or replacement can still be made if the quality of the product delivered is not good.</li></ul>'),
        ('damaged', 'Damaged or defective items', '<p>If you receive a damaged or defective item, report it to us <strong>within 2 days of delivery</strong>. Please share your order number and a photo or short video of the item and its packaging. The request will be accepted once we have checked and confirmed the problem.</p>'),
        ('different', 'Item not as described', '<p>If the product you received is not as shown on the site or not as you expected, tell our customer service team within 2 days of delivery. We’ll look into your complaint and decide on a replacement, refund or other fair solution.</p>'),
        ('warranty', 'Manufacturer warranty', '<p>For products that come with a manufacturer’s warranty, please contact the manufacturer for warranty claims. We’re happy to help you get in touch.</p>'),
        ('refunds', 'How refunds are paid', '<p>Approved refunds are processed within <strong>3 to 5 days</strong> to your original payment method (UPI, card or net banking via Razorpay). Your bank may take a few more working days to show the amount.</p>'),
        ('how', 'How to request', f'<p>Message us on <a href="{wa("Hi EcoCart, I need help with my order")}">WhatsApp</a> or call <a href="tel:+917012045854">+91 70120 45854</a>, or email <a href="mailto:{EMAIL}">{EMAIL}</a> with your order number and photos. We reply as quickly as we can.</p><span class="updated">Last updated on {UPDATED}</span>'),
    ], glance='<div class="glance"><div><b>2 days</b><span>to cancel an order or report a problem</span></div><div><b>3–5 days</b><span>for an approved refund to be processed</span></div><div><b>Replace or refund</b><span>for damaged, defective or wrong items</span></div></div>')
    + SHOP_BAND())
add(2677, 'refund_returns-2', [('html', refund)])

# =====================================================================
# TERMS (2711)
# =====================================================================
terms = page(
    hero('Policy', 'Terms and Conditions',
         'The rules for using ecocart.co.in and buying from us, written as plainly as we can.', '')
    + doc([
        ('about', 'About these terms', '<p>In these Terms and Conditions, “we”, “us” and “our” mean EcoCart (ecocart.co.in), whose registered and operational office is at Bindu Manzil, Thiruvallam PO, Pachaloor, Thiruvananthapuram, Kerala 695027. “You”, “your”, “user” and “visitor” mean any person who visits our website and/or agrees to buy from us.</p><p>Your use of the website and any purchase from us are governed by these terms.</p>'),
        ('orders', 'Orders, prices and payment', f'<ul><li>All prices are in Indian Rupees (₹). Shipping is charged as shown at checkout (currently a flat ₹55 per order).</li><li>Payments are made online through Razorpay using UPI, cards or net banking. We do not store your card details.</li><li>An order is confirmed once payment is successful and you receive our confirmation email. We may cancel an order and refund you in full if a product is unavailable or a price was shown in error.</li><li>Product photos are for illustration. Natural and handmade products can vary slightly in colour, size and texture.</li></ul><p>Shipping, cancellation and refunds are covered by our <a href="{SITE}/shipping-and-delivery/">Shipping &amp; Delivery Policy</a> and <a href="{SITE}/refund_returns-2/">Cancellation &amp; Refund Policy</a>, which form part of these terms.</p>'),
        ('content', 'Website content', '<ul><li>The content of the pages of this website may change without notice.</li><li>Neither we nor any third parties give any warranty or guarantee as to the accuracy, timeliness, performance, completeness or suitability of the information and materials on this website for any particular purpose. Such information may contain inaccuracies or errors, and we exclude liability for them to the fullest extent permitted by law.</li><li>Your use of any information or materials on this website is entirely at your own risk. It is your responsibility to make sure any products, services or information available through this website meet your requirements.</li></ul>'),
        ('ip', 'Copyright and trademarks', '<p>This website contains material that is owned by or licensed to us, including the design, layout, look, appearance, photos and graphics. Reproduction is prohibited except in line with the copyright notice, which forms part of these terms. All trademarks shown on this website that are not our property or licensed to us are acknowledged on the website.</p><p>Unauthorised use of information provided by us may give rise to a claim for damages and/or be a criminal offence.</p>'),
        ('links', 'Links', '<p>From time to time this website may include links to other websites for your convenience. We are not responsible for their content. You may not create a link to our website from another website or document without our prior written consent.</p>'),
        ('liability', 'Payment authorisation', '<p>We are not liable for any loss or damage arising directly or indirectly from the decline of authorisation for any transaction because the cardholder has exceeded the preset limit agreed with our acquiring bank.</p>'),
        ('law', 'Governing law', f'<p>Any dispute arising out of the use of our website, a purchase from us or any engagement with us is subject to the laws of India, and the courts of Thiruvananthapuram, Kerala will have jurisdiction.</p><p>Questions about these terms? Email <a href="mailto:{EMAIL}">{EMAIL}</a>.</p><span class="updated">Last updated on {UPDATED}</span>'),
    ]))
add(2711, 'terms-and-conditions', [('html', terms)])

# =====================================================================
# PRIVACY (2697)
# =====================================================================
privacy = page(
    hero('Policy', 'Privacy Policy',
         'How EcoCart collects, uses and protects the information you share when you visit our website or buy from us.', '')
    + doc([
        ('intro', 'Our commitment', f'<p>This privacy policy sets out how EcoCart (ecocart.co.in) uses and protects any information you give us when you visit our website and/or buy from us. We are committed to protecting your privacy. If we ask you for information that identifies you, it will only be used in line with this policy and India’s Digital Personal Data Protection Act, 2023.</p><p>We may update this policy from time to time by changing this page, so please check it now and then.</p>'),
        ('collect', 'What we collect', '<ul><li>Your name, phone number, email address and delivery address when you place an order or contact us.</li><li>Order details such as the products you buy and the amount paid.</li><li>Messages you send us by WhatsApp, email or our contact form.</li><li>Basic technical data such as your device, browser and pages visited, collected through cookies and analytics tools.</li></ul><p>We do <strong>not</strong> collect or store your card, UPI or bank details. Payments are handled by Razorpay.</p>'),
        ('use', 'How we use it', '<ul><li>To process, ship and deliver your orders, and to send order and delivery updates.</li><li>To answer your questions and give customer support.</li><li>To keep internal records and improve our products, services and website.</li><li>To send you offers and news about new products by email or WhatsApp, only if you have agreed. You can unsubscribe at any time.</li></ul>'),
        ('share', 'Who we share it with', '<p>We never sell your personal information. We share only what is needed with trusted partners who help us run the store:</p><ul><li><strong>Payments:</strong> Razorpay, to process your payment securely.</li><li><strong>Checkout and delivery:</strong> our checkout and shipping partners (such as Shiprocket’s Fastrr checkout) and courier companies or India Post, to deliver your order.</li><li><strong>Email:</strong> Mailchimp, to send emails you have signed up for.</li><li><strong>Analytics and advertising:</strong> Google, Meta and Hotjar, to understand how our site is used and to show relevant ads.</li></ul><p>We may also share information when the law requires it.</p>'),
        ('cookies', 'How we use cookies', '<p>A cookie is a small file placed on your device that helps a website remember you. We use cookies to keep items in your cart, keep you logged in, and understand which pages are useful so we can improve the site. Analytics data is used in aggregate for statistical analysis.</p><p>You can accept or decline cookies. Most browsers accept them automatically, but you can change your browser settings to decline them. This may stop some parts of the site, such as the cart, from working properly.</p>'),
        ('security', 'Keeping it secure', '<p>We use suitable physical, electronic and managerial measures to protect your information from unauthorised access or disclosure. Our website runs over a secure HTTPS connection.</p>'),
        ('rights', 'Your choices and rights', f'<ul><li>You can choose not to receive marketing messages. Every marketing email has an unsubscribe link, or you can tell us directly.</li><li>You can ask to see, correct or delete the personal information we hold about you.</li><li>We keep order records only as long as needed for delivery, support, accounting and legal reasons.</li></ul><p>To make a request, email <a href="mailto:{EMAIL}">{EMAIL}</a>. If you believe any information we hold is incorrect, write to us and we will correct it promptly.</p>'),
        ('contact', 'Contact and grievances', f'<p>For privacy questions or complaints, contact EcoCart, Bindu Manzil, Thiruvallam PO, Pachaloor, Thiruvananthapuram, Kerala 695027, by email at <a href="mailto:{EMAIL}">{EMAIL}</a> or phone <a href="tel:+917012045854">7012045854</a>.</p><span class="updated">Last updated on {UPDATED}</span>'),
    ]))
add(2697, 'privacy-policy-2', [('html', privacy)])

# =====================================================================
# ORDER TRACKING (2627)  keeps [woocommerce_order_tracking]
# =====================================================================
track_top = open_ecp(
    hero('Order tracking', 'Track your <span class="serif grad">order</span>.',
         'Enter your order ID and the email you used at checkout to see where your parcel is. Your order ID is in your confirmation email.',
         '<div class="ctas">' + btn(wa('Hi EcoCart, can you update me on my order? Order ID: '), 'Ask on WhatsApp instead', 'wa', ext=True) + '</div>')
    )
track_bottom = close_ecp(f'''<section class="sec"><div class="steps">
<div><b>Order placed</b><p>You get a confirmation email with your order ID.</p></div>
<div><b>Packed with care</b><p>We pack your products and hand them to the courier.</p></div>
<div><b>On the way</b><p>Delivered by courier or India Post within 4 to 10 days.</p></div>
<div><b>Delivered</b><p>Anything wrong? Tell us within 2 days and we’ll fix it.</p></div>
</div></section>''' + SHOP_BAND('Hi EcoCart, I have a question about my order'))
add(2627, 'order-tracking', [('html', track_top), ('sc', FORM('[woocommerce_order_tracking]')), ('html', track_bottom)])

# =====================================================================
# BETTER HONEY landing (7420)
# =====================================================================
BH = f'{SITE}/product/better-honey-a-delicious-fusion-of-honey-and-dry-fruits/'
honey_top = open_ecp(
    hero('Top seller · Rated 5.0 by customers',
         'Better Honey <span class="serif grad">A delicious fusion of honey and dry fruits.</span>',
         'Elevate your taste buds with Better Honey, a luxurious blend of pure, golden honey and premium dry fruits. Natural sweetness with a crunchy bite, perfect for your pantry and for gifting.',
         '<div class="ctas">' + btn(BH, 'Buy Better Honey') + btn(wa('Hi EcoCart, I want to order Better Honey'), 'Order on WhatsApp', 'wa', ext=True) + '</div>',
         f'<div class="chips"><span>{I["star"]}5.0 from customer reviews</span><span>{I["leaf"]}100% pure honey</span><span>{I["truck"]}Ships across India</span></div>')
    + trust()
    + f'''<section class="sec split">
<div class="pic"><video src="{UP}/2024/08/InShot_20240813_150613856.mp4" poster="{UP}/2024/07/IMG_20240726_010543-transformed-794x1024.jpeg" controls muted playsinline preload="none" aria-label="Better Honey video"></video></div>
<div><span class="kick">Why you’ll love it</span><h2>Honey, almonds, cashews, walnuts and <span class="serif">raisins</span>.</h2>
<ul class="ticks">
<li><strong>Natural sweetness:</strong> 100% pure honey from trusted beekeepers.</li>
<li><strong>Nutrient-rich:</strong> premium dry fruits bring vitamins, minerals and antioxidants.</li>
<li><strong>Versatile:</strong> drizzle on toast, mix into yoghurt or oats, sweeten drinks, or enjoy by the spoonful.</li>
<li><strong>Feel-good energy:</strong> a wholesome treat that supports digestion and steady energy.</li>
</ul>
<div class="ctas">{btn(BH, "Choose your size", "dark")}{btn(f"{SITE}/product-category/honey/", "All honey", "line", icon=None)}</div></div>
</section>
<section class="sec"><div class="cards c4 gal">''' + ''.join(
        f'<figure class="card" style="padding:0;overflow:hidden"><img src="{u}" alt="{a}" loading="lazy" decoding="async" width="768" height="1024" style="aspect-ratio:3/4;object-fit:cover;width:100%"></figure>'
        for u, a in [(f'{UP}/2024/07/IMG_20240726_010543-transformed-794x1024.jpeg', 'Better Honey jar with dry fruits'),
                     (f'{UP}/2024/07/20240722_161552-768x1024.jpg', 'Better Honey close up'),
                     (f'{UP}/2024/07/20240722_161448-768x1024.jpg', 'Honey with almonds, cashews and walnuts'),
                     (f'{UP}/2024/07/20240722_161136-768x1024.jpg', 'Better Honey jars ready to ship')]) + '''</div></section>
<section class="sec"><div class="head"><div><span class="kick">Pure Honey Collection</span><h2>Pick your <span class="serif">jar</span></h2></div></div></section>''')
honey_bottom = close_ecp(
    f'''<section class="sec"><div class="head"><div><span class="kick">How to enjoy it</span><h2>Five ways with Better Honey</h2></div></div>
<div class="cards">
<div class="card"><span class="n">01</span><h3>Breakfast toast</h3><p>Spread on warm toast or dosa for a crunchy, sweet start.</p></div>
<div class="card"><span class="n">02</span><h3>Yoghurt and oats</h3><p>Stir into curd, overnight oats or smoothie bowls.</p></div>
<div class="card"><span class="n">03</span><h3>A healthy gift</h3><p>A jar that feels special for festivals, birthdays and thank-yous.</p></div>
</div></section>''' + band('Treat yourself, or someone you love.',
                           'Order Better Honey online with secure UPI or card payment, or message us on WhatsApp for gift orders.',
                           btn(BH, 'Buy Better Honey') + btn(wa('Hi EcoCart, I want to order Better Honey'), 'Order on WhatsApp', 'wa', ext=True)))
honey_bottom = honey_bottom.replace('Five ways', 'Easy ways')
add(7420, 'better-honey', [('html', honey_top),
                           ('sc', '<div class="ecp-products">[products category="pure-honey-collection,honey" limit="8" columns="4" orderby="popularity"]</div>'),
                           ('html', honey_bottom)])

# =====================================================================
# RED MOUNTAIN KITKAT TOWER landing (6494)
# =====================================================================
rm_top = open_ecp(
    hero('Red Mountain exclusive',
         'Red Mountain <span class="serif grad">KitKat tower</span>, made to wow.',
         'Layers of chocolate built into a stunning tower: the gift that makes birthdays, anniversaries and surprises unforgettable. Personalise it and we’ll deliver it with care.',
         '<div class="ctas">' + btn(f'{SITE}/product-category/gift/gift-gift/', 'Shop Red Mountain') + btn(wa('Hi EcoCart, I want to order a Red Mountain KitKat tower'), 'Customise on WhatsApp', 'wa', ext=True) + '</div>',
         f'<div class="chips"><span>{I["gift"]}Customisable</span><span>{I["heart"]}Birthdays and anniversaries</span><span>{I["box"]}Packed with care</span></div>')
    + f'''<section class="sec split">
<div class="pic"><video src="{UP}/2024/06/WhatsApp-Video-2024-06-08-at-8.31.12-AM.mp4" controls muted playsinline preload="none" aria-label="Red Mountain KitKat tower video"></video></div>
<div><span class="kick">The ultimate chocolate gift</span><h2>Big on chocolate, bigger on <span class="serif">smiles</span>.</h2>
<ul class="ticks"><li>Single or double layer, with sizes for every budget</li><li>Add a name or message to make it personal</li><li>Pair with fresh flowers for a heart-shaped surprise</li><li>Tell us your date and we’ll plan the delivery</li></ul>
<div class="ctas">{btn(f"{SITE}/product-category/gift/", "All gifts", "dark")}{btn(wa("Hi EcoCart, I want to order a Red Mountain KitKat tower"), "Plan a surprise", "wa", ext=True)}</div></div>
</section>
<section class="sec"><div class="head"><div><span class="kick">Red Mountain exclusive sale</span><h2>Choose your <span class="serif">tower</span></h2></div></div></section>''')
rm_bottom = close_ecp(f'''<section class="sec"><div class="steps">
<div><b>Pick a tower</b><p>Choose the size and layers you like.</p></div>
<div><b>Personalise</b><p>Share a name, message or theme on WhatsApp.</p></div>
<div><b>Pay securely</b><p>UPI, card or net banking via Razorpay.</p></div>
<div><b>We deliver</b><p>Packed with care for the big day.</p></div>
</div></section>''' + band('Planning a surprise?', 'Tell us the occasion, budget and date. We’ll help you build the perfect gift.',
                         btn(wa('Hi EcoCart, I want to plan a gift'), 'Chat on WhatsApp', 'wa', ext=True) + btn(f'{SITE}/product-category/gift/', 'Browse gifts', 'ghost')))
add(6494, 'red-mountain-kitkat-tower', [('html', rm_top),
                                        ('sc', '<div class="ecp-products">[products category="gift-gift" limit="8" columns="4"]</div>'),
                                        ('html', rm_bottom)])

# =====================================================================
# THOBE landing (5227)  H1 "Thobe"
# =====================================================================
th_top = open_ecp(
    hero('Men’s collection', 'Thobe <span class="serif grad">collection</span>',
         'Premium thobes in classic whites, rich browns, blues, greys and black. Comfortable for every day, elegant for Eid, weddings and Jumu’ah.',
         '<div class="ctas">' + btn(f'{SITE}/product-category/men/thobes-shirts-2/', 'Shop all thobes') + btn(wa('Hi EcoCart, I need help choosing a thobe size'), 'Size help on WhatsApp', 'wa', ext=True) + '</div>',
         f'<div class="chips"><span>{I["sparkle"]}Many colours and sizes</span><span>{I["shield"]}Secure checkout</span><span>{I["truck"]}Flat ₹55 shipping</span></div>')
    + '<section class="sec"><div class="head"><div><span class="kick">New and popular</span><h2>Find your <span class="serif">thobe</span></h2></div></div></section>')
th_bottom = close_ecp(f'''<section class="sec cards">
<div class="card"><span class="ico">{I["users"]}</span><h3>Not sure of your size?</h3><p>Send us your height and chest size on WhatsApp and we’ll suggest the right fit before you order.</p><a class="go" href="{wa("Hi EcoCart, I need help choosing a thobe size")}">Ask on WhatsApp {I["arrow"]}</a></div>
<div class="card"><span class="ico">{I["gift"]}</span><h3>A gift for Eid</h3><p>Pair a thobe with a prayer mat or a customised men’s hamper for a complete gift.</p><a class="go" href="{SITE}/product-category/gift/">See gifts {I["arrow"]}</a></div>
<div class="card"><span class="ico">{I["return"]}</span><h3>Easy help</h3><p>Wrong or damaged item? Tell us within 2 days of delivery and we’ll sort it out.</p><a class="go" href="{SITE}/refund_returns-2/">Refund policy {I["arrow"]}</a></div>
</section>''' + SHOP_BAND('Hi EcoCart, I want to order a thobe'))
add(5227, 'thobe', [('html', th_top),
                    ('sc', '<div class="ecp-products">[products category="thobes-shirts-2" limit="12" columns="4" orderby="date" order="DESC"]</div>'),
                    ('html', th_bottom)])

# =====================================================================
# BLOG POSTS: CTA block appended (classic posts, not Elementor)
# =====================================================================
POST_CTA = (style() + '<div class="ecp" style="padding:24px 0 8px"><section class="band" style="padding:32px">'
            '<div><h2 style="font-size:clamp(22px,2.6vw,30px)">Shop eco-friendly at <span class="serif">EcoCart</span></h2>'
            '<p>Pure honey, coconut goods, natural soaps, handmade gifts and thobes. Flat ₹55 delivery across India.</p></div>'
            '<div class="ctas">' + btn(f'{SITE}/shop/', 'Shop now') + btn(wa('Hi EcoCart, I read your blog and have a question'), 'WhatsApp us', 'wa', ext=True)
            + '</div></section></div>')
POST_CTA_BLOCK = '\n<!-- wp:html -->\n<!-- ecp-post-cta -->' + POST_CTA + '\n<!-- /wp:html -->'

# Post 6269: rewrite body with true facts (old body listed products EcoCart doesn't sell and made-up testimonials)
eco_post = f'''<!-- wp:paragraph -->
<p>At EcoCart, we offer a growing range of eco-friendly products to help you live a healthier, more sustainable life. Since 2021 we’ve been bringing natural food, home and gift products from small makers in Kerala to homes across India.</p>
<!-- /wp:paragraph -->
<!-- wp:heading -->
<h2>Why choose EcoCart?</h2>
<!-- /wp:heading -->
<!-- wp:list -->
<ul><li><strong>Right from source:</strong> we work with small farmers, beekeepers and crafters, so you get fresh, honest products.</li><li><strong>Chemical-free choices:</strong> pure honey, cold-pressed coconut oil, sprouted flours and homemade soaps.</li><li><strong>Fair prices:</strong> everyday products at prices that make the green choice easy.</li><li><strong>Secure checkout:</strong> pay with UPI, cards or net banking through Razorpay, with flat ₹55 delivery across India.</li></ul>
<!-- /wp:list -->
<!-- wp:heading -->
<h2>Our eco-friendly product range</h2>
<!-- /wp:heading -->
<!-- wp:heading {{"level":3}} -->
<h3>1. Pure honey</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>Our top seller, <a href="{SITE}/better-honey/">Better Honey</a>, blends pure honey with almonds, cashews, walnuts and raisins. You’ll also find almond honey, comb honey and saffron-infused honey in our <a href="{SITE}/product-category/eco-goods/honey/">honey collection</a>.</p>
<!-- /wp:paragraph -->
<!-- wp:heading {{"level":3}} -->
<h3>2. Coconut goods from Kerala</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>GreenNuts virgin coconut oil (including gentle oils for mother and baby), coconut milk, desiccated coconut, coconut chutney and pickle, and roasted coconut curry and sambar masalas. Browse <a href="{SITE}/product-category/eco-goods/coconut-products/">coconut products</a>.</p>
<!-- /wp:paragraph -->
<!-- wp:heading {{"level":3}} -->
<h3>3. Healthy flours and natural sweeteners</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>Sprouted ragi and moong dal powders, carrot powder and palm sugar (panam kalkandam) for healthier home cooking and baby food. See <a href="{SITE}/product-category/eco-goods/grains-flours/">grains and flours</a>.</p>
<!-- /wp:paragraph -->
<!-- wp:heading {{"level":3}} -->
<h3>4. Natural personal care</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>Homemade natural soaps, kasthuri manjal and virgin coconut oil for skin and hair, plus soft, eco-friendly bamboo tissue for the home.</p>
<!-- /wp:paragraph -->
<!-- wp:heading {{"level":3}} -->
<h3>5. Handmade coconut-shell craft</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>Bowls, cups, spoons and decorative lamps made by hand from coconut shells: zero plastic and beautiful on any table. Shop <a href="{SITE}/product-category/coconut-shell-products/">coconut-shell products</a>.</p>
<!-- /wp:paragraph -->
<!-- wp:heading {{"level":3}} -->
<h3>6. Thoughtful gifts</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>From the <a href="{SITE}/red-mountain-kitkat-tower/">Red Mountain KitKat tower</a> to customised men’s hampers, bouquets and wallets, our <a href="{SITE}/product-category/gift/">gift collection</a> makes every occasion special.</p>
<!-- /wp:paragraph -->
<!-- wp:heading -->
<h2>Shop with confidence</h2>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>We hold a 5-star rating on Google, and we answer questions personally on WhatsApp at +91 70120 45854. If anything arrives damaged, tell us within 2 days of delivery and we’ll replace it or refund you. Read our <a href="{SITE}/shipping-and-delivery/">shipping</a> and <a href="{SITE}/refund_returns-2/">refund</a> policies for the details.</p>
<!-- /wp:paragraph -->
<!-- wp:heading -->
<h2>Start shopping today</h2>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>Ready to make a positive impact? <a href="{SITE}/shop/">Explore EcoCart’s eco-friendly products</a> and make your lifestyle greener, one purchase at a time.</p>
<!-- /wp:paragraph -->''' + POST_CTA_BLOCK
PAGES['post-6269'] = {'id': 6269, 'slug': 'eco-friendly-products-your-one-stop-shop-in-india', 'kind': 'post', 'content': eco_post}
PAGES['post-7355'] = {'id': 7355, 'slug': 'reusable-cleaning-cloths-for-eco-friendly-homes', 'kind': 'post-append', 'append': POST_CTA_BLOCK}
PAGES['post-7618'] = {'id': 7618, 'slug': 'roshan-shaji-kerala-ai-visionary-entrepreneur', 'kind': 'post-append', 'append': POST_CTA_BLOCK}

if __name__ == '__main__':
    random.seed(20261018)
    for k, v in PAGES.items():
        json.dump(v, open(os.path.join(OUT, f'{k}.json'), 'w'), ensure_ascii=False, indent=1)
        print(k, v.get('slug'), len(json.dumps(v)))
