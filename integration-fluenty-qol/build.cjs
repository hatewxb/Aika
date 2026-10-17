if(!process.env.AIKA_REVIEW_THEMES)throw new Error('Run node build-review.cjs with explicit local input paths');
const fs=require('fs'),path=require('path'),vm=require('vm');
const themes=process.env.AIKA_REVIEW_THEMES,project=process.env.AIKA_REVIEW_WORK;
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const write=(p,v)=>fs.writeFileSync(p,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');
const backup=path.join(project,'backup');fs.mkdirSync(backup,{recursive:true});
const names={
'Sidebar View':'Вид боковой панели','Store':'Магазин','Library':'Библиотека','Collection':'Коллекции','Community':'Сообщество','Market':'Торговая площадка','Activity':'Активность','News':'Новости','Calendar':'Календарь','Scroll Bar Width':'Ширина полосы прокрутки','Title Bar Auto Hide':'Автоскрытие заголовка','Title Bar Always Show':'Постоянный заголовок','Wallet Amount':'Баланс кошелька','Navigation Arrow':'Стрелки навигации','Window Control Buttons':'Кнопки управления окном','Overlay List Position':'Список в оверлее','Library List':'Список библиотеки','Play Button Alignment':'Выравнивание кнопки запуска',"What's New":'Что нового','Add Shelf':'Добавление полки','Game Header Width':'Ширина заголовка игры','Play Button Color':'Системный цвет кнопки запуска','Game Stats Position':'Расположение сведений об игре','Main Profile Settings':'Вид профиля','Store Page Live Broadcast Visibility':'Трансляция в магазине','Steam Page Footer Visibility':'Нижняя часть магазина','Color Scheme':'Цветовая схема',
'General - Wallet balance':'Скрыть баланс кошелька','Community - VAC-Ban visibility':'Видимость отметки VAC','General - News button':'Скрыть кнопку новостей','News container':'Раздел «Что нового»','Hide shelf':'Скрыть добавление полки','General - Achievement Notification':'Скрыть уведомления достижений',
'Color preset':'Цветовой набор','Top bar':'Расположение верхних вкладок','Compact header':'Компактная шапка','Wallet visibility':'Показывать кошелёк','URL visibility':'Показывать адресную строку',"What's New visibility":'Показывать «Что нового»','Add Shelf visibility':'Показывать добавление полки','Steam News visibility':'Показывать новости Steam','Performance':'Производительность','Library covers':'Анимация обложек','Cursor glow':'Свечение под курсором','Cursor glow radius':'Радиус свечения','Privacy blur':'Размытие личных данных','Notification wordmark':'Надпись на уведомлениях','Notification opacity':'Непрозрачность уведомлений','Custom colors':'Собственные цвета'
};
const values={'yes':'Да','no':'Нет','Show':'Показывать','Hide':'Скрывать','On':'Включено','Off':'Выключено','Full sidebar':'Полная панель','Small sidebar':'Компактная панель','No sidebar':'Без панели','Bottom':'Снизу','Left':'Слева','Full':'Полный','Compact':'Компактный','Normal':'Обычный','Center':'По центру','Left Spanning':'Слева на всю ширину','Original':'Исходная','Bottom Right':'Справа внизу','Bottom Center':'По центру внизу','Top Right':'Справа вверху','Default':'Стандартный','Transparent':'Прозрачный','Dark':'Тёмная','For me':'Только у меня','For all':'У всех','Balanced':'Сбалансированная','Low':'Минимальная','Cinematic':'Кинематографичный','Classic':'Классический','3D tilt':'3D-наклон','Lift':'Подъём','Zoom':'Приближение','Balance':'Баланс','Name and balance':'Имя и баланс','Gothic':'Готическая','Japanese':'Японская','Greeny':'Зелёный','Rose Ash':'Розовый пепел'};
const tabs={'Main':'Основное','Elements':'Элементы','Animations':'Анимации','Advanced':'Дополнительно','Color set':'Набор цветов','General':'Основное','Userpannel':'Панель пользователя','Profile':'Профиль','Other':'Прочее'};
let config=read(process.env.AIKA_REVIEW_CONFIG);
if(!fs.existsSync(path.join(backup,'config.json')))fs.copyFileSync(process.env.AIKA_REVIEW_CONFIG,path.join(backup,'config.json'));
const originals={};
for(const folder of ['fluenty1.17.0','Aika','QOL-Toggles-Steam']){
 const src=path.join(themes,folder,'skin.json'),dest=path.join(backup,folder+'.json');
 if(!fs.existsSync(dest))fs.copyFileSync(src,dest);originals[folder]=read(dest);
}
function localize(input,folder){
 const skin=structuredClone(input),conds={},saved={};
 const prev=config.themes.conditions[folder]||{};
 for(const [key,c] of Object.entries(skin.Conditions||{})){
  const label=folder==='Aika'&&key==='Store'?'Вид страницы магазина':(names[key]||key);
  const originalValues=c.values||{};
  c.tab=tabs[c.tab]||names[c.tab]||c.tab;if(c.section)c.section=tabs[c.section]||c.section;
  if(c.values)c.values=Object.fromEntries(Object.entries(c.values).map(([v,spec])=>[values[v]||v,spec]));
  if(typeof c.default==='string')c.default=values[c.default]||c.default;
  if(folder==='QOL-Toggles-Steam'){
   c.description=key==='Community - VAC-Ban visibility'?'Только скрывает надпись в этом клиенте. Не снимает VAC и не меняет данные аккаунта.':key==='General - Achievement Notification'?'Скрывает всплывающие уведомления достижений в интерфейсе.':label+'.';
   if(key==='General - Achievement Notification')c.values['Да'].TargetCss.affects=['.*'];
  }
  if(folder==='Aika'){
   const l10n=fs.readFileSync(path.join(themes,'Aika/js/settings-l10n.js'),'utf8');
   const literal=l10n.match(/const DESCRIPTIONS = (\{[\s\S]*?\n  \});/);
   if(literal){const dict=vm.runInNewContext('('+literal[1]+')');if(dict[key])c.description=dict[key];}
  }
  conds[label]=c;const selected=prev[key]??prev[label]??c.default;saved[label]=values[selected]||selected;
 }
 skin.Conditions=conds;
 skin.description=folder==='Aika'?'Тёплая тёмная тема с анимациями. Для совместной работы с Fluenty выберите общий профиль.':folder==='QOL-Toggles-Steam'?'Переключатели видимости элементов Steam. Также включены в общий профиль.':skin.description;
 return {skin,saved};
}
const localized={};for(const folder of Object.keys(originals))localized[folder]=localize(originals[folder],folder);
const combined='Fluenty-Aika-QOL-RU',out=path.join(themes,combined);
if(!fs.existsSync(out))fs.cpSync(path.join(themes,'fluenty1.17.0'),out,{recursive:true});
const addon=path.join(out,'compat');fs.mkdirSync(addon,{recursive:true});
fs.cpSync(path.join(themes,'QOL-Toggles-Steam/config'),path.join(addon,'qol'),{recursive:true});
for(const f of ['cover-tilt.js','spotlight.js','achievement-progress.js']){
 let code=fs.readFileSync(path.join(themes,'Aika/js',f),'utf8');
 if(f==='cover-tilt.js'){
  code=code.replace('const step = (now) => {','const step = (now) => {\n    let moving = false;');
  code=code.replace('const c = st.cur;','if (!settled) moving = true;\n      const c = st.cur;');
  code=code.replace('loop = live.size ? requestAnimationFrame(step) : 0;','loop = moving ? requestAnimationFrame(step) : 0;');
 }
 if(f==='spotlight.js')code=code.replace('document.addEventListener("pointermove", onMove', 'document.addEventListener("pointermove", onMove');
 write(path.join(addon,f),code);
}
const css=`/* Only Aika motion tokens: no palette, layout, fonts, store or startup curtain. */
:root{--aika-motion:1;--aika-decor:1;--aika-covers-mode:tilt;--aika-tilt-max:9;--aika-tilt-lift:1.035;--aika-tilt-ease:90;--aika-tilt-perspective:900px;--aika-tilt-shadow-shift:-.8px;--aika-tilt-shadow-y:12px;--aika-tilt-shadow-blur:28px;--aika-tilt-light-size:60%;--aika-tilt-light:rgba(255,255,255,.16);--aika-transparent:transparent;--aika-hairline:1px;--aika-border-hover:rgba(255,255,255,.12);--aika-shadow-deep:rgba(0,0,0,.35);--aika-dur-base:250ms;--aika-ease:cubic-bezier(.16,1,.3,1);--aika-ease-hover:ease-out;--aika-spot-size:160px;--aika-spot-x:50%;--aika-spot-y:0%;--aika-accent-spot:rgba(255,255,255,.055);--aika-accent-none:transparent;--aika-covers-zoom:1.06;--aika-dur-enter:300ms;--aika-press-scale:.99;--aika-shadow-cover-hover:0 12px 28px rgba(0,0,0,.35);--aika-home-glare:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.13) 50%,transparent 65%);--aika-shine-from:-100%;--aika-shine-to:100%;--aika-home-shine-dur:900ms}
@media(prefers-reduced-motion:reduce){:root{--aika-motion:0;--aika-decor:0}}
`;
write(path.join(addon,'motion.css'),css.replace('--aika-covers-mode:tilt;','').replace('--aika-motion:0;--aika-decor:0','--aika-motion:0!important;--aika-decor:0!important'));
for(const [file,src] of [['tilt.css','options/covers-tilt.css'],['zoom.css','options/covers-zoom.css']])write(path.join(addon,file),fs.readFileSync(path.join(themes,'Aika',src),'utf8'));
const cards=fs.readFileSync(path.join(themes,'Aika/components/card.css'),'utf8');
const from=cards.indexOf('html :is(.AppDetailsSection');const until=cards.indexOf('\n/*',from);
write(path.join(addon,'glow.css'),cards.slice(from,until<0?undefined:until));
write(path.join(addon,'lift.css'),':root{--aika-covers-mode:lift} html:root .Draggable.HoversEnabled .LibraryItemBox{transition:transform 220ms ease-out} html:root .Draggable.HoversEnabled .LibraryItemBox:hover{transform:translateY(-4px)}');
write(path.join(addon,'off.css'),':root{--aika-motion:0!important;--aika-decor:0!important;--aika-covers-mode:off!important}');
write(path.join(addon,'main.js'),'import "./cover-tilt.js";\nimport "./spotlight.js";\nimport "./achievement-progress.js";\n');
const merged=structuredClone(localized['fluenty1.17.0'].skin);
merged.name='Fluenty + Aika + QOL — русский';merged.version='1.17.0-local.1';merged.description='Fluenty — оформление; Aika — изолированные анимации библиотеки; QOL — переключатели. Локальный профиль совместимости.';
delete merged.github;
const current={...localized['fluenty1.17.0'].saved};
const covers={tab:'Aika — анимации',description:'Наклон с бликом, подъём или приближение обложек. Не меняет расположение панелей Fluenty.',default:'3D-наклон',values:{'3D-наклон':{TargetCss:{affects:['^Steam$'],src:'compat/tilt.css'}},'Подъём':{TargetCss:{affects:['^Steam$'],src:'compat/lift.css'}},'Приближение':{TargetCss:{affects:['^Steam$'],src:'compat/zoom.css'}}}};
merged.Conditions['Aika: анимация обложек']=covers;
merged.Conditions['Aika: свечение панелей']={tab:'Aika — анимации',description:'Нейтральное свечение следует за курсором, сохраняя цвета Fluenty.',default:'Да',values:{'Да':{TargetCss:{affects:['^Steam$'],src:'compat/glow.css'}},'Нет':{}}};
merged.Conditions['Aika: режим движения']={tab:'Aika — анимации',description:'Отключение движения применяется после перезапуска Steam. Учитывается системное уменьшение анимации.',default:'Включено',values:{'Включено':{},'Выключено':{TargetCss:{affects:['^Steam$'],src:'compat/off.css'}}}};
function prefixPaths(obj){if(!obj||typeof obj!=='object')return;for(const[k,v]of Object.entries(obj)){if(k==='src'&&typeof v==='string')obj[k]=v.replace(/^config\//,'compat/qol/');else prefixPaths(v)}}
for(const[key,value]of Object.entries(localized['QOL-Toggles-Steam'].skin.Conditions)){
 const c=structuredClone(value);c.tab='QOL — '+c.tab;prefixPaths(c);merged.Conditions['QOL: '+key]=c;current['QOL: '+key]=localized['QOL-Toggles-Steam'].saved[key];
}
for(const [key,c] of Object.entries(merged.Conditions))if(!(key in current))current[key]=c.default;
// One owner for each overlapping visibility switch: QOL owns these in the combined profile.
for(const k of ['Баланс кошелька','Что нового','Добавление полки','Трансляция в магазине'])delete merged.Conditions[k];
for(const k of Object.keys(current))if(!(k in merged.Conditions))delete current[k];
merged.Patches.push({MatchRegexString:'^Steam$',TargetCss:'compat/motion.css',TargetJs:'compat/main.js'});
// The supplied Fluenty archive references absent Big Picture files. Keep Steam's defaults there.
merged.Patches=merged.Patches.filter(p=>[p.TargetCss,p.TargetJs].filter(Boolean).every(f=>fs.existsSync(path.join(out,f))));
write(path.join(out,'skin.json'),merged);
for(const [folder,{skin,saved}]of Object.entries(localized)){write(path.join(themes,folder,'skin.json'),skin);config.themes.conditions[folder]=saved;}
config.themes.conditions[combined]=current;
// Stage activation separately to avoid the running Steam client overwriting settings.
write(path.join(project,'activation.json'),{theme:combined,conditions:current});
write(path.join(project,'localized-config.json'),config);
write(path.join(project,'build-report.json'),{combined,conditions:Object.keys(merged.Conditions).length,excluded:['Aika complete layout','Cinematic store','startup/page curtains','Aika notification replacement'],backup,at:new Date().toISOString()});
console.log('Built '+combined+'; '+Object.keys(merged.Conditions).length+' options; original manifests backed up.');
require('./enhance.cjs');

require('./integrate-all.cjs');
