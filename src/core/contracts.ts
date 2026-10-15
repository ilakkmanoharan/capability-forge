export type ActionType = "navigate" | "click" | "fill" | "read";
export type Inputs = { memberId: string; accountType: "Savings" | "Checking" };
export type Outputs = { accountType: "Savings" | "Checking"; balance: string; currency: "USD" };
export type Target = { frame: "servicing"; strategy: "label" | "role" | "row"; name: string; role?: "button" | "heading" | "textbox" | "cell" };
export type ValueSource = { parameter: keyof Inputs } | { literal: string };
export type Condition = {kind:"visible";target:Target} | {kind:"equals";target:Target;value:ValueSource};
export type Step = {id:string;action:"fill"|"click";target:Target;value?:{parameter:keyof Inputs};checkpoint:Condition;timeoutMs:number};
export type Field = {type:"string";sensitive:boolean;pattern:string};
export type Capability = {
 schemaVersion:"1.0";capabilityId:"member-account-balance";version:string;
 description:string;surfaceProfile:"forge-servicing-web@1";
 inputs:Record<keyof Inputs,Field>;
 outputs:Record<keyof Outputs,Field & {target:Target}>;
 steps:Step[];success:Condition[];outcomes:{code:"member_not_found"|"validation_error";when:Condition}[];
};
export type RunResult = (
 {status:"success";outputs:Outputs;capability?:Capability} |
 {status:"business_outcome";code:string} |
 {status:"failure";code:string;stepId?:string;expected:string|Condition;observed:unknown}
) & {modelCalls:number;sessionId:string};
export type Intervention = {reason:string;stepId:string;sessionId:string;checkpoint:Condition};
export type Surface = {
 readonly sessionId:string;
 observe():unknown; exception():string|null; stateCheckpoint():Condition;
 act(step:Step,inputs:Inputs):void|Promise<void>;
 check(condition:Condition,inputs:Inputs):boolean;
 extract(definitions:Capability["outputs"]):Outputs;
};
