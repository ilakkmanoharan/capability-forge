import {sanitizeObservation,safeText} from '../core/guard.ts';
const TYPES=new Set(['run_started','step_started','step_completed','model_requested','model_decided','provider_receipt','intervention_requested','human_claimed','human_action','automation_resumed','recovery_completed','run_succeeded','business_outcome','run_failed','cancel_requested']);
const CODES=new Set(['session_expired','unexpected_dialog','known_interstitial','session_restored','member_not_found','validation_error','permission_denied','app_error','invalid_inputs','schema_invalid','contract_changed','input_contract_changed','duplicate_step','target_blocked','origin_blocked','route_blocked','risk_blocked','action_blocked','frame_blocked','target_ambiguous','target_missing','checkpoint_timeout','load_timeout','max_steps','run_timeout','handoff_timeout','session_replaced','output_invalid','cancelled','model_unavailable','execution_failed','enter_input','open_result','open_account','goal_complete','model_auth_failed','model_rate_limited','model_quota_exhausted']);
const uuid=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value)?value:undefined;
export function cleanEvent(event){
 if(!TYPES.has(event.type))return null;
 const result={type:event.type};
 if(Number.isInteger(event.sequence)&&event.sequence>=0)result.sequence=event.sequence;
 if(typeof event.time==='string'&&/^\d{4}-\d{2}-\d{2}T[0-9:.]+Z$/.test(event.time))result.time=event.time;
 if(/^step-[0-9]{1,2}$/.test(event.stepId))result.stepId=event.stepId;
 if(['fill','click','finish','input'].includes(event.action))result.action=event.action;
 if(CODES.has(event.code))result.code=event.code;
 if(['discovery','replay'].includes(event.mode))result.mode=event.mode;
 if(Number.isInteger(event.epoch))result.epoch=event.epoch;
 if(uuid(event.sessionId))result.sessionId=event.sessionId;
 if(event.type==='human_action'){result.target=safeText(event.target);result.trustedInput=event.trustedInput===true;}
 if(event.snapshot)result.snapshot=sanitizeObservation(event.snapshot);
 return result;
}
export function cleanResult(result,calls){
 const status=['success','failure','business_outcome'].includes(result.status)?result.status:'failure';
 const expected=result.expected&&typeof result.expected==='object'?{
   kind:['visible','equals'].includes(result.expected.kind)?result.expected.kind:'visible',
   target:{frame:'servicing',strategy:['label','role','row'].includes(result.expected.target?.strategy)?result.expected.target.strategy:'role',name:safeText(result.expected.target?.name)},
   ...(result.expected.value?.parameter&&['memberId','accountType'].includes(result.expected.value.parameter)?{value:{parameter:result.expected.value.parameter}}:{})
  }:undefined;
 return {status,modelCalls:calls,...(/^step-[0-9]{1,2}$/.test(result.stepId)?{stepId:result.stepId}:{}),...(expected?{expected}:{}),...(CODES.has(result.code)?{code:result.code}:{}),...(uuid(result.sessionId)?{sessionId:result.sessionId}:{}),...(status==='success'?{outputFields:['accountType','balance','currency'],outputs:'[REDACTED]'}:{}),...(result.observed?{observed:sanitizeObservation(result.observed)}:{})};
}
