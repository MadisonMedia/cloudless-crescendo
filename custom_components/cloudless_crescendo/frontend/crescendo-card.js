var U=globalThis,N=U.ShadowRoot&&(U.ShadyCSS===void 0||U.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,I=Symbol(),st=new WeakMap,S=class{constructor(t,e,i){if(this._$cssResult$=!0,i!==I)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o,e=this.t;if(N&&t===void 0){let i=e!==void 0&&e.length===1;i&&(t=st.get(e)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),i&&st.set(e,t))}return t}toString(){return this.cssText}},nt=n=>new S(typeof n=="string"?n:n+"",void 0,I),B=(n,...t)=>{let e=n.length===1?n[0]:t.reduce((i,s,r)=>i+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+n[r+1],n[0]);return new S(e,n,I)},rt=(n,t)=>{if(N)n.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let e of t){let i=document.createElement("style"),s=U.litNonce;s!==void 0&&i.setAttribute("nonce",s),i.textContent=e.cssText,n.appendChild(i)}},V=N?n=>n:n=>n instanceof CSSStyleSheet?(t=>{let e="";for(let i of t.cssRules)e+=i.cssText;return nt(e)})(n):n;var{is:kt,defineProperty:Rt,getOwnPropertyDescriptor:Ot,getOwnPropertyNames:Tt,getOwnPropertySymbols:Ht,getPrototypeOf:Ut}=Object,L=globalThis,ot=L.trustedTypes,Nt=ot?ot.emptyScript:"",Lt=L.reactiveElementPolyfillSupport,C=(n,t)=>n,W={toAttribute(n,t){switch(t){case Boolean:n=n?Nt:null;break;case Object:case Array:n=n==null?n:JSON.stringify(n)}return n},fromAttribute(n,t){let e=n;switch(t){case Boolean:e=n!==null;break;case Number:e=n===null?null:Number(n);break;case Object:case Array:try{e=JSON.parse(n)}catch{e=null}}return e}},ht=(n,t)=>!kt(n,t),at={attribute:!0,type:String,converter:W,reflect:!1,useDefault:!1,hasChanged:ht};Symbol.metadata??=Symbol("metadata"),L.litPropertyMetadata??=new WeakMap;var g=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=at){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){let i=Symbol(),s=this.getPropertyDescriptor(t,i,e);s!==void 0&&Rt(this.prototype,t,s)}}static getPropertyDescriptor(t,e,i){let{get:s,set:r}=Ot(this.prototype,t)??{get(){return this[e]},set(o){this[e]=o}};return{get:s,set(o){let a=s?.call(this);r?.call(this,o),this.requestUpdate(t,a,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??at}static _$Ei(){if(this.hasOwnProperty(C("elementProperties")))return;let t=Ut(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(C("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(C("properties"))){let e=this.properties,i=[...Tt(e),...Ht(e)];for(let s of i)this.createProperty(s,e[s])}let t=this[Symbol.metadata];if(t!==null){let e=litPropertyMetadata.get(t);if(e!==void 0)for(let[i,s]of e)this.elementProperties.set(i,s)}this._$Eh=new Map;for(let[e,i]of this.elementProperties){let s=this._$Eu(e,i);s!==void 0&&this._$Eh.set(s,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){let e=[];if(Array.isArray(t)){let i=new Set(t.flat(1/0).reverse());for(let s of i)e.unshift(V(s))}else t!==void 0&&e.push(V(t));return e}static _$Eu(t,e){let i=e.attribute;return i===!1?void 0:typeof i=="string"?i:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),this.renderRoot!==void 0&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){let t=new Map,e=this.constructor.elementProperties;for(let i of e.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t)}createRenderRoot(){let t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return rt(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,i){this._$AK(t,i)}_$ET(t,e){let i=this.constructor.elementProperties.get(t),s=this.constructor._$Eu(t,i);if(s!==void 0&&i.reflect===!0){let r=(i.converter?.toAttribute!==void 0?i.converter:W).toAttribute(e,i.type);this._$Em=t,r==null?this.removeAttribute(s):this.setAttribute(s,r),this._$Em=null}}_$AK(t,e){let i=this.constructor,s=i._$Eh.get(t);if(s!==void 0&&this._$Em!==s){let r=i.getPropertyOptions(s),o=typeof r.converter=="function"?{fromAttribute:r.converter}:r.converter?.fromAttribute!==void 0?r.converter:W;this._$Em=s;let a=o.fromAttribute(e,r.type);this[s]=a??this._$Ej?.get(s)??a,this._$Em=null}}requestUpdate(t,e,i,s=!1,r){if(t!==void 0){let o=this.constructor;if(s===!1&&(r=this[t]),i??=o.getPropertyOptions(t),!((i.hasChanged??ht)(r,e)||i.useDefault&&i.reflect&&r===this._$Ej?.get(t)&&!this.hasAttribute(o._$Eu(t,i))))return;this.C(t,e,i)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,e,{useDefault:i,reflect:s,wrapped:r},o){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,o??e??this[t]),r!==!0||o!==void 0)||(this._$AL.has(t)||(this.hasUpdated||i||(e=void 0),this._$AL.set(t,e)),s===!0&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[s,r]of this._$Ep)this[s]=r;this._$Ep=void 0}let i=this.constructor.elementProperties;if(i.size>0)for(let[s,r]of i){let{wrapped:o}=r,a=this[s];o!==!0||this._$AL.has(s)||a===void 0||this.C(s,void 0,r,a)}}let t=!1,e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(i=>i.hostUpdate?.()),this.update(e)):this._$EM()}catch(i){throw t=!1,this._$EM(),i}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(t){}firstUpdated(t){}};g.elementStyles=[],g.shadowRootOptions={mode:"open"},g[C("elementProperties")]=new Map,g[C("finalized")]=new Map,Lt?.({ReactiveElement:g}),(L.reactiveElementVersions??=[]).push("2.1.2");var Z=globalThis,ct=n=>n,D=Z.trustedTypes,lt=D?D.createPolicy("lit-html",{createHTML:n=>n}):void 0,gt="$lit$",v=`lit$${Math.random().toFixed(9).slice(2)}$`,_t="?"+v,Dt=`<${_t}>`,y=document,P=()=>y.createComment(""),k=n=>n===null||typeof n!="object"&&typeof n!="function",Q=Array.isArray,jt=n=>Q(n)||typeof n?.[Symbol.iterator]=="function",q=`[ 	
\f\r]`,M=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,dt=/-->/g,pt=/>/g,b=RegExp(`>|${q}(?:([^\\s"'>=/]+)(${q}*=${q}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),ut=/'/g,mt=/"/g,vt=/^(?:script|style|textarea|title)$/i,Y=n=>(t,...e)=>({_$litType$:n,strings:t,values:e}),m=Y(1),Qt=Y(2),Yt=Y(3),x=Symbol.for("lit-noChange"),p=Symbol.for("lit-nothing"),ft=new WeakMap,$=y.createTreeWalker(y,129);function bt(n,t){if(!Q(n)||!n.hasOwnProperty("raw"))throw Error("invalid template strings array");return lt!==void 0?lt.createHTML(t):t}var zt=(n,t)=>{let e=n.length-1,i=[],s,r=t===2?"<svg>":t===3?"<math>":"",o=M;for(let a=0;a<e;a++){let h=n[a],c,d,l=-1,u=0;for(;u<h.length&&(o.lastIndex=u,d=o.exec(h),d!==null);)u=o.lastIndex,o===M?d[1]==="!--"?o=dt:d[1]!==void 0?o=pt:d[2]!==void 0?(vt.test(d[2])&&(s=RegExp("</"+d[2],"g")),o=b):d[3]!==void 0&&(o=b):o===b?d[0]===">"?(o=s??M,l=-1):d[1]===void 0?l=-2:(l=o.lastIndex-d[2].length,c=d[1],o=d[3]===void 0?b:d[3]==='"'?mt:ut):o===mt||o===ut?o=b:o===dt||o===pt?o=M:(o=b,s=void 0);let f=o===b&&n[a+1].startsWith("/>")?" ":"";r+=o===M?h+Dt:l>=0?(i.push(c),h.slice(0,l)+gt+h.slice(l)+v+f):h+v+(l===-2?a:f)}return[bt(n,r+(n[e]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),i]},R=class n{constructor({strings:t,_$litType$:e},i){let s;this.parts=[];let r=0,o=0,a=t.length-1,h=this.parts,[c,d]=zt(t,e);if(this.el=n.createElement(c,i),$.currentNode=this.el.content,e===2||e===3){let l=this.el.content.firstChild;l.replaceWith(...l.childNodes)}for(;(s=$.nextNode())!==null&&h.length<a;){if(s.nodeType===1){if(s.hasAttributes())for(let l of s.getAttributeNames())if(l.endsWith(gt)){let u=d[o++],f=s.getAttribute(l).split(v),H=/([.?@])?(.*)/.exec(u);h.push({type:1,index:r,name:H[2],strings:f,ctor:H[1]==="."?K:H[1]==="?"?G:H[1]==="@"?J:E}),s.removeAttribute(l)}else l.startsWith(v)&&(h.push({type:6,index:r}),s.removeAttribute(l));if(vt.test(s.tagName)){let l=s.textContent.split(v),u=l.length-1;if(u>0){s.textContent=D?D.emptyScript:"";for(let f=0;f<u;f++)s.append(l[f],P()),$.nextNode(),h.push({type:2,index:++r});s.append(l[u],P())}}}else if(s.nodeType===8)if(s.data===_t)h.push({type:2,index:r});else{let l=-1;for(;(l=s.data.indexOf(v,l+1))!==-1;)h.push({type:7,index:r}),l+=v.length-1}r++}}static createElement(t,e){let i=y.createElement("template");return i.innerHTML=t,i}};function w(n,t,e=n,i){if(t===x)return t;let s=i!==void 0?e._$Co?.[i]:e._$Cl,r=k(t)?void 0:t._$litDirective$;return s?.constructor!==r&&(s?._$AO?.(!1),r===void 0?s=void 0:(s=new r(n),s._$AT(n,e,i)),i!==void 0?(e._$Co??=[])[i]=s:e._$Cl=s),s!==void 0&&(t=w(n,s._$AS(n,t.values),s,i)),t}var F=class{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){let{el:{content:e},parts:i}=this._$AD,s=(t?.creationScope??y).importNode(e,!0);$.currentNode=s;let r=$.nextNode(),o=0,a=0,h=i[0];for(;h!==void 0;){if(o===h.index){let c;h.type===2?c=new O(r,r.nextSibling,this,t):h.type===1?c=new h.ctor(r,h.name,h.strings,this,t):h.type===6&&(c=new X(r,this,t)),this._$AV.push(c),h=i[++a]}o!==h?.index&&(r=$.nextNode(),o++)}return $.currentNode=y,s}p(t){let e=0;for(let i of this._$AV)i!==void 0&&(i.strings!==void 0?(i._$AI(t,i,e),e+=i.strings.length-2):i._$AI(t[e])),e++}},O=class n{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,i,s){this.type=2,this._$AH=p,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=i,this.options=s,this._$Cv=s?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode,e=this._$AM;return e!==void 0&&t?.nodeType===11&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=w(this,t,e),k(t)?t===p||t==null||t===""?(this._$AH!==p&&this._$AR(),this._$AH=p):t!==this._$AH&&t!==x&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):jt(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==p&&k(this._$AH)?this._$AA.nextSibling.data=t:this.T(y.createTextNode(t)),this._$AH=t}$(t){let{values:e,_$litType$:i}=t,s=typeof i=="number"?this._$AC(t):(i.el===void 0&&(i.el=R.createElement(bt(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===s)this._$AH.p(e);else{let r=new F(s,this),o=r.u(this.options);r.p(e),this.T(o),this._$AH=r}}_$AC(t){let e=ft.get(t.strings);return e===void 0&&ft.set(t.strings,e=new R(t)),e}k(t){Q(this._$AH)||(this._$AH=[],this._$AR());let e=this._$AH,i,s=0;for(let r of t)s===e.length?e.push(i=new n(this.O(P()),this.O(P()),this,this.options)):i=e[s],i._$AI(r),s++;s<e.length&&(this._$AR(i&&i._$AB.nextSibling,s),e.length=s)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){let i=ct(t).nextSibling;ct(t).remove(),t=i}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}},E=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,i,s,r){this.type=1,this._$AH=p,this._$AN=void 0,this.element=t,this.name=e,this._$AM=s,this.options=r,i.length>2||i[0]!==""||i[1]!==""?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=p}_$AI(t,e=this,i,s){let r=this.strings,o=!1;if(r===void 0)t=w(this,t,e,0),o=!k(t)||t!==this._$AH&&t!==x,o&&(this._$AH=t);else{let a=t,h,c;for(t=r[0],h=0;h<r.length-1;h++)c=w(this,a[i+h],e,h),c===x&&(c=this._$AH[h]),o||=!k(c)||c!==this._$AH[h],c===p?t=p:t!==p&&(t+=(c??"")+r[h+1]),this._$AH[h]=c}o&&!s&&this.j(t)}j(t){t===p?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}},K=class extends E{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===p?void 0:t}},G=class extends E{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==p)}},J=class extends E{constructor(t,e,i,s,r){super(t,e,i,s,r),this.type=5}_$AI(t,e=this){if((t=w(this,t,e,0)??p)===x)return;let i=this._$AH,s=t===p&&i!==p||t.capture!==i.capture||t.once!==i.once||t.passive!==i.passive,r=t!==p&&(i===p||s);s&&this.element.removeEventListener(this.name,this,i),r&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}},X=class{constructor(t,e,i){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(t){w(this,t)}};var It=Z.litHtmlPolyfillSupport;It?.(R,O),(Z.litHtmlVersions??=[]).push("3.3.3");var $t=(n,t,e)=>{let i=e?.renderBefore??t,s=i._$litPart$;if(s===void 0){let r=e?.renderBefore??null;i._$litPart$=s=new O(t.insertBefore(P(),r),r,void 0,e??{})}return s._$AI(n),s};var tt=globalThis,_=class extends g{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){let e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=$t(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return x}};_._$litElement$=!0,_.finalized=!0,tt.litElementHydrateSupport?.({LitElement:_});var Bt=tt.litElementPolyfillSupport;Bt?.({LitElement:_});(tt.litElementVersions??=[]).push("4.2.2");var j="cloudless_crescendo",At=(n,t,e=101)=>n.callWS({type:`${j}/room/curve`,samples:e,...t});function Vt(n,t){let e=n.length-1,i=Math.max(0,Math.min(1,t/100))*e,s=Math.min(e-1,Math.floor(i)),r=i-s,o=n[s],a=n[Math.min(e,s+1)];return o.map((h,c)=>h+(a[c]-h)*r)}var yt=[28,29,36];function Wt(n,t,e){let i=0,s=[0,0,0];for(let c of Object.values(n.lights)){let[d,l,u,f]=Vt(c,t);i+=d,s[0]+=l*d,s[1]+=u*d,s[2]+=f*d}if(i<=.01)return xt(yt);let r=Math.max(s[0],s[1],s[2],1e-6),o=s.map(c=>c/r*255),h=.25+.75*Math.pow(Math.min(1,i/Math.max(1,e)),.35);return xt(yt.map((c,d)=>c+(o[d]-c)*h))}function qt(n){let t=Object.values(n.lights),e=1;for(let i=0;i<n.samples;i++){let s=0;for(let r of t)s+=r[i][0];e=Math.max(e,s)}return e}function wt(n){let t=qt(n),e=[];for(let i=0;i<=100;i+=2.5)e.push(`${Wt(n,i,t)} ${i}%`);return`linear-gradient(90deg, ${e.join(", ")})`}function Et(n){let t=[],e=Math.max(1,Math.round((n.length-1)/40));for(let a=0;a<n.length;a+=e){let[h,c,d,l]=n[a],u=a/(n.length-1)*100;t.push(`rgba(${c}, ${d}, ${l}, ${(.12+.88*(h/100)).toFixed(3)}) ${u.toFixed(1)}%`)}let[i,s,r,o]=n[n.length-1];return t.push(`rgba(${s}, ${r}, ${o}, ${(.12+.88*(i/100)).toFixed(3)}) 100%`),`linear-gradient(90deg, ${t.join(", ")})`}var xt=n=>`rgb(${Math.round(n[0])}, ${Math.round(n[1])}, ${Math.round(n[2])})`;function et(n,t){let e=Math.max(0,Math.round(n)),i=t.startsWith("de");if(e<60)return i?`${e} s`:`${e} s`;let s=Math.round(e/60);if(s<60)return`${s} min`;let r=Math.floor(s/60),o=s%60;return o?`${r} h ${o} min`:`${r} h`}function it(n){return n?.locale?.language??n?.language??"en"}function A(n,t){return it(n).startsWith("de")?t.de:t.en}function St(n,t){let e=0,i,s,r=()=>{if(e=performance.now(),i=void 0,s){let a=s;s=void 0,n(...a)}},o=(...a)=>{s=a;let h=t-(performance.now()-e);h<=0?r():i===void 0&&(i=window.setTimeout(r,h))};return o.cancel=()=>{i!==void 0&&window.clearTimeout(i),i=void 0,s=void 0},o}var Ft=300,Ct=.4,Mt=1.5,T=class extends _{constructor(){super(...arguments);this._gradient="";this._lanes=[];this._moved=!1;this._received=0;this._frame=0;this._width=320;this._sendLive=St(e=>{this._fadeTo(e,Ct)},Ft)}setConfig(e){if(!e?.entity)throw new Error("Please choose a Crescendo room (entity).");this._config={show_lanes:!0,live:!0,...e}}static getConfigElement(){return document.createElement("crescendo-card-editor")}static getStubConfig(e){return{entity:Object.values(e.states).find(s=>s.entity_id.startsWith("light.")&&"curve_id"in s.attributes)?.entity_id??""}}getCardSize(){return this._config?.show_lanes?4:3}getGridOptions(){return{columns:12,min_columns:6,min_rows:3}}connectedCallback(){super.connectedCallback(),this._resize=new ResizeObserver(e=>{this._width=e[0]?.contentRect.width??this._width}),this._resize.observe(this)}disconnectedCallback(){super.disconnectedCallback(),this._resize?.disconnect(),this._sendLive.cancel(),this._raf&&cancelAnimationFrame(this._raf),this._raf=void 0}willUpdate(e){if(!e.has("hass")||!this.hass||!this._config)return;let i=this.hass.states[this._config.entity];if(i!==this._stateObj){this._stateObj=i,this._received=performance.now();let s=i?.attributes.curve_id;i&&s!==this._curveId&&(this._curveId=s,this._loadCurve()),i?.attributes.fading&&this._animate()}}async _loadCurve(){if(!(!this.hass||!this._config))try{let e=await At(this.hass,{entity_id:this._config.entity});this._gradient=wt(e),this._lanes=Object.entries(e.lights).map(([i,s])=>[i,Et(s)]),this._curve=e}catch(e){console.warn("Crescendo: could not load curve",e)}}_animate(){if(this._raf)return;let e=()=>{this._raf=void 0,this._frame++,this._stateObj?.attributes.fading&&(this._raf=requestAnimationFrame(e))};this._raf=requestAnimationFrame(e)}get _statePosition(){let e=this._stateObj?.attributes??{},i=Number(e.position??0);if(!e.fading)return i;let s=Number(e.target_position??i),r=Number(e.fade_remaining??0);if(r<=0)return s;let o=(performance.now()-this._received)/1e3;return i+(s-i)*Math.min(1,o/r)}get _position(){if(this._drag!==void 0)return this._drag;let e=this._statePosition;if(this._pending){let i=this._stateObj?.attributes??{},s=i.fading?Number(i.target_position):e;if(Math.abs(s-this._pending.position)<.6||performance.now()>this._pending.until)this._pending=void 0;else return this._pending.position}return e}_fadeTo(e,i){if(!this.hass||!this._config)return;let s={position:Math.round(e*10)/10};i!==void 0&&(s.duration=i),this.hass.callService(j,"fade_to",s,{entity_id:this._config.entity})}_positionFromEvent(e){let i=this.renderRoot.querySelector(".score");if(!i)return 0;let s=i.getBoundingClientRect();return Math.max(0,Math.min(100,(e.clientX-s.left)/s.width*100))}_onPointerDown(e){e.button===0&&(e.currentTarget.setPointerCapture(e.pointerId),this._moved=!1,this._drag=this._positionFromEvent(e))}_onPointerMove(e){if(this._drag===void 0)return;let i=this._positionFromEvent(e);Math.abs(i-this._drag)>.2&&(this._moved=!0),this._drag=i,this._moved&&this._config?.live&&this._sendLive(i)}_onPointerUp(){if(this._drag===void 0)return;let e=this._drag,i=this._curve?.steps.find(r=>Math.abs(r.position-e)<=Mt);i&&(e=i.position),e<Mt&&(e=0),this._sendLive.cancel(),this._drag=void 0,this._pending={position:e,until:performance.now()+2500};let s=this._moved&&this._config?.live;this._fadeTo(e,s?Ct:this._config?.step_duration)}_onKeyDown(e){let i={ArrowRight:1,ArrowUp:1,ArrowLeft:-1,ArrowDown:-1},s=this._position;if(e.key in i)s+=i[e.key]*(e.shiftKey?10:1);else if(e.key==="PageUp")s+=10;else if(e.key==="PageDown")s-=10;else if(e.key==="Home")s=0;else if(e.key==="End")s=100;else return;e.preventDefault(),s=Math.max(0,Math.min(100,Math.round(s))),this._pending={position:s,until:performance.now()+2500},this._fadeTo(s,.5),this.requestUpdate()}_toggle(){if(!this.hass||!this._config)return;let e=this._stateObj?.state==="on";this.hass.callService("light",e?"turn_off":"turn_on",{},{entity_id:this._config.entity})}_status(e){let i=this._stateObj?.attributes??{},s=it(this.hass);if(i.fading&&this._drag===void 0&&!this._pending){let o=Math.round(Number(i.target_position)),a=Number(i.fade_remaining??0)-(performance.now()-this._received)/1e3;if(a>3)return A(this.hass,{en:`to ${o} %, ${et(a,s)} left`,de:`auf ${o} %, noch ${et(a,s)}`})}return e<.5?A(this.hass,{en:"Off",de:"Aus"}):this._curve?.steps.find(o=>Math.abs(o.position-e)<.6)?.name??""}_stepLabels(){let e=this._curve?.steps??[],i=72/Math.max(160,this._width)*100,s=-1/0;return e.map(r=>{let o=!!r.name&&r.position-s>=i&&r.position<=100-i/3;return o&&(s=r.position),m`<button
        class="step ${o?"named":""}"
        style="left: ${r.position}%"
        title=${r.name??`${r.position} %`}
        @click=${()=>{this._pending={position:r.position,until:performance.now()+2500},this._fadeTo(r.position,this._config?.step_duration)}}
      >
        <span class="tick"></span>${o?m`<span class="label">${r.name}</span>`:p}
      </button>`})}render(){if(!this._config||!this.hass)return p;let e=this._stateObj;if(!e)return m`<ha-card><div class="missing">
        ${A(this.hass,{en:"Room not found:",de:"Raum nicht gefunden:"})} ${this._config.entity}
      </div></ha-card>`;this._frame;let i=this._position,s=this._config.name??e.attributes.friendly_name??this._config.entity,r=e.state==="on",o=e.state==="unavailable";return m`
      <ha-card class=${o?"unavailable":""}>
        <div class="head">
          <div class="name">${s}</div>
          <button
            class="power ${r?"on":""}"
            @click=${this._toggle}
            aria-label=${r?A(this.hass,{en:"Turn off",de:"Ausschalten"}):A(this.hass,{en:"Turn on",de:"Einschalten"})}
          >
            <ha-icon icon="mdi:power"></ha-icon>
          </button>
        </div>
        <div class="readout">
          <span class="value">${Math.round(i)}</span><span class="unit">%</span>
          <span class="status">${this._status(i)}</span>
        </div>
        <div
          class="score ${this._drag!==void 0?"dragging":""}"
          role="slider"
          tabindex="0"
          aria-label=${s}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow=${Math.round(i)}
          @pointerdown=${this._onPointerDown}
          @pointermove=${this._onPointerMove}
          @pointerup=${this._onPointerUp}
          @pointercancel=${this._onPointerUp}
          @keydown=${this._onKeyDown}
        >
          <div class="ribbon" style="background: ${this._gradient||"var(--divider-color)"}">
            <div class="veil" style="left: ${i}%"></div>
          </div>
          ${this._config.show_lanes&&this._lanes.length?m`<div class="lanes">
                ${this._lanes.map(([a,h])=>m`<div class="lane" title=${this.hass?.states[a]?.attributes.friendly_name??a}>
                      <div class="lane-fill" style="background: ${h}"></div>
                      <div class="veil" style="left: ${i}%"></div>
                    </div>`)}
              </div>`:p}
          <div class="playhead" style="left: ${i}%"><div class="knob"></div></div>
        </div>
        <div class="steps">${this._stepLabels()}</div>
        ${this._config.buttons?.length?m`<div class="buttons">
              ${this._config.buttons.map(a=>m`<button
                  class="chip"
                  @click=${()=>{this._pending={position:a.position,until:performance.now()+2500},this._fadeTo(a.position,a.duration??this._config?.step_duration)}}
                >
                  ${a.icon?m`<ha-icon .icon=${a.icon}></ha-icon>`:p}
                  <span>${a.name??`${a.position} %`}</span>
                </button>`)}
            </div>`:p}
      </ha-card>
    `}};T.properties={hass:{attribute:!1},_config:{state:!0},_curve:{state:!0},_drag:{state:!0},_frame:{state:!0},_width:{state:!0}},T.styles=B`
    :host {
      --crescendo-radius: 14px;
      display: block;
    }
    ha-card {
      padding: 16px 16px 12px;
      overflow: hidden;
    }
    ha-card.unavailable {
      opacity: 0.5;
      pointer-events: none;
    }
    .missing {
      color: var(--error-color, #db4437);
      padding: 8px 0;
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .name {
      font-size: 1rem;
      font-weight: 500;
      color: var(--primary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    button {
      font: inherit;
      color: inherit;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
    }
    button:focus-visible,
    .score:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 3px;
    }
    .power {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: var(--secondary-text-color);
      background: var(--secondary-background-color, rgba(127, 127, 127, 0.12));
      transition: background-color 180ms, color 180ms;
      flex: none;
    }
    .power.on {
      color: var(--text-primary-color, #fff);
      background: var(--primary-color);
    }
    .readout {
      display: flex;
      align-items: baseline;
      gap: 2px;
      margin: 2px 0 12px;
      min-height: 48px;
    }
    .value {
      font-size: 2.75rem;
      font-weight: 300;
      line-height: 1;
      letter-spacing: -0.03em;
      font-variant-numeric: tabular-nums;
      color: var(--primary-text-color);
    }
    .unit {
      font-size: 1rem;
      color: var(--secondary-text-color);
      margin-right: 12px;
    }
    .status {
      font-size: 0.9rem;
      color: var(--secondary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .score {
      position: relative;
      touch-action: pan-y;
      user-select: none;
      -webkit-user-select: none;
      cursor: ew-resize;
      border-radius: var(--crescendo-radius);
    }
    .ribbon {
      position: relative;
      height: 52px;
      border-radius: var(--crescendo-radius);
      overflow: hidden;
      box-shadow: inset 0 0 0 1px rgba(127, 127, 127, 0.18);
    }
    .veil {
      position: absolute;
      top: 0;
      bottom: 0;
      right: 0;
      background: color-mix(in srgb, var(--card-background-color, #fff) 72%, transparent);
      pointer-events: none;
    }
    .lanes {
      display: grid;
      gap: 3px;
      margin-top: 6px;
    }
    .lane {
      position: relative;
      height: 5px;
      border-radius: 3px;
      overflow: hidden;
      background: rgba(127, 127, 127, 0.16);
    }
    .lane-fill {
      position: absolute;
      inset: 0;
    }
    .playhead {
      position: absolute;
      top: -4px;
      bottom: -4px;
      width: 4px;
      margin-left: -2px;
      border-radius: 2px;
      background: #fff;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4);
      pointer-events: none;
    }
    .knob {
      position: absolute;
      top: 15px;
      left: 50%;
      width: 18px;
      height: 30px;
      margin-left: -9px;
      border-radius: 9px;
      background: #fff;
      box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.35),
        0 2px 6px rgba(0, 0, 0, 0.3);
    }
    .score.dragging .knob {
      transform: scale(1.12);
    }
    .steps {
      position: relative;
      height: 30px;
      margin: 2px 4px 0;
    }
    .step {
      position: absolute;
      top: 0;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 24px;
      height: 30px;
      color: var(--secondary-text-color);
    }
    .tick {
      width: 2px;
      height: 6px;
      border-radius: 1px;
      background: var(--secondary-text-color);
      opacity: 0.6;
    }
    .label {
      margin-top: 3px;
      font-size: 0.75rem;
      white-space: nowrap;
    }
    .step:hover .label,
    .step:hover .tick {
      color: var(--primary-text-color);
      opacity: 1;
    }
    .buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 6px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 12px;
      border-radius: 16px;
      background: var(--secondary-background-color, rgba(127, 127, 127, 0.12));
      color: var(--primary-text-color);
      font-size: 0.875rem;
    }
    .chip ha-icon {
      --mdc-icon-size: 18px;
    }
    @media (prefers-reduced-motion: reduce) {
      .power {
        transition: none;
      }
    }
  `;var z=class extends _{constructor(){super(...arguments);this._label=e=>{let i={entity:{en:"Room",de:"Raum"},name:{en:"Name",de:"Name"},show_lanes:{en:"Show each light",de:"Einzelne Leuchten zeigen"},live:{en:"Lights follow while dragging",de:"Leuchten folgen beim Ziehen"},step_duration:{en:"Fade time for steps (empty = room default)",de:"\xDCberblendzeit f\xFCr Stufen (leer = Raumstandard)"}};return i[e.name]?A(this.hass,i[e.name]):e.name}}setConfig(e){this._config=e}get _schema(){return[{name:"entity",required:!0,selector:{entity:{filter:{integration:j,domain:"light"}}}},{name:"name",selector:{text:{}}},{type:"grid",name:"",schema:[{name:"show_lanes",selector:{boolean:{}}},{name:"live",selector:{boolean:{}}}]},{name:"step_duration",selector:{number:{min:0,max:600,step:.5,mode:"box",unit_of_measurement:"s"}}}]}render(){return!this.hass||!this._config?p:m`<ha-form
      .hass=${this.hass}
      .data=${{show_lanes:!0,live:!0,...this._config}}
      .schema=${this._schema}
      .computeLabel=${this._label}
      @value-changed=${this._changed}
    ></ha-form>`}_changed(e){let i={...e.detail.value};(i.step_duration===void 0||i.step_duration==="")&&delete i.step_duration,this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:i},bubbles:!0,composed:!0}))}};z.properties={hass:{attribute:!1},_config:{state:!0}};function Kt(){customElements.get("crescendo-card")||customElements.define("crescendo-card",T),customElements.get("crescendo-card-editor")||customElements.define("crescendo-card-editor",z);let n=window;n.customCards=n.customCards??[],n.customCards.some(t=>t.type==="crescendo-card")||n.customCards.push({type:"crescendo-card",name:"Crescendo",description:"One slider for a whole room, with staggered dimming curves.",preview:!0,documentationURL:"https://github.com/MadisonMedia/cloudless-crescendo"})}function Pt(n=0){if(!!(customElements.get("home-assistant")||customElements.get("hui-view"))||n>600){Kt();return}window.setTimeout(()=>Pt(n+1),50)}Pt();
