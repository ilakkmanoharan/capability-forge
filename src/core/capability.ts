import {validate} from './schema.ts';
import {checkInputs} from './guard.ts';
export const row = name => ({frame:'servicing',strategy:'row',name});
export const heading = name => ({frame:'servicing',strategy:'role',role:'heading',name});
export const visible = target => ({kind:'visible',target});
export const equals = (target,value) => ({kind:'equals',target,value});
export const inputContract = {
 memberId:{type:'string',sensitive:true,pattern:'^[0-9]{5}$'},
 accountType:{type:'string',sensitive:false,pattern:'^(Savings|Checking)$'}
};
export function compileCapability(steps) {
 return {schemaVersion:'1.0',capabilityId:'member-account-balance',version:'1.0.0',
 description:'Read a member account balance through the servicing UI.',surfaceProfile:'forge-servicing-web@1',
 inputs:structuredClone(inputContract),outputs:{
  accountType:{type:'string',sensitive:false,target:row('Account type'),pattern:'^(Savings|Checking)$'},
  balance:{type:'string',sensitive:true,target:row('Current balance'),pattern:'^[0-9]+\\.[0-9]{2}$'},
  currency:{type:'string',sensitive:false,target:row('Currency'),pattern:'^USD$'}},
 steps:structuredClone(steps),success:[visible(heading('Account detail')),equals(row('Member ID'),{parameter:'memberId'}),equals(row('Account type'),{parameter:'accountType'})],
 outcomes:[{code:'member_not_found',when:visible(heading('Member not found'))},{code:'validation_error',when:visible(heading('Validation error'))}]};
}
const canonical=value=>JSON.stringify(value&&typeof value==='object'?Array.isArray(value)?value.map(v=>JSON.parse(canonical(v))):Object.fromEntries(Object.keys(value).sort().map(k=>[k,JSON.parse(canonical(value[k]))])):value);
export function validateCapability(schema,capability,policy) {
 validate(schema,capability);
 if(canonical(capability.inputs)!==canonical(inputContract)) throw new Error('input_contract_changed');
 const ids=new Set();
 for(const step of capability.steps) {
  if(ids.has(step.id)) throw new Error('duplicate_step'); ids.add(step.id);
  if(step.action==='fill' && (!step.value || step.value.parameter!=='memberId' || step.target.name!=='Member ID')) throw new Error('parameter_binding_invalid');
  if(step.action==='click' && step.value) throw new Error('unexpected_step_value');
  if(!['visible','equals'].includes(step.checkpoint.kind)) throw new Error('checkpoint_invalid');
  const cp=step.checkpoint;
  if(cp.kind!=='visible'||cp.value||cp.target.strategy!=='role'||cp.target.role!=='heading'||!['Member search','Search results','Member detail','Account detail'].includes(cp.target.name))throw new Error('checkpoint_invalid');
 }
 // Outputs and completion proof are fixed by the reviewed task contract, never the model.
 const expected=compileCapability(capability.steps);
 for(const k of ['outputs','success','outcomes'])
  if(canonical(capability[k])!==canonical(expected[k])) throw new Error('contract_changed');
 for(const step of capability.steps) {
  const t=step.target;
  if(t.frame!=='servicing' || (step.action==='fill' ? t.strategy!=='label' || !policy.fillLabels.includes(t.name)
   :t.strategy!=='role' || t.role!=='button' || !(policy.clickNames.includes(t.name)||t.name==='{{accountType}} details'))) throw new Error('target_blocked');
 }
 return capability;
}
export function resolveValue(source,inputs) { return source.parameter ? inputs[source.parameter] : source.literal; }
