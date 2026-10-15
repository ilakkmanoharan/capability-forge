import {BrowserSurface} from './surface.ts';
import {Runner} from '../core/runner.ts';
import {guard} from '../core/guard.ts';
const $=id=>document.getElementById(id),frame=document.querySelector('iframe');
const json=async(url,data)=>{const response=await fetch(url,{...(data?{method:'POST',headers:{'Content-Type':'application/json','X-Forge-Client':'1'},body:JSON.stringify(data)}:{})});const value=await response.json();if(!response.ok)throw new Error(value.code||'request_failed');return value;};
const config=await json('/api/config');const schema=await json('/schemas/capability.schema.json');
$('provider').textContent=config.modelReady?`Configured model: ${config.model}`:'Model key required in local .env';
let saved=(await json('/api/capability')).capability||null,runner=null,events=[],runId=null,source='saved-discovery';
function showArtifact(){ $('artifact').textContent=saved?JSON.stringify(saved,null,2):'No capability yet.';$('replay').disabled=!saved||!!runner?.busy; }
showArtifact();
function event(value){const e={sequence:events.length+1,time:new Date().toISOString(),...value};events.push(e);const li=document.createElement('li');li.textContent=`${e.sequence}. ${e.type}${e.stepId?' · '+e.stepId:''}${e.code?' · '+e.code:''}`;$('timeline').append(li);li.scrollIntoView({block:'nearest'});}
function state(s){for(const id of ['goal','member-id','account-type','run-scenario'])$(id).disabled=s.busy;
 $('owner').textContent=`Owner: ${s.owner}`;$('shield').hidden=s.owner==='human'||!s.busy;$('discover').disabled=s.busy||!config.modelReady;$('replay').disabled=s.busy||!saved;$('load-fixture').disabled=s.busy;$('policy-probe').disabled=s.busy;$('cancel').hidden=!s.busy;$('handoff').hidden=!s.intervention;$('claim').disabled=s.owner!=='paused';$('resume').disabled=s.owner!=='human';$('run-state').textContent=s.intervention?`Paused: ${s.intervention.reason}`:s.busy?`Running. Model calls: ${s.modelCalls}`:`Ready. Last run used ${s.modelCalls} model calls.`;if(s.intervention)$('handoff-reason').textContent=`${s.intervention.reason} at ${s.intervention.stepId}. Session: ${s.intervention.sessionId}`;}
async function reset(){await new Promise(resolve=>{frame.onload=resolve;frame.src='/desk';});frame.contentDocument.getElementById('scenario').value=$('run-scenario').value;}
async function start(mode,commandId=null){
 if(runner?.busy)return;events=[];$('timeline').replaceChildren();$('result').textContent='Running…';
 $('discover').disabled=true;$('replay').disabled=true;
 try {
  await reset();
  const inputs={memberId:$('member-id').value,accountType:$('account-type').value};const goal=$('goal').value;
  const start=await json('/api/start',{mode,source,commandId});runId=start.runId;
  const surface=new BrowserSurface(frame,config.policy,event,()=>runner?.control.owner||'automation');
  $('session-label').textContent=`Session: ${surface.sessionId}`;
  runner=new Runner({surface,policy:config.policy,schema,emit:event,onState:state});
  const result=await runner.run({mode,inputs,capability:saved,decide:async observation=>{
    const response=await json('/api/decide',{runId,goal,observation,accountType:inputs.accountType});
    event({type:'provider_receipt',provider:'openai-responses',requestId:response.requestId,model:response.model});return response.decision;
  }});
  if(result.status==='success'&&mode==='discovery'){saved=result.capability;source='saved-discovery';showArtifact();}
  $('result').textContent=JSON.stringify(result,null,2);
  const receipt=await json('/api/complete',{runId,result,events});
  event({type:'evidence_saved',code:receipt.runId});
 }catch(e){$('result').textContent=`Run could not complete: ${e.message}`;}
 finally{$('discover').disabled=!config.modelReady;showArtifact();}
}
$('discover').onclick=()=>start('discovery');$('replay').onclick=()=>start('replay');
$('claim').onclick=()=>{try{runner.claim();}catch(e){$('run-state').textContent=e.message;}};
$('resume').onclick=()=>{try{runner.resume();}catch(e){$('run-state').textContent=e.message;}};
$('cancel').onclick=()=>runner?.cancel();
$('policy-probe').onclick=async()=>{
 const origin=location.origin;let code='unexpected_allow';
 try{guard(config.policy,origin+'/desk','click',{frame:'servicing',strategy:'role',role:'button',name:'Submit wire transfer'},'irreversible');}catch(e){code=e.message;}
 $('result').textContent=`Risky action blocked: ${code}. No UI action executed.`;
 await json('/api/policy-proof',{code});
};

$('load-fixture').onclick=async()=>{if(runner?.busy)return;const fixture=await json('/api/fixture',{});saved=fixture.capability;source='development-fixture';showArtifact();$('run-state').textContent='Development fixture loaded. Replay is real; this is not genuine model discovery evidence.';};

let commandPolling=false;
setInterval(async()=>{
 if(commandPolling||runner?.busy)return;commandPolling=true;
 try{const {command}=await json('/api/next');if(!command)return;
  if(command.fixture){const f=await json('/api/fixture',{});saved=f.capability;source='development-fixture';}
  else {saved=(await json('/api/capability')).capability;source='saved-discovery';}
  $('member-id').value=command.inputs.memberId;$('account-type').value=command.inputs.accountType;$('run-scenario').value=command.scenario;
  await start(command.mode,command.id);
 }catch{}finally{commandPolling=false;}
},1000);
