const newPhoto = name => `/assets/about-gallery-${name}.jpg`;
const escape = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const figure = (src, alt, className) => `<figure class="${className}"><img src="${src}" alt="${escape(alt)}" loading="lazy" decoding="async"></figure>`;

export function renderAboutPage(page){
  const blocks=page.sections.flatMap(section=>section.blocks);
  const block=id=>{
    const found=blocks.find(item=>item.id===`block-yui_3_17_2_1_1760310748972_${id}`);
    if(!found)throw Error(`Missing About content block: ${id}`);
    return found;
  };
  const inner=(id,tag,pattern='')=>{
    const html=block(id).html??'';
    const match=html.match(new RegExp(`<${tag}\\b[^>]*${pattern}[^>]*>([\\s\\S]*?)<\\/${tag}>`,'i'));
    if(!match)throw Error(`Missing About ${tag} in block: ${id}`);
    return match[1];
  };
  const image=(id,alt,className)=>{
    const b=block(id),src=b.source;
    if(!/^\/assets\/[a-zA-Z0-9._-]+\.(?:webp|jpe?g|png)$/.test(src))throw Error(`Invalid About image: ${src}`);
    return figure(src,b.alt||alt,className);
  };
  const gallery = [
    [newPhoto('ocean-heart'),'Ocean resin heart with local sand'],
    [newPhoto('maple-leaf'),'Maple leaf preserved with sand'],
    [newPhoto('flower-heart'),'Preserved flower heart'],
    [newPhoto('yellow-flower'),'Yellow flower in resin'],
    [block('31818').source,'Floral resin artwork']
  ].map(([src,alt])=>figure(src,alt,'ft-gallery-photo')).join('');
  return `<div class="ft-about">
    <section class="ft-began"><div class="ft-chapter-inner">
      <div class="ft-chapter-copy"><span class="ft-eyebrow">The story</span><h1>${inner('6864','h3')}</h1><p>${inner('6864','p','class="sqsrte-large"')}</p><blockquote>${inner('17030','em')}</blockquote></div>
      ${image('12446','Irina working with resin in her studio','ft-chapter-photo')}
    </div></section>
    <section class="ft-story"><div class="ft-story-inner">
      <div class="ft-story-copy"><span class="ft-eyebrow">Meet the artist · Vancouver, BC</span><h2>${inner('2695','h3')}</h2><p>${inner('2695-1','p','class="sqsrte-large"')}</p><blockquote>${inner('16341','em')}</blockquote></div>
      ${image('4385','Irina overlooking the Vancouver coast','ft-story-photo')}
    </div></section>
    <section class="ft-resin"><div class="ft-chapter-inner">
      <div class="ft-chapter-copy"><span class="ft-eyebrow">The story</span><h2>${inner('20422','h3')}</h2><p>${inner('20422','p','class="sqsrte-large"')}</p><blockquote>${inner('21532','em')}</blockquote></div>
      ${image('23429','Flowers preserved in resin','ft-chapter-photo')}
    </div></section>
    <section class="ft-create"><div class="ft-create-copy"><span class="ft-eyebrow">The work</span><h2>${inner('25943','h3')}</h2><p>${inner('25943','p','class="sqsrte-large"')}</p><blockquote>${inner('27204','em')}</blockquote></div><div class="ft-gallery">${gallery}</div></section>
    <section class="ft-thanks"><div class="ft-thanks-inner">
      ${image('68750','Floral resin keepsake in hand','ft-thanks-photo')}
      <div class="ft-thanks-copy"><span class="ft-eyebrow">A note from Irina</span><h2>${inner('66355','h3')}</h2><p>${inner('66355','p','class="sqsrte-large"')}</p></div>
    </div></section>
  </div>`;
}
