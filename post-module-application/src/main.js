import './style.css';

const candidates = [
['AAPL','Core 10'],['ABNB','Core 10'],['ACGL','Core 10'],['ADSK','Core 10'],['AFL','Core 10'],
['AIG','Core 10'],['ALGN','Core 10'],['CEG','Core 10'],['CL','Core 10'],['COR','Core 10'],
['AEE','Expansion 5'],['AEP','Expansion 5'],['AES','Expansion 5'],['ATO','Expansion 5'],['BG','Expansion 5']
];
let state={screen:[],submittedWeights:[],referenceWeights:[],news:[],riskline:null,dataMode:'none',referenceDate:null};
let screening=false;

document.querySelector('#app').innerHTML = `
<main><h1>Diversified Quality & Defensive Growth</h1>
<p>Deterministic screen &rarr; equal-weight submitted portfolio &rarr; human review &rarr; LLM interpretation.</p>
<section class="card"><h2>Inputs</h2>
<label>Candidate tickers<textarea id="tickers" rows="3">${candidates.map(x=>x[0]).join(', ')}</textarea></label>
<div class="grid">
<label>RSI period<input id="rsiPeriod" type="number" value="14"></label>
<label>RSI threshold<input id="rsiThreshold" type="number" value="70"></label>
<label>MACD fast<input id="macdFast" type="number" value="12"></label>
<label>MACD slow<input id="macdSlow" type="number" value="26"></label>
<label>MACD signal<input id="macdSignal" type="number" value="9"></label>
<label>Twelve Data API key<input id="tdKey" type="password" autocomplete="off"></label>
<label>OpenRouter API key<input id="orKey" type="password" autocomplete="off"></label>
<label>newsdata.io API key (optional)<input id="newsKey" type="password" autocomplete="off"></label>
</div>
<label><input id="macro" type="checkbox" style="width:auto"> Include Riskline macro overlay</label>
<button id="screenBtn">Refresh Live Portfolio</button> <button id="demoBtn" class="secondary">Load Reference Demo</button><p id="loadStatus" class="small">The dashboard initializes on load with a clearly labeled reference demonstration. Live screening starts automatically as soon as a valid runtime Twelve Data key is available. Keys remain in memory only and are not stored.</p></section>
<section class="card"><h2>Human Review Surface</h2><div id="coverage">Run the screen first.</div><div id="screen"></div><div id="weights"></div><div id="news"></div><div id="macroPanel"></div>
<label><input id="reviewed" type="checkbox" style="width:auto" disabled> I have reviewed the surface</label>
<button id="generate" disabled>Generate Research Note</button></section>
<section class="card"><h2>LLM Executive Commentary</h2><div id="note" class="note">Not generated.</div></section></main>`;

