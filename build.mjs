import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyEditor} from './editor-content.mjs';
import {renderAboutPage} from './about-page.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const content=applyEditor(read('content/pages.json'),root), media=read('content/assets.json');
const production=process.argv.includes('--production');
const origin='https://www.fallentreevancouver.com';
const dist=path.join(root,'dist');
fs.mkdirSync(dist,{recursive:true});
fs.cpSync(path.join(root,'public'),dist,{recursive:true});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function asset(src){
  if(!src) return '';
  if(media.assets.some(a=>a.local_url===src))return src;
  if(src.startsWith('/assets/')){
    const file=path.resolve(root,'public',src.slice(1));
    if(!file.startsWith(path.join(root,'public/assets')+path.sep)||!fs.existsSync(file)||!/^\/(?:[^?#]+)\.(?:png|jpe?g|webp)$/i.test(src))throw Error('Invalid editor image: '+src);
    return src;
  }
  if(media.url_map[src]) return media.url_map[src];
  const normalized=decodeURIComponent(src.replace(/^http:/,'https:').replace(/^\/\//,'https://').split('?')[0]);
  const entry=media.assets.find(a=>decodeURIComponent(a.source_url.split('?')[0])===normalized);
  if(!entry?.local_url) throw Error('Missing local asset: '+src);
  return entry.local_url;
}
const css=[];
function rule(selector,props,desktop=false){
  const str=Object.entries(props??{}).map(([k,v])=>`${k}:${v}`).join(';').replaceAll('--sqs-mobile-site-gutter','--mobile-gutter').replaceAll('--sqs-site-gutter','--site-gutter').replaceAll('--sqs-site-max-width','--site-max-width');
  if(str) css.push(desktop?`@media(min-width:768px){${selector}{${str}}}`:`${selector}{${str}}`);
}
function img(b,extra=''){
 const fp=b.focalPoint??{x:.5,y:.5};
 const m=media.assets.find(a=>a.local_url===asset(b.source));
 return `<img src="${asset(b.source)}" alt="${esc(b.alt||m?.caption||'')}"${m?` width="${m.width}" height="${m.height}"`:''} style="object-position:${fp.x*100}% ${fp.y*100}%" decoding="async" ${extra}>`;
}
function composeForm(b,slug){
 const reserve=slug==='/reserve-preservation';
 return `<form class="enquiry" action="https://formsubmit.co/fallentreevancouver@gmail.com" method="POST" data-enquiry="${reserve?'preservation':'general'}"><input type="hidden" name="_subject" value="${reserve?'Flower preservation enquiry — Fallen Tree Vancouver':'Website enquiry — Fallen Tree Vancouver'}"><input type="hidden" name="_next" value="${origin}/thank-you/"><input type="hidden" name="_template" value="table"><input type="hidden" name="_captcha" value="false"><input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off" aria-hidden="true"><p class="email-notice">Send your enquiry here. For flower preservation, we will confirm availability by email; submitting this form does not reserve a date.</p><div class="name-fields"><label>First Name (required)<input name="firstName" autocomplete="given-name" maxlength="100" required></label><label>Last Name (required)<input name="lastName" autocomplete="family-name" maxlength="100" required></label></div><label>Email (required)<input type="email" name="email" autocomplete="email" maxlength="254" required></label>${reserve?'<label>Subject: Flower Preservation (required)<input name="subject" value="Flower Preservation" maxlength="200" required></label>':''}<label>Message (required)<textarea name="message" required maxlength="10000" rows="4" placeholder="${reserve?"Please tell us about your flowers (wedding, memorial, other) and the type of piece you’re interested in (heart block, tray, etc.)":"Tell us how we can help - general questions, custom orders, or anything else."}"></textarea></label>${reserve?'<label>Event Date<input type="date" name="eventDate"></label>':''}<p class="direct-email">Your details are processed by <a href="https://formsubmit.co/privacy.pdf" target="_blank" rel="noopener">FormSubmit</a> to deliver this enquiry to us.</p><button class="button" type="submit">Send enquiry</button><p class="direct-email">Or email <a href="mailto:fallentreevancouver@gmail.com${reserve?'?subject=Flower%20Preservation':''}">fallentreevancouver@gmail.com</a></p></form>`;
}
const instagram='<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/></svg>';
function buttonLabel(label){
 const text=String(label??'').trim().replace(/^boook\b/i,'Book').toLowerCase();
 return (text.charAt(0).toUpperCase()+text.slice(1)).replace(/\binstagram\b/g,'Instagram').replace(/\bshop makers\b/g,'Shop Makers');
}
function block(b,slug){
 let inner=''; const selector=`#${b.id}`;
 for(const mode of ['mobile','desktop']){
   const g=b.geometry?.[mode]??{};
   rule(selector,g,mode==='desktop');
   let align='flex-start'; const textProps={};
   for(const r of b.blockStyles??[]){
     if(r.media && mode==='mobile') continue;
     if(r.media?.includes('max-width') && mode==='desktop')continue;
     if(r.selector.endsWith(' .sqs-block')&&r.declarations['justify-content'])align=r.declarations['justify-content'];
     if(r.selector===`#${b.id}`&&r.declarations['--tweak-text-block-background-color'])textProps.background=r.declarations['--tweak-text-block-background-color'];
     if(r.selector.endsWith(' .sqs-html-content')&&r.declarations.padding)textProps.padding=r.declarations['--tweak-text-block-padding'];
   }
   rule(selector,{'justify-content':align},mode==='desktop');
   rule(selector+' > .cell-inner',{'justify-content':align,...(b.type==='text'&&!textProps.background?{height:'auto'}:{}),...textProps},mode==='desktop');
 }
 if(b.type==='text') inner=b.html;
 if(b.type==='image'){
   const shape=b.shape??'';
   inner=`<div class="image-frame ${esc(shape)} ${b.stretched?'stretched':''}">${img(b,'loading="lazy"')}</div>`;
   if(b.href)inner=`<a class="image-link" href="${esc(b.href)}">${inner}</a>`;
 }
 if(b.type==='button')inner=`<a class="button ${esc(b.variant)}" href="${esc(b.href==='/cart'?'/contact':b.href)}">${esc(buttonLabel(b.label))}</a>`;
 if(b.type==='accordion') inner=b.items.map(q=>`<details><summary>${esc(q.q)}</summary><div class="answer">${q.a}</div></details>`).join('');
 if(b.type==='form')inner=composeForm(b,slug);
 if(b.type==='social')inner=`<a class="social-link" href="https://www.instagram.com/fallentreevancouver/" aria-label="Instagram">${instagram}</a>`;
 return `<div id="${esc(b.id)}" class="cell cell-${esc(b.type)}"><div class="cell-inner">${inner}</div></div>`;
}
function section(s,slug,first=false){
 if(s.id==='68e491418560745fb61aa844'&&['/','/home'].includes(slug)){
 const names=['Coastal resin art','Preserving flowers','Behind the scenes with Irina','Botanical keepsakes'];
 const photos=s.blocks.filter(b=>b.type==='image');
 return `<section class="home-social" aria-labelledby="social-title"><div class="social-heading"><div><p class="social-kicker">From my studio to your feed</p><div id="social-title">${s.blocks.find(b=>b.type==='text').html}</div><p>See the process, the details, and the pieces taking shape.</p></div><a class="social-follow" href="https://www.instagram.com/fallentreevancouver/" target="_blank" rel="noopener noreferrer">Follow on Instagram<span>@fallentreevancouver</span></a></div><div class="social-photos">${photos.map((b,i)=>`<a href="${esc(b.href)}" target="_blank" rel="noopener noreferrer" aria-label="${names[i]} — view on Instagram (opens in a new tab)">${img({...b,alt:names[i]},'loading="lazy"')}<span>${names[i]}</span></a>`).join('')}</div></section>`;
 }

 const rhythm = s.type==='gallery'?'rhythm-gallery':slug==='footer'?'rhythm-footer':slug==='/explore-my-work'?'rhythm-title':['68e491418560745fb61aa816','68f14d785db5235667a98153'].includes(s.id)?'rhythm-form':s.id==='68f1d5bf3b39f829a307db17'?'rhythm-split':['68f1d9bcb8d00f51bd94560b','68f096adce85d5141f959667','68f14947aace670798fb0c06','68f15586d618b1a4ad7bdecd','68f09300151f2f7486bd26c4'].includes(s.id)?'rhythm-stack':'';
 const id=`section-${s.id}`; const size=s.styles.sectionHeight?.replace('section-height--','')??'custom';
 let body='';
 if(s.type==='fluid'){
  rule(`#${id} .layout`,s.geometry.mobile);
  rule(`#${id} .layout`,s.geometry.desktop,true);
  if(s.wrapperStyle)rule(`#${id} > .section-content`,s.wrapperStyle);
  body=`<div class="section-content"><div class="layout">${s.blocks.map(b=>block(b,slug)).join('')}</div></div>`;
 }
 if(s.type==='gallery'){
  const g=s.gallery, aspect=g.aspectRatio==='four-three'?'4/3':'1';
  rule(`#${id} .gallery`,{'--gallery-gap':`${g.gutter}px`,'--gallery-columns':g.numColumns,'--gallery-ratio':aspect});
  body=`<div class="gallery">${s.blocks.map(b=>`<figure>${img(b,'loading="lazy"')}${b.title||b.description||b.price?`<figcaption>${b.title?`<strong>${esc(b.title)}</strong>`:''}${b.description?`<p>${esc(b.description)}</p>`:''}${b.price?`<p>${esc(b.price)}</p>`:''}</figcaption>`:''}</figure>`).join('')}</div>`;
 }
 if(s.type==='testimonials')body=`<div class="testimonials"><div class="review-intro">${['/','/home'].includes(slug)?'<p class="testimonial-label">From the people who chose my work</p><h2>Loved in their homes</h2>':s.introHtml}</div><div class="reviews">${s.blocks.map(b=>`<blockquote><h2>${esc(b.title)}</h2>${b.html}</blockquote>`).join('')}</div></div>`;
 const bg=s.backgroundImage?`<div class="section-background">${img(s.backgroundImage,'fetchpriority="high" loading="eager"')}</div>`:'';
 return `<section id="${id}" class="section ${rhythm} theme-${s.theme||'default'} size-${size} type-${s.type}${first?' first-section':''}${s.backgroundImage?' has-background':''}">${bg}${body}</section>`;
}
const logo=asset(content.logo.source);
function header(slug){return `<a class="skip-link" href="#page">Skip to content</a><header class="header"><a class="brand" href="/" aria-label="Fallen Tree Vancouver"><img src="${logo}" alt="Fallen Tree Vancouver" width="82" height="82"></a><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Open menu"><span></span><span></span></button><nav id="site-nav" aria-label="Main navigation">${content.nav.map(n=>`<a href="${n.href}"${slug===n.href?' aria-current="page"':''}>${esc(n.label)}</a>`).join('')}</nav></header>`;}
function homeIntro(){return `<div class="home-redesign"><section class="home-hero" aria-labelledby="home-title"><div class="home-hero-copy"><p class="home-eyebrow">Fallen Tree Vancouver</p><h1 id="home-title">Nature, held in your hands.</h1><p>I make each resin piece by hand, bringing the textures and colours of the coast into everyday life.</p><p class="home-note">Made by hand in Vancouver, BC</p><a class="home-action" href="/explore-my-work">Explore my work</a></div><div class="home-hero-photo"><img src="/assets/home-photo-01-57a842ac.webp" alt="Ocean-inspired resin coasters on driftwood" width="1500" height="2000" fetchpriority="high"></div></section><section class="home-facts" aria-label="About the artwork"><div><h2>Inspired by place</h2><p>Vancouver's shores, sand, and shifting tides.</p></div><div><h2>Made by hand</h2><p>Every layer shaped with care.</p></div><div><h2>Made to keep</h2><p>Small pieces of nature for everyday life.</p></div></section><section class="home-story"><img src="/assets/home-photo-02-1c38fac7.webp" alt="Irina making resin art in her studio" width="1067" height="1600" loading="lazy"><div><p class="home-eyebrow">Behind the art</p><h2>From local sand to something lasting.</h2><p>I'm Irina. My work begins with the natural details I notice around Vancouver and takes shape, one piece at a time, in my studio.</p><a class="home-story-action" href="/about-2">Meet the artist</a></div></section></div>`;}
function findUs(){return `<section class="find-us"><header class="find-intro"><p class="find-label">Made here. Found here.</p><h2>Find something worth keeping.</h2><p>Discover nature-inspired resin artwork at these local spots.</p></header><article class="find-store"><img src="/assets/home-photo-03-eb62339d.webp" alt="Shop Makers storefront" loading="lazy"><div class="find-store-copy"><p class="find-label">Shop small · Shop local</p><h2>Discover my work<br>at Shop Makers.</h2><div class="find-addresses"><div><h3>North Vancouver</h3><p>125 Victory Ship Way<br>Unit 124, North Vancouver</p><a href="https://www.google.com/maps/search/?api=1&amp;query=125+Victory+Ship+Way+124+North+Vancouver">Get directions</a></div><div><h3>Kitsilano</h3><p>1929 W 4th Ave<br>Vancouver</p><a href="https://www.google.com/maps/search/?api=1&amp;query=1929+W+4th+Ave+Vancouver">Get directions</a></div></div><a class="find-shop-online" href="https://www.shopmakers.ca">Visit Shop Makers online</a></div></article><article id="christmas-market" class="find-market"><img src="/assets/home-photo-04-0e93c55c.webp" alt="Shipyards Christmas Market logo" loading="lazy"><div><p class="find-label">Come say hello</p><h2>Shipyards Christmas Market</h2><p class="find-date">December 11–17, 2026</p><p>125 Victory Ship Way, North Vancouver</p></div><a href="https://shipyardschristmasmarket.com">Market details</a></article></section>`;}
const footer=content.footer.sections.map(s=>section(s,'footer')).join('');
for(const page of content.pages){
 const canonical=origin+(page.slug==='/home'?'':page.slug==='/'?'':page.slug);
 const social=asset(page.og.image);
 const isHome=['/','/home'].includes(page.slug);
 const sections=page.slug==='/about-2'?renderAboutPage(page):isHome?`${homeIntro()}<div hidden aria-hidden="true">${page.sections.slice(0,2).map((s,i)=>section(s,page.slug,i===0)).join('')}</div>${findUs()}<div hidden aria-hidden="true">${section(page.sections[2],page.slug)}</div>${page.sections.slice(3).map(s=>section(s,page.slug)).join('')}`:page.sections.map((s,i)=>section(s,page.slug,i===0)).join('');
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(page.title)}</title><meta name="description" content="${esc(page.description)}"><meta name="robots" content="${production&&page.slug!='/hidden-sections'?'index,follow':'noindex,nofollow'}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:site_name" content="Fallen Tree Vancouver"><meta property="og:title" content="${esc(page.og.title||page.title)}"><meta property="og:description" content="${esc(page.og.description||page.description)}"><meta property="og:url" content="${canonical}">${social?`<meta property="og:image" content="${origin}${social}">`:''}<link rel="icon" href="${media.assets.find(a=>a.roles.includes('favicon')).local_url}"><link rel="stylesheet" href="/assets/fonts/fonts.css"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/layout.css">${isHome?'<link rel="stylesheet" href="/home.css">':''}${page.slug==='/about-2'?'<link rel="stylesheet" href="/about.css">':''}<link rel="stylesheet" href="/consistency.css"><script src="/site.js" defer></script></head><body data-page="${page.slug}">${header(page.slug)}<main id="page">${sections}</main><footer>${footer}</footer></body></html>`;
 const directory=path.join(dist,page.slug);fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'index.html'),html);
}
fs.writeFileSync(path.join(dist,'layout.css'),[...new Set(css)].join('\n'));
fs.writeFileSync(path.join(dist,'robots.txt'),production?`User-agent: *\nAllow: /\nDisallow: /hidden-sections\nSitemap: ${origin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n');
fs.writeFileSync(path.join(dist,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${content.pages.filter(p=>!['/hidden-sections','/home'].includes(p.slug)).map(p=>`<url><loc>${origin}${p.slug}</loc></url>`).join('')}</urlset>`);
fs.writeFileSync(path.join(dist,'_headers'),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n${production?'':'  X-Robots-Tag: noindex, nofollow\n'}`);
fs.writeFileSync(path.join(dist,'404.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found — Fallen Tree Vancouver</title><link rel="stylesheet" href="/styles.css"><main class="not-found"><h1>Page not found</h1><p><a href="/">Return to Fallen Tree Vancouver</a></p></main></html>`);
const thanksDir=path.join(dist,'thank-you');fs.mkdirSync(thanksDir,{recursive:true});
fs.writeFileSync(path.join(thanksDir,'index.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Thank you — Fallen Tree Vancouver</title><meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/assets/fonts/fonts.css"><link rel="stylesheet" href="/styles.css"></head><body><main class="not-found"><h1>Thank you for your enquiry</h1><p>Your enquiry has been submitted. We will reply by email. Flower preservation dates are confirmed separately; this is not a booking confirmation.</p><p>If you need to follow up, email <a href="mailto:fallentreevancouver@gmail.com">fallentreevancouver@gmail.com</a>.</p><p><a class="button" href="/">Return to Fallen Tree Vancouver</a></p></main></body></html>`);
// Cloudflare build does not require the Sites hosting manifest.
console.log(`Built ${content.pages.length} pages (${production?'production':'private preview'}). All media are local.`);
