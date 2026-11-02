const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('node:vm');
for(const file of ['cover-tilt.js','spotlight.js']) test(file+': outside surfaces never reads computed style or schedules a frame',()=>{
 const listeners=new Map(),frames=new Map();let reads=0,id=0;
 class Element {closest(){return null;}}
 const context={window:{},document:{documentElement:{},addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener(){}},Element,
 getComputedStyle:()=>{reads++;return {getPropertyValue:()=>''};},
 requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:n=>frames.delete(n),
 matchMedia:()=>({matches:false}),performance:{now:()=>0}};
 vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'../js',file),'utf8'),context);
 for(let i=0;i<100;i++){listeners.get('pointermove')({target:new Element()});listeners.get('pointerleave')?.();}
 assert.equal(reads,0);assert.equal(frames.size,0);
});
