import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyEditor} from './editor-content.mjs';
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
 return `<form class="enquiry" action="https://formsubmit.co/fallentreevancouver@gmail.com" method="POST" data-enquiry="${reserve?'preservation':'general'}"><input type="hidden" name="_subject" value="${reserve?'Flower preservation enquiry — Fallen Tree Vancouver':'Website enquiry — Fallen Tree Vancouver'}"><input type="hidden" name="_next" value="${origin}/thank-you/"><input type="hidden" name="_template" value="table"><input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off" aria-hidden="true"><p class="email-notice">Send your enquiry here. For flower preservation, we will confirm availability by email; submitting this form does not reserve a date.</p><div class="name-fields"><label>First Name (required)<input name="firstName" autocomplete="given-name" maxlength="100" required></label><label>Last Name (required)<input name="lastName" autocomplete="family-name" maxlength="100" required></label></div><label>Email (required)<input type="email" name="email" autocomplete="email" maxlength="254" required></label>${reserve?'<label>Subject: Flower Preservation (required)<input name="subject" value="Flower Preservation" maxlength="200" required></label>':''}<label>Message (required)<textarea name="message" required maxlength="10000" rows="4" placeholder="${reserve?"Please tell us about your flowers (wedding, memorial, other) and the type of piece you’re interested in (heart block, tray, etc.)":"Tell us how we can help - general questions, custom orders, or anything else."}"></textarea></label>${reserve?'<label>Event Date<input type="date" name="eventDate"></label>':''}<p class="direct-email">Your details are processed by <a href="https://formsubmit.co/privacy.pdf" target="_blank" rel="noopener">FormSubmit</a> to deliver this enquiry to us.</p><button class="button" type="submit">Send enquiry</button><p class="direct-email">Or email <a href="mailto:fallentreevancouver@gmail.com${reserve?'?subject=Flower%20Preservation':''}">fallentreevancouver@gmail.com</a></p></form>`;
}
const instagram='<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/></svg>';
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
 if(b.type==='button')inner=`<a class="button ${esc(b.variant)}" href="${esc(b.href==='/cart'?'/contact':b.href)}">${esc(b.label)}</a>`;
 if(b.type==='accordion') inner=b.items.map(q=>`<details><summary>${esc(q.q)}</summary><div class="answer">${q.a}</div></details>`).join('');
 if(b.type==='form')inner=composeForm(b,slug);
 if(b.type==='social')inner=`<a class="social-link" href="https://www.instagram.com/fallentreevancouver/" aria-label="Instagram">${instagram}</a>`;
 return `<div id="${esc(b.id)}" class="cell cell-${esc(b.type)}"><div class="cell-inner">${inner}</div></div>`;
}
function section(s,slug,first=false){
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
 if(s.type==='testimonials')body=`<div class="testimonials"><div class="review-intro">${s.introHtml}</div><div class="reviews">${s.blocks.map(b=>`<blockquote><h2>${esc(b.title)}</h2>${b.html}</blockquote>`).join('')}</div></div>`;
 const bg=s.backgroundImage?`<div class="section-background">${img(s.backgroundImage,'fetchpriority="high" loading="eager"')}</div>`:'';
 return `<section id="${id}" class="section theme-${s.theme||'default'} size-${size} type-${s.type}${first?' first-section':''}${s.backgroundImage?' has-background':''}">${bg}${body}</section>`;
}
const logo=asset(content.logo.source);
function header(slug){return `<a class="skip-link" href="#page">Skip to content</a><header class="header"><a class="brand" href="/" aria-label="Fallen Tree Vancouver"><img src="${logo}" alt="Fallen Tree Vancouver" width="82" height="82"></a><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Open menu"><span></span><span></span></button><nav id="site-nav" aria-label="Main navigation">${content.nav.map(n=>`<a href="${n.href}"${slug===n.href?' aria-current="page"':''}>${esc(n.label)}</a>`).join('')}</nav></header>`;}
const footer=content.footer.sections.map(s=>section(s,'footer')).join('');
for(const page of content.pages){
 const canonical=origin+(page.slug==='/home'?'':page.slug==='/'?'':page.slug);
 const social=asset(page.og.image);
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(page.title)}</title><meta name="description" content="${esc(page.description)}"><meta name="robots" content="${production&&page.slug!='/hidden-sections'?'index,follow':'noindex,nofollow'}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:site_name" content="Fallen Tree Vancouver"><meta property="og:title" content="${esc(page.og.title||page.title)}"><meta property="og:description" content="${esc(page.og.description||page.description)}"><meta property="og:url" content="${canonical}">${social?`<meta property="og:image" content="${origin}${social}">`:''}<link rel="icon" href="${media.assets.find(a=>a.roles.includes('favicon')).local_url}"><link rel="stylesheet" href="/assets/fonts/fonts.css"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/layout.css"><script src="/site.js" defer></script></head><body data-page="${page.slug}">${header(page.slug)}<main id="page">${page.sections.map((s,i)=>section(s,page.slug,i===0)).join('')}</main><footer>${footer}</footer></body></html>`;
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
