import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Runner} from '../../src/core/runner.ts';
import {compileCapability,validateCapability,visible,heading} from '../../src/core/capability.ts';
import {guard,checkInputs,checkOutput,sanitizeObservation} from '../../src/core/guard.ts';
import {validate,validateDecision} from '../../src/core/schema.ts';
import {cleanEvent,cleanResult} from '../../src/server/evidence.ts';
import {decide,sanitizeGoal} from '../../src/server/provider.ts';
const schema=JSON.parse(await readFile(new URL('../../schemas/capability.schema.json',import.meta.url),'utf8'));
const policy=JSON.parse(await readFile(new URL('../../config/policy.json',import.meta.url),'utf8'));
const target=(name,strategy='role')=>({frame:'servicing',strategy,...(strategy==='role'?{role:'button'}:{}),name});
const steps=[{id:'step-1',action:'fill',target:target('Member ID','label'),value:{parameter:'memberId'},checkpoint:visible(heading('Member search')),timeoutMs:100},
 {id:'step-2',action:'click',target:target('Search members'),checkpoint:visible(heading('Search results')),timeoutMs:100},
 {id:'step-3',action:'click',target:target('Open member'),checkpoint:visible(heading('Member detail')),timeoutMs:100},
 {id:'step-4',action:'click',target:target('Savings details'),checkpoint:visible(heading('Account detail')),timeoutMs:100}];