const val=id=>document.getElementById(id).value;
const ema=(arr,p)=>{const k=2/(p+1); let out=[], prev=arr[0]; for(let x of arr){prev=x*k+prev*(1-k);out.push(prev)} return out};
function rsi(arr,p=14){if(arr.length<=p)return NaN;let gains=0,loss=0;for(let i=1;i<=p;i++){let d=arr[i]-arr[i-1];if(d>=0)gains+=d;else loss-=d}let ag=gains/p,al=loss/p;for(let i=p+1;i<arr.length;i++){let d=arr[i]-arr[i-1],g=Math.max(d,0),l=Math.max(-d,0);ag=(ag*(p-1)+g)/p;al=(al*(p-1)+l)/p}return al===0?100:100-(100/(1+ag/al))}
function macdHist(arr,fast,slow,signal){let ef=ema(arr,fast),es=ema(arr,slow),m=arr.map((_,i)=>ef[i]-es[i]),sig=ema(m,signal);return m[m.length-1]-sig[sig.length-1]}
function annVol(arr){let r=[];for(let i=1;i<arr.length;i++)r.push(arr[i]/arr[i-1]-1);let mean=r.reduce((a,b)=>a+b,0)/r.length;let v=r.reduce((a,b)=>a+(b-mean)**2,0)/(r.length-1);return Math.sqrt(v)*Math.sqrt(252)}
async function twelve(ticker,key){
 let u=`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(ticker)}&interval=1day&outputsize=120&apikey=${encodeURIComponent(key)}`;
 let res=await fetch(u); if(!res.ok){let error=new Error(`${ticker}: HTTP ${res.status}`);error.status=res.status;throw error} let j=await res.json();
 if(j.status==='error'||!j.values)throw new Error(`${ticker}: ${j.message||'no values'}`);
 return j.values.slice().reverse().map(x=>({date:x.datetime,close:+x.close,open:+x.open,high:+x.high,low:+x.low}));
}
const sleep=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
async function twelveWithRateLimitRetry(ticker,key){
 for(let attempt=0;attempt<3;attempt++){
   try{return await twelve(ticker,key)}
   catch(error){
     if(error.status!==429||attempt===2)throw error;
     document.getElementById('coverage').textContent=`Twelve Data rate limit reached while loading ${ticker}. Waiting for the next credit window...`;
     await sleep(65000);
   }
 }
}
function table(rows,heads,keys){return `<table><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr class="${r.pass===true?'pass':r.pass===false?'fail':''}">${keys.map(k=>`<td>${r[k]??''}</td>`).join('')}</tr>`).join('')}</tbody></table>`}
async function loadDemoReference(reason='Live market data is temporarily unavailable.'){
 const response=await fetch('./portfolio_summary.json');
 if(!response.ok)throw new Error(`Reference data HTTP ${response.status}`);
 const demo=await response.json();
 const survivorsByTicker=Object.fromEntries(demo.screen_survivors.map(item=>[item.ticker,item]));
 state.dataMode='reference_demo';state.referenceDate=demo.reference_date;state.news=[];state.riskline=null;
 state.screen=candidates.map(([ticker,group])=>{
   const survivor=survivorsByTicker[ticker];
   return {ticker,group,rsi:survivor?'Validated < 70':'—',macd_hist:survivor?'Validated > 0':'—',volatility:'Reference',pass:Boolean(survivor),status:survivor?'REFERENCE PASS':'REFERENCE FAIL'};
 });
 state.submittedWeights=demo.screen_survivors.map(item=>({ticker:item.ticker,weight:100*item.submitted_equal_weight}));
 state.referenceWeights=demo.screen_survivors.map(item=>({ticker:item.ticker,weight:100*item.reference_inverse_volatility_weight})).sort((a,b)=>b.weight-a.weight);
 document.getElementById('coverage').innerHTML=`<div class="demo-banner"><b>Reference demonstration mode — not current market data.</b><br>${reason} Results reproduce the validated ${demo.reference_date} example.</div>`;
 document.getElementById('screen').innerHTML='<h3>Reference screen results</h3>'+table(state.screen,['Ticker','Group','RSI rule','MACD rule','Data','Result'],['ticker','group','rsi','macd_hist','volatility','status']);
 document.getElementById('weights').innerHTML='<h3>Submitted portfolio: equal weight</h3><p class="small">Validated reference example. Equal weight is the official Finance-track submission.</p>'+table(state.submittedWeights.map(x=>({ticker:x.ticker,weight:x.weight.toFixed(1)+'%'})),['Ticker','Submitted weight'],['ticker','weight'])+'<h3>Monitoring reference: inverse volatility</h3><p class="small">Reference-only comparison; it does not replace the submitted equal-weight portfolio.</p>'+table(state.referenceWeights.map(x=>({ticker:x.ticker,weight:x.weight.toFixed(1)+'%'})),['Ticker','Reference weight'],['ticker','weight']);
 document.getElementById('news').innerHTML='';document.getElementById('macroPanel').innerHTML='';
 document.getElementById('reviewed').disabled=false;document.getElementById('reviewed').checked=false;document.getElementById('generate').disabled=true;
 document.getElementById('note').textContent='Not generated. Commentary will be labeled as reference-demo interpretation.';
 document.getElementById('loadStatus').textContent='Reference demonstration loaded. Enter a Twelve Data key to replace it with a live screen.';
}
async function fetchNews(key,survivors){
 if(!key||!survivors.length)return [];
 let q=survivors.join(' OR '), u=`https://newsdata.io/api/1/latest?apikey=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&language=en`;
 try{let r=await fetch(u);let j=await r.json();return (j.results||[]).slice(0,8).map(x=>({title:x.title,source:x.source_name||'',link:x.link||''}))}catch(e){return [{title:`News unavailable: ${e.message}`,source:'',link:''}]}
}
async function fetchRiskline(){
 try{let r=await fetch('https://api.riskline.com/alerts/latest.json'); if(!r.ok)throw new Error(`HTTP ${r.status}`); return await r.json()}catch(e){return {error:e.message}}
}
async function runScreen({silentMissingKey=false}={}){
 if(screening)return;
 const key=val('tdKey'); if(!key){if(!silentMissingKey)alert('Enter Twelve Data API key.');return}
 screening=true;
 const screenButton=document.getElementById('screenBtn');
 screenButton.disabled=true;
 screenButton.textContent='Loading live data...';
 const rp=+val('rsiPeriod'),rt=+val('rsiThreshold'),mf=+val('macdFast'),ms=+val('macdSlow'),msg=+val('macdSignal');
 const requested=val('tickers').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean);
 const group=Object.fromEntries(candidates);
 document.getElementById('coverage').textContent='Starting controlled live-price screen...'; state.screen=[];
 for(let index=0;index<requested.length;index++){
   const t=requested[index];
   document.getElementById('coverage').textContent=`Loading ${t} (${index+1} of ${requested.length})...`;
   try{let d=await twelveWithRateLimitRetry(t,key), closes=d.map(x=>x.close), rv=rsi(closes,rp), mh=macdHist(closes,mf,ms,msg), vol=annVol(closes), pass=rv<rt&&mh>0;
     state.screen.push({ticker:t,group:group[t]||'Custom',rsi:rv.toFixed(2),macd_hist:mh.toFixed(4),volatility:(100*vol).toFixed(2)+'%',vol_raw:vol,pass,status:pass?'PASS':'FAIL'});
   }catch(e){state.screen.push({ticker:t,group:group[t]||'Custom',rsi:'-',macd_hist:'-',volatility:'-',pass:false,status:'ERROR: '+e.message})}
 }
 if(state.screen.length&&state.screen.every(item=>String(item.status).startsWith('ERROR:'))){
   await loadDemoReference('All live requests failed or were blocked by the data provider.');
   screening=false;screenButton.disabled=false;screenButton.textContent='Retry Live Data';
   return;
 }
 state.dataMode='live';state.referenceDate=null;
 state.screen.sort((a,b)=>requested.indexOf(a.ticker)-requested.indexOf(b.ticker));
 const survivors=state.screen.filter(x=>x.pass);
 const equalWeight=survivors.length?100/survivors.length:0;
 const inverseVolDenominator=survivors.reduce((sum,x)=>sum+1/x.vol_raw,0);
 state.submittedWeights=survivors.map(x=>({ticker:x.ticker,weight:equalWeight}));
 state.referenceWeights=survivors.map(x=>({ticker:x.ticker,weight:100*(1/x.vol_raw)/inverseVolDenominator})).sort((a,b)=>b.weight-a.weight);
 document.getElementById('coverage').textContent=`Screened ${state.screen.length} of ${requested.length} candidates, ${survivors.length} passed.`;
 document.getElementById('screen').innerHTML='<h3>Screen results</h3>'+table(state.screen,['Ticker','Group','RSI','MACD hist.','Ann. vol.','Result'],['ticker','group','rsi','macd_hist','volatility','status']);
 document.getElementById('weights').innerHTML=survivors.length
   ? '<h3>Submitted portfolio: equal weight</h3><p class="small">Official Finance-track allocation. Each passing security receives the same weight.</p>'+
     table(state.submittedWeights.map(x=>({ticker:x.ticker,weight:x.weight.toFixed(1)+'%'})),['Ticker','Submitted weight'],['ticker','weight'])+
     '<h3>Monitoring reference: inverse volatility</h3><p class="small">Comparison only; this allocation is not submitted and does not replace the equal-weight portfolio.</p>'+
     table(state.referenceWeights.map(x=>({ticker:x.ticker,weight:x.weight.toFixed(1)+'%'})),['Ticker','Reference weight'],['ticker','weight'])
   : '<div class="warn">No security passed the screen, so no portfolio was formed.</div>';
 state.news=await fetchNews(val('newsKey'),survivors.map(x=>x.ticker));
 document.getElementById('news').innerHTML=state.news.length?'<h3>Optional news</h3><ul>'+state.news.map(n=>`<li>${n.title} <span class="small">${n.source}</span></li>`).join('')+'</ul>':'';
 state.riskline=document.getElementById('macro').checked?await fetchRiskline():null;
 document.getElementById('macroPanel').innerHTML=state.riskline?'<h3>Riskline overlay</h3><p class="small">Macro alerts loaded for human/LLM relevance review. They do not change weights.</p>':'';
 document.getElementById('reviewed').disabled=false; document.getElementById('reviewed').checked=false; document.getElementById('generate').disabled=true;
 document.getElementById('loadStatus').textContent=`Live prices refreshed at ${new Date().toLocaleTimeString()}. The runtime key remains in memory only.`;
 screening=false;
 screenButton.disabled=false;
 screenButton.textContent='Refresh Live Portfolio';
}
document.getElementById('screenBtn').onclick=()=>runScreen();
document.getElementById('demoBtn').onclick=()=>loadDemoReference('Reference mode selected manually.');

