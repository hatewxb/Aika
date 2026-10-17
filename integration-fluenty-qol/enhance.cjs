if(!process.env.AIKA_REVIEW_THEMES)throw new Error('Run node build-review.cjs with explicit local input paths');
const fs=require('fs'),path=require('path');
const root=process.env.AIKA_REVIEW_THEMES+'/Fluenty-Aika-QOL-RU',aika=process.env.AIKA_REVIEW_THEMES+'/Aika',dest=root+'/compat';
const read=p=>fs.readFileSync(p,'utf8');const write=(p,v)=>fs.writeFileSync(p,v);
// Steam's shipped class map supplies aliases; use semantic names AND this client's hashes.
const source=read(process.env.AIKA_REVIEW_STEAM_UI),aliases={};
for(const match of source.matchAll(/\b([A-Za-z][A-Za-z0-9_]*):"([_A-Za-z0-9-]+)"/g)){
 const [,key,value]=match;if(value.length<12||value.length>65)continue;
 (aliases[key]??=new Set()).add(value);
}
function selectorNames(text){return text.replace(/\.([A-Z][A-Za-z0-9_]+)/g,(whole,key)=>aliases[key]?':is('+[whole,...[...aliases[key]].slice(0,8).map(v=>'.'+v)].join(',')+')':whole);}
for(const file of ['cover-tilt.js','spotlight.js','achievement-progress.js','tilt.css','zoom.css','lift.css','glow.css'])write(dest+'/'+file,selectorNames(read(dest+'/'+file)));
let tiltScript=read(dest+'/cover-tilt.js');
tiltScript=tiltScript.replace(/const COVERS = [^;]+;/,'const COVERS = ".LibraryItemBox, .WYgDg9NyCcMIVuMyZ_NBC";');
write(dest+'/cover-tilt.js',tiltScript);
// Fluenty also forces translateY(-3px)!important on every hovered cover.
// Give the selected Aika mode ownership of transform, without overriding other properties.
for(const file of ['tilt.css','zoom.css','lift.css']){
 let text=read(dest+'/'+file);
 text=text.replace(/(\n\s*transform\s*:[^;]+);/g,'$1 !important;').replace('transform:translateY(-4px)','transform:translateY(-4px)!important');
 write(dest+'/'+file,text);
}
// Target the actual card itself: some Steam layouts place hover/draggable flags on a different wrapper.
write(dest+'/tilt.css',read(dest+'/tilt.css')+`\nhtml:root .WYgDg9NyCcMIVuMyZ_NBC,html:root .LibraryItemBox{transform:perspective(var(--aika-tilt-perspective,900px)) rotateX(calc(var(--aika-tilt-rx,0)*1deg)) rotateY(calc(var(--aika-tilt-ry,0)*1deg)) scale(var(--aika-tilt-s,1))!important;transition:box-shadow 250ms ease-out!important}\nhtml:root .WYgDg9NyCcMIVuMyZ_NBC:hover,html:root .LibraryItemBox:hover{transform:perspective(var(--aika-tilt-perspective,900px)) rotateX(calc(var(--aika-tilt-rx,3)*1deg)) rotateY(calc(var(--aika-tilt-ry,7)*1deg)) scale(var(--aika-tilt-s,1.035))!important}\n`);
write(dest+'/covers-base.css',`:root{--aika-covers-mode:tilt}
html:root .WYgDg9NyCcMIVuMyZ_NBC,html:root .LibraryItemBox{transform:var(--our-cover-transform,perspective(var(--aika-tilt-perspective,900px)) rotateX(calc(var(--aika-tilt-rx,0)*1deg)) rotateY(calc(var(--aika-tilt-ry,0)*1deg)) scale(var(--aika-tilt-s,1)))!important;transition:box-shadow 250ms ease-out!important}
`);
for(const [file,mode]of [['tilt.css','tilt'],['lift.css','lift'],['zoom.css','zoom']]){
 let text=read(dest+'/'+file)+`\n:root{--aika-covers-mode:${mode}!important}\n`;
 if(mode==='lift')text+='html:root :is(.LibraryItemBox,.WYgDg9NyCcMIVuMyZ_NBC):hover{--our-cover-transform:translateY(-4px);transform:translateY(-4px)!important}\n';
 if(mode==='zoom')text+='html:root :is(.LibraryItemBox,.WYgDg9NyCcMIVuMyZ_NBC){--our-cover-transform:none}\n';
 write(dest+'/'+file,text);
}
write(dest+'/layout-fixes.css',`/* Empty shelf: keep the help text in normal flow below controls, including narrow windows. */
html :is(.Showcase,.V7RuDNUxhxoBRaiGWbk3B):has(:is(.EmptyMessage,.mzPGHdgk9pc3JvhdUg0cl)){min-height:150px!important}
html :is(.EmptyMessage,.mzPGHdgk9pc3JvhdUg0cl){display:flex!important;clear:both;position:relative!important;min-height:60px!important;margin-top:14px!important;align-items:center;justify-content:center}
html :is(.EmptyMessage,.mzPGHdgk9pc3JvhdUg0cl) :is(.Message,._2j0P6ED4qgKoZ623as9P_e){position:relative!important;inset:auto!important;transform:none!important;align-self:center!important;box-sizing:border-box;max-width:420px!important;width:calc(100% - 40px)!important;margin:0 auto 12px!important;translate:28px 0;text-align:center!important;line-height:1.45!important;pointer-events:none}
html :is(.EmptyMessage,.mzPGHdgk9pc3JvhdUg0cl) :is(.ShowcaseArrow,.UOfJ-NXoaml5lmTtRdkSo){display:none!important}
@media(max-width:1000px){html :is(.EmptyMessage,.mzPGHdgk9pc3JvhdUg0cl) :is(.Message,._2j0P6ED4qgKoZ623as9P_e){margin-inline:auto!important;translate:12px 0}}
`);
const tokens=`:root{--aika-z-boot:2147483000;--aika-z-curtain:2147482000;--aika-bg-deep:var(--background-col,#202020);--aika-bg-gradient:linear-gradient(#222,#191919);--aika-boot-beam:linear-gradient(90deg,transparent 35%,rgba(180,170,255,.18) 50%,transparent 65%);--aika-boot-haze:radial-gradient(ellipse at center,rgba(180,170,255,.1),transparent 65%);--aika-boot-fade:180ms;--aika-boot-min:150;--aika-boot-limit:2500;--aika-curtain:var(--background-col,#202020);--aika-curtain-in:80;--aika-curtain-out:140;--aika-curtain-wait:250;--aika-curtain-quiet:80}
`;
write(dest+'/curtains.css',tokens+read(aika+'/sections/boot.css')+read(aika+'/components/curtain.css'));
let boot=selectorNames(read(aika+'/js/boot-reveal.js'));
// Independent watchdog restores the native browser view even if RAF is throttled or an error occurs.
boot=boot.replace('let sawLoading = false',`const watchdog=setTimeout(()=>{showView();box.remove();},3200);
  addEventListener('pagehide',()=>{clearTimeout(watchdog);showView();box.remove();},{once:true});
  let sawLoading = false`);
