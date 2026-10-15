import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {SessionControl,type Owner} from '../../src/core/session.ts';
function at(owner:Owner){const s=new SessionControl();if(owner==='paused'||owner==='human'){s.pause();if(owner==='human')s.claimHuman();}else if(owner==='completed')s.complete();return s;}
const transitions={pause:['automation','paused'],claimHuman:['paused','human'],releaseHuman:['human','paused'],resume:['paused','automation'],complete:['automation','completed']} as const;
describe('Session control state machine',()=>{
 it('starts with automation ownership and epoch zero',()=>{const s=new SessionControl();assert.equal(s.owner,'automation');assert.equal(s.token,0);s.assertAutomation(0);});
 for(const [method,[from,to]] of Object.entries(transitions)) {
  for(const owner of ['automation','paused','human','completed'] as Owner[]){
   it(`${method} from ${owner} ${owner===from?'transfers ownership':'is rejected without mutation'}`,()=>{
    const s=at(owner),token=s.token;
    if(owner===from){s[method as keyof typeof transitions]();assert.equal(s.owner,to);assert.equal(s.token,token+1);}
    else{assert.throws(()=>s[method as keyof typeof transitions](),/^Error: invalid_control_transition$/);assert.equal(s.owner,owner);assert.equal(s.token,token);}
   });
  }
 }
 for(const owner of ['paused','human','completed'] as Owner[])
  it(`rejects automation while ${owner}, even with the current token`,()=>{const s=at(owner);assert.throws(()=>s.assertAutomation(s.token),/^Error: stale_or_unowned_action$/);});
 for(const token of [-1,1,NaN,Infinity,'0',null,undefined])
  it(`rejects invalid or stale token ${token}`,()=>assert.throws(()=>new SessionControl().assertAutomation(token as any),/^Error: stale_or_unowned_action$/));
 it('old tokens remain invalid through repeated handoffs',()=>{const s=new SessionControl(),tokens=[s.token];for(let i=0;i<5;i++){s.pause();s.claimHuman();s.releaseHuman();s.resume();for(const t of tokens)assert.throws(()=>s.assertAutomation(t));s.assertAutomation(s.token);tokens.push(s.token);}assert.equal(s.token,20);});
 it('instances isolate ownership',()=>{const a=new SessionControl(),b=new SessionControl();a.pause();assert.equal(b.owner,'automation');b.assertAutomation(0);});
});