// GitHub Pages is public, so no financial-data credential is embedded in the build.
// The SPA still initializes on page load and immediately fetches live prices whenever
// a runtime key is already available (for example, browser autofill) or once the user
// supplies it. This preserves the assignment's on-load behavior without exposing a key.
let autoScreenTimer;
const tdKeyInput=document.getElementById('tdKey');
tdKeyInput.addEventListener('input',()=>{
 clearTimeout(autoScreenTimer);
 if(tdKeyInput.value.trim()) autoScreenTimer=setTimeout(()=>runScreen({silentMissingKey:true}),650);
});
tdKeyInput.addEventListener('keydown',event=>{
 if(event.key==='Enter'){event.preventDefault();clearTimeout(autoScreenTimer);runScreen();}
});
window.addEventListener('load',()=>{
 loadDemoReference('Dashboard initialized before a live-data key was supplied.').catch(error=>{document.getElementById('coverage').textContent='Reference demonstration unavailable: '+error.message});
 setTimeout(()=>{if(tdKeyInput.value.trim())runScreen({silentMissingKey:true});},250);
});
document.getElementById('reviewed').onchange=e=>document.getElementById('generate').disabled=!e.target.checked;

const schema={type:'object',properties:{summary:{type:'string'},top_conviction:{type:'string'},risks:{type:'array',items:{type:'string'},minItems:3,maxItems:3}},required:['summary','top_conviction','risks'],additionalProperties:false};
async function openRouter(key,system,user){
 let body={model:'anthropic/claude-sonnet-5',messages:[{role:'system',content:system},{role:'user',content:user}],response_format:{type:'json_schema',json_schema:{name:'portfolio_commentary',strict:true,schema}}};
 let r=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!r.ok)throw new Error(`OpenRouter HTTP ${r.status}: ${await r.text()}`); let j=await r.json(); return JSON.parse(j.choices[0].message.content);
}
document.getElementById('generate').onclick=async()=>{
 const key=val('orKey'); if(!key){alert('Enter OpenRouter API key.');return}
 const surface={
   data_mode:state.dataMode,
   reference_date:state.referenceDate,
   methodology:{submitted_portfolio:'equal weight among screen survivors',reference_only:'inverse-volatility comparison'},
   screen:state.screen,
   submitted_equal_weights:state.submittedWeights.map(x=>({ticker:x.ticker,weight_pct:+x.weight.toFixed(4)})),
   reference_inverse_volatility_weights:state.referenceWeights.map(x=>({ticker:x.ticker,weight_pct:+x.weight.toFixed(4)})),
   news:state.news
 };
 const system=`You are an investment research assistant. Interpret only the supplied finished calculations. The submitted portfolio is equal weighted among screen survivors. Inverse-volatility weights are reference-only. Never recompute RSI, MACD, volatility, or weights, and never confuse the reference allocation with the submitted portfolio. Be concise, skeptical, and suitable for an investment committee. If data_mode is reference_demo, explicitly state that the figures are the validated ${state.referenceDate||'reference-date'} demonstration and are not current market data.`;
 try{
   let note=await openRouter(key,system,JSON.stringify(surface));
   let html=`<b>Summary</b><br>${note.summary}<br><br><b>Top conviction</b><br>${note.top_conviction}<br><br><b>Risks</b><ol>${note.risks.map(x=>`<li>${x}</li>`).join('')}</ol>`;
   if(document.getElementById('macro').checked){
      let macro=await openRouter(key,'Flag only the relevance of the supplied macro alerts to the listed holdings. Never suggest or imply a weight change. Interpret finished evidence only.',JSON.stringify({survivors:state.submittedWeights.map(x=>x.ticker),riskline:state.riskline}));
      html+=`<hr><b>Macro relevance overlay</b><br>${macro.summary}<ol>${macro.risks.map(x=>`<li>${x}</li>`).join('')}</ol>`;
   }
   document.getElementById('note').innerHTML=html;
 }catch(e){document.getElementById('note').textContent='Generation failed: '+e.message}
};
