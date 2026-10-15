import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validateCapability} from '../src/core/capability.ts';
const root=process.cwd(),evidence=path.join(root,'evidence');
const schema=JSON.parse(await fs.readFile('schemas/capability.schema.json','utf8'));
const policy=JSON.parse(await fs.readFile('config/policy.json','utf8'));
const capability=JSON.parse(await fs.readFile(path.join(evidence,'capability.json'),'utf8'));
validateCapability(schema,capability,policy);
const digest=createHash('sha256').update(JSON.stringify(capability)).digest('hex');
const reports=[];
for(const name of await fs.readdir(evidence))if(/^[a-f0-9-]{36}\.json$/.test(name))reports.push(JSON.parse(await fs.readFile(path.join(evidence,name),'utf8')));
const discovery=reports.find(r=>r.mode==='discovery'&&r.result.status==='success'&&r.providerReceipts.length>0&&r.capabilitySha256===digest);
if(!discovery)throw new Error('No genuine discovery receipt for the saved capability');
for(const r of reports){if(r.mode==='replay'&&(r.result.modelCalls!==0||r.providerReceipts.length))throw new Error('Replay model call detected');if(r.capabilitySha256!==digest)throw new Error('Artifact digest mismatch');}
const handoff=reports.find(r=>r.mode==='replay'&&r.result.status==='success'&&r.events.some(e=>e.type==='human_action')&&r.events.some(e=>e.type==='automation_resumed'));
if(!handoff)throw new Error('No completed handoff proof');
if(handoff.events.filter(e=>e.sessionId).some(e=>e.sessionId!==handoff.result.sessionId))throw new Error('Handoff session changed');
const raw=(await Promise.all(['.env','.env.credentials.local'].map(n=>fs.readFile(n,'utf8').catch(()=>'')))).join('\n');
const secrets=[...raw.matchAll(/^(?:OPENAI_API_KEY|XAI_API_KEY)=(.+)$/gm)].map(m=>m[1].trim());
async function scan(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){if(['.git','node_modules'].includes(entry.name)||entry.name==='.env'||entry.name.startsWith('.env.'))continue;const file=path.join(dir,entry.name);if(entry.isDirectory())await scan(file);else{const text=await fs.readFile(file,'utf8');if(secrets.some(secret=>secret&&text.includes(secret)))throw new Error('Secret found outside local configuration');}}}
await scan(root);
for(const name of await fs.readdir(evidence))if(name.endsWith('.json')||name.endsWith('.jsonl')){
 const text=await fs.readFile(path.join(evidence,name),'utf8');
 if(/["'](?:10001|10002|99999|2450\.75|730\.20|125\.50)["']/.test(text))throw new Error('Raw fixture input or output leaked into evidence');
}
console.log(JSON.stringify({capabilitySha256:digest,genuineDiscovery:discovery.runId,modelCalls:discovery.result.modelCalls,replayReports:reports.filter(r=>r.mode==='replay').length,sameSessionHandoff:handoff.runId,secretScan:'passed',evidenceRedaction:'passed'},null,2));
