import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({URL,FormData,Blob,AbortSignal,fetch});
vm.runInContext(fs.readFileSync(new URL('./recognition.js',import.meta.url),'utf8')+'\nglobalThis.api=Recognition;',context);
const api=context.api;
const photo='data:image/jpeg;base64,/9j/2Q==';
const key='sk-test-fixture-not-a-real-key';
const result={is_plant:true,candidates:[{name:'山茶',scientific_name:'Camellia japonica',family:'山茶科',bloom_months:[4,2,3,3,0,'5',13],description:'常绿灌木，花色丰富。',features:'叶片革质，有锯齿。',habitat:'温暖湿润的庭院。',reason:'照片中叶缘与花形符合候选。',score:.99}]};
const completion=value=>({choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(value)}}]});
let passed=0;
async function check(name,test){await test();passed++;console.log('PASS',name);}

await check('DeepSeek accepts root, v1 and complete endpoint forms',()=>{
  assert.equal(api.deepSeekEndpoint('https://api.deepseek.com'),'https://api.deepseek.com/chat/completions');
  assert.equal(api.deepSeekEndpoint('https://api.deepseek.com/v1/'),'https://api.deepseek.com/v1/chat/completions');
  assert.equal(api.deepSeekEndpoint('http://localhost:8765/chat/completions'),'http://localhost:8765/chat/completions');
});
await check('configuration rejects insecure destinations and malformed keys',()=>{
  for(const endpoint of ['http://example.org','javascript:alert(1)','https://name:secret@example.org','https://example.org/?key=secret'])assert.throws(()=>api.config('deepseek',{apiKey:key,endpoint}));
  assert.throws(()=>api.config('deepseek',{apiKey:'key with spaces'}));
  assert.throws(()=>api.config('unknown',{apiKey:key}));
});
await check('DeepSeek sends the photo and JSON prompt with bearer authentication',async()=>{
  const calls=[];
  const candidates=await api.identify('deepseek',{apiKey:key},photo,async(url,init)=>{calls.push({url,init});return Response.json(completion(result));});
  assert.equal(calls.length,1);const {url,init}=calls[0],body=JSON.parse(init.body);
  assert.equal(url,'https://api.deepseek.com/chat/completions');
  assert.equal(init.headers.Authorization,'Bearer '+key);
  assert.equal(init.headers['Content-Type'],'application/json');
  assert.equal(init.credentials,'omit');assert.equal(init.redirect,'error');
  assert.equal(body.model,'deepseek-flash');assert.equal(body.response_format.type,'json_object');
  assert.equal(body.thinking.type,'disabled');assert.equal(body.stream,false);
  assert.equal(body.messages[0].role,'user');assert.equal(body.messages[0].content[1].image_url.url,photo);
  assert.ok(!init.body.includes(key));assert.ok(!init.body.includes('latitude'));assert.ok(!init.body.includes('address'));
  assert.equal(candidates[0].name,'山茶');assert.equal(candidates[0].score,null);
  assert.equal(JSON.stringify(candidates[0].months),'[2,3,4]');assert.equal(candidates[0].description,result.candidates[0].description);
});
await check('custom vision models and compatible endpoints are retained',async()=>{
  await api.identify('deepseek',{apiKey:key,model:'my-vision-model',endpoint:'https://example.org/v1'},photo,async(url,init)=>{assert.equal(url,'https://example.org/v1/chat/completions');assert.equal(JSON.parse(init.body).model,'my-vision-model');return Response.json(completion(result));});
});
await check('no credentials or invalid photos never make a request',async()=>{
  let count=0;const spy=async()=>{count++;throw new Error('unexpected request');};
  await assert.rejects(api.identify('deepseek',{apiKey:''},photo,spy));
  await assert.rejects(api.identify('deepseek',{apiKey:key},'https://example.org/private-photo',spy));
  assert.equal(count,0);
});
await check('empty, truncated, non-plant and malformed responses are rejected',()=>{
  for(const data of [{},completion({is_plant:false,candidates:[]}),completion({candidates:[]}),completion({is_plant:true,candidates:[{name:{bad:'value'}}]}),{choices:[{finish_reason:'length',message:{content:'{}'}}]}, {choices:[{message:{content:'not JSON'}}]}])assert.throws(()=>api.parseDeepSeek(data));
});
await check('fenced JSON is tolerated while generated confidence remains absent',()=>{
  const data=completion(result);data.choices[0].message.content='```json\n'+JSON.stringify(result)+'\n```';
  const parsed=api.parseDeepSeek(data);assert.equal(parsed[0].score,null);assert.equal(parsed[0].reason,result.candidates[0].reason);
});
await check('authentication, balance and unsupported-image failures are actionable',async()=>{
  for(const [status,pattern] of [[401,/密钥/],[402,/余额/],[400,/支持图片/],[404,/接口或模型/],[429,/频繁|额度/],[503,/暂时不可用/]]){
    await assert.rejects(api.identify('deepseek',{apiKey:key},photo,async()=>Response.json({error:{message:key}},{status})),error=>pattern.test(error.message)&&!error.message.includes(key));
  }
});
await check('CORS and timeout errors do not expose request credentials',async()=>{
  await assert.rejects(api.identify('deepseek',{apiKey:key},photo,async()=>{throw new TypeError(key);}),error=>/跨域|CORS/.test(error.message)&&!error.message.includes(key));
  await assert.rejects(api.identify('deepseek',{apiKey:key},photo,async()=>{const e=new Error('timeout');e.name='TimeoutError';throw e;}),/超时/);
});
await check('Pl@ntNet remains multipart and retains its supplied score',async()=>{
  let networkCalls=0;
  const parsed=await api.identify('plantnet',{apiKey:key,proxy:'https://example.org/identify'},photo,async(url,init)=>{
    if(url===photo)return new Response(new Blob(['jpeg'],{type:'image/jpeg'}));
    networkCalls++;assert.equal(url,'https://example.org/identify');assert.equal(init.headers['X-Plantnet-Key'],key);assert.equal(init.body.get('organs'),'auto');assert.equal(init.body.get('images').name,'plant.jpg');
    return Response.json({results:[{score:.87,species:{scientificNameWithoutAuthor:'Osmanthus fragrans',commonNames:['桂花']}}]});
  });
  assert.equal(networkCalls,1);assert.equal(parsed[0].score,.87);assert.equal(parsed[0].name,'桂花');
});
console.log(`${passed} provider checks passed.`);
