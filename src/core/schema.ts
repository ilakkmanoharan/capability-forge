// Deliberately bounded JSON Schema subset used by this repository's schemas.
export function validate(schema, value, depth = 0) {
  if(depth > 30) throw new Error('schema_depth');
  const fail = () => { throw new Error('schema_invalid'); };
  if(schema.const !== undefined && JSON.stringify(value) !== JSON.stringify(schema.const)) fail();
  if(schema.enum && !schema.enum.includes(value)) fail();
  if(schema.type === 'object') {
    if(!value || typeof value !== 'object' || Array.isArray(value)) fail();
    if(Object.keys(value).some(k => ['__proto__','constructor','prototype'].includes(k))) fail();
    for(const k of schema.required || []) if(!Object.hasOwn(value,k)) fail();
    for(const [k,v] of Object.entries(value)) {
      if(!Object.hasOwn(schema.properties || {},k)) { if(schema.additionalProperties === false) fail(); }
      else validate(schema.properties[k],v,depth+1);
    }
  }
  if(schema.type === 'array') {
    if(!Array.isArray(value) || value.length < (schema.minItems || 0) || value.length > (schema.maxItems ?? 100)) fail();
    value.forEach(v => validate(schema.items,v,depth+1));
  }
  if(schema.type === 'string') {
    if(typeof value !== 'string' || value.length < (schema.minLength || 0) || value.length > (schema.maxLength ?? 1000)) fail();
    if(schema.pattern && !new RegExp(schema.pattern).test(value)) fail();
  }
  if(schema.type === 'boolean' && typeof value !== 'boolean') fail();
  if(schema.type === 'integer' && (!Number.isInteger(value) || value < schema.minimum || value > schema.maximum)) fail();
  return value;
}
export const targetSchema = {"type": "object", "properties": {"frame": {"const": "servicing"}, "strategy": {"enum": ["label", "role", "row"]}, "name": {"type": "string", "minLength": 1, "maxLength": 160}, "role": {"enum": ["button", "heading", "textbox", "cell"]}}, "required": ["frame", "strategy", "name"], "additionalProperties": false};
export const decisionSchema = {type:'object', properties:{
  action:{enum:['fill','click','finish']}, target:targetSchema,
  parameter:{enum:['memberId','accountType']}, reasonCode:{enum:['enter_input','open_result','open_account','goal_complete']}
},required:['action','reasonCode'],additionalProperties:false};
export function validateDecision(value) {
 validate(decisionSchema,value);
 if(value.action !== 'finish' && !value.target) throw new Error('missing_target');
 if(value.action === 'fill' && !value.parameter) throw new Error('missing_parameter');
 if(value.action !== 'fill' && value.parameter) throw new Error('unexpected_parameter');
 if(value.action === 'finish' && value.target) throw new Error('unexpected_target');
 return value;
}
