// Script injetado nas páginas do projeto do usuário (somente no preview).
// Repassa erros do navegador ao painel do app via postMessage.
export const BRIDGE_SCRIPT = `(function(){
  var send=function(m){try{parent.postMessage(Object.assign({source:'codementor-preview'},m),'*')}catch(e){}};
  window.addEventListener('error',function(e){
    var t=e.target;
    if(t&&t!==window&&(t.src||t.href)){send({type:'error',message:'Falha ao carregar '+(t.src||t.href)});return}
    send({type:'error',message:String(e.message),file:e.filename,line:e.lineno,col:e.colno});
  },true);
  window.addEventListener('unhandledrejection',function(e){
    var r=e.reason;send({type:'error',message:'Promise rejeitada: '+((r&&r.message)||String(r))});
  });
  var ce=console.error;
  console.error=function(){send({type:'error',message:Array.prototype.map.call(arguments,String).join(' ')});return ce.apply(console,arguments)};
  window.addEventListener('load',function(){send({type:'loaded'})});
})();`
