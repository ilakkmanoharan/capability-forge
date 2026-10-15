import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { enforcePolicy, type Policy } from '../../src/core/policy.ts';
const makePolicy = (): Policy => ({origins:['http://127.0.0.1:4317'],routes:[/^\/(?:desk)?$/],actions:['navigate','click','fill','read']});
const makeAction = () => ({url:'http://127.0.0.1:4317/desk',type:'click' as const,risk:'reversible' as const});
describe('Execution policy boundary', () => {
  for(const type of ['navigate','click','fill','read'] as const)
    it(`permits explicitly allowed ${type}`,()=>assert.doesNotThrow(()=>enforcePolicy(makePolicy(),{...makeAction(),type})));
  for(const url of ['http://127.0.0.1.evil.test:4317/desk','https://127.0.0.1:4317/desk','http://127.0.0.1:4318/desk','http://localhost:4317/desk','https://example.com/desk'])
    it(`blocks origin ${url}`,()=>assert.throws(()=>enforcePolicy(makePolicy(),{...makeAction(),url}),/^Error: origin_blocked$/));
  for(const url of ['http://user@127.0.0.1:4317/desk','http://user:password@127.0.0.1:4317/desk'])
    it('blocks credentials in a URL',()=>assert.throws(()=>enforcePolicy(makePolicy(),{...makeAction(),url}),/^Error: credential_url_blocked$/));
  for(const path of ['/admin','/desk/admin','/Desk','/desk/','/%64esk'])
    it(`blocks undeclared route ${path}`,()=>assert.throws(()=>enforcePolicy(makePolicy(),{...makeAction(),url:'http://127.0.0.1:4317'+path}),/^Error: route_blocked$/));
  for(const field of ['origins','routes','actions'] as const)
    it(`empty ${field} denies execution`,()=>assert.throws(()=>enforcePolicy({...makePolicy(),[field]:[]},makeAction())));
  it('blocks irreversible actions',()=>assert.throws(()=>enforcePolicy(makePolicy(),{...makeAction(),risk:'irreversible'}),/^Error: irreversible_action_blocked$/));
  for(const url of ['', 'relative/path', 'not a URL'])
    it('rejects malformed and relative URLs',()=>assert.throws(()=>enforcePolicy(makePolicy(),{...makeAction(),url}),/^Error: invalid_url$/));
  it('matches pathname while leaving query and fragment outside route policy',()=>assert.doesNotThrow(()=>enforcePolicy(makePolicy(),{...makeAction(),url:'http://127.0.0.1:4317/desk?mode=normal#result'})));
  it('global route expressions behave consistently across calls',()=>{const policy={...makePolicy(),routes:[/^\/desk$/g]};for(let i=0;i<4;i++)assert.doesNotThrow(()=>enforcePolicy(policy,makeAction()));});
  it('does not change the caller route matcher state',()=>{const rule=/^\/desk$/g;rule.lastIndex=7;enforcePolicy({...makePolicy(),routes:[rule]},makeAction());assert.equal(rule.lastIndex,7);});
  for(const risk of ['unknown',undefined,null,42])
    it(`fails closed for untrusted risk ${risk}`,()=>assert.throws(()=>enforcePolicy(makePolicy(),{...makeAction(),risk} as any),/^Error: invalid_risk$/));
  it('rejects an unknown action type',()=>assert.throws(()=>enforcePolicy(makePolicy(),{...makeAction(),type:'evaluate'} as any),/^Error: action_blocked$/));
});
