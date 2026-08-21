/**
 * Runs before React hydrates so failures in Next's bootstrap chunks can still
 * be recovered. Keep this as plain ES5-compatible JavaScript: it is injected
 * verbatim into the document head.
 */
export const chunkRecoveryScript = `(function(){
var busy=false,key='animesice:chunk-recovery',max=2,windowMs=30000,healthyMs=10000;
var pattern=/loading chunk|loading css chunk|failed to fetch dynamically imported module|importing a module script failed|chunkloaderror|loadingchunkerror/i;
function exhausted(){window.__ANIMESICE_CHUNK_RECOVERY_EXHAUSTED__=true;window.dispatchEvent(new Event('animesice:chunk-recovery-exhausted'))}
function recover(value,asset){
  var text=((value&&value.message)||'')+' '+((value&&value.name)||'');
  if(!asset&&!pattern.test(text))return;
  if(busy)return;
  busy=true;
  try{
    var now=Date.now(),state=JSON.parse(sessionStorage.getItem(key)||'null');
    if(!state||now-state.startedAt>windowMs)state={startedAt:now,attempts:0};
    if(state.attempts>=max){exhausted();return}
    state.attempts+=1;
    sessionStorage.setItem(key,JSON.stringify(state));
    var url=state.attempts===max&&location.pathname!=='/'?new URL('/',location.origin):new URL(location.href);
    url.searchParams.set('__chunk_retry',String(now));
    location.replace(url.href);
  }catch(error){exhausted()}
}
window.addEventListener('error',function(event){
  var target=event.target;
  var source=target&&(target.tagName==='SCRIPT'?target.src:(target.tagName==='LINK'&&target.rel==='stylesheet'?target.href:''));
  var asset=typeof source==='string'&&source.indexOf('/_next/static/')!==-1;
  recover(event.error||event,asset);
},true);
window.addEventListener('unhandledrejection',function(event){recover(event.reason,false)});
window.addEventListener('animesice:chunk-error',function(){recover({name:'ChunkLoadError'},false)});
setTimeout(function(){
  if(busy)return;
  try{
    sessionStorage.removeItem(key);
    var clean=new URL(location.href);
    if(clean.searchParams.has('__chunk_retry')){
      clean.searchParams.delete('__chunk_retry');
      history.replaceState(history.state,'',clean.href);
    }
  }catch(error){}
},healthyMs);
})();`;