const cap=()=>compileCapability(steps);
const inputs={memberId:'10002',accountType:'Savings'};
class Surface {
 sessionId='fixed-session'; screen='Member search'; scenario='normal'; actions=[]; calls=0; current='';
 observe(){return {headings:[this.screen],controls:[],rows:[],dialog:false,loading:false};}
 exception(){return this.scenario==='expired'&&this.screen==='Session expired'?'session_expired':this.screen==='Permission denied'?'permission_denied':this.scenario==='dialog'&&this.screen==='Search results'?'unexpected_dialog':null;}
 stateCheckpoint(){return visible(heading(this.screen));}
 check(c,i){return c.kind==='visible'?c.target.name===this.screen:c.target.name==='Member ID'?this.current===i.memberId:c.target.name==='Account type'?this.screen==='Account detail':false;}
 act(step,i){this.actions.push(step.action);if(step.action==='fill'){this.current=i.memberId;return;}
 if(step.target.name==='Search members')this.screen=this.current==='99999'?'Member not found':this.scenario==='expired'?'Session expired':this.scenario==='permission'?'Permission denied':'Search results';
 else if(step.target.name==='Open member')this.screen='Member detail';else this.screen='Account detail';}
 extract(){return {accountType:'Savings',balance:'730.20',currency:'USD'};}
}
const make=(surface=new Surface(),options={})=>new Runner({surface,policy,schema,...options});
describe('Runtime contracts and replay',()=>{
 it('validates the reviewed capability',()=>assert.doesNotThrow(()=>validateCapability(schema,cap(),policy)));
 for(const mutate of [c=>c.schemaVersion='99',c=>c.extra='bad',c=>c.steps[0].action='evaluate',c=>c.steps[0].timeoutMs=999999,c=>c.steps[0].value={literal:'10001'},c=>c.steps[1].id=c.steps[0].id,c=>c.outputs.balance.pattern='.*',c=>c.success=[],c=>c.inputs.memberId.sensitive=false,c=>c.steps[1].target.name='Submit wire transfer'])
  it('rejects a tampered artifact',()=>{const c=cap();mutate(c);assert.throws(()=>validateCapability(schema,c,policy));});
 it('replays without calling an injected model and returns typed outputs',async()=>{let calls=0;const result=await make().run({mode:'replay',inputs,capability:cap(),decide:()=>{calls++;throw new Error('model must not execute');}});assert.equal(result.status,'success');assert.equal(result.modelCalls,0);assert.equal(calls,0);assert.equal(result.outputs.balance,'730.20');});
 it('missing member is a business outcome',async()=>{const result=await make().run({mode:'replay',inputs:{...inputs,memberId:'99999'},capability:cap()});assert.equal(result.status,'business_outcome');assert.equal(result.code,'member_not_found');});
 it('invalid input fails before UI actions',async()=>{const surface=new Surface();const result=await make(surface).run({mode:'replay',inputs:{...inputs,memberId:'bad'},capability:cap()});assert.equal(result.code,'invalid_inputs');assert.equal(surface.actions.length,0);});
 it('permission denial stops instead of proceeding',async()=>{const surface=new Surface();surface.scenario='permission';const r=await make(surface).run({mode:'replay',inputs,capability:cap()});assert.equal(r.code,'permission_denied');assert.equal(surface.actions.length,2);});
 it('checkpoint mismatch returns a bounded failure',async()=>{const surface=new Surface();surface.check=()=>false;const r=await make(surface).run({mode:'replay',inputs,capability:cap()});assert.equal(r.code,'checkpoint_timeout');});
 it('output contract rejects wrong currency',async()=>{const surface=new Surface();surface.extract=()=>({accountType:'Savings',balance:'730.20',currency:'EUR'});const r=await make(surface).run({mode:'replay',inputs,capability:cap()});assert.equal(r.code,'output_invalid');});
 it('expiry pauses and resumes in the same session',async()=>{const surface=new Surface();surface.scenario='expired';const events=[];const runner=make(surface,{emit:e=>events.push(e)});const pending=runner.run({mode:'replay',inputs,capability:cap()});while(!runner.intervention)await new Promise(r=>setTimeout(r,1));const session=runner.sessionId;runner.claim();surface.scenario='normal';surface.screen='Member search';runner.resume();const result=await pending;assert.equal(result.status,'success');assert.equal(result.sessionId,session);assert.equal(surface.sessionId,session);assert.ok(events.some(e=>e.type==='human_claimed'));assert.ok(events.some(e=>e.type==='automation_resumed'));});
 it('resume rejects an unresolved exceptional state',async()=>{const s=new Surface();s.scenario='expired';const r=make(s,{pauseBudgetMs:10});const run=r.run({mode:'replay',inputs,capability:cap()});while(!r.intervention)await new Promise(r=>setTimeout(r,1));r.claim();assert.throws(()=>r.resume(),/resume_checkpoint_failed/);r.cancel();assert.equal((await run).code,'cancelled');});
 it('human ownership times out safely',async()=>{const s=new Surface();s.scenario='expired';const r=await make(s,{pauseBudgetMs:5}).run({mode:'replay',inputs,capability:cap()});assert.equal(r.code,'handoff_timeout');});
 it('discovery requests model decisions and emits a capability',async()=>{const surface=new Surface();let index=0;const decisions=[...steps.map(s=>({action:s.action,target:s.target,...(s.action==='fill'?{parameter:'memberId'}:{}),reasonCode:s.action==='fill'?'enter_input':'open_result'})),{action:'finish',reasonCode:'goal_complete'}];const result=await make(surface).run({mode:'discovery',inputs,decide:async()=>decisions[index++]});assert.equal(result.status,'success');assert.equal(result.modelCalls,5);validateCapability(schema,result.capability,policy);});
 it('a premature model finish cannot bypass success checkpoints',async()=>{const result=await make().run({mode:'discovery',inputs,decide:async()=>({action:'finish',reasonCode:'goal_complete'})});assert.equal(result.status,'failure');});
 it('bounded discovery stops repeated decisions',async()=>{const r=await make(new Surface(),{maxSteps:2}).run({mode:'discovery',inputs,decide:async()=>({action:'fill',target:target('Member ID','label'),parameter:'memberId',reasonCode:'enter_input'})});assert.equal(r.code,'max_steps');});
});
describe('Redaction and defensive validation',()=>{
 it('does not persist arbitrary strings, input values, tokens, or balances',()=>{const dirty={type:'human_action',target:'Secret Person',input:'10001',password:'sk-secret',snapshot:{headings:['Secret Person'],rows:['2450.75'],controls:[]}};const text=JSON.stringify(cleanEvent(dirty));for(const secret of ['Secret Person','10001','sk-secret','2450.75'])assert.ok(!text.includes(secret));});
 it('unknown events cannot be used as a log injection channel',()=>assert.equal(cleanEvent({type:'secret-value'}),null));
 it('unknown fields in result are omitted',()=>{const text=JSON.stringify(cleanResult({status:'success',outputs:{balance:'2450.75'},secret:'sk-secret'},0));assert.ok(!text.includes('2450.75'));assert.ok(!text.includes('sk-secret'));assert.ok(text.includes('[REDACTED]'));});
 it('unknown UI labels are scrubbed before model use',()=>assert.equal(sanitizeObservation({controls:[{name:'Secret Person'}]}).controls[0].name,'[REDACTED]'));
 it('goal scrubbing removes identifiers and unknown names',()=>{const text=sanitizeGoal('look up Jane 10001 sk-secret');assert.ok(!text.includes('Jane'));assert.ok(!text.includes('10001'));assert.ok(!text.includes('sk-secret'));});
 for(const value of [{},{memberId:'10001',accountType:'Savings',extra:'x'},{memberId:'10001',accountType:'Credit'}])it('strictly rejects invalid invocation input',()=>assert.throws(()=>checkInputs(value)));
 for(const balance of [1,'1.1','NaN','1e2','-1.00'])it('rejects invalid decimal output',()=>assert.throws(()=>checkOutput({accountType:'Savings',balance,currency:'USD'},inputs)));
 it('JSON schema rejects prototype keys',()=>assert.throws(()=>validate({type:'object',properties:{}},JSON.parse('{"__proto__":{}}'))));
 for(const value of [{action:'click',reasonCode:'open_result'},{action:'fill',target:target('Member ID','label'),reasonCode:'enter_input'},{action:'finish',target:target('Open member'),reasonCode:'goal_complete'},{action:'evaluate',reasonCode:'open_result'}])it('rejects malformed model decisions',()=>assert.throws(()=>validateDecision(value)));
 it('execution guard blocks a model-invented target',()=>assert.throws(()=>guard(policy,'http://127.0.0.1:4317/desk','click',target('Submit wire transfer')),/target_blocked/));
 it('execution guard blocks a foreign frame',()=>assert.throws(()=>guard(policy,'http://127.0.0.1:4317/desk','fill',{...target('Member ID','label'),frame:'other'}),/frame_blocked/));
 it('execution guard blocks query-bearing target routes',()=>assert.throws(()=>guard(policy,'http://127.0.0.1:4317/desk?admin=1','click',target('Open member')),/route_blocked/));
 it('provider refuses to run without a key',async()=>assert.rejects(()=>decide({},{key:null,model:'test'}),/model_unavailable/));
 it('provider extracts and validates a genuine-shaped response without persisting raw payload',async()=>{const result=await decide({goal:'look up member',observation:{},accountType:'Savings'},{key:'test-key',model:'test',fetcher:async(url,options)=>{const body=JSON.parse(options.body);assert.equal(body.store,false);assert.ok(body.text.format.strict);return {ok:true,json:async()=>({id:'resp_test',model:'test',output:[{content:[{type:'output_text',text:JSON.stringify({action:'finish',target:null,parameter:null,reasonCode:'goal_complete'})}]}]})};}});assert.equal(result.decision.action,'finish');});
 for(const status of [401,429,500])it(`provider handles HTTP ${status} without exposing response data`,async()=>assert.rejects(()=>decide({observation:{}},{key:'test-key',model:'test',fetcher:async()=>({ok:false,status,json:async()=>({})})}),/model_/));
});

