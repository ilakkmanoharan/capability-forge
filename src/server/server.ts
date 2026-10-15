import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {stripTypeScriptTypes} from 'node:module';
import {decide} from './provider.ts';
import {checkInputs} from '../core/guard.ts';
import {cleanEvent,cleanResult} from './evidence.ts';
import {compileCapability,visible,heading} from '../core/capability.ts';
import {validateCapability} from '../core/capability.ts';
const root=fileURLToPath(new URL('../../',import.meta.url));
try{process.loadEnvFile(path.join(root,'.env'));}catch{}
const port=4317,origin=`http://127.0.0.1:${port}`,model=process.env.OPENAI_MODEL||'gpt-4.1-mini';
const policy=JSON.parse(await readFile(path.join(root,'config/policy.json'),'utf8'));
const schema=JSON.parse(await readFile(path.join(root,'schemas/capability.schema.json'),'utf8'));
const evidence=path.join(root,'evidence');await mkdir(evidence,{recursive:true});
const commands=new Map();
const sessions=new Map();let capability=null;
try{capability=JSON.parse(await readFile(path.join(evidence,'capability.json'),'utf8'));validateCapability(schema,capability,policy);}catch{capability=null;}
const reply=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>150000)throw new Error('body_too_large');}return JSON.parse(text);}
export const server=createServer(async(req,res)=>{
 try {
  if(req.headers.host!==`127.0.0.1:${port}`){reply(res,403,{code:'host_blocked'});return;}
  const url=new URL(req.url,origin);
  if(req.method==='POST') {
   if(req.headers.origin!==origin || req.headers['x-forge-client']!=='1' || !req.headers['content-type']?.startsWith('application/json')){reply(res,403,{code:'request_blocked'});return;}
   const data=await body(req);
   if(url.pathname==='/api/command'){
    if(commands.size>=100)throw new Error('session_limit');
    if(!['discovery','replay'].includes(data.mode))throw new Error('invalid_mode');
    checkInputs(data.inputs);
    const scenario=['normal','slow','permission','expired','dialog','known','app-error','ambiguous'].includes(data.scenario)?data.scenario:'normal';
    const id=randomUUID();commands.set(id,{id,mode:data.mode,inputs:data.inputs,scenario,status:'queued',fixture:data.fixture===true});reply(res,200,{id});return;
   }
   if(url.pathname==='/api/start'){
    if(!['discovery','replay'].includes(data.mode))throw new Error('invalid_mode');
    if(sessions.size>=100)throw new Error('session_limit');
    const runId=randomUUID();if(data.commandId&&commands.has(data.commandId))commands.get(data.commandId).runId=runId;sessions.set(runId,{mode:data.mode,source:data.source==='development-fixture'?'development-fixture':'saved-discovery',calls:0,receipts:[],started:new Date().toISOString(),pending:false});reply(res,200,{runId});return;
   }
   if(url.pathname==='/api/decide'){
    const run=sessions.get(data.runId);if(!run||run.mode!=='discovery'||run.calls>=12||run.pending)throw new Error('model_request_blocked');
    if(!['Savings','Checking'].includes(data.accountType))throw new Error('invalid_inputs');
    run.pending=true;run.calls++;
    try{const result=await decide(data,{key:process.env.OPENAI_API_KEY,model});run.receipts.push({requestId:result.requestId,model:result.model,usage:result.usage});reply(res,200,result);}finally{run.pending=false;}return;
   }
   if(url.pathname==='/api/complete'){
    const run=sessions.get(data.runId);if(!run||run.pending)throw new Error('invalid_run');
    if(run.mode==='replay'&&run.calls!==0)throw new Error('replay_model_violation');
    if(data.result.status==='success'&&run.mode==='discovery'){
     if(!run.receipts.length)throw new Error('missing_live_receipt');
     validateCapability(schema,data.result.capability,policy);capability=data.result.capability;
     await writeFile(path.join(evidence,'capability.json'),JSON.stringify(capability,null,2)+'\n');
    }
    const events=(Array.isArray(data.events)?data.events:[]).slice(0,500).map(cleanEvent).filter(Boolean);
    const digest=capability?createHash('sha256').update(JSON.stringify(capability)).digest('hex'):null;
    const report={runId:data.runId,mode:run.mode,started:run.started,finished:new Date().toISOString(),provider:run.mode==='discovery'?'openai-responses':'none',capabilitySource:run.source,providerReceipts:run.receipts,capabilitySha256:digest,result:cleanResult(data.result,run.calls),events};
    await writeFile(path.join(evidence,`${data.runId}.json`),JSON.stringify(report,null,2)+'\n');
    await writeFile(path.join(evidence,`${data.runId}.jsonl`),events.map(e=>JSON.stringify(e)).join('\n')+'\n');
    for(const command of commands.values())if(command.runId===data.runId){command.status='completed';command.result=data.result;}
    sessions.delete(data.runId);reply(res,200,{runId:data.runId});return;
   }
   if(url.pathname==='/api/fixture'){
    const target=(name,strategy='role')=>({frame:'servicing',strategy,...(strategy==='role'?{role:'button'}:{}),name});
    const fixture=compileCapability([
     {id:'step-1',action:'fill',target:target('Member ID','label'),value:{parameter:'memberId'},checkpoint:visible(heading('Member search')),timeoutMs:5000},
     {id:'step-2',action:'click',target:target('Search members'),checkpoint:visible(heading('Search results')),timeoutMs:5000},
     {id:'step-3',action:'click',target:target('Open member'),checkpoint:visible(heading('Member detail')),timeoutMs:5000},
     {id:'step-4',action:'click',target:target('{{accountType}} details'),checkpoint:visible(heading('Account detail')),timeoutMs:5000}]);
    reply(res,200,{capability:fixture,source:'development-fixture'});return;
   }
   if(url.pathname==='/api/policy-proof'){await writeFile(path.join(evidence,'policy-proof.json'),JSON.stringify({action:'irreversible_click',status:'blocked',code:data.code==='risk_blocked'?'risk_blocked':'unexpected_result'},null,2)+'\n');reply(res,200,{ok:true});return;}
   reply(res,404,{code:'not_found'});return;
  }
  if(req.method!=='GET'){reply(res,405,{code:'method_not_allowed'});return;}
  if(url.pathname==='/api/next'){
   const command=[...commands.values()].find(c=>c.status==='queued');if(command)command.status='claimed';reply(res,200,{command:command||null});return;
  }
  if(/^\/api\/command\/[a-f0-9-]{36}$/.test(url.pathname)){
   const command=commands.get(url.pathname.split('/').at(-1));if(!command){reply(res,404,{code:'not_found'});return;}reply(res,200,{status:command.status,result:command.result||null});return;
  }
  if(url.pathname==='/api/config'){reply(res,200,{modelReady:!!process.env.OPENAI_API_KEY,model,policy});return;}
  if(url.pathname==='/api/capability'){reply(res,200,{capability});return;}
  if(url.pathname==='/api/runs'){const names=(await readdir(evidence)).filter(n=>/^[a-f0-9-]{36}\.json$/.test(n));const runs=await Promise.all(names.map(async n=>JSON.parse(await readFile(path.join(evidence,n),'utf8'))));reply(res,200,{runs});return;}
  let file,mime='text/html; charset=utf-8';
  if(url.pathname==='/')file='src/browser/index.html';
  else if(url.pathname==='/desk')file='src/demo/desk.html';
  else if(url.pathname==='/app.css'){file='src/browser/app.css';mime='text/css';}
  else if(url.pathname==='/domain.js'){file='src/demo/domain.ts';mime='text/javascript';}
  else if(url.pathname==='/schemas/capability.schema.json'){reply(res,200,schema);return;}
  else if(/^\/src\/(browser|core)\/[a-z-]+\.ts$/.test(url.pathname)){file=url.pathname.slice(1);mime='text/javascript';}
  else{reply(res,404,{code:'not_found'});return;}
  let content=await readFile(path.join(root,file),'utf8');if(file.endsWith('.ts'))content=stripTypeScriptTypes(content);
  res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'"});res.end(content);
 }catch(e){const safe=new Set(['model_unavailable','model_auth_failed','model_rate_limited','model_quota_exhausted','model_invalid','model_request_blocked','invalid_inputs','body_too_large','invalid_run','missing_live_receipt','session_limit','schema_invalid']);reply(res,400,{code:safe.has(e.message)?e.message:'request_failed'});}
});
server.listen(port,'127.0.0.1',()=>console.log(`capability-forge: ${origin} (model: ${model}, key configured: ${!!process.env.OPENAI_API_KEY})`));
