import fs from 'node:fs';
import path from 'node:path';
export function applyEditor(content,root){
 const folder=path.join(root,'content/editor');
 const read=name=>JSON.parse(fs.readFileSync(path.join(folder,name+'.json'),'utf8'));
 if(!fs.existsSync(folder))return content;
 function safeHTML(html){if(typeof html!=='string'||/<\s*(script|iframe|object|embed|style)\b|\son[a-z]+\s*=|javascript\s*:/i.test(html))throw Error('Unsafe editor HTML'); return html;}
 function apply(page,name){
  const data=read(name); if(name!=='footer'){page.title=data.title;page.description=data.description;}
  const updates=new Map(Object.values(data).filter(v=>v&&typeof v==='object'&&v.id).map(v=>[v.id,v]));
  for(const s of page.sections)for(const b of [...s.blocks,...(s.backgroundImage?[s.backgroundImage]:[])]){
   const u=updates.get(b.id??s.id+'-background'); if(!u)continue;
   if(u.html!==undefined)b.html=safeHTML(u.html);
   if(u.source!==undefined){b.source=u.source;b.alt=u.alt;}
   if(u.items)b.items=u.items.map(i=>({q:i.q,a:safeHTML(i.a)}));
  }
 }
 for(const p of content.pages)apply(p,p.slug==='/'?'home':p.slug.slice(1));
 apply(content.footer,'footer');
 const galleries=content.pages.find(p=>p.slug==='/explore-my-work').sections.filter(s=>s.type==='gallery');
 for(const gallery of galleries)gallery.blocks=read('works').items.filter(w=>w.visible&&(w.gallery??galleries[0].id)===gallery.id).flatMap(w=>w.photos.map(p=>({...p,title:w.title,description:w.description,price:w.price})));
 return content;
}