it('API credit exhaustion is a specific safe error',async()=>assert.rejects(()=>decide({observation:{}},{key:'test-key',model:'test',fetcher:async()=>({ok:false,status:429,json:async()=>({error:{code:'credit_balance_exhausted'}})})}),/model_quota_exhausted/));

it('equivalent JSON property order preserves the capability contract',()=>{const c=cap();c.inputs={accountType:c.inputs.accountType,memberId:c.inputs.memberId};assert.doesNotThrow(()=>validateCapability(schema,c,policy));});
it('one runner cannot be reused with stale ownership',async()=>{const r=make();await r.run({mode:'replay',inputs,capability:cap()});await assert.rejects(()=>r.run({mode:'replay',inputs,capability:cap()}),/run_reused/);});
it('failure becomes a terminal ownership state',async()=>{const r=make();await r.run({mode:'replay',inputs:{...inputs,memberId:'bad'},capability:cap()});assert.equal(r.control.owner,'failed');assert.throws(()=>r.control.assertAutomation(r.control.token));});
it('sensitive input state is conveyed only as a filled boolean',()=>{const text=JSON.stringify(sanitizeObservation({controls:[{strategy:'label',name:'Member ID',value:'10001',filled:true}]}));assert.ok(text.includes('"filled":true'));assert.ok(!text.includes('10001'));});

it('failure evidence includes a safe precise checkpoint and step',()=>{const r=cleanResult({status:'failure',code:'checkpoint_timeout',stepId:'step-2',expected:{kind:'visible',target:{frame:'servicing',strategy:'role',role:'heading',name:'Search results'},literal:'sk-secret'}},0);assert.equal(r.stepId,'step-2');assert.equal(r.expected.target.name,'Search results');assert.ok(!JSON.stringify(r).includes('sk-secret'));});
