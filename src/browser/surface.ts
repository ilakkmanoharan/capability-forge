import {guard,safeText} from '../core/guard.ts';
import {resolveValue,visible,heading} from '../core/capability.ts';
function shown(el){return Boolean(el && !el.hidden && el.getClientRects().length && getComputedStyle(el).visibility!=='hidden');}
function name(el){return el.getAttribute('aria-label') || el.textContent.trim();}
export class BrowserSurface {
 constructor(frame,policy,onManual=()=>{},getOwner=()=> 'automation') {
  this.frame=frame;this.policy=policy;this.document=frame.contentDocument;this.id=crypto.randomUUID();
  this.onManual=onManual;this.getOwner=getOwner;
  for(const type of ['click','input'])this.document.addEventListener(type,e=>{
   if(this.getOwner()!=='human')return;
   const el=e.target.closest('button,input,select');if(!el)return;
   const label=el.tagName==='INPUT' ? (el.labels?.[0]?.textContent.trim() || '') : name(el);
   this.onManual({type:'human_action',action:type,target:safeText(label),trustedInput:e.isTrusted,sessionId:this.sessionId});
  },true);
 }
 get sessionId(){return this.frame.contentDocument===this.document?this.id:'replaced';}
 url(){return this.frame.contentWindow.location.href;}
 resolve(target,optional=false) {
  const d=this.frame.contentDocument;
  if(this.sessionId==='replaced')throw new Error('session_replaced');
  let matches=[];
  if(target.frame!=='servicing')throw new Error('frame_blocked');
  if(target.strategy==='label')matches=[...d.querySelectorAll('input')].filter(el=>[...el.labels||[]].some(l=>l.textContent.trim()===target.name));
  if(target.strategy==='role') {
   const query=target.role==='heading'?'h1,h2,h3,[role="heading"]':target.role==='button'?'button,[role="button"]':'input';
   matches=[...d.querySelectorAll(query)].filter(el=>name(el)===target.name);
  }
  if(target.strategy==='row')matches=[...d.querySelectorAll('main tr')].filter(tr=>tr.querySelector('th')?.textContent.trim()===target.name).map(tr=>tr.querySelector('td')).filter(Boolean);
  matches=matches.filter(shown);
  if(matches.length>1)throw new Error('target_ambiguous');
  if(!matches.length&&!optional)throw new Error('target_missing');
  return matches[0];
 }
 assertScope(){guard(this.policy,this.url(),'read',{frame:'servicing',strategy:'row',name:'Member ID'});}
 check(condition,inputs) {
  this.assertScope();
  const el=this.resolve(condition.target,true);if(!el)return false;
  return condition.kind==='visible'||el.textContent.trim()===resolveValue(condition.value,inputs);
 }
 observe(){
  this.assertScope();const d=this.frame.contentDocument;
  return {headings:[...d.querySelectorAll('h1,h2,h3')].filter(shown).map(el=>safeText(name(el))),
   controls:[...d.querySelectorAll('button,input')].filter(shown).map(el=>el.tagName==='INPUT'
    ? {frame:'servicing',strategy:'label',name:safeText(el.labels?.[0]?.textContent.trim()||''),filled:el.value.length>0}
    : {frame:'servicing',strategy:'role',role:'button',name:safeText(name(el))}),
   rows:[...d.querySelectorAll('main tr th')].map(el=>safeText(name(el))),
   dialog:!!d.querySelector('dialog[open]'),loading:d.querySelector('main section')?.textContent==='Loading'};
 }
 exception(){const o=this.observe();if(o.headings.includes('Permission denied'))return 'permission_denied';if(o.headings.includes('App error'))return 'app_error';if(o.headings.includes('Session expired'))return 'session_expired';if(o.dialog)return this.document.querySelector('dialog[open]')?.getAttribute('data-kind')==='known'?'known_interstitial':'unexpected_dialog';return null;}
 stateCheckpoint(){const headings=this.observe().headings;const screen=[...headings].reverse().find(x=>['Member search','Search results','Member detail','Account detail'].includes(x));if(!screen)throw new Error('checkpoint_invalid');return visible(heading(screen));}
 act(action,inputs){
  const resolvedTarget={...action.target,name:action.target.name.replace('{{accountType}}',inputs.accountType)};
  guard(this.policy,this.url(),action.action,resolvedTarget);
  const el=this.resolve(resolvedTarget);
  if(this.document.querySelector('dialog[open]') && action.target.name!=='Acknowledge service notice')throw new Error('dialog_blocks_action');
  if(action.action==='fill'){
   const value=resolveValue(action.value,inputs);if(typeof value!=='string')throw new Error('invalid_inputs');
   el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));
  }else if(action.action==='click')el.click();else throw new Error('action_blocked');
  guard(this.policy,this.url(),action.action,resolvedTarget);
 }
 extract(definitions){const result={};for(const [key,def] of Object.entries(definitions)){guard(this.policy,this.url(),'read',def.target);result[key]=this.resolve(def.target).textContent.trim();}return result;}
}
