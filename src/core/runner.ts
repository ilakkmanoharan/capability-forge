import {SessionControl} from './session.ts';
import {checkInputs,checkOutput,sanitizeObservation} from './guard.ts';
import {compileCapability,validateCapability,visible,heading,row,equals,resolveValue} from './capability.ts';
import {validateDecision} from './schema.ts';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export class Runner {
 constructor({surface,policy,schema,emit=()=>{},onState=()=>{},pauseBudgetMs=180000,maxSteps=12,timeoutMs=180000}) {
  Object.assign(this,{surface,policy,schema,emit,onState,pauseBudgetMs,maxSteps,timeoutMs});
  this.control=new SessionControl();this.modelCalls=0;this.steps=[];this.busy=false;this.intervention=null;this.inFlight=false;this.used=false;
 }
 event(type,details={}) { this.emit({type,...details}); }
 snapshot(){try{return sanitizeObservation(this.surface.observe());}catch{return {headings:[],controls:[],rows:[],dialog:false,loading:false};}}
 state() { this.onState({owner:this.control.owner,epoch:this.control.token,intervention:this.intervention,modelCalls:this.modelCalls,busy:this.busy}); }
 claim() { if(this.inFlight)throw new Error('action_in_flight');this.control.claimHuman();this.event('human_claimed',{epoch:this.control.token});this.state(); }
 resume() {
  if(this.control.owner!=='human')throw new Error('human_not_owner');
  if(this.surface.exception() || this.surface.sessionId!==this.sessionId || !this.surface.check(this.resumeCheckpoint,this.inputs))throw new Error('resume_checkpoint_failed');
  this.control.releaseHuman();this.control.resume();this.event('automation_resumed',{epoch:this.control.token});this.intervention=null;this.state();
 }
 cancel(){this.cancelled=true;this.event('cancel_requested');}
 async handoff(reason,checkpoint) {
  if(this.inFlight)throw new Error('action_in_flight');
  this.resumeCheckpoint=checkpoint;this.control.pause();
  this.intervention={reason,stepId:this.stepId,sessionId:this.sessionId,checkpoint};
  this.event('intervention_requested',{code:reason,stepId:this.stepId,snapshot:this.snapshot(),sessionId:this.sessionId});this.state();
  const start=Date.now();
  while(this.control.owner!=='automation') {if(this.cancelled)throw new Error('cancelled');if(Date.now()-start>this.pauseBudgetMs)throw new Error('handoff_timeout');await sleep(100);}
 }
 async settled(timeout=5000) {
  const start=Date.now();
  while(this.surface.observe().loading){if(this.cancelled)throw new Error('cancelled');if(Date.now()-start>timeout)throw new Error('load_timeout');await sleep(50);}
 }
 async act(action,inputs,token) {
  this.control.assertAutomation(token);
  this.inFlight=true;
  try { await this.surface.act(action,inputs); } finally {this.inFlight=false;}
  this.control.assertAutomation(token);
 }
 async conditions(checkpoint,timeout=5000) {
  this.expected=checkpoint;
  const start=Date.now();
  while(!this.surface.check(checkpoint,this.inputs)) {
   if(this.cancelled)throw new Error('cancelled');
   if(Date.now()-start>timeout)throw new Error('checkpoint_timeout');await sleep(50);
  }
 }
 async recover(step) {
  const exception=this.surface.exception();
  if(!exception)return false;
  if(exception==='known_interstitial'){await this.act({action:'click',target:{frame:'servicing',strategy:'role',role:'button',name:'Acknowledge service notice'}},this.inputs,this.control.token);this.event('recovery_completed',{code:'known_interstitial',stepId:step.id});return true;}
  if(exception==='permission_denied'||exception==='app_error')throw new Error(exception);
  await this.handoff(exception,exception==='session_expired'?visible(heading('Member search')):visible(step.target));
  // Session restoration retains the entered search input. Retry only the reviewed read-only search.
  if(exception==='session_expired') {
   if(step.action!=='click'||step.target.name!=='Search members')throw new Error('unsafe_retry');
   await this.act(step,this.inputs,this.control.token);await this.settled(step.timeoutMs);
   this.event('recovery_completed',{code:'session_restored',stepId:step.id});
  }
  return true;
 }
 result(result) {return {...result,modelCalls:this.modelCalls,sessionId:this.sessionId};}
 async run({mode,inputs,capability,decide}) {
  if(this.busy)throw new Error('run_busy');if(this.used)throw new Error('run_reused');this.used=true;this.busy=true;this.inputs=inputs;this.sessionId=this.surface.sessionId;this.started=Date.now();this.state();
  try {
   checkInputs(inputs);
   if(mode==='replay')validateCapability(this.schema,capability,this.policy);
   if(!['discovery','replay'].includes(mode))throw new Error('invalid_mode');
   this.event('run_started',{mode,sessionId:this.sessionId});
   if(mode==='replay') {
    for(const step of capability.steps) {
     this.budget();this.stepId=step.id;this.expected=step.checkpoint;
     const outcome=this.outcome(capability);if(outcome)return this.result(outcome);
     this.event('step_started',{stepId:step.id,action:step.action});
     await this.act(step,inputs,this.control.token);await this.settled(step.timeoutMs);
     if(this.surface.exception())await this.recover(step);
     const after=this.outcome(capability);if(after)return this.result(after);
     await this.conditions(step.checkpoint,step.timeoutMs);
     this.event('step_completed',{stepId:step.id,action:step.action});
    }
   } else {
    let completed=false;let previous=null;
    for(let index=0;index<this.maxSteps;index++) {
     this.budget();this.stepId=`step-${index+1}`;
     await this.settled();
     const outcome=this.outcome(compileCapability([]));if(outcome)return this.result(outcome);
     if(this.surface.exception())await this.handoff(this.surface.exception(),visible(heading('Member search')));
     if(previous)previous.checkpoint=this.surface.stateCheckpoint();
     const observation=this.snapshot();
     this.modelCalls++;this.state();this.event('model_requested',{stepId:this.stepId,snapshot:observation});
     const decision=validateDecision(await decide(observation));
     this.control.assertAutomation(this.control.token);this.budget();
     this.event('model_decided',{stepId:this.stepId,action:decision.action,code:decision.reasonCode});
     if(decision.action==='finish'){completed=true;break;}
     const step={id:this.stepId,action:decision.action,target:decision.target,...(decision.action==='fill'?{value:{parameter:decision.parameter}}:{}),checkpoint:visible(decision.target),timeoutMs:5000};
     await this.act(step,inputs,this.control.token);await this.settled();
     if(this.surface.exception())await this.recover(step);
     previous=step;this.steps.push(step);
    }
    if(!completed)throw new Error('max_steps');
    for(const step of this.steps)if(step.target.name===inputs.accountType+' details')step.target.name='{{accountType}} details';
    capability=compileCapability(this.steps);validateCapability(this.schema,capability,this.policy);
   }
   for(const condition of capability.success)await this.conditions(condition,1000);
   const outputs=checkOutput(this.surface.extract(capability.outputs),inputs);
   this.control.complete();this.event('run_succeeded',{outputFields:Object.keys(outputs),modelCalls:this.modelCalls});
   return this.result({status:'success',outputs,...(mode==='discovery'?{capability}:{})});
  } catch(error) {
   if(this.control.owner!=='completed')this.control.fail();
   const code=SAFE_ERRORS.has(error.message)?error.message:'execution_failed';
   this.event('run_failed',{code,stepId:this.stepId,snapshot:this.snapshot()});
   return this.result({status:'failure',code,stepId:this.stepId,expected:this.expected||'valid invocation and reviewed capability',observed:this.snapshot()});
  } finally {this.busy=false;this.state();}
 }
 outcome(capability) {for(const o of capability.outcomes)if(this.surface.check(o.when,this.inputs)){this.event('business_outcome',{code:o.code});this.control.complete();return {status:'business_outcome',code:o.code};}return null;}
 budget(){if(this.cancelled)throw new Error('cancelled');if(Date.now()-this.started>this.timeoutMs)throw new Error('run_timeout');if(this.surface.sessionId!==this.sessionId)throw new Error('session_replaced');}
}
const SAFE_ERRORS=new Set(['invalid_inputs','schema_invalid','contract_changed','input_contract_changed','duplicate_step','target_blocked','origin_blocked','route_blocked','risk_blocked','action_blocked','frame_blocked','target_ambiguous','target_missing','checkpoint_timeout','load_timeout','permission_denied','app_error','max_steps','run_timeout','handoff_timeout','session_replaced','output_invalid','cancelled','model_unavailable','model_invalid','model_auth_failed','model_rate_limited','model_quota_exhausted','unsafe_retry','parameter_binding_invalid']);
