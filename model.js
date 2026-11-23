/* Sugar Story Studio v2: one work, shared characters, ordered chapters. */
var StoryModel=(function(){
 'use strict';
 var copy=function(x){return JSON.parse(JSON.stringify(x));};
 function list(a){return Array.isArray(a)?a:[]}
 function ids(a){return Array.from(new Set(list(a).map(function(x){return String(x).slice(0,120)}))).slice(0,100)}
 function str(x,n){return String(x==null?'':x).slice(0,n||3000)}
 function clean(type,d,teacher,old){
  d=d||{};var r={},fields={info:['title','intro','disclaimer','imageId'],chapter:['title','intro','imageId'],role:['name','job','background','want','worry','imageId'],relationship:['from','to','label','description'],node:['chapterId','kind','title','text','response','next','imageId','originMaterialId'],source:['title','fact','fiction','url','imageId','ownerNodeId'],material:['who','stage','action','reason','prediction','setting'],comment:['text','targetId']};
  if(type==='layout'){r.positions={};Object.keys(d.positions||{}).slice(0,400).forEach(function(id){if(!/^[\w-]{1,120}$/.test(id))return;var p=d.positions[id];r.positions[id]={x:Math.max(0,Math.min(20000,Number(p.x)||0)),y:Math.max(0,Math.min(20000,Number(p.y)||0))}});return r}
  if(!fields[type])throw Error('無法儲存這種卡片。');
  fields[type].forEach(function(k){r[k]=str(d[k],['text','intro','fact','fiction','background','description'].indexOf(k)>=0?8000:2000)});
  if(['info','chapter','role','relationship','node','source'].indexOf(type)>=0)r.assignees=ids(d.assignees);
  if(['info','chapter','node','role'].indexOf(type)>=0)r.sourceIds=ids(d.sourceIds);
  if(type==='info')r.schemaVersion=2;
  if(type==='chapter'){r.order=Math.max(1,Math.min(20,Number(d.order)||1));r.minScenes=Math.max(1,Math.min(20,Number(d.minScenes)||3));r.minEndings=Math.max(1,Math.min(20,Number(d.minEndings)||3));r.starts={};Object.keys(d.starts||{}).slice(0,40).forEach(function(k){r.starts[str(k,120)]=str(d.starts[k],120)})}
  if(type==='node'){if(['scene','choice','ending'].indexOf(r.kind)<0)throw Error('請選擇這一幕的類型。');r.roleIds=ids(d.roleIds);r.originMaterialIds=ids(list(d.originMaterialIds).concat(d.originMaterialId?[d.originMaterialId]:[]));r.nextEarly=!!d.nextEarly;r.options=list(d.options).slice(0,4).map(function(o,i){return{id:str(o.id||'option-'+i,120),label:str(o.label,400),result:str(o.result,4000),target:str(o.target,120),early:!!o.early}});var keys=r.options.map(function(o){return o.id});if(new Set(keys).size!==keys.length)throw Error('選項編號重複，請重新新增。')}
  if(type==='source'){if(r.url&&!/^https:\/\//i.test(r.url))throw Error('資料來源請填 https 網址。');var same=old&&['title','fact','fiction','url','imageId'].every(function(k){return (old[k]||'')===r[k]});r.approved=teacher?!!d.approved:!!(same&&old.approved);if(r.approved&&(!r.title||!r.fact||!r.url))throw Error('請補齊資料名稱、史實與來源，再勾選教師核對。')}
  return r;
 }
 function edges(e){var d=e.data;return d.kind==='choice'?list(d.options).map(function(o){return{key:o.id,target:o.target,label:o.label,result:o.result,early:!!o.early}}):d.kind==='scene'?[{key:'next',target:d.next,label:'繼續故事',early:!!d.nextEarly}]:[]}
 function chapters(es){return es.filter(function(e){return !e.deleted&&e.type==='chapter'}).sort(function(a,b){return a.data.order-b.data.order||a.id.localeCompare(b.id)})}
 function validate(es){
  var alive=es.filter(function(e){return !e.deleted}),by={},errors=[],warnings=[],roles=alive.filter(function(e){return e.type==='role'}),chs=chapters(alive),info=alive.find(function(e){return e.type==='info'}),allReached={};alive.forEach(function(e){by[e.id]=e});
  if(!info||!info.data.title||!info.data.intro)errors.push('完整作品的名稱與共同說明還沒寫好。');if(!roles.length)errors.push('至少建立一位玩家可以選的角色。');if(!chs.length)errors.push('請先建立章節。');
  roles.forEach(function(r){if(!r.data.name||!r.data.job||!r.data.background)errors.push('人物「'+(r.data.name||'未命名')+'」需要姓名、職業與背景。')});
  alive.forEach(function(e){var d=e.data;if(d.imageId&&(!by[d.imageId]||by[d.imageId].type!=='asset'))errors.push('「'+(d.title||d.name||'卡片')+'」的圖片不存在。');list(d.sourceIds).forEach(function(id){if(!by[id]||by[id].type!=='source'||!by[id].data.approved)errors.push('「'+(d.title||d.name||'卡片')+'」引用的真實對照卡尚未由教師確認。')});if(e.type==='relationship'&&(!by[d.from]||by[d.from].type!=='role'||!by[d.to]||by[d.to].type!=='role'||d.from===d.to))errors.push('有一條人物關係尚未指定兩位不同人物。')});
  chs.forEach(function(ch){var d=ch.data,nodes=alive.filter(function(e){return e.type==='node'&&e.data.chapterId===ch.id}),nb={},canEnd={},reached={};nodes.forEach(function(n){nb[n.id]=n;if(n.data.kind==='ending')canEnd[n.id]=true});
   var title=d.title||'未命名章節';if(!d.title||!d.intro)errors.push('「'+title+'」需要章節名稱與引言。');
   nodes.forEach(function(n){var x=n.data,t=x.title||'未命名卡片';if(!x.title||!x.text)errors.push('「'+title+'／'+t+'」缺少標題或情境。');if(x.kind==='choice'&&(list(x.options).length<2||list(x.options).length>4))errors.push('「'+t+'」請設計 2 至 4 個選項。');list(x.options).forEach(function(o){if(x.kind==='choice'&&(!o.label||!o.result))errors.push('「'+t+'」的選項需要行動與對應結果。')});edges(n).forEach(function(edge){if(!nb[edge.target])errors.push('「'+t+'」有等待教師接線的選項，或接到別章。');if(edge.early&&nb[edge.target]&&nb[edge.target].data.kind!=='ending')errors.push('「'+t+'」的提前結局標記只能接到結局。')});ids(x.roleIds).forEach(function(id){if(!by[id]||by[id].type!=='role')errors.push('「'+t+'」有已刪除的出場人物。')})});
   var changed=true;while(changed){changed=false;nodes.forEach(function(n){if(!canEnd[n.id]&&edges(n).some(function(e){return canEnd[e.target]})){canEnd[n.id]=true;changed=true}})}
   roles.forEach(function(role){var start=d.starts&&d.starts[role.id];if(!nb[start]||nb[start].data.kind==='ending'){errors.push('「'+title+'」還沒替「'+role.data.name+'」設定情節起點。');return}var dist={},queue=[start];dist[start]=1;
    while(queue.length){var id=queue.shift(),n=nb[id];reached[id]=true;allReached[id]=true;if(!canEnd[id])errors.push('「'+title+'／'+n.data.title+'」走不到任何結局。');edges(n).forEach(function(e){var target=nb[e.target];if(!target)return;if(target.data.kind==='ending'){reached[e.target]=true;allReached[e.target]=true;if(dist[id]<(Number(d.minScenes)||3)&&!e.early)errors.push('「'+role.data.name+'」在「'+title+'」少於 '+(d.minScenes||3)+' 幕就到「'+target.data.title+'」；請補情節，或由教師標記提前結局。')}else if(dist[e.target]===undefined||dist[e.target]>dist[id]+1){dist[e.target]=dist[id]+1;queue.push(e.target)}})}
   });
   var ends=nodes.filter(function(n){return n.data.kind==='ending'&&reached[n.id]&&n.data.title&&n.data.text});if(ends.length<(Number(d.minEndings)||3))errors.push('「'+title+'」至少需要 '+(d.minEndings||3)+' 個完成且走得到的結局，目前有 '+ends.length+' 個。');nodes.forEach(function(n){if(!reached[n.id])warnings.push('「'+title+'／'+n.data.title+'」還沒有角色會走到。')});
  });
  alive.filter(function(e){return e.type==='node'&&!chs.some(function(c){return c.id===e.data.chapterId})}).forEach(function(e){errors.push('「'+e.data.title+'」沒有放進有效章節。')});
  if(!alive.some(function(e){return e.type==='source'&&e.data.approved}))errors.push('完整作品至少需要一張經教師核對的真實對照卡。');
  return{errors:Array.from(new Set(errors)),warnings:Array.from(new Set(warnings))};
 }
 // Remove only unchanged built-in wording; keep custom writing and all map links.
 function stripTemplate(e){var out=copy(e),d=out.data||{},rules={"info:intro":{"同一座糖廠，連著不同人的生活。選擇一個身分，走過三個章節，看看每個決定如何影響自己與別人。":""},"chapter:title":{"機器來了":"第1章","收成與原料的新安排":"第2章","戰時生活的改變":"第3章"},"chapter:intro":{"工場傳出新消息：接下來將使用機器製糖。有人想學新技術，也有人擔心家裡的人手和生計。":"","交蔗、車班和田裡的人手，都得重新安排。上一章的選擇留下了影響，大家又要面對新的協商。":"","戰時需求使工場工作與田裡的種植安排面臨調整。家裡與工作都受到牽動，大家得再次決定怎麼安排生活。":"","新的消息傳來，這一次大家又得一起面對難題。":""},"node:title":{"第1幕：一個新的消息":"第1幕","第2幕：有人受到影響":"第2幕","第3幕：最後怎麼安排":"第3幕","結局甲：互相幫忙的新安排":"結局甲","結局乙：先試過再說":"結局乙","結局丙：留下另一個問題":"結局丙"},"node:text":{"消息傳來，原本的安排得重新想一想。你會先怎麼做？":"","你的行動讓另一個人也必須調整。他把自己的困難說了出來。":"","大家已經知道彼此的需要，現在得決定最後的安排。":"","大家交換了幫忙的條件。事情能繼續進行，但彼此也有了新的責任。":"","這次先做一小段，保留了調整的機會。往後大家還得觀察試過之後的變化。":"","原本的安排維持了。有人的需要還沒被解決，這件事會成為下一章可以接續的線索。":""},"option:label":{"先找當事人談談":"","找其他人一起幫忙":"","先照自己的想法做":"","一起合作，交換條件":"","先試一小步，再調整":"","堅持原來的安排":""},"option:result":{"有人願意幫忙，但也提出條件。":"","事情有了新的可能，還需要確認時間。":"","安排暫時定下來，也有人仍有顧慮。":""}};
 Object.keys(d).forEach(function(k){var map=rules[out.type+':'+k];if(map&&Object.prototype.hasOwnProperty.call(map,d[k]))d[k]=map[d[k]]});
 list(d.options).forEach(function(o){['label','result'].forEach(function(k){var map=rules['option:'+k];if(map&&Object.prototype.hasOwnProperty.call(map,o[k]))o[k]=map[o[k]]})});return out;
 }
 function chapterSeed(id,order,roleIds,title){var out=[],nodes=[id+'-s1',id+'-s2',id+'-s3'],ends=[id+'-e1',id+'-e2',id+'-e3'],starts={};roleIds.forEach(function(r){starts[r]=nodes[0]});function add(i,t,d){out.push({id:i,type:t,data:d,rev:1,deleted:false})}
  add(id,'chapter',{title:title||'第'+order+'章',order:order,intro:'',imageId:'',minScenes:3,minEndings:3,starts:starts,assignees:[],sourceIds:[]});
  nodes.forEach(function(n,i){add(n,'node',{chapterId:id,kind:'choice',title:'第'+(i+1)+'幕',text:'',response:'',imageId:'',roleIds:[],sourceIds:[],assignees:[],originMaterialIds:[],options:[0,1,2].map(function(j){return{id:n+'-o'+j,label:'',result:'',target:i<2?nodes[i+1]:ends[j],early:false}})})});
  ends.forEach(function(n,i){add(n,'node',{chapterId:id,kind:'ending',title:'結局'+['甲','乙','丙'][i],text:'',response:'',imageId:'',roleIds:[],sourceIds:[],assignees:[],originMaterialIds:[],options:[]})});return out;
 }
 function seed(){var rs=['role-farmer','role-worker','role-youth','role-manager'],es=[{id:'info',type:'info',rev:1,deleted:false,data:{schemaVersion:2,title:'糖的多重宇宙',intro:'',disclaimer:'本作品為學生創作的模擬互動故事，情節不代表歷史上實際發生過的事。真實歷史另以對照卡呈現。',imageId:'',sourceIds:[],assignees:[]}}];
  rs.forEach(function(id,i){es.push({id:id,type:'role',rev:1,deleted:false,data:{name:'人物'+(i+1),job:'',background:'',want:'',worry:'',imageId:'',sourceIds:[],assignees:[]}})});
  [1,2,3].forEach(function(i){es=es.concat(chapterSeed('chapter-'+i,i,rs,'第'+i+'章'))});es.push({id:'layout',type:'layout',rev:1,deleted:false,data:{positions:{}}});return es;
 }
 function publicEntities(es){var alive=es.filter(function(e){return !e.deleted}),used={};alive.forEach(function(e){if(['info','chapter','node','role','source'].indexOf(e.type)>=0&&e.data.imageId&&(e.type!=='source'||e.data.approved))used[e.data.imageId]=true});return alive.filter(function(e){return ['info','chapter','node','role','relationship','source','asset'].indexOf(e.type)>=0&&(e.type!=='source'||e.data.approved)&&(e.type!=='asset'||used[e.id])}).map(function(e){var d=copy(e.data);delete d.assignees;delete d.originMaterialId;delete d.originMaterialIds;delete d.ownerNodeId;return{id:e.id,type:e.type,data:d}})}
 function adaptLegacy(es){if(chapters(es).length)return copy(es);var out=copy(es),starts={};out.forEach(function(e){if(e.type==='role')starts[e.id]=e.data.startNode;if(e.type==='node'){e.data.chapterId='legacy-chapter';e.data.roleIds=e.data.roleIds||[];list(e.data.options).forEach(function(o){o.result=o.result||''})}});out.push({id:'legacy-chapter',type:'chapter',data:{title:'故事章節',intro:'',order:1,minScenes:3,minEndings:3,starts:starts},rev:1,deleted:false});return out}
 // A graph shown as a spanning tree: shared destinations and loops are references,
 // never recursively duplicated. Unconnected cards remain visible as separate roots.
 function storyTree(es,chapterId){var nodes=es.filter(function(e){return !e.deleted&&e.type==='node'&&e.data.chapterId===chapterId}),by={},incoming={},seen={},paths={},roots=[],floating=[];nodes.forEach(function(n){by[n.id]=n});nodes.forEach(function(n){edges(n).forEach(function(e){if(by[e.target])incoming[e.target]=true})});var ch=es.find(function(e){return !e.deleted&&e.id===chapterId&&e.type==='chapter'}),entries=ids(Object.keys(ch&&ch.data.starts||{}).map(function(r){return ch.data.starts[r]})).filter(function(id){return by[id]});
 function visit(id,path,anc){if(!by[id])return{kind:'missing',id:id};if(seen[id])return{kind:anc.indexOf(id)>=0?'loop':'reference',id:id};seen[id]=true;paths[id]=path.slice();var n={kind:'node',id:id,branches:[]};edges(by[id]).forEach(function(e,i){var key='edge:'+id+':'+e.key;n.branches.push({key:key,index:i,label:e.label,result:e.result||'',early:e.early,target:e.target,child:visit(e.target,path.concat([id,key]),anc.concat([id]))})});return n;}
 entries.forEach(function(id){if(!seen[id])roots.push(visit(id,[],[]))});nodes.filter(function(n){return !incoming[n.id]}).forEach(function(n){if(!seen[n.id])floating.push(visit(n.id,[],[]))});nodes.forEach(function(n){if(!seen[n.id])floating.push(visit(n.id,[],[]))});return{roots:roots,floating:floating,paths:paths};
 }
 return{storyTree:storyTree,stripTemplate:stripTemplate,copy:copy,clean:clean,edges:edges,chapters:chapters,validate:validate,seed:seed,chapterSeed:chapterSeed,publicEntities:publicEntities,adaptLegacy:adaptLegacy};
})();
if(typeof module!=='undefined')module.exports=StoryModel;