boot=boot.replace('showView();\n      box.remove();','clearTimeout(watchdog);\n      showView();\n      box.remove();');
write(dest+'/boot-reveal.js',boot);
let page=selectorNames(read(aika+'/js/page-curtain.js'));
page=page.replace('transition(kind, args, run);','transition(kind, args, run).catch(()=>{run();curtain.classList.remove("is-on");busy=false;});');
write(dest+'/page-curtain.js',page);
// Aika's clip-based menu unfolding without changing Fluenty colors, dimensions or native positioning.
write(dest+'/menu-motion.js',`(()=>{
 if(window.__ourMenuMotion)return;window.__ourMenuMotion=true;
 const seen=new WeakSet(),active=new Map();
 const scan=()=>{if(document.hidden||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  document.querySelectorAll('.contextMenu.ready').forEach(menu=>{
   if(seen.has(menu))return;seen.add(menu);
   const a=menu.animate([{clipPath:'inset(0 0 100% 0 round 8px)'},{clipPath:'inset(0 round 8px)'}],{duration:280,easing:'cubic-bezier(.215,.61,.355,1)'});active.set(menu,a);
  });
  for(const [menu,a] of active){if(!menu.isConnected||!menu.classList.contains('ready')){a.cancel();seen.delete(menu);active.delete(menu)}}
 };
 new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 addEventListener('visibilitychange',()=>{if(!document.hidden){for(const menu of active.keys())seen.delete(menu);scan()}});scan();
})();`);
// Explicit Steam-only motion preference: Windows may disable animation globally.
// The user's requested animated theme can opt out without changing any Windows setting.
for(const file of ['cover-tilt.js','boot-reveal.js','page-curtain.js','achievement-progress.js','menu-motion.js']){
 let text=read(dest+'/'+file);
 text=text.replaceAll('matchMedia("(prefers-reduced-motion: reduce)").matches','(matchMedia("(prefers-reduced-motion: reduce)").matches && getComputedStyle(document.documentElement).getPropertyValue("--our-force-motion").trim()==="0")');
 text=text.replaceAll("matchMedia('(prefers-reduced-motion:reduce)').matches",'(matchMedia("(prefers-reduced-motion:reduce)").matches && getComputedStyle(document.documentElement).getPropertyValue("--our-force-motion").trim()==="0")');
 text=text.replace('const reduced = matchMedia("(prefers-reduced-motion: reduce)");','const reduced = {get matches(){return matchMedia("(prefers-reduced-motion: reduce)").matches && getComputedStyle(document.documentElement).getPropertyValue("--our-force-motion").trim()==="0";}};');
 write(dest+'/'+file,text);
}
write(dest+'/motion-preference.css',`:root{--our-force-motion:1;--our-motion-enabled:1}
@media(prefers-reduced-motion:reduce){html:root{--aika-motion:var(--our-motion-enabled,1)!important;--aika-decor:var(--our-motion-enabled,1)!important}}
`);
write(dest+'/respect-system-motion.css',`:root{--our-force-motion:0!important}@media(prefers-reduced-motion:reduce){:root{--our-motion-enabled:0!important}}`);
write(dest+'/off.css',read(dest+'/off.css')+'\n:root{--our-motion-enabled:0!important}\n');
write(dest+'/main.js','import "./boot-reveal.js";\nimport "./page-curtain.js";\nimport "./cover-tilt.js";\nimport "./spotlight.js";\nimport "./achievement-progress.js";\n');
// Capture the official release text before Fluenty builds its custom header; never invent dates.
write(dest+'/release-date.js',`(()=>{
 if(window.__ourReleaseDate)return;window.__ourReleaseDate=true;
 let release='';let frame=0;
 const apply=()=>{frame=0;
  const native=document.querySelector('.release_date .date');
  if(native?.textContent.trim())release=native.textContent.trim();
  const header=document.querySelector('.apphubCustom_GameDetails .rightSideDetails');
  if(!header||!release)return;
  let row=header.querySelector('.our-release-date');
  if(!row){row=document.createElement('div');row.className='our-release-date';header.append(row);}
  const text='Дата выхода: '+release;if(row.textContent!==text)row.textContent=text;
 };
 const queue=()=>{if(!frame)frame=requestAnimationFrame(apply)};
 const start=()=>{apply();new MutationObserver(queue).observe(document.body,{subtree:true,childList:true,characterData:true})};
 if(document.body)start();else addEventListener('DOMContentLoaded',start,{once:true});
})();`);
write(dest+'/release-date.css',`html .our-release-date{display:block!important;position:static!important;margin:10px 0!important;color:#ddd!important;font-size:14px!important;line-height:1.5!important;font-weight:500!important;white-space:normal!important}
html .glance_ctn .release_date{display:flex!important;position:static!important;gap:8px;flex-wrap:wrap;margin-block:10px!important}
html .glance_ctn .release_date :is(.subtitle.column,.date){display:block!important;position:static!important;inset:auto!important;width:auto!important;text-align:start!important}
html:has(.our-release-date) #game_highlights .release_date{display:none!important}
`);
write(dest+'/lilac.css',`:root{--our-lilac:190,151,255;--aika-accent-spot:rgba(var(--our-lilac),.12);--aika-tilt-light:rgba(224,204,255,.24);--aika-border-hover:rgba(var(--our-lilac),.32);--aika-home-glare:linear-gradient(115deg,transparent 35%,rgba(224,204,255,.21) 50%,transparent 65%);--aika-boot-beam:linear-gradient(90deg,transparent 30%,rgba(var(--our-lilac),.26) 50%,transparent 70%);--aika-boot-haze:radial-gradient(ellipse at center,rgba(var(--our-lilac),.16),transparent 65%)}
html :is(.DialogInput_Wrapper,.DialogInputContainer,.DialogInput):focus-within{outline-color:rgb(var(--our-lilac));box-shadow:0 0 0 1px rgba(var(--our-lilac),.48),0 0 14px rgba(var(--our-lilac),.12)!important}
/* Keep text and control geometry unchanged, including Family View fields. */
`);
write(dest+'/lilac-soft.css',`:root{--our-lilac:190,151,255;--aika-accent-spot:rgba(var(--our-lilac),.06)!important;--aika-tilt-light:rgba(224,204,255,.13)!important;--aika-border-hover:rgba(var(--our-lilac),.16)!important;--aika-home-glare:linear-gradient(115deg,transparent 35%,rgba(224,204,255,.11) 50%,transparent 65%)!important}
`);
const skin=JSON.parse(read(root+'/skin.json'));skin.version='1.17.0-local.2';
skin.version='1.17.0-local.4';
skin.Conditions['Aika: лиловая подсветка']={tab:'Aika — анимации',description:'Яркость лиловых бликов на панелях и обложках. Не меняет системный акцент Windows, PIN или ограничения семейного просмотра.',default:'Яркий лиловый',values:{'Яркий лиловый':{},'Мягкий':{TargetCss:{affects:['^Steam$'],src:'compat/lilac-soft.css'}}}};
skin.Conditions['Aika: учитывать анимации Windows']={tab:'Aika — анимации',description:'Нет — включать эффекты только в Steam, даже если анимации Windows выключены. Да — учитывать системное уменьшение движения. Требуется перезапуск Steam.',default:'Нет',values:{'Нет':{},'Да':{TargetCss:{affects:['^Steam$'],src:'compat/respect-system-motion.css'}}}};
// Legacy Fluenty enhancements must not throw when Steam removes a targeted element.
const original=process.env.AIKA_REVIEW_THEMES+'/fluenty1.17.0';
let library=read(original+'/src/styles/library.css');
library=library.replace(/(\.WYgDg9NyCcMIVuMyZ_NBC\._1Pf6J2JFkZ-oRpe0_7cabJ\._3ANruIVwRSgaU7L1eWRnf8\.Panel:hover\s*\{[^}]*?)transform:\s*unset\s*!important;/,'$1/* Aika owns cover transforms in the combined profile. */');
write(root+'/src/styles/library.css',library);
// Load the compatibility layer from Fluenty's actual root entries as well.
// This avoids relying on a second JS patch for the same Steam window.
let rootJs=read(original+'/libraryroot.custom.js');
rootJs='import "./compat/main.js";\n'+rootJs;
write(root+'/libraryroot.custom.js',rootJs);
write(root+'/libraryroot.custom.css','@import url("./compat/motion.css");\n@import url("./compat/covers-base.css");\n@import url("./compat/curtains.css");\n@import url("./compat/lilac.css");\n@import url("./compat/layout-fixes.css");\n@import url("./compat/motion-preference.css");\n'+read(original+'/libraryroot.custom.css'));
let search=read(original+'/src/scripts/customSearch.js');
search=search.replace("export async function customSearch() {","export async function customSearch() {\n if(!document.querySelector('._12vo5L1hsNGdao6_ssuirS')) return;");
search=search.replace("e[0].removedNodes[0].classList[0]","e[0]?.removedNodes[0]?.classList?.[0]");
search=search.replaceAll('e[0].addedNodes[0]?.childNodes[0].className','e[0]?.addedNodes[0]?.childNodes[0]?.className').replaceAll('e[1].addedNodes[0]?.childNodes[0].className','e[1]?.addedNodes[0]?.childNodes[0]?.className');
search=search.replace("searchBox.addEventListener('keyup'","if(!searchBox || searchBox.dataset.ourSearchHook) return; searchBox.dataset.ourSearchHook='1';\n\t\t\tsearchBox.addEventListener('keyup'");
search=search.replace(/\n\t\}\);\n\}\s*$/, '\n\t}).catch(()=>{});\n}\n');
write(root+'/src/scripts/customSearch.js',search);
let menu=read(original+'/src/styles/menus/viewRootMenu.js');
menu=menu.replace('const container = matchedElements[0];','const container = matchedElements?.[0];\n    if(!container || container.children.length<8) return;');
menu=menu.replace("container.insertBefore(document.querySelector('.WUOrULWKkGLl3ZUQdDXg8').cloneNode(true), container.children[8]);","const divider=document.querySelector('.WUOrULWKkGLl3ZUQdDXg8');\n    if(divider) container.insertBefore(divider.cloneNode(true), container.children[8]||null);");
menu=menu.replace('})()','})().catch(()=>{});');
write(root+'/src/styles/menus/viewRootMenu.js',menu);
skin.Patches.push({MatchRegexString:'^Steam$',TargetCss:'compat/layout-fixes.css'});
skin.Patches.push({MatchRegexString:'^Steam$',TargetCss:'compat/curtains.css'});
skin.Patches.push({MatchRegexString:'^Steam$',TargetCss:'compat/lilac.css'});
skin.Patches.push({MatchRegexString:'.ContextMenuPopup|^Menu$|.*Supernav$',TargetJs:'compat/menu-motion.js'});
skin.Patches.push({MatchRegexString:'^https://store\\.steampowered\\.com/app/.*',TargetCss:'compat/release-date.css',TargetJs:'compat/release-date.js'});
// QOL must explicitly restore elements hidden by Fluenty's base stylesheet.
write(dest+'/qol-wallet-show.css','html:root ._1ENHEsrSLcTRtPQFl1F-wL ._3yD46y5pd3zOGR7CzKs0mC ._2jphjrSifC6orDT4g_7Wd{display:block!important}\n');
write(dest+'/qol/walletBalance/walletBalance.css','html:root ._1ENHEsrSLcTRtPQFl1F-wL ._3yD46y5pd3zOGR7CzKs0mC ._2jphjrSifC6orDT4g_7Wd,html:root ._2jphjrSifC6orDT4g_7Wd{display:none!important}\n');
const wallet=skin.Conditions['QOL: Скрыть баланс кошелька'];
wallet.values['Нет']={TargetCss:{affects:['^Steam$'],src:'compat/qol-wallet-show.css'}};
wallet.description='Да — скрыть баланс. Нет — показать баланс, в том числе если он скрыт базовым оформлением Fluenty.';
skin.version='1.17.0-local.5';
write(root+'/skin.json',JSON.stringify(skin,null,2)+'\n');
write(process.env.AIKA_REVIEW_WORK+'/enhancement-report.json',JSON.stringify({version:skin.version,features:['responsive shelf text','Aika boot curtain with independent timeout','Aika route curtain','actual Steam class aliases','official release date'],at:new Date().toISOString()},null,2));
console.log('Adapted startup/page curtains, class aliases, shelf layout and release date.');
