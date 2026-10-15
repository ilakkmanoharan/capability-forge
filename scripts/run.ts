// The CLI submits a command to the console's existing browser session.
const [modeArg,...args]=process.argv.slice(2),mode=modeArg==='discover'?'discovery':modeArg;
if(!['discovery','replay'].includes(mode)){console.error('Usage: node scripts/run.ts discover|replay [--member=10002] [--account=Savings] [--scenario=expired] [--fixture] [--show-outputs]');process.exit(1);}
const option=(name,fallback)=>args.find(a=>a.startsWith(`--${name}=`))?.split('=').slice(1).join('=')||fallback;
const origin='http://127.0.0.1:4317';
try{
 const request=await fetch(origin+'/api/command',{method:'POST',headers:{'Content-Type':'application/json','X-Forge-Client':'1',Origin:origin},body:JSON.stringify({mode,inputs:{memberId:option('member',mode==='discovery'?'10001':'10002'),accountType:option('account','Savings')},scenario:option('scenario','normal'),fixture:args.includes('--fixture')})});
 const start=await request.json();if(!request.ok)throw new Error(start.code);
 console.log('Command queued. Keep the console open at '+origin+'.');
 const deadline=Date.now()+240000;
 while(Date.now()<deadline){
  const response=await fetch(origin+'/api/command/'+start.id),value=await response.json();
  if(value.status==='completed'){
   const result=value.result;if(!args.includes('--show-outputs')&&result.outputs)result.outputs='[REDACTED: use --show-outputs for synthetic demo data]';
   if(result.capability)delete result.capability;
   console.log(JSON.stringify(result,null,2));process.exitCode=result.status==='failure'?1:0;break;
  }
  await new Promise(resolve=>setTimeout(resolve,300));
 }
 if(!process.exitCode&&Date.now()>=deadline)throw new Error('command_timeout: open the browser console and check pending human intervention');
}catch(error){console.error(error.message==='fetch failed'?'Start npm start first.':error.message);process.exitCode=1;}
