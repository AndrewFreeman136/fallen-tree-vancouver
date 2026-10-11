import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const works=path.join(root,'content/editor/works.json'),home=path.join(root,'content/editor/home.json');
const originalWorks=fs.readFileSync(works),originalHome=fs.readFileSync(home);
const build=()=>execFileSync(process.execPath,['build.mjs'],{cwd:root,stdio:'pipe'});
try{
 const w=JSON.parse(originalWorks);w.items[0].visible=false;
 w.items[1].title='Editor verification';w.items[1].description='Saved content verification';
 w.items.splice(1,0,w.items.splice(2,1)[0]);
 const image=w.items[1].photos[0].source;
 const upload='/assets/images/editor-verification.webp';
 fs.mkdirSync(path.join(root,'public/assets/images'),{recursive:true});
 fs.copyFileSync(path.join(root,'public',image),path.join(root,'public',upload));
 w.items.push({visible:true,title:'Added work',photos:[{source:upload,alt:'Uploaded photo'}]});
 fs.writeFileSync(works,JSON.stringify(w));
 const h=JSON.parse(originalHome),text=Object.values(h).find(v=>v?.html);
 text.html='<h3>Edited heading verification</h3>';fs.writeFileSync(home,JSON.stringify(h));
 build();
 const gallery=fs.readFileSync(path.join(root,'dist/explore-my-work/index.html'),'utf8');
 assert.equal((gallery.match(/<figure>/g)||[]).length,18);
 assert(gallery.includes('Added work')&&gallery.includes('Uploaded photo')&&gallery.includes('Saved content verification'));
 assert(gallery.indexOf(w.items[1].photos[0].source)<gallery.indexOf(w.items[2].photos[0].source));
 assert(fs.readFileSync(path.join(root,'dist/index.html'),'utf8').includes(text.html));
 text.html='<script>alert(1)</script>';fs.writeFileSync(home,JSON.stringify(h));
 assert.throws(build,/Unsafe editor HTML/);
 w.items.at(-1).photos[0].source='/assets/images/../../../package.json';fs.writeFileSync(home,originalHome);fs.writeFileSync(works,JSON.stringify(w));
 assert.throws(build,/Invalid editor image/);
 console.log('PASS: persistent files change rendered text; hiding, ordering, adding work and new photo; unsafe HTML and file paths rejected.');
}finally{
 fs.writeFileSync(works,originalWorks);fs.writeFileSync(home,originalHome);
 fs.rmSync(path.join(root,'public/assets/images/editor-verification.webp'),{force:true});
 fs.rmSync(path.join(root,'dist/assets/images/editor-verification.webp'),{force:true});build();
}
