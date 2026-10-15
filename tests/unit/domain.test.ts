import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {lookupMember,readAccount} from '../../src/demo/domain.ts';
describe('Synthetic banking domain',()=>{
 for(const id of ['10001','10002'])it(`finds member ${id}`,()=>assert.deepEqual(lookupMember(id),{status:'found',memberId:id}));
 it('returns absence as a business outcome',()=>assert.deepEqual(lookupMember('99999'),{status:'business_outcome',code:'member_not_found'}));
 for(const id of ['', '1234','123456','ABCDE',' 10001','10001 ','<img>','１０００１',null,undefined,10001])
  it(`rejects invalid member input ${id}`,()=>assert.deepEqual(lookupMember(id),{status:'business_outcome',code:'invalid_member_id'}));
 for(const [id,account,balance] of [['10001','Savings','2450.75'],['10001','Checking','800.00'],['10002','Savings','730.20'],['10002','Checking','125.50']])
  it(`returns ${id} ${account} as a decimal string`,()=>assert.deepEqual(readAccount(id,account),{status:'success',outputs:{memberId:id,accountType:account,balance,currency:'USD'}}));
 for(const account of ['savings','Credit', '',null])it(`rejects unknown account ${account}`,()=>assert.deepEqual(readAccount('10001',account),{status:'business_outcome',code:'invalid_account_type'}));
 it('checks member existence before account extraction',()=>assert.deepEqual(readAccount('99999','Savings'),{status:'business_outcome',code:'member_not_found'}));
 it('returned objects cannot change later lookup results',()=>{const r=readAccount('10001','Savings');if(r.status==='success')r.outputs.balance='0';assert.equal((readAccount('10001','Savings') as any).outputs.balance,'2450.75');});
});
