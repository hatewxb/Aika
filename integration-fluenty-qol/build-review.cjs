// Offline-only review builder. Does not download, activate a theme, or edit Steam.
const fs=require('node:fs'),path=require('node:path');
const args=process.argv.slice(2),opt={};
for(let i=0;i<args.length;i+=2){if(!args[i].startsWith('--')||!args[i+1])throw Error('Expected --option path');opt[args[i].slice(2)]=path.resolve(args[i+1]);}
for(const key of ['fluenty','aika','qol','steam-ui','out'])if(!opt[key])throw Error('Required: --fluenty --aika --qol --steam-ui --out');
for(const key of ['fluenty','aika','qol'])if(!fs.existsSync(path.join(opt[key],'skin.json')))throw Error('Missing input skin.json: '+key);
if(!fs.statSync(opt['steam-ui']).isFile())throw Error('--steam-ui must be Steam steamui/sp.js');
const real=p=>fs.realpathSync(p),inside=(a,b)=>{const rel=path.relative(a,b);return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));};
const parent=path.dirname(opt.out);fs.mkdirSync(parent,{recursive:true});const target=path.join(real(parent),path.basename(opt.out));
for(const src of [__dirname,opt.fluenty,opt.aika,opt.qol,path.dirname(opt['steam-ui'])])if(inside(real(src),target)||inside(target,real(src)))throw Error('Output must be separate from all inputs');
if(fs.existsSync(target))throw Error('Output already exists. Choose a new empty output path.');
fs.mkdirSync(target);const themes=path.join(target,'themes');fs.mkdirSync(themes);
for(const [key,name]of [['fluenty','fluenty1.17.0'],['aika','Aika'],['qol','QOL-Toggles-Steam']])fs.cpSync(opt[key],path.join(themes,name),{recursive:true,filter:s=>!['.git','screenshots','tools'].includes(path.basename(s))});
const cfg=path.join(target,'review-config.json');fs.writeFileSync(cfg,JSON.stringify({themes:{conditions:{}}}));
process.env.AIKA_REVIEW_THEMES=themes.replaceAll('\\','/');process.env.AIKA_REVIEW_WORK=target.replaceAll('\\','/');
process.env.AIKA_REVIEW_CONFIG=cfg;process.env.AIKA_REVIEW_STEAM_UI=opt['steam-ui'];
require('./build.cjs');
console.log('Review build ready: '+path.join(themes,'Fluenty-Aika-QOL-RU'));
console.log('Nothing installed or activated. Review the generated files before manual installation.');
