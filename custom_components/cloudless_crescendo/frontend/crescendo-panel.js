var D=globalThis,j=D.ShadowRoot&&(D.ShadyCSS===void 0||D.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,B=Symbol(),rt=new WeakMap,R=class{constructor(e,t,i){if(this._$cssResult$=!0,i!==B)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,t=this.t;if(j&&e===void 0){let i=t!==void 0&&t.length===1;i&&(e=rt.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),i&&rt.set(t,e))}return e}toString(){return this.cssText}},ot=n=>new R(typeof n=="string"?n:n+"",void 0,B),F=(n,...e)=>{let t=n.length===1?n[0]:e.reduce((i,s,o)=>i+(r=>{if(r._$cssResult$===!0)return r.cssText;if(typeof r=="number")return r;throw Error("Value passed to 'css' function must be a 'css' function result: "+r+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+n[o+1],n[0]);return new R(t,n,B)},nt=(n,e)=>{if(j)n.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(let t of e){let i=document.createElement("style"),s=D.litNonce;s!==void 0&&i.setAttribute("nonce",s),i.textContent=t.cssText,n.appendChild(i)}},K=j?n=>n:n=>n instanceof CSSStyleSheet?(e=>{let t="";for(let i of e.cssRules)t+=i.cssText;return ot(t)})(n):n;var{is:Tt,defineProperty:Lt,getOwnPropertyDescriptor:Nt,getOwnPropertyNames:Ht,getOwnPropertySymbols:Ot,getPrototypeOf:Ut}=Object,I=globalThis,at=I.trustedTypes,zt=at?at.emptyScript:"",Dt=I.reactiveElementPolyfillSupport,P=(n,e)=>n,V={toAttribute(n,e){switch(e){case Boolean:n=n?zt:null;break;case Object:case Array:n=n==null?n:JSON.stringify(n)}return n},fromAttribute(n,e){let t=n;switch(e){case Boolean:t=n!==null;break;case Number:t=n===null?null:Number(n);break;case Object:case Array:try{t=JSON.parse(n)}catch{t=null}}return t}},ht=(n,e)=>!Tt(n,e),lt={attribute:!0,type:String,converter:V,reflect:!1,useDefault:!1,hasChanged:ht};Symbol.metadata??=Symbol("metadata"),I.litPropertyMetadata??=new WeakMap;var _=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=lt){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let i=Symbol(),s=this.getPropertyDescriptor(e,i,t);s!==void 0&&Lt(this.prototype,e,s)}}static getPropertyDescriptor(e,t,i){let{get:s,set:o}=Nt(this.prototype,e)??{get(){return this[t]},set(r){this[t]=r}};return{get:s,set(r){let l=s?.call(this);o?.call(this,r),this.requestUpdate(e,l,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??lt}static _$Ei(){if(this.hasOwnProperty(P("elementProperties")))return;let e=Ut(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(P("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(P("properties"))){let t=this.properties,i=[...Ht(t),...Ot(t)];for(let s of i)this.createProperty(s,t[s])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[i,s]of t)this.elementProperties.set(i,s)}this._$Eh=new Map;for(let[t,i]of this.elementProperties){let s=this._$Eu(t,i);s!==void 0&&this._$Eh.set(s,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let i=new Set(e.flat(1/0).reverse());for(let s of i)t.unshift(K(s))}else e!==void 0&&t.push(K(e));return t}static _$Eu(e,t){let i=t.attribute;return i===!1?void 0:typeof i=="string"?i:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=new Map,t=this.constructor.elementProperties;for(let i of t.keys())this.hasOwnProperty(i)&&(e.set(i,this[i]),delete this[i]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return nt(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,i){this._$AK(e,i)}_$ET(e,t){let i=this.constructor.elementProperties.get(e),s=this.constructor._$Eu(e,i);if(s!==void 0&&i.reflect===!0){let o=(i.converter?.toAttribute!==void 0?i.converter:V).toAttribute(t,i.type);this._$Em=e,o==null?this.removeAttribute(s):this.setAttribute(s,o),this._$Em=null}}_$AK(e,t){let i=this.constructor,s=i._$Eh.get(e);if(s!==void 0&&this._$Em!==s){let o=i.getPropertyOptions(s),r=typeof o.converter=="function"?{fromAttribute:o.converter}:o.converter?.fromAttribute!==void 0?o.converter:V;this._$Em=s;let l=r.fromAttribute(t,o.type);this[s]=l??this._$Ej?.get(s)??l,this._$Em=null}}requestUpdate(e,t,i,s=!1,o){if(e!==void 0){let r=this.constructor;if(s===!1&&(o=this[e]),i??=r.getPropertyOptions(e),!((i.hasChanged??ht)(o,t)||i.useDefault&&i.reflect&&o===this._$Ej?.get(e)&&!this.hasAttribute(r._$Eu(e,i))))return;this.C(e,t,i)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,t,{useDefault:i,reflect:s,wrapped:o},r){i&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,r??t??this[e]),o!==!0||r!==void 0)||(this._$AL.has(e)||(this.hasUpdated||i||(t=void 0),this._$AL.set(e,t)),s===!0&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[s,o]of this._$Ep)this[s]=o;this._$Ep=void 0}let i=this.constructor.elementProperties;if(i.size>0)for(let[s,o]of i){let{wrapped:r}=o,l=this[s];r!==!0||this._$AL.has(s)||l===void 0||this.C(s,void 0,o,l)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(i=>i.hostUpdate?.()),this.update(t)):this._$EM()}catch(i){throw e=!1,this._$EM(),i}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(e){}firstUpdated(e){}};_.elementStyles=[],_.shadowRootOptions={mode:"open"},_[P("elementProperties")]=new Map,_[P("finalized")]=new Map,Dt?.({ReactiveElement:_}),(I.reactiveElementVersions??=[]).push("2.1.2");var Y=globalThis,dt=n=>n,W=Y.trustedTypes,pt=W?W.createPolicy("lit-html",{createHTML:n=>n}):void 0,vt="$lit$",f=`lit$${Math.random().toFixed(9).slice(2)}$`,ft="?"+f,jt=`<${ft}>`,x=document,L=()=>x.createComment(""),N=n=>n===null||typeof n!="object"&&typeof n!="function",tt=Array.isArray,It=n=>tt(n)||typeof n?.[Symbol.iterator]=="function",q=`[ 	
\f\r]`,T=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,ct=/-->/g,ut=/>/g,$=RegExp(`>|${q}(?:([^\\s"'>=/]+)(${q}*=${q}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),mt=/'/g,gt=/"/g,bt=/^(?:script|style|textarea|title)$/i,et=n=>(e,...t)=>({_$litType$:n,strings:e,values:t}),p=et(1),it=et(2),Qt=et(3),w=Symbol.for("lit-noChange"),u=Symbol.for("lit-nothing"),_t=new WeakMap,y=x.createTreeWalker(x,129);function $t(n,e){if(!tt(n)||!n.hasOwnProperty("raw"))throw Error("invalid template strings array");return pt!==void 0?pt.createHTML(e):e}var Wt=(n,e)=>{let t=n.length-1,i=[],s,o=e===2?"<svg>":e===3?"<math>":"",r=T;for(let l=0;l<t;l++){let a=n[l],h,d,c=-1,g=0;for(;g<a.length&&(r.lastIndex=g,d=r.exec(a),d!==null);)g=r.lastIndex,r===T?d[1]==="!--"?r=ct:d[1]!==void 0?r=ut:d[2]!==void 0?(bt.test(d[2])&&(s=RegExp("</"+d[2],"g")),r=$):d[3]!==void 0&&(r=$):r===$?d[0]===">"?(r=s??T,c=-1):d[1]===void 0?c=-2:(c=r.lastIndex-d[2].length,h=d[1],r=d[3]===void 0?$:d[3]==='"'?gt:mt):r===gt||r===mt?r=$:r===ct||r===ut?r=T:(r=$,s=void 0);let m=r===$&&n[l+1].startsWith("/>")?" ":"";o+=r===T?a+jt:c>=0?(i.push(h),a.slice(0,c)+vt+a.slice(c)+f+m):a+f+(c===-2?l:m)}return[$t(n,o+(n[t]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),i]},H=class n{constructor({strings:e,_$litType$:t},i){let s;this.parts=[];let o=0,r=0,l=e.length-1,a=this.parts,[h,d]=Wt(e,t);if(this.el=n.createElement(h,i),y.currentNode=this.el.content,t===2||t===3){let c=this.el.content.firstChild;c.replaceWith(...c.childNodes)}for(;(s=y.nextNode())!==null&&a.length<l;){if(s.nodeType===1){if(s.hasAttributes())for(let c of s.getAttributeNames())if(c.endsWith(vt)){let g=d[r++],m=s.getAttribute(c).split(f),v=/([.?@])?(.*)/.exec(g);a.push({type:1,index:o,name:v[2],strings:m,ctor:v[1]==="."?J:v[1]==="?"?X:v[1]==="@"?Z:E}),s.removeAttribute(c)}else c.startsWith(f)&&(a.push({type:6,index:o}),s.removeAttribute(c));if(bt.test(s.tagName)){let c=s.textContent.split(f),g=c.length-1;if(g>0){s.textContent=W?W.emptyScript:"";for(let m=0;m<g;m++)s.append(c[m],L()),y.nextNode(),a.push({type:2,index:++o});s.append(c[g],L())}}}else if(s.nodeType===8)if(s.data===ft)a.push({type:2,index:o});else{let c=-1;for(;(c=s.data.indexOf(f,c+1))!==-1;)a.push({type:7,index:o}),c+=f.length-1}o++}}static createElement(e,t){let i=x.createElement("template");return i.innerHTML=e,i}};function S(n,e,t=n,i){if(e===w)return e;let s=i!==void 0?t._$Co?.[i]:t._$Cl,o=N(e)?void 0:e._$litDirective$;return s?.constructor!==o&&(s?._$AO?.(!1),o===void 0?s=void 0:(s=new o(n),s._$AT(n,t,i)),i!==void 0?(t._$Co??=[])[i]=s:t._$Cl=s),s!==void 0&&(e=S(n,s._$AS(n,e.values),s,i)),e}var G=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:i}=this._$AD,s=(e?.creationScope??x).importNode(t,!0);y.currentNode=s;let o=y.nextNode(),r=0,l=0,a=i[0];for(;a!==void 0;){if(r===a.index){let h;a.type===2?h=new O(o,o.nextSibling,this,e):a.type===1?h=new a.ctor(o,a.name,a.strings,this,e):a.type===6&&(h=new Q(o,this,e)),this._$AV.push(h),a=i[++l]}r!==a?.index&&(o=y.nextNode(),r++)}return y.currentNode=x,s}p(e){let t=0;for(let i of this._$AV)i!==void 0&&(i.strings!==void 0?(i._$AI(e,i,t),t+=i.strings.length-2):i._$AI(e[t])),t++}},O=class n{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,i,s){this.type=2,this._$AH=u,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=i,this.options=s,this._$Cv=s?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=S(this,e,t),N(e)?e===u||e==null||e===""?(this._$AH!==u&&this._$AR(),this._$AH=u):e!==this._$AH&&e!==w&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):It(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==u&&N(this._$AH)?this._$AA.nextSibling.data=e:this.T(x.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:i}=e,s=typeof i=="number"?this._$AC(e):(i.el===void 0&&(i.el=H.createElement($t(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===s)this._$AH.p(t);else{let o=new G(s,this),r=o.u(this.options);o.p(t),this.T(r),this._$AH=o}}_$AC(e){let t=_t.get(e.strings);return t===void 0&&_t.set(e.strings,t=new H(e)),t}k(e){tt(this._$AH)||(this._$AH=[],this._$AR());let t=this._$AH,i,s=0;for(let o of e)s===t.length?t.push(i=new n(this.O(L()),this.O(L()),this,this.options)):i=t[s],i._$AI(o),s++;s<t.length&&(this._$AR(i&&i._$AB.nextSibling,s),t.length=s)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let i=dt(e).nextSibling;dt(e).remove(),e=i}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},E=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,i,s,o){this.type=1,this._$AH=u,this._$AN=void 0,this.element=e,this.name=t,this._$AM=s,this.options=o,i.length>2||i[0]!==""||i[1]!==""?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=u}_$AI(e,t=this,i,s){let o=this.strings,r=!1;if(o===void 0)e=S(this,e,t,0),r=!N(e)||e!==this._$AH&&e!==w,r&&(this._$AH=e);else{let l=e,a,h;for(e=o[0],a=0;a<o.length-1;a++)h=S(this,l[i+a],t,a),h===w&&(h=this._$AH[a]),r||=!N(h)||h!==this._$AH[a],h===u?e=u:e!==u&&(e+=(h??"")+o[a+1]),this._$AH[a]=h}r&&!s&&this.j(e)}j(e){e===u?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}},J=class extends E{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===u?void 0:e}},X=class extends E{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==u)}},Z=class extends E{constructor(e,t,i,s,o){super(e,t,i,s,o),this.type=5}_$AI(e,t=this){if((e=S(this,e,t,0)??u)===w)return;let i=this._$AH,s=e===u&&i!==u||e.capture!==i.capture||e.once!==i.once||e.passive!==i.passive,o=e!==u&&(i===u||s);s&&this.element.removeEventListener(this.name,this,i),o&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},Q=class{constructor(e,t,i){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(e){S(this,e)}};var Bt=Y.litHtmlPolyfillSupport;Bt?.(H,O),(Y.litHtmlVersions??=[]).push("3.3.3");var yt=(n,e,t)=>{let i=t?.renderBefore??e,s=i._$litPart$;if(s===void 0){let o=t?.renderBefore??null;i._$litPart$=s=new O(e.insertBefore(L(),o),o,void 0,t??{})}return s._$AI(n),s};var st=globalThis,b=class extends _{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=yt(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return w}};b._$litElement$=!0,b.finalized=!0,st.litElementHydrateSupport?.({LitElement:b});var Ft=st.litElementPolyfillSupport;Ft?.({LitElement:b});(st.litElementVersions??=[]).push("4.2.2");var A="cloudless_crescendo",wt=(n,e,t=101)=>n.callWS({type:`${A}/room/curve`,samples:t,...e});function M(n,e){let t=n.length-1,i=Math.max(0,Math.min(1,e/100))*t,s=Math.min(t-1,Math.floor(i)),o=i-s,r=n[s],l=n[Math.min(t,s+1)];return r.map((a,h)=>a+(l[h]-a)*o)}var xt=[28,29,36];function Kt(n,e,t){let i=0,s=[0,0,0];for(let h of Object.values(n.lights)){let[d,c,g,m]=M(h,e);i+=d,s[0]+=c*d,s[1]+=g*d,s[2]+=m*d}if(i<=.01)return k(xt);let o=Math.max(s[0],s[1],s[2],1e-6),r=s.map(h=>h/o*255),a=.25+.75*Math.pow(Math.min(1,i/Math.max(1,t)),.35);return k(xt.map((h,d)=>h+(r[d]-h)*a))}function Vt(n){let e=Object.values(n.lights),t=1;for(let i=0;i<n.samples;i++){let s=0;for(let o of e)s+=o[i][0];t=Math.max(t,s)}return t}function At(n){let e=Vt(n),t=[];for(let i=0;i<=100;i+=2.5)t.push(`${Kt(n,i,e)} ${i}%`);return`linear-gradient(90deg, ${t.join(", ")})`}var k=n=>`rgb(${Math.round(n[0])}, ${Math.round(n[1])}, ${Math.round(n[2])})`;function St(n){let e=parseInt(n.replace("#",""),16);return[e>>16&255,e>>8&255,e&255]}function Et(n){return`#${n.map(e=>Math.round(e).toString(16).padStart(2,"0")).join("")}`}function kt(n){let e=n/100,t=e<=66?255:329.698727446*Math.pow(e-60,-.1332047592),i=e<=66?99.4708025861*Math.log(e)-161.1195681661:288.1221695283*Math.pow(e-60,-.0755148492),s=e>=66?255:e<=19?0:138.5177312231*Math.log(e-10)-305.0447927307,o=r=>Math.max(0,Math.min(255,r));return[o(t),o(i),o(s)]}function U(n,e){return n.states[e]?.attributes.friendly_name??e}function qt(n){return n?.locale?.language??n?.language??"en"}function Mt(n,e){return qt(n).startsWith("de")?e.de:e.en}function Ct(n,e){let t=0,i,s,o=()=>{if(t=performance.now(),i=void 0,s){let l=s;s=void 0,n(...l)}},r=(...l)=>{s=l;let a=e-(performance.now()-t);a<=0?o():i===void 0&&(i=window.setTimeout(o,a))};return r.cancel=()=>{i!==void 0&&window.clearTimeout(i),i=void 0,s=void 0},r}var Rt=new Set(["hs","xy","rgb","rgbw","rgbww"]),Pt=n=>JSON.parse(JSON.stringify(n)),z=class extends b{constructor(){super(...arguments);this.narrow=!1;this._rooms=[];this._title="";this._saved="";this._preview=!1;this._playhead=40;this._error="";this._saving=!1;this._creating=!1;this._newName="";this._search="";this._loaded=!1;this._dragging=!1;this._sendPreview=Ct(t=>{if(!this.hass||!this._draft)return;let i=this._room;this.hass.callWS({type:`${A}/room/preview`,entity_id:i?.entity_id??void 0,options:this._draft,position:t,transition:.3}).catch(s=>this._error=String(s?.message??s))},250)}firstUpdated(){this._loadRooms()}async _loadRooms(t){if(!this.hass)return;try{this._rooms=await this.hass.callWS({type:`${A}/rooms`})}catch(s){this._error=String(s?.message??s)}this._loaded=!0;let i=t??this._selected??this._rooms[0]?.entry_id;i&&this._select(i,!0)}get _room(){return this._rooms.find(t=>t.entry_id===this._selected)}get _dirty(){return!!this._draft&&JSON.stringify({t:this._title,o:this._draft})!==this._saved}_select(t,i=!1){if(!i&&this._dirty&&!confirm(this._t("Discard unsaved changes?","Ungespeicherte \xC4nderungen verwerfen?")))return;let s=this._rooms.find(o=>o.entry_id===t);s&&(this._selected=t,this._title=s.title,this._draft=Pt(s.options),this._saved=JSON.stringify({t:this._title,o:this._draft}),this._step=this._draft.steps.length?0:void 0,this._error="",this._scheduleCurve())}_update(t){if(!this._draft)return;let i=Pt(this._draft);t(i),this._draft=i,this._scheduleCurve(),this._preview&&this._sendPreview(this._playhead)}_scheduleCurve(){window.clearTimeout(this._curveTimer),this._curveTimer=window.setTimeout(async()=>{if(!(!this.hass||!this._draft))try{this._curve=await wt(this.hass,{options:this._draft},201),this._error=""}catch(t){this._error=String(t?.message??t)}},120)}async _save(){if(!(!this.hass||!this._draft||!this._selected)){this._saving=!0;try{let t=await this.hass.callWS({type:`${A}/room/save`,entry_id:this._selected,title:this._title.trim()||this._room?.title,options:this._draft});this._draft=t.options,this._saved=JSON.stringify({t:this._title,o:this._draft}),await this._loadRooms(this._selected)}catch(t){this._error=String(t?.message??t)}this._saving=!1}}_discard(){this._selected&&this._select(this._selected,!0)}async _create(){if(!(!this.hass||!this._newName.trim()))try{let{entry_id:t}=await this.hass.callWS({type:`${A}/room/create`,title:this._newName.trim()});this._creating=!1,this._newName="",await this._loadRooms(t),this._select(t,!0)}catch(t){this._error=String(t?.message??t)}}async _deleteRoom(){let t=this._room;!this.hass||!t||confirm(this._t(`Delete the room "${t.title}"?`,`Raum \u201E${t.title}\u201C l\xF6schen?`))&&(await this.hass.callWS({type:`${A}/room/delete`,entry_id:t.entry_id}),this._selected=void 0,this._draft=void 0,this._curve=void 0,await this._loadRooms())}_t(t,i){return Mt(this.hass,{en:t,de:i})}_caps(t){let i=this.hass?.states[t]?.attributes??{},s=i.supported_color_modes??[];return{color:s.some(o=>Rt.has(o)),white:s.includes("color_temp")||s.some(o=>Rt.has(o)),minKelvin:i.min_color_temp_kelvin??2e3,maxKelvin:i.max_color_temp_kelvin??6500}}_samples(t){return this._curve?.lights[t]}_positionFromEvent(t,i){let s=i.getBoundingClientRect();return Math.max(0,Math.min(100,(t.clientX-s.left)/s.width*100))}_onTrackDown(t){if(t.button!==0)return;let i=t.currentTarget;i.setPointerCapture(t.pointerId),this._dragging=!0,this._movePlayhead(this._positionFromEvent(t,i))}_onTrackMove(t){this._dragging&&this._movePlayhead(this._positionFromEvent(t,t.currentTarget))}_onTrackUp(){this._dragging=!1}_movePlayhead(t){let i=this._draft?.steps??[],s=i.findIndex(o=>Math.abs(o.position-t)<=1.2);s>=0&&(t=i[s].position,this._step=s),this._playhead=Math.round(t*10)/10,this._preview&&this._sendPreview(this._playhead)}_togglePreview(){this._preview=!this._preview,this._preview&&this._sendPreview(this._playhead)}_addStep(){if(!this._draft)return;let t=Math.round(this._playhead);t<=0&&(t=10);let i=this._draft.steps.findIndex(s=>s.position===t);if(i>=0){this._step=i;return}this._update(s=>{s.steps.push({position:t,lights:{}}),s.steps.sort((o,r)=>o.position-r.position)}),this._step=this._draft.steps.findIndex(s=>s.position===t)}_removeStep(t){this._update(s=>s.steps.splice(t,1));let i=this._draft?.steps.length??0;this._step=i?Math.min(t,i-1):void 0}_moveStep(t,i){let s=Math.round(Number(i)*10)/10;if(!this._draft||!(s>0&&s<=100))return;if(this._draft.steps.some((r,l)=>l!==t&&r.position===s)){this._error=this._t("Another step already uses this position.","Diese Position hat schon eine andere Stufe.");return}let o=this._draft.steps[t];this._update(r=>{r.steps[t].position=s,r.steps.sort((l,a)=>l.position-a.position)}),this._step=this._draft.steps.findIndex(r=>r.position===o.position||r.position===s),this._playhead=s}_setPoint(t,i,s){this._update(o=>{let r=o.steps[t].lights;s?r[i]=s:delete r[i]})}_include(t,i,s){if(!s){this._setPoint(t,i,void 0);return}let o=this._draft.steps[t],r=this._samples(i),l=r?Math.round(M(r,o.position)[0]):100;this._setPoint(t,i,{brightness:l||50})}_addLight(t){this._update(i=>{i.lights.some(s=>s.entity_id===t)||i.lights.push({entity_id:t,color_mode:"auto"})}),this._search=""}_removeLight(t){this._update(i=>{i.lights=i.lights.filter(s=>s.entity_id!==t);for(let s of i.steps)delete s.lights[t]})}_setColorMode(t,i){this._update(s=>{let o=s.lights.find(r=>r.entity_id===t);o&&(o.color_mode=i)})}render(){return this.hass?p`
      <div class="toolbar">
        <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
        <h1>Crescendo</h1>
      </div>
      <main>
        ${this._renderRooms()}
        ${this._error?p`<div class="error" role="alert">${this._error}</div>`:u}
        ${this._draft?this._renderEditor():this._renderEmpty()}
      </main>
      ${this._dirty?p`<div class="savebar">
            <span>${this._t("Unsaved changes","Ungespeicherte \xC4nderungen")}</span>
            <button class="text" @click=${this._discard}>${this._t("Discard","Verwerfen")}</button>
            <button class="filled" ?disabled=${this._saving} @click=${this._save}>
              ${this._saving?this._t("Saving\u2026","Speichert\u2026"):this._t("Save","Speichern")}
            </button>
          </div>`:u}
    `:u}_renderRooms(){return p`<nav class="rooms" aria-label=${this._t("Rooms","R\xE4ume")}>
      ${this._rooms.map(t=>p`<button
          class="room-tab ${t.entry_id===this._selected?"active":""}"
          @click=${()=>this._select(t.entry_id)}
        >
          ${t.entry_id===this._selected&&this._title||t.title}
        </button>`)}
      ${this._creating?p`<form
            class="create"
            @submit=${t=>{t.preventDefault(),this._create()}}
          >
            <input
              .value=${this._newName}
              @input=${t=>this._newName=t.target.value}
              placeholder=${this._t("Room name","Name des Raums")}
              aria-label=${this._t("Room name","Name des Raums")}
              autofocus
            />
            <button class="filled" type="submit" ?disabled=${!this._newName.trim()}>
              ${this._t("Create","Anlegen")}
            </button>
            <button class="text" type="button" @click=${()=>this._creating=!1}>
              ${this._t("Cancel","Abbrechen")}
            </button>
          </form>`:p`<button class="room-tab add" @click=${()=>this._creating=!0}>
            <ha-icon icon="mdi:plus"></ha-icon>${this._t("New room","Neuer Raum")}
          </button>`}
    </nav>`}_renderEmpty(){return this._loaded?p`<section class="empty">
      <h2>${this._t("No room yet","Noch kein Raum")}</h2>
      <p>
        ${this._t("A room puts several lights on one scale from 0 to 100. Create one and decide which light joins at which point.","Ein Raum legt mehrere Leuchten auf eine Skala von 0 bis 100. Lege einen an und bestimme, welche Leuchte wann dazukommt.")}
      </p>
      <button class="filled" @click=${()=>this._creating=!0}>${this._t("Create room","Raum anlegen")}</button>
    </section>`:u}_renderEditor(){let t=this._draft;return p`
      <section class="score-card">
        <div class="room-head">
          <input
            class="room-name"
            .value=${this._title}
            @input=${i=>this._title=i.target.value}
            aria-label=${this._t("Room name","Name des Raums")}
          />
          ${this._room?.entity_id?p`<span class="entity">${this._room.entity_id}</span>`:u}
        </div>
        ${t.lights.length?this._renderScore():p`<p class="hint">
          ${this._t("Add the lights of this room below.","F\xFCge unten die Leuchten dieses Raums hinzu.")}
        </p>`}
      </section>
      ${this._step!==void 0&&t.steps[this._step]?this._renderStep(this._step):u}
      ${this._renderLights()} ${this._renderSettings()}
    `}_renderScore(){let t=this._draft,i=this._curve,s=i?At(i):"var(--divider-color)",o=this._step!==void 0?t.steps[this._step]?.position:void 0,r=(l,a="")=>p`<div
      class="track ${a}"
      @pointerdown=${this._onTrackDown}
      @pointermove=${this._onTrackMove}
      @pointerup=${this._onTrackUp}
      @pointercancel=${this._onTrackUp}
    >
      ${l}
      ${t.steps.map(h=>p`<div class="bar ${h.position===o?"selected":""}" style="left:${h.position}%"></div>`)}
      <div class="playhead" style="left:${this._playhead}%"></div>
    </div>`;return p`
      <div class="score">
        <div class="row ruler-row">
          <div class="label"></div>
          <div class="ruler">
            ${t.steps.map((l,a)=>p`<button
                class="marker ${a===this._step?"selected":""} ${l.position>=96?"end":""}"
                style="left:${l.position}%"
                @click=${()=>{this._step=a,this._movePlayhead(l.position)}}
              >
                <span>${l.name||`${l.position}`}</span>
              </button>`)}
          </div>
        </div>
        <div class="row">
          <div class="label">${this._t("Room","Raum")}</div>
          ${r(p`<div class="ribbon" style="background:${s}"></div>`,"ribbon-track")}
        </div>
        ${t.lights.map(l=>{let a=this._samples(l.entity_id),h=t.steps.map((d,c)=>({s:d,i:c,p:d.lights[l.entity_id]})).filter(d=>d.p);return p`<div class="row">
            <div class="label" title=${l.entity_id}>${U(this.hass,l.entity_id)}</div>
            ${r(p`${a?this._lane(a):u}
              ${h.map(d=>p`<button
                  class="dot ${d.i===this._step?"selected":""}"
                  style="left:${d.s.position}%; bottom:${(d.p.brightness??M(a??[[0,0,0,0]],d.s.position)[0])*.8+6}%"
                  aria-label="${U(this.hass,l.entity_id)} ${d.s.position} %"
                  @pointerdown=${c=>c.stopPropagation()}
                  @click=${()=>{this._step=d.i,this._movePlayhead(d.s.position)}}
                ></button>`)}`,"lane")}
          </div>`})}
        <div class="row ruler-scale">
          <div class="label"></div>
          <div class="scale">${[0,25,50,75,100].map(l=>p`<span style="left:${l}%">${l}</span>`)}</div>
        </div>
      </div>
      <div class="score-actions">
        <label class="switch">
          <input type="checkbox" .checked=${this._preview} @change=${this._togglePreview} />
          <span>${this._t("Preview on the lights","Vorschau an den Leuchten")}</span>
        </label>
        <span class="playhead-value">${Math.round(this._playhead)} %</span>
        <button class="outlined" @click=${this._addStep}>
          <ha-icon icon="mdi:plus"></ha-icon>${this._t(`Step at ${Math.round(this._playhead)||10} %`,`Stufe bei ${Math.round(this._playhead)||10} %`)}
        </button>
      </div>
    `}_lane(t){let i=t.length-1,s=t.map((a,h)=>`${h/i*1e3},${100-a[0]*.8-4}`),o=`M0,100 L${s.join(" L")} L1000,100 Z`,r=`g${Math.random().toString(36).slice(2,8)}`,l=t.filter((a,h)=>h%5===0||h===i);return it`<svg class="area" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id=${r} x1="0" x2="1" y1="0" y2="0">
          ${l.map(a=>{let h=t.indexOf(a);return it`<stop offset=${h/i} stop-color=${k([a[1],a[2],a[3]])} stop-opacity=${.25+.75*(a[0]/100)}></stop>`})}
        </linearGradient>
      </defs>
      <path d=${o} fill="url(#${r})"></path>
      <polyline points=${s.join(" ")} fill="none" stroke="var(--primary-text-color)" stroke-opacity="0.35" stroke-width="1.5" vector-effect="non-scaling-stroke"></polyline>
    </svg>`}_renderStep(t){let i=this._draft,s=i.steps[t];return p`<section class="card step-card">
      <div class="step-head">
        <button
          class="icon"
          ?disabled=${t===0}
          @click=${()=>{this._step=t-1,this._playhead=i.steps[t-1].position}}
          aria-label=${this._t("Previous step","Vorherige Stufe")}
        >
          <ha-icon icon="mdi:chevron-left"></ha-icon>
        </button>
        <label class="field position">
          <span>${this._t("Position","Position")}</span>
          <input
            type="number"
            min="1"
            max="100"
            step="1"
            .value=${String(s.position)}
            @change=${o=>this._moveStep(t,o.target.value)}
          />
        </label>
        <label class="field grow">
          <span>${this._t("Name (shown on the card)","Name (erscheint auf der Karte)")}</span>
          <input
            .value=${s.name??""}
            placeholder=${this._t("e.g. Morning","z. B. Morgen")}
            @input=${o=>{let r=o.target.value;this._update(l=>{r?l.steps[t].name=r:delete l.steps[t].name})}}
          />
        </label>
        <button
          class="icon"
          ?disabled=${t>=i.steps.length-1}
          @click=${()=>{this._step=t+1,this._playhead=i.steps[t+1].position}}
          aria-label=${this._t("Next step","N\xE4chste Stufe")}
        >
          <ha-icon icon="mdi:chevron-right"></ha-icon>
        </button>
      </div>
      <div class="step-lights">
        ${i.lights.map(o=>this._renderPoint(t,s,o))}
      </div>
      <div class="step-foot">
        <button class="text danger" @click=${()=>this._removeStep(t)}>
          <ha-icon icon="mdi:delete-outline"></ha-icon>${this._t("Remove step","Stufe entfernen")}
        </button>
      </div>
    </section>`}_renderPoint(t,i,s){let o=s.entity_id,r=i.lights[o],l=this._caps(o),a=this._samples(o),h=a?Math.round(M(a,i.position)[0]):void 0,d=r?.kelvin!==void 0?"white":r?.rgb||r?.xy?"color":"none",c=U(this.hass,o),g=m=>{let v={brightness:r?.brightness??h??50};if(m==="white"&&(v.kelvin=2700),m==="color"){let C=a?M(a,i.position):void 0;v.rgb=C&&C[0]>0?[Math.round(C[1]),Math.round(C[2]),Math.round(C[3])]:[255,140,60]}this._setPoint(t,o,v)};return p`<div class="point ${r?"active":""}">
      <label class="include">
        <input type="checkbox" .checked=${!!r} @change=${m=>this._include(t,o,m.target.checked)} />
        <span class="light-name">${c}</span>
      </label>
      ${r?p`
            <div class="control">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                .value=${String(r.brightness??0)}
                aria-label="${c} ${this._t("brightness","Helligkeit")}"
                @input=${m=>this._setPoint(t,o,{...r,brightness:Number(m.target.value)})}
              />
              <span class="value">${r.brightness===0?this._t("off","aus"):`${r.brightness??0} %`}</span>
            </div>
            ${l.white||l.color?p`<div class="color-row">
                  <div class="segmented" role="radiogroup" aria-label=${this._t("Color","Farbe")}>
                    <button class=${d==="none"?"on":""} @click=${()=>g("none")}>
                      ${this._t("Keep","Beibehalten")}
                    </button>
                    ${l.white?p`<button class=${d==="white"?"on":""} @click=${()=>g("white")}>
                          ${this._t("White","Wei\xDF")}
                        </button>`:u}
                    ${l.color?p`<button class=${d==="color"?"on":""} @click=${()=>g("color")}>
                          ${this._t("Color","Farbe")}
                        </button>`:u}
                  </div>
                  ${d==="white"?this._kelvinControl(t,o,r,l):u}
                  ${d==="color"?p`<label class="swatch" style="background:${k(r.rgb??[255,255,255])}">
                        <input
                          type="color"
                          .value=${Et(r.rgb??[255,255,255])}
                          aria-label=${this._t("Pick color","Farbe w\xE4hlen")}
                          @input=${m=>this._setPoint(t,o,{brightness:r.brightness,rgb:St(m.target.value)})}
                        />
                      </label>`:u}
                </div>`:u}
          `:p`<div class="follow">
            ${h===void 0?this._t("Not used yet","Noch nicht verwendet"):h>0?this._t(`Follows the curve: ${h} %`,`Folgt der Kurve: ${h} %`):this._t("Off here","Hier aus")}
          </div>`}
    </div>`}_kelvinControl(t,i,s,o){let r=Math.max(1800,Math.min(o.minKelvin,2200)),l=Math.min(8e3,Math.max(o.maxKelvin,5e3)),a=`linear-gradient(90deg, ${[0,.25,.5,.75,1].map(h=>k(kt(r+(l-r)*h))).join(", ")})`;return p`<div class="control kelvin">
      <input
        type="range"
        min=${r}
        max=${l}
        step="50"
        style="--track:${a}"
        .value=${String(s.kelvin??2700)}
        aria-label=${this._t("Color temperature","Farbtemperatur")}
        @input=${h=>this._setPoint(t,i,{brightness:s.brightness,kelvin:Number(h.target.value)})}
      />
      <span class="value">${s.kelvin??2700} K</span>
    </div>`}_renderLights(){let t=this._draft,i=new Set(t.lights.map(r=>r.entity_id)),s=this._search.trim().toLowerCase(),o=s?Object.values(this.hass.states).filter(r=>r.entity_id.startsWith("light.")&&!i.has(r.entity_id)&&!("curve_id"in r.attributes)&&`${r.entity_id} ${r.attributes.friendly_name??""}`.toLowerCase().includes(s)).slice(0,8):[];return p`<section class="card">
      <h2>${this._t("Lights","Leuchten")}</h2>
      <div class="light-list">
        ${t.lights.map(r=>{let l=this._caps(r.entity_id);return p`<div class="light-row">
            <div class="light-info">
              <span class="light-name">${U(this.hass,r.entity_id)}</span>
              <span class="entity">${r.entity_id}</span>
            </div>
            ${l.color&&l.white?p`<select
                  aria-label=${this._t("How white is produced","Wie Wei\xDF erzeugt wird")}
                  .value=${r.color_mode}
                  @change=${a=>this._setColorMode(r.entity_id,a.target.value)}
                >
                  <option value="auto">${this._t("Automatic","Automatisch")}</option>
                  <option value="color">${this._t("Always mix colors","Immer Farben mischen")}</option>
                  <option value="white">${this._t("Always white LEDs","Immer Wei\xDF-LEDs")}</option>
                </select>`:u}
            <button
              class="icon"
              @click=${()=>this._removeLight(r.entity_id)}
              aria-label=${this._t("Remove light","Leuchte entfernen")}
            >
              <ha-icon icon="mdi:close"></ha-icon>
            </button>
          </div>`})}
      </div>
      <div class="add-light">
        <input
          type="search"
          .value=${this._search}
          placeholder=${this._t("Add a light\u2026","Leuchte hinzuf\xFCgen\u2026")}
          aria-label=${this._t("Add a light","Leuchte hinzuf\xFCgen")}
          @input=${r=>this._search=r.target.value}
        />
        ${o.length?p`<div class="results">
              ${o.map(r=>p`<button @click=${()=>this._addLight(r.entity_id)}>
                  <span class="light-name">${r.attributes.friendly_name??r.entity_id}</span>
                  <span class="entity">${r.entity_id}</span>
                </button>`)}
            </div>`:u}
      </div>
      <p class="hint">
        ${this._t("Automatic: if a light uses a color anywhere in the curve, its whites are mixed from colors too. That avoids the visible jump when an RGBCCT light switches between white LEDs and color LEDs.","Automatisch: Nutzt eine Leuchte irgendwo in der Kurve eine Farbe, wird auch ihr Wei\xDF aus Farben gemischt. So gibt es keinen sichtbaren Sprung, wenn eine RGBCCT-Leuchte zwischen Wei\xDF- und Farb-LEDs wechselt.")}
      </p>
    </section>`}_renderSettings(){let t=this._draft,i=(s,o,r,l)=>p`<input
      type="number"
      min=${o}
      max=${r}
      step=${l}
      .value=${String(t[s])}
      @change=${a=>{let h=Number(a.target.value);h>=o&&h<=r&&this._update(d=>d[s]=h)}}
    />`;return p`<section class="card settings">
      <h2>${this._t("Timing","Zeiten")}</h2>
      <label class="field">
        <span>${this._t("Fade time for sliders and steps (s)","\xDCberblendzeit f\xFCr Regler und Stufen (s)")}</span>
        ${i("default_transition",0,60,.1)}
      </label>
      <label class="field">
        <span>${this._t("Longest single command during long fades (s)","L\xE4ngster Einzelbefehl bei langen \xDCberblendungen (s)")}</span>
        ${i("max_segment",1,600,1)}
      </label>
      <button class="text danger" @click=${this._deleteRoom}>
        <ha-icon icon="mdi:delete-outline"></ha-icon>${this._t("Delete room","Raum l\xF6schen")}
      </button>
    </section>`}updated(t){t.has("hass")&&!t.get("hass")&&this.hass&&!this._loaded&&this._loadRooms()}};z.properties={hass:{attribute:!1},narrow:{type:Boolean},_rooms:{state:!0},_selected:{state:!0},_title:{state:!0},_draft:{state:!0},_curve:{state:!0},_step:{state:!0},_preview:{state:!0},_playhead:{state:!0},_error:{state:!0},_saving:{state:!0},_creating:{state:!0},_newName:{state:!0},_search:{state:!0},_loaded:{state:!0}},z.styles=F`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--primary-background-color);
      color: var(--primary-text-color);
      font-family: var(--ha-font-family-body, Roboto, system-ui, sans-serif);
      --radius: 14px;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 4px;
      height: var(--header-height, 56px);
      padding: 0 12px;
      background: var(--app-header-background-color, var(--primary-color));
      color: var(--app-header-text-color, #fff);
      border-bottom: var(--app-header-border-bottom, none);
      position: sticky;
      top: 0;
      z-index: 2;
    }
    .toolbar h1 {
      font-size: 1.25rem;
      font-weight: 400;
      margin: 0 0 0 8px;
    }
    main {
      max-width: 1040px;
      margin: 0 auto;
      padding: 16px 16px 96px;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 16px;
    }
    main > * {
      min-width: 0;
    }
    h2 {
      font-size: 1rem;
      font-weight: 500;
      margin: 0 0 12px;
    }
    button {
      font: inherit;
      color: inherit;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
    }
    button:disabled {
      opacity: 0.4;
      cursor: default;
    }
    :is(button, input, select):focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    input,
    select {
      font: inherit;
      color: var(--primary-text-color);
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 8px 10px;
      min-height: 40px;
      box-sizing: border-box;
    }
    input[type="range"] {
      border: none;
      padding: 0;
      background: none;
      accent-color: var(--primary-color);
      min-height: 32px;
    }
    input[type="checkbox"] {
      accent-color: var(--primary-color);
      width: 20px;
      height: 20px;
      min-height: 0;
      margin: 0;
    }
    .filled,
    .outlined,
    .text {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 40px;
      padding: 0 16px;
      border-radius: 20px;
      font-weight: 500;
      white-space: nowrap;
    }
    .filled {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
    }
    .outlined {
      border: 1px solid var(--divider-color);
      color: var(--primary-color);
    }
    .text {
      color: var(--primary-color);
      padding: 0 8px;
    }
    .danger {
      color: var(--error-color, #db4437);
    }
    .icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      flex: none;
      color: var(--secondary-text-color);
    }
    ha-icon {
      --mdc-icon-size: 20px;
    }
    .error {
      padding: 12px 16px;
      border-radius: 10px;
      background: rgba(219, 68, 55, 0.12);
      color: var(--error-color, #db4437);
    }
    .hint {
      color: var(--secondary-text-color);
      font-size: 0.875rem;
      line-height: 1.5;
      margin: 12px 0 0;
      max-width: 70ch;
    }
    .entity {
      color: var(--secondary-text-color);
      font-size: 0.75rem;
    }

    /* Rooms */
    .rooms {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .room-tab {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 36px;
      padding: 0 16px;
      border-radius: 18px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
    }
    .room-tab.active {
      background: var(--primary-color);
      border-color: var(--primary-color);
      color: var(--text-primary-color, #fff);
    }
    .room-tab.add {
      color: var(--primary-color);
      border-style: dashed;
    }
    .create {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .empty {
      background: var(--card-background-color);
      border-radius: var(--radius);
      padding: 32px 24px;
      text-align: center;
    }
    .empty p {
      color: var(--secondary-text-color);
      max-width: 52ch;
      margin: 8px auto 20px;
      line-height: 1.5;
    }

    /* Cards */
    .card,
    .score-card {
      background: var(--card-background-color);
      border-radius: var(--radius);
      padding: 16px;
      box-shadow: var(--ha-card-box-shadow, none);
      border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color));
    }
    .room-head {
      display: flex;
      align-items: baseline;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }
    .room-name {
      font-size: 1.5rem;
      font-weight: 400;
      border: 1px solid transparent;
      background: transparent;
      padding: 4px 8px;
      margin-left: -8px;
      min-width: 0;
      flex: 1 1 200px;
    }
    .room-name:hover,
    .room-name:focus {
      border-color: var(--divider-color);
    }

    /* Score */
    .score {
      display: grid;
      gap: 4px;
    }
    .row {
      display: grid;
      grid-template-columns: 140px minmax(0, 1fr);
      gap: 12px;
      align-items: center;
    }
    .label {
      font-size: 0.8125rem;
      color: var(--secondary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .track {
      position: relative;
      height: 40px;
      border-radius: 8px;
      background: rgba(127, 127, 127, 0.08);
      touch-action: pan-y;
      cursor: ew-resize;
      user-select: none;
      -webkit-user-select: none;
    }
    .ribbon-track {
      height: 44px;
      overflow: hidden;
    }
    .ribbon {
      position: absolute;
      inset: 0;
    }
    .area {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border-radius: 8px;
    }
    .bar {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 1px;
      background: var(--divider-color);
      pointer-events: none;
    }
    .bar.selected {
      width: 2px;
      margin-left: -0.5px;
      background: var(--primary-color);
    }
    .playhead {
      position: absolute;
      top: -2px;
      bottom: -2px;
      width: 3px;
      margin-left: -1.5px;
      border-radius: 2px;
      background: var(--primary-text-color);
      pointer-events: none;
    }
    .dot {
      position: absolute;
      width: 14px;
      height: 14px;
      margin: 0 0 -7px -7px;
      border-radius: 50%;
      background: var(--card-background-color);
      border: 2px solid var(--primary-text-color);
      box-sizing: border-box;
      z-index: 1;
    }
    .dot.selected {
      background: var(--primary-color);
      border-color: var(--primary-color);
    }
    .ruler {
      position: relative;
      height: 28px;
    }
    .marker {
      position: absolute;
      bottom: 0;
      transform: translateX(-50%);
      font-size: 0.75rem;
      padding: 4px 8px;
      border-radius: 12px;
      color: var(--secondary-text-color);
      white-space: nowrap;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .marker.end {
      transform: translateX(-100%);
    }
    .marker.selected {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
    }
    .scale {
      position: relative;
      height: 18px;
      font-size: 0.6875rem;
      color: var(--secondary-text-color);
      font-variant-numeric: tabular-nums;
    }
    .scale span {
      position: absolute;
      transform: translateX(-50%);
    }
    .scale span:first-child {
      transform: none;
    }
    .scale span:last-child {
      transform: translateX(-100%);
    }
    .score-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 12px;
    }
    .switch {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    .playhead-value {
      margin-left: auto;
      font-variant-numeric: tabular-nums;
      color: var(--secondary-text-color);
    }

    /* Step */
    .step-head {
      display: flex;
      align-items: flex-end;
      gap: 8px;
    }
    .field {
      display: grid;
      gap: 4px;
      font-size: 0.8125rem;
      color: var(--secondary-text-color);
    }
    .field.grow {
      flex: 1;
      min-width: 0;
    }
    .field.grow input {
      width: 100%;
    }
    .field.position input {
      width: 84px;
    }
    .step-lights {
      display: grid;
      gap: 4px;
      margin-top: 16px;
    }
    .point {
      display: grid;
      grid-template-columns: minmax(140px, 220px) minmax(0, 1fr);
      gap: 4px 16px;
      align-items: center;
      padding: 10px 0;
      border-top: 1px solid var(--divider-color);
    }
    .include {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      min-width: 0;
    }
    .light-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .point:not(.active) .light-name {
      color: var(--secondary-text-color);
    }
    .follow {
      font-size: 0.8125rem;
      color: var(--secondary-text-color);
    }
    .control {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .control input[type="range"] {
      flex: 1;
      min-width: 0;
    }
    .control .value {
      width: 64px;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .kelvin input[type="range"] {
      -webkit-appearance: none;
      appearance: none;
      height: 10px;
      min-height: 10px;
      border-radius: 5px;
      background: var(--track);
    }
    .kelvin input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #fff;
      border: 2px solid rgba(0, 0, 0, 0.35);
    }
    .kelvin input[type="range"]::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #fff;
      border: 2px solid rgba(0, 0, 0, 0.35);
    }
    .color-row {
      grid-column: 2;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .color-row .kelvin {
      flex: 1;
      min-width: 180px;
    }
    .segmented {
      display: inline-flex;
      border: 1px solid var(--divider-color);
      border-radius: 18px;
      overflow: hidden;
    }
    .segmented button {
      height: 32px;
      padding: 0 12px;
      font-size: 0.8125rem;
    }
    .segmented button + button {
      border-left: 1px solid var(--divider-color);
    }
    .segmented button.on {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
    }
    .swatch {
      position: relative;
      width: 40px;
      height: 32px;
      border-radius: 8px;
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.2);
      cursor: pointer;
    }
    .swatch input {
      position: absolute;
      inset: 0;
      opacity: 0;
      width: 100%;
      height: 100%;
      cursor: pointer;
    }
    .step-foot {
      display: flex;
      justify-content: flex-end;
      margin-top: 8px;
    }

    /* Lights */
    .light-list {
      display: grid;
    }
    .light-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
      border-top: 1px solid var(--divider-color);
    }
    .light-info {
      display: grid;
      flex: 1;
      min-width: 0;
    }
    .add-light {
      position: relative;
      margin-top: 12px;
    }
    .add-light input {
      width: 100%;
    }
    .results {
      display: grid;
      margin-top: 4px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      overflow: hidden;
    }
    .results button {
      display: grid;
      text-align: left;
      padding: 8px 12px;
    }
    .results button + button {
      border-top: 1px solid var(--divider-color);
    }
    .results button:hover {
      background: rgba(127, 127, 127, 0.1);
    }

    /* Settings */
    .settings {
      display: grid;
      gap: 12px;
      justify-items: start;
    }
    .settings .field input {
      width: 120px;
    }

    /* Save bar */
    .savebar {
      position: fixed;
      left: 50%;
      bottom: 16px;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 8px 8px 20px;
      border-radius: 28px;
      background: var(--card-background-color);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
      border: 1px solid var(--divider-color);
      z-index: 3;
      max-width: calc(100vw - 32px);
      box-sizing: border-box;
    }
    .savebar span {
      margin-right: 8px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (max-width: 600px) {
      main {
        padding: 12px 12px 96px;
      }
      .row {
        grid-template-columns: minmax(0, 1fr);
        gap: 2px;
      }
      .row .label:empty {
        display: none;
      }
      .ruler-row .label,
      .ruler-scale .label {
        display: none;
      }
      .point {
        grid-template-columns: minmax(0, 1fr);
      }
      .color-row {
        grid-column: 1;
      }
      .step-head {
        flex-wrap: wrap;
      }
      .savebar span {
        display: none;
      }
    }
  `;customElements.get("crescendo-panel")||customElements.define("crescendo-panel",z);
