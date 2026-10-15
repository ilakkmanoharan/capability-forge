import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {enforcePolicy} from '../../src/core/policy.ts';
import {SessionControl} from '../../src/core/session.ts';
import {lookupMember,readAccount} from '../../src/demo/domain.ts';
const policy={origins:['http://127.0.0.1:4317'],routes:[/^\/desk$/],actions:['read' as const,'click' as const]};
describe('Feature: Safe local capability foundations',()=>{
 it('Allowed read: Given allowlisted UI, When reversible read, Then permit',()=>assert.doesNotThrow(()=>enforcePolicy(policy,{url:'http://127.0.0.1:4317/desk',type:'read',risk:'reversible'})));
 it('Risky action: Given allowed UI, When irreversible click, Then block',()=>assert.throws(()=>enforcePolicy(policy,{url:'http://127.0.0.1:4317/desk',type:'click',risk:'irreversible'}),/^Error: irreversible_action_blocked$/));
 it('Missing member: Given absent ID, When lookup, Then business outcome',()=>assert.deepEqual(lookupMember('99999'),{status:'business_outcome',code:'member_not_found'}));
 it('Parameterized account lookup: Given 10002, When Savings, Then 730.20 USD',()=>assert.deepEqual(readAccount('10002','Savings'),{status:'success',outputs:{memberId:'10002',accountType:'Savings',balance:'730.20',currency:'USD'}}));
 it('Human owns the session: Given pause, When claim, Then automation blocked',()=>{const s=new SessionControl(),token=s.token;s.pause();s.claimHuman();assert.throws(()=>s.assertAutomation(token));assert.equal(s.owner,'human');});
 it('Return to automation: Given human ownership, When release and resume, Then new token only',()=>{const s=new SessionControl(),token=s.token;s.pause();s.claimHuman();s.releaseHuman();s.resume();s.assertAutomation(s.token);assert.throws(()=>s.assertAutomation(token));});
});
