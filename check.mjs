import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const base=path.dirname(fileURLToPath(import.meta.url)),dist=path.join(base,'dist');
const pages=JSON.parse(fs.readFileSync(path.join(base,'content/pages.json'))).pages;
const production=process.argv.includes('--production');
let resources=0,links=0;const errors=[];
for(const page of pages){
 const html=fs.readFileSync(path.join(dist,page.slug,'index.html'),'utf8');
 for(const [_,attr,value]of html.matchAll(/\b(src|href)="([^"]+)"/g)){
  if(attr==='src'&&/^https?:|^\/\//.test(value))errors.push(`${page.slug}: remote runtime asset ${value}`);
  if(!value.startsWith('/')||value.startsWith('//'))continue;
  const url=value.split(/[?#]/)[0];const file=path.join(dist,url);
  if(!(fs.existsSync(file)||fs.existsSync(path.join(file,'index.html'))))errors.push(`${page.slug}: missing ${value}`);
  if(attr==='src')resources++;else links++;
 }
 assert(html.includes('<html lang="en">'));
 assert(html.includes(`name="robots" content="${production&&page.slug!='/hidden-sections'?'index,follow':'noindex,nofollow'}"`));
 assert(!html.includes('href="/cart"'));
 assert(!/https?:[^"\s]+squarespace/.test(html));
 for(const s of page.sections)for(const b of s.blocks){if(b.type==='text')assert(html.includes(b.html),`Missing text block ${b.id}`);if(b.type==='accordion')for(const i of b.items)assert(html.includes(i.a));}
}
assert.equal(pages.length,8);
assert.equal((fs.readFileSync(path.join(dist,'preserve-your-blooms/index.html'),'utf8').match(/<details>/g)||[]).length,7);
assert.equal((fs.readFileSync(path.join(dist,'explore-my-work/index.html'),'utf8').match(/<figure>/g)||[]).length,18);
assert.equal(errors.length,0,errors.join('\n'));
const result={pages:pages.length,localImageReferences:resources,localLinks:links,errors,checks:['all original text blocks retained','all internal resources resolve','18 work gallery photos','7 FAQ answers','no Squarespace runtime or media requests','no cart',production?'production index rules':'preview noindex']};
fs.writeFileSync(path.join(base,'verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
