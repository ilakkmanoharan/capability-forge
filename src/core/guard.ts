export function guard(policy, urlString, action, target, risk = 'reversible') {
 let url; try { url = new URL(urlString); } catch { throw new Error('invalid_url'); }
 if(url.username || url.password || !policy.allowedOrigins.includes(url.origin)) throw new Error('origin_blocked');
 if(!policy.allowedPaths.includes(url.pathname) || url.search || url.hash) throw new Error('route_blocked');
 if(!policy.actions.includes(action)) throw new Error('action_blocked');
 if(risk !== 'reversible') throw new Error('risk_blocked');
 if(!target || target.frame !== 'servicing') throw new Error('frame_blocked');
 const allowed = action === 'fill' ? target.strategy === 'label' && policy.fillLabels.includes(target.name)
   : action === 'click' ? target.strategy === 'role' && target.role === 'button' && policy.clickNames.includes(target.name)
   : target.strategy === 'row' && policy.readRows.includes(target.name);
 if(!allowed) throw new Error('target_blocked');
}
export function checkInputs(inputs) {
 if(!inputs || Object.keys(inputs).sort().join(',') !== 'accountType,memberId'
   || typeof inputs.memberId !== 'string' || !/^[0-9]{5}$/.test(inputs.memberId)
   || !['Savings','Checking'].includes(inputs.accountType)) throw new Error('invalid_inputs');
 return inputs;
}
export function checkOutput(outputs, inputs) {
 if(!outputs || Object.keys(outputs).sort().join(',') !== 'accountType,balance,currency'
  || outputs.accountType !== inputs.accountType || outputs.currency !== 'USD'
  || typeof outputs.balance !== 'string' || !/^[0-9]+\.[0-9]{2}$/.test(outputs.balance)) throw new Error('output_invalid');
 return outputs;
}
export const SAFE_TEXT = new Set(['Member servicing','Member search','Search results','Member detail','Account detail','Permission denied','Session expired','Member not found','App error','Validation error','Session restored. Search again.','Loading','Member ID','Account type','Current balance','Currency','Savings','Checking','USD','Search members','Open member','Savings details','Checking details','Back to search','Back to member','Restore demo session','Dismiss notice','Acknowledge service notice']);
export function safeText(value) { return SAFE_TEXT.has(value) ? value : '[REDACTED]'; }
export function sanitizeObservation(observation) {
 return { headings:(observation.headings || []).slice(0,20).map(safeText),
   controls:(observation.controls || []).slice(0,30).map(c=>({strategy:['label','role','row'].includes(c.strategy)?c.strategy:'role',name:safeText(c.name),...(c.role ? {role:['button','heading','textbox','cell'].includes(c.role)?c.role:'button'} : {}),frame:'servicing',...(c.strategy==='label'?{filled:c.filled===true}:{})})),
   rows:(observation.rows || []).slice(0,20).map(safeText),
   dialog:observation.dialog === true, loading:observation.loading === true };
}
