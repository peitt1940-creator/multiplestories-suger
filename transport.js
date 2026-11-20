/* GitHub Pages <-> GAS bridge. No account, password or signing secret belongs here. */
(function (global) {
  'use strict';
  const CHANNEL='sugar-studio-bridge-v1',METHODS=['studioLogin','studioApi','studioPublished','studioPublicImage'];
  function validUrl(value){try{let u=new URL(value);return u.origin==='https://script.google.com'&&/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u.pathname)&&!u.search&&!u.hash}catch(_){return false}}
  class StudioTransport {
    constructor(url){this.url=String(url||'').trim();this.frame=null;this.peer=null;this.peerOrigin='';this.channel='';this.connecting=null;this.pending=new Map();this.listener=event=>this.receive(event);global.addEventListener('message',this.listener)}
    isConfigured(){return validUrl(this.url)}
    receive(event){
      const m=event.data;if(!m||m.channel!==CHANNEL||m.nonce!==this.channel)return;
      // GAS wraps HtmlService in an additional Google-owned frame. The inner
      // frame announces itself using a fresh 256-bit nonce from our frame URL.
      if(m.type==='ready'){
        let u;try{u=new URL(event.origin)}catch(_){return}
        if(u.protocol!=='https:'||!(u.hostname==='script.google.com'||u.hostname.endsWith('.googleusercontent.com'))||!event.source||!this.frame)return;
        if(this.peer&&this.peer!==event.source)return;
        this.peer=event.source;this.peerOrigin=event.origin;this.readyResolve?.();return;
      }
      if(event.source!==this.peer||event.origin!==this.peerOrigin||m.type!=='result'||typeof m.id!=='string')return;
      const job=this.pending.get(m.id);if(!job)return;clearTimeout(job.timer);this.pending.delete(m.id);
      if(m.transportError)job.reject(Error(String(m.transportError)));else job.resolve(m.result);
    }
    connect(){
      if(this.peer)return Promise.resolve();if(this.connecting)return this.connecting;
      if(!this.isConfigured())return Promise.reject(Error('網站尚未設定後台連線，請老師檢查 config.js 的 GAS 網址。'));
      if(global.location.protocol!=='https:')return Promise.reject(Error('請從 GitHub Pages 的 https 網址開啟正式網站。'));
      let bytes=new Uint8Array(32);global.crypto.getRandomValues(bytes);this.channel=Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
      this.connecting=new Promise((resolve,reject)=>{
        let timer=setTimeout(()=>{this.reset();reject(Error('無法連上資料庫。請老師確認 GAS 已更新部署、允許任何人存取，且已設定正確的前端網址。'));},30000);
        this.readyResolve=()=>{clearTimeout(timer);this.readyResolve=null;resolve()};
        let frame=global.document.createElement('iframe');this.frame=frame;frame.setAttribute('aria-hidden','true');frame.title='故事資料連線';frame.style.cssText='position:fixed;left:-10000px;top:0;width:8px;height:8px;border:0;pointer-events:none';
        let url=new URL(this.url);url.searchParams.set('page','bridge');url.searchParams.set('parentOrigin',global.location.origin);url.searchParams.set('nonce',this.channel);frame.src=url.href;
        global.document.body.appendChild(frame);
      }).catch(e=>{this.connecting=null;throw e});return this.connecting;
    }
    reset(){this.frame?.remove();this.frame=null;this.peer=null;this.peerOrigin='';this.connecting=null;this.readyResolve=null;this.channel='';for(const job of this.pending.values()){clearTimeout(job.timer);job.reject(Error('後台連線已中斷，未送出的內容仍保留在草稿。'))}this.pending.clear()}
    async call(method,args){
      if(!METHODS.includes(method))throw Error('無法執行這項操作。');await this.connect();
      return new Promise((resolve,reject)=>{
        const id=global.crypto.randomUUID(),timer=setTimeout(()=>{this.pending.delete(id);reject(Error('後台回應較慢，尚未確認儲存結果。請保留草稿，稍後查看作品的最新版本。'));if(!this.pending.size)this.reset();},65000);
        this.pending.set(id,{resolve,reject,timer});
        try{this.peer.postMessage({channel:CHANNEL,nonce:this.channel,type:'call',id,method,args},this.peerOrigin)}catch(e){clearTimeout(timer);this.pending.delete(id);reject(e)}
      });
    }
  }
  global.StudioTransport=StudioTransport;global.studioTransport=new StudioTransport(global.STUDIO_CONFIG?.gasUrl);
})(window);
