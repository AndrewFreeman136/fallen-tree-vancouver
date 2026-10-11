const toggle=document.querySelector('.menu-toggle');
const nav=document.querySelector('#site-nav');
function closeMenu(){toggle?.setAttribute('aria-expanded','false');toggle?.setAttribute('aria-label','Open menu');nav?.classList.remove('open');document.body.classList.remove('menu-open');}
toggle?.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close menu':'Open menu');nav.classList.toggle('open',open);document.body.classList.toggle('menu-open',open);});
nav?.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&toggle?.getAttribute('aria-expanded')==='true'){closeMenu();toggle.focus();}if(e.key==='Tab'&&toggle?.getAttribute('aria-expanded')==='true'){const els=[toggle,...nav.querySelectorAll('a')];if(e.shiftKey&&document.activeElement===els[0]){e.preventDefault();els.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===els.at(-1)){e.preventDefault();els[0].focus();}}});
matchMedia('(min-width:768px)').addEventListener('change',e=>{if(e.matches)closeMenu();});
