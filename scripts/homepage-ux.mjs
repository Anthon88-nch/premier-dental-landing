// Homepage composition is isolated from the unchanged inner-page shell.
export function mainSections(html) {
  const start=html.indexOf('<main id="main">')+'<main id="main">'.length;
  const end=html.indexOf('</main>',start);
  const content=html.slice(start,end),sections=[];
  let depth=0,begin=0;
  for(const match of content.matchAll(/<\/?section\b[^>]*>/g)) {
    if(!match[0].startsWith('</')) {if(depth++===0)begin=match.index;}
    else if(--depth===0)sections.push(content.slice(begin,match.index+match[0].length));
  }
  return {start,end,sections};
}
const sectionId=section=>section.match(/^<section[^>]*\bid="([^"]+)"/)?.[1] || 'hero';
export const replaceSection=(html,id,replacement)=>{
  const {sections}=mainSections(html),section=sections.find(value=>sectionId(value)===id);
  if(!section)throw new Error(`Missing homepage section: ${id}`);
  return html.replace(section,replacement);
};

export function homepageUx(html) {
  html=html.replace('<body>','<body class="home-page">');
  const {start,end,sections}=mainSections(html);
  const blocks=Object.fromEntries(sections.map(section=>[sectionId(section),section]));
  const steps=blocks.steps.replace('</section>',blocks.aftercare+'</section>');
  const cost=blocks.cost.replace('</section>',blocks.systems+'</section>');
  const clinic=blocks.clinic.replace('</section>',blocks.laboratory+'</section>');
  const order=[blocks.hero,blocks.solutions,cost,blocks.reviews,blocks.doctor,steps,clinic,blocks.faq,blocks.contacts];
  html=html.slice(0,start)+'\n'+order.join('\n')+'\n'+html.slice(end);
  html=html.replace(/(<div class="footer-top">)/,'$1<a class="home-footer-blog" href="blog/">Блог</a>');
  return html;
}
