import{r as c,c as B,j as s}from"./app-CQLcEX3n.js";import{A as Ce}from"./AdminLayout-BHYBSiVz.js";const ce=(...e)=>e.filter((t,a,o)=>!!t&&t.trim()!==""&&o.indexOf(t)===a).join(" ").trim();const Ae=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();const ke=e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(t,a,o)=>o?o.toUpperCase():a.toLowerCase());const se=e=>{const t=ke(e);return t.charAt(0).toUpperCase()+t.slice(1)};var V={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};const Se=e=>{for(const t in e)if(t.startsWith("aria-")||t==="role"||t==="title")return!0;return!1},Ee=c.createContext({}),Oe=()=>c.useContext(Ee),Ie=c.forwardRef(({color:e,size:t,strokeWidth:a,absoluteStrokeWidth:o,className:l="",children:i,iconNode:r,...d},m)=>{const{size:u=24,strokeWidth:p=2,absoluteStrokeWidth:x=!1,color:h="currentColor",className:g=""}=Oe()??{},A=o??x?Number(a??p)*24/Number(t??u):a??p;return c.createElement("svg",{ref:m,...V,width:t??u??V.width,height:t??u??V.height,stroke:e??h,strokeWidth:A,className:ce("lucide",g,l),...!i&&!Se(d)&&{"aria-hidden":"true"},...d},[...r.map(([k,y])=>c.createElement(k,y)),...Array.isArray(i)?i:[i]])});const w=(e,t)=>{const a=c.forwardRef(({className:o,...l},i)=>c.createElement(Ie,{ref:i,iconNode:t,className:ce(`lucide-${Ae(se(e))}`,`lucide-${e}`,o),...l}));return a.displayName=se(e),a};const Le=[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]],Te=w("chevron-right",Le);const Re=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]],$e=w("circle-alert",Re);const Me=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]],G=w("circle-check",Me);const De=[["path",{d:"M12 15V3",key:"m9g1x1"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["path",{d:"m7 10 5 5 5-5",key:"brsn70"}]],_e=w("download",De);const Pe=[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M8 13h2",key:"yr2amv"}],["path",{d:"M14 13h2",key:"un5t4a"}],["path",{d:"M8 17h2",key:"2yhykz"}],["path",{d:"M14 17h2",key:"10kma7"}]],Fe=w("file-spreadsheet",Pe);const Ge=[["path",{d:"M10 18v-7",key:"wt116b"}],["path",{d:"M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z",key:"yxxwt6"}],["path",{d:"M14 18v-7",key:"vav6t3"}],["path",{d:"M18 18v-7",key:"aexdmj"}],["path",{d:"M3 22h18",key:"8prr45"}],["path",{d:"M6 18v-7",key:"1ivflk"}]],ae=w("landmark",Ge);const ze=[["path",{d:"M18 8c0 3.613-3.869 7.429-5.393 8.795a1 1 0 0 1-1.214 0C9.87 15.429 6 11.613 6 8a6 6 0 0 1 12 0",key:"11u0oz"}],["circle",{cx:"12",cy:"8",r:"2",key:"1822b1"}],["path",{d:"M8.714 14h-3.71a1 1 0 0 0-.948.683l-2.004 6A1 1 0 0 0 3 22h18a1 1 0 0 0 .948-1.316l-2-6a1 1 0 0 0-.949-.684h-3.712",key:"q8zwxj"}]],re=w("map-pinned",ze);const Ue=[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",key:"1r0f0z"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]],oe=w("map-pin",Ue);const Be=[["path",{d:"M12 3v12",key:"1x0j5s"}],["path",{d:"m17 8-5-5-5 5",key:"7q97r8"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}]],ne=w("upload",Be);const We=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],He=w("x",We);let qe={data:""},Ve=e=>{if(typeof window=="object"){let t=(e?e.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||qe},Ke=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,Xe=/\/\*[^]*?\*\/|  +/g,ie=/\n+/g,E=(e,t)=>{let a="",o="",l="";for(let i in e){let r=e[i];i[0]=="@"?i[1]=="i"?a=i+" "+r+";":o+=i[1]=="f"?E(r,i):i+"{"+E(r,i[1]=="k"?"":t)+"}":typeof r=="object"?o+=E(r,t?t.replace(/([^,])+/g,d=>i.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,m=>/&/.test(m)?m.replace(/&/g,d):d?d+" "+m:m)):i):r!=null&&(i=i[1]=="-"?i:i.replace(/[A-Z]/g,"-$&").toLowerCase(),l+=E.p?E.p(i,r):i+":"+r+";")}return a+(t&&l?t+"{"+l+"}":l)+o},S={},de=e=>{if(typeof e=="object"){let t="";for(let a in e)t+=a+de(e[a]);return t}return e},Ze=(e,t,a,o,l)=>{let i=de(e),r=S[i]||(S[i]=(m=>{let u=0,p=11;for(;u<m.length;)p=101*p+m.charCodeAt(u++)>>>0;return"go"+p})(i));if(!S[r]){let m=i!==e?e:(u=>{let p,x,h=[{}];for(;p=Ke.exec(u.replace(Xe,""));)p[4]?h.shift():p[3]?(x=p[3].replace(ie," ").trim(),h.unshift(h[0][x]=h[0][x]||{})):h[0][p[1]]=p[2].replace(ie," ").trim();return h[0]})(e);S[r]=E(l?{["@keyframes "+r]:m}:m,a?"":"."+r)}let d=a&&S.g;return a&&(S.g=S[r]),((m,u,p,x)=>{x?u.data=u.data.replace(x,m):u.data.indexOf(m)===-1&&(u.data=p?m+u.data:u.data+m)})(S[r],t,o,d),r},Ye=(e,t,a)=>e.reduce((o,l,i)=>{let r=t[i];if(r&&r.call){let d=r(a),m=d&&d.props&&d.props.className||/^go/.test(d)&&d;r=m?"."+m:d&&typeof d=="object"?d.props?"":E(d,""):d===!1?"":d}return o+l+(r??"")},"");function W(e){let t=this||{},a=e.call?e(t.p):e;return Ze(a.unshift?a.raw?Ye(a,[].slice.call(arguments,1),t.p):a.reduce((o,l)=>Object.assign(o,l&&l.call?l(t.p):l),{}):a,Ve(t.target),t.g,t.o,t.k)}let me,X,Z;W.bind({g:1});let C=W.bind({k:1});function Qe(e,t,a,o){E.p=t,me=e,X=a,Z=o}function O(e,t){let a=this||{};return function(){let o=arguments;function l(i,r){let d=Object.assign({},i),m=d.className||l.className;a.p=Object.assign({theme:X&&X()},d),a.o=/go\d/.test(m),d.className=W.apply(a,o)+(m?" "+m:"");let u=e;return e[0]&&(u=d.as||e,delete d.as),Z&&u[0]&&Z(d),me(u,d)}return t?t(l):l}}var Je=e=>typeof e=="function",U=(e,t)=>Je(e)?e(t):e,et=(()=>{let e=0;return()=>(++e).toString()})(),pe=(()=>{let e;return()=>{if(e===void 0&&typeof window<"u"){let t=matchMedia("(prefers-reduced-motion: reduce)");e=!t||t.matches}return e}})(),tt=20,Y="default",ue=(e,t)=>{let{toastLimit:a}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,a)};case 1:return{...e,toasts:e.toasts.map(r=>r.id===t.toast.id?{...r,...t.toast}:r)};case 2:let{toast:o}=t;return ue(e,{type:e.toasts.find(r=>r.id===o.id)?1:0,toast:o});case 3:let{toastId:l}=t;return{...e,toasts:e.toasts.map(r=>r.id===l||l===void 0?{...r,dismissed:!0,visible:!1}:r)};case 4:return t.toastId===void 0?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(r=>r.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let i=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(r=>({...r,pauseDuration:r.pauseDuration+i}))}}},z=[],xe={toasts:[],pausedAt:void 0,settings:{toastLimit:tt}},N={},he=(e,t=Y)=>{N[t]=ue(N[t]||xe,e),z.forEach(([a,o])=>{a===t&&o(N[t])})},ge=e=>Object.keys(N).forEach(t=>he(e,t)),st=e=>Object.keys(N).find(t=>N[t].toasts.some(a=>a.id===e)),H=(e=Y)=>t=>{he(t,e)},at={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},rt=(e={},t=Y)=>{let[a,o]=c.useState(N[t]||xe),l=c.useRef(N[t]);c.useEffect(()=>(l.current!==N[t]&&o(N[t]),z.push([t,o]),()=>{let r=z.findIndex(([d])=>d===t);r>-1&&z.splice(r,1)}),[t]);let i=a.toasts.map(r=>{var d,m,u;return{...e,...e[r.type],...r,removeDelay:r.removeDelay||((d=e[r.type])==null?void 0:d.removeDelay)||e?.removeDelay,duration:r.duration||((m=e[r.type])==null?void 0:m.duration)||e?.duration||at[r.type],style:{...e.style,...(u=e[r.type])==null?void 0:u.style,...r.style}}});return{...a,toasts:i}},ot=(e,t="blank",a)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...a,id:a?.id||et()}),D=e=>(t,a)=>{let o=ot(t,e,a);return H(o.toasterId||st(o.id))({type:2,toast:o}),o.id},f=(e,t)=>D("blank")(e,t);f.error=D("error");f.success=D("success");f.loading=D("loading");f.custom=D("custom");f.dismiss=(e,t)=>{let a={type:3,toastId:e};t?H(t)(a):ge(a)};f.dismissAll=e=>f.dismiss(void 0,e);f.remove=(e,t)=>{let a={type:4,toastId:e};t?H(t)(a):ge(a)};f.removeAll=e=>f.remove(void 0,e);f.promise=(e,t,a)=>{let o=f.loading(t.loading,{...a,...a?.loading});return typeof e=="function"&&(e=e()),e.then(l=>{let i=t.success?U(t.success,l):void 0;return i?f.success(i,{id:o,...a,...a?.success}):f.dismiss(o),l}).catch(l=>{let i=t.error?U(t.error,l):void 0;i?f.error(i,{id:o,...a,...a?.error}):f.dismiss(o)}),e};var nt=1e3,it=(e,t="default")=>{let{toasts:a,pausedAt:o}=rt(e,t),l=c.useRef(new Map).current,i=c.useCallback((x,h=nt)=>{if(l.has(x))return;let g=setTimeout(()=>{l.delete(x),r({type:4,toastId:x})},h);l.set(x,g)},[]);c.useEffect(()=>{if(o)return;let x=Date.now(),h=a.map(g=>{if(g.duration===1/0)return;let A=(g.duration||0)+g.pauseDuration-(x-g.createdAt);if(A<0){g.visible&&f.dismiss(g.id);return}return setTimeout(()=>f.dismiss(g.id,t),A)});return()=>{h.forEach(g=>g&&clearTimeout(g))}},[a,o,t]);let r=c.useCallback(H(t),[t]),d=c.useCallback(()=>{r({type:5,time:Date.now()})},[r]),m=c.useCallback((x,h)=>{r({type:1,toast:{id:x,height:h}})},[r]),u=c.useCallback(()=>{o&&r({type:6,time:Date.now()})},[o,r]),p=c.useCallback((x,h)=>{let{reverseOrder:g=!1,gutter:A=8,defaultPosition:k}=h||{},y=a.filter(v=>(v.position||k)===(x.position||k)&&v.height),I=y.findIndex(v=>v.id===x.id),$=y.filter((v,L)=>L<I&&v.visible).length;return y.filter(v=>v.visible).slice(...g?[$+1]:[0,$]).reduce((v,L)=>v+(L.height||0)+A,0)},[a]);return c.useEffect(()=>{a.forEach(x=>{if(x.dismissed)i(x.id,x.removeDelay);else{let h=l.get(x.id);h&&(clearTimeout(h),l.delete(x.id))}})},[a,i]),{toasts:a,handlers:{updateHeight:m,startPause:d,endPause:u,calculateOffset:p}}},lt=C`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,ct=C`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,dt=C`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,mt=O("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${lt} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${ct} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${e=>e.secondary||"#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${dt} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,pt=C`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,ut=O("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||"#e0e0e0"};
  border-right-color: ${e=>e.primary||"#616161"};
  animation: ${pt} 1s linear infinite;
`,xt=C`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,ht=C`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,gt=O("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${xt} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${ht} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${e=>e.secondary||"#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,ft=O("div")`
  position: absolute;
`,bt=O("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,yt=C`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,vt=O("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${yt} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,jt=({toast:e})=>{let{icon:t,type:a,iconTheme:o}=e;return t!==void 0?typeof t=="string"?c.createElement(vt,null,t):t:a==="blank"?null:c.createElement(bt,null,c.createElement(ut,{...o}),a!=="loading"&&c.createElement(ft,null,a==="error"?c.createElement(mt,{...o}):c.createElement(gt,{...o})))},Nt=e=>`
0% {transform: translate3d(0,${e*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,wt=e=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${e*-150}%,-1px) scale(.6); opacity:0;}
`,Ct="0%{opacity:0;} 100%{opacity:1;}",At="0%{opacity:1;} 100%{opacity:0;}",kt=O("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,St=O("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,Et=(e,t)=>{let a=e.includes("top")?1:-1,[o,l]=pe()?[Ct,At]:[Nt(a),wt(a)];return{animation:t?`${C(o)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${C(l)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}},Ot=c.memo(({toast:e,position:t,style:a,children:o})=>{let l=e.height?Et(e.position||t||"top-center",e.visible):{opacity:0},i=c.createElement(jt,{toast:e}),r=c.createElement(St,{...e.ariaProps},U(e.message,e));return c.createElement(kt,{className:e.className,style:{...l,...a,...e.style}},typeof o=="function"?o({icon:i,message:r}):c.createElement(c.Fragment,null,i,r))});Qe(c.createElement);var It=({id:e,className:t,style:a,onHeightUpdate:o,children:l})=>{let i=c.useCallback(r=>{if(r){let d=()=>{let m=r.getBoundingClientRect().height;o(e,m)};d(),new MutationObserver(d).observe(r,{subtree:!0,childList:!0,characterData:!0})}},[e,o]);return c.createElement("div",{ref:i,className:t,style:a},l)},Lt=(e,t)=>{let a=e.includes("top"),o=a?{top:0}:{bottom:0},l=e.includes("center")?{justifyContent:"center"}:e.includes("right")?{justifyContent:"flex-end"}:{};return{left:0,right:0,display:"flex",position:"absolute",transition:pe()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:`translateY(${t*(a?1:-1)}px)`,...o,...l}},Tt=W`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`,P=16,Rt=({reverseOrder:e,position:t="top-center",toastOptions:a,gutter:o,children:l,toasterId:i,containerStyle:r,containerClassName:d})=>{let{toasts:m,handlers:u}=it(a,i);return c.createElement("div",{"data-rht-toaster":i||"",style:{position:"fixed",zIndex:9999,top:P,left:P,right:P,bottom:P,pointerEvents:"none",...r},className:d,onMouseEnter:u.startPause,onMouseLeave:u.endPause},m.map(p=>{let x=p.position||t,h=u.calculateOffset(p,{reverseOrder:e,gutter:o,defaultPosition:t}),g=Lt(x,h);return c.createElement(It,{id:p.id,key:p.id,onHeightUpdate:u.updateHeight,className:p.visible?Tt:"",style:g},p.type==="custom"?U(p.message,p):l?l(p):c.createElement(Ot,{toast:p,position:x}))}))},M=f;async function $t(){return(await B.get(route("geo.countries"))).data}async function Mt(e){return(await B.get(route("geo.states",{country:e}))).data}async function Dt(e,t){const a=new FormData;return a.append("state_id",e),a.append("file",t),(await B.post(route("geo.import.preview"),a)).data}async function _t(e,t){const a=new FormData;return a.append("state_id",e),a.append("file",t),(await B.post(route("geo.import.do"),a)).data}function F({n:e,label:t,active:a,done:o}){return s.jsxs("div",{className:"flex items-center gap-2",children:[s.jsx("div",{className:`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition ${o?"bg-green-500 text-white":a?"bg-indigo-700 text-white":"bg-gray-200 text-gray-400"}`,children:o?s.jsx(G,{className:"w-4 h-4"}):e}),s.jsx("span",{className:`text-sm font-medium hidden sm:block ${a?"text-indigo-900":o?"text-green-600":"text-gray-400"}`,children:t})]})}function K({done:e}){return s.jsx("div",{className:`flex-1 h-0.5 mx-2 ${e?"bg-green-400":"bg-gray-200"}`})}function R({icon:e,color:t,label:a,value:o}){const l={blue:"bg-blue-50 border-blue-100 text-blue-700",green:"bg-green-50 border-green-100 text-green-700",amber:"bg-amber-50 border-amber-100 text-amber-700"};return s.jsxs("div",{className:`rounded-xl border p-4 text-center ${l[t]}`,children:[s.jsx(e,{className:"w-6 h-6 mx-auto mb-1 opacity-70"}),s.jsx("p",{className:"text-2xl font-extrabold",children:Number(o).toLocaleString()}),s.jsx("p",{className:"text-xs mt-0.5 opacity-75",children:a})]})}function le(){return s.jsxs("svg",{className:"animate-spin h-4 w-4",fill:"none",viewBox:"0 0 24 24",children:[s.jsx("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),s.jsx("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8v8z"})]})}function Gt(){const[e,t]=c.useState(1),[a,o]=c.useState([]),[l,i]=c.useState([]),[r,d]=c.useState(""),[m,u]=c.useState(""),[p,x]=c.useState(""),[h,g]=c.useState(null),[A,k]=c.useState(!1),[y,I]=c.useState(null),[$,v]=c.useState(!1),[L,Q]=c.useState(!1),[_,q]=c.useState(null),J=c.useRef();c.useEffect(()=>{$t().then(n=>o(Array.isArray(n)?n:n.data??[])).catch(()=>{})},[]);const fe=async n=>{if(d(n),u(""),x(""),i([]),!!n)try{const b=await Mt(n);i(Array.isArray(b)?b:b.data??[])}catch{M.error("Failed to load states")}},be=n=>{u(n);const b=l.find(j=>String(j.id)===String(n));x(b?.name??""),n&&t(j=>Math.max(j,2))},ee=n=>{if(!n)return;const b=n.name.split(".").pop().toLowerCase();if(!["csv","xlsx","xls"].includes(b)){M.error("Only CSV or Excel files are supported");return}g(n),I(null),q(null),t(j=>Math.max(j,2))},ye=n=>{n.preventDefault(),k(!1),ee(n.dataTransfer.files[0])},ve=async()=>{if(!(!m||!h)){v(!0);try{const n=await Dt(m,h);I(n),t(3)}catch(n){const b=n?.response?.data?.errors?Object.values(n.response.data.errors).flat().join(" "):"Preview failed — check the file format.";M.error(b)}finally{v(!1)}}},je=async()=>{Q(!0);try{const n=await _t(m,h);q(n.stats),t(4),M.success(n.message)}catch(n){const b=n?.response?.data?.errors?Object.values(n.response.data.errors).flat().join(" "):n?.response?.data?.message??"Import failed.";M.error(b)}finally{Q(!1)}},Ne=()=>{t(1),d(""),u(""),x(""),i([]),g(null),I(null),q(null)},we=()=>{const n=["STATE NAME,STATE CODE,LGA NAME,LGA CODE,WARD NAME,WARD CODE,POLLING STATION LOCATION/NAME,POLLING STATION CODE","OSUN,OS,OSOGBO,1,OSOGBO CENTRAL,1,SECRETARIAT - SECRETARIAT I,1","OSUN,OS,OSOGBO,1,OSOGBO CENTRAL,1,SECRETARIAT - SECRETARIAT II,2","OSUN,OS,IFE CENTRAL,2,IFE CENTRAL 1,1,OBA'S PALACE - OBA'S PALACE A,1"].join(`
`),b=new Blob([n],{type:"text/csv"}),j=URL.createObjectURL(b),T=document.createElement("a");T.href=j,T.download="geo_import_sample.csv",T.click(),URL.revokeObjectURL(j)},te=m&&h;return s.jsxs(Ce,{title:"Geo Import",children:[s.jsx(Rt,{position:"top-right"}),s.jsxs("div",{className:"max-w-3xl mx-auto space-y-6",children:[s.jsxs("div",{className:"flex items-start justify-between gap-4",children:[s.jsxs("div",{children:[s.jsx("h2",{className:"text-2xl font-bold text-gray-800",children:"Geographic Data Import"}),s.jsx("p",{className:"text-sm text-gray-500 mt-0.5",children:"Bulk-seed LGAs, wards and polling units for a state from a CSV or Excel file."})]}),s.jsxs("button",{onClick:we,className:"flex items-center gap-2 text-sm text-indigo-700 border border-indigo-200 rounded-lg px-3 py-2 hover:bg-indigo-50 transition shrink-0",children:[s.jsx(_e,{className:"w-4 h-4"})," Sample CSV"]})]}),s.jsxs("div",{className:"flex items-center bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4",children:[s.jsx(F,{n:1,label:"Select State",active:e===1,done:!!m&&e>1}),s.jsx(K,{done:!!m&&e>1}),s.jsx(F,{n:2,label:"Upload File",active:e===2,done:!!h&&e>2}),s.jsx(K,{done:!!h&&e>2}),s.jsx(F,{n:3,label:"Preview",active:e===3,done:e>=4}),s.jsx(K,{done:e>=4}),s.jsx(F,{n:4,label:"Done",active:e===4,done:!1})]}),e===4&&_&&s.jsxs("div",{className:"bg-white rounded-2xl border border-green-100 shadow-sm p-8 text-center space-y-5",children:[s.jsx("div",{className:"w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto",children:s.jsx(G,{className:"w-8 h-8 text-green-600"})}),s.jsxs("div",{children:[s.jsx("h3",{className:"text-xl font-bold text-gray-800",children:"Import Complete!"}),s.jsxs("p",{className:"text-sm text-gray-500 mt-1",children:["Records created for ",s.jsx("span",{className:"font-semibold text-indigo-900",children:p}),":"]})]}),s.jsxs("div",{className:"grid grid-cols-3 gap-4",children:[s.jsx(R,{icon:ae,color:"blue",label:"LGAs Created",value:_.lgas}),s.jsx(R,{icon:re,color:"green",label:"Wards Created",value:_.wards}),s.jsx(R,{icon:oe,color:"amber",label:"Polling Units Created",value:_.polling_units})]}),s.jsx("p",{className:"text-xs text-gray-400",children:"Existing records were skipped — no duplicates created."}),s.jsx("button",{onClick:Ne,className:"mx-auto flex items-center gap-2 bg-indigo-700 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-800 transition text-sm font-semibold",children:"Import Another State"})]}),e<4&&s.jsxs("div",{className:"bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden",children:[s.jsxs("div",{className:"p-6 border-b border-gray-100",children:[s.jsxs("div",{className:"flex items-center gap-2 mb-4",children:[s.jsx("div",{className:"w-6 h-6 rounded-full bg-indigo-700 text-white flex items-center justify-center text-xs font-bold",children:"1"}),s.jsx("h3",{className:"font-semibold text-gray-800",children:"Select Country & State"})]}),s.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-4",children:[s.jsxs("div",{children:[s.jsx("label",{className:"block text-xs font-medium text-gray-600 mb-1.5",children:"Country"}),s.jsxs("select",{value:r,onChange:n=>fe(n.target.value),className:"w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white",children:[s.jsx("option",{value:"",children:"Select country…"}),a.map(n=>s.jsx("option",{value:n.id,children:n.name},n.id))]})]}),s.jsxs("div",{children:[s.jsx("label",{className:"block text-xs font-medium text-gray-600 mb-1.5",children:"State"}),s.jsxs("select",{value:m,onChange:n=>be(n.target.value),disabled:!r||l.length===0,className:"w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400",children:[s.jsx("option",{value:"",children:"Select state…"}),l.map(n=>s.jsx("option",{value:n.id,children:n.name},n.id))]})]})]})]}),s.jsxs("div",{className:`p-6 border-b border-gray-100 transition ${m?"":"opacity-40 pointer-events-none"}`,children:[s.jsxs("div",{className:"flex items-center gap-2 mb-4",children:[s.jsx("div",{className:"w-6 h-6 rounded-full bg-indigo-700 text-white flex items-center justify-center text-xs font-bold",children:"2"}),s.jsx("h3",{className:"font-semibold text-gray-800",children:"Upload File"}),s.jsx("span",{className:"text-xs text-gray-400 ml-1",children:"CSV, XLS or XLSX · max 10 MB"})]}),h?s.jsxs("div",{className:"flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3",children:[s.jsx(Fe,{className:"w-8 h-8 text-indigo-500 shrink-0"}),s.jsxs("div",{className:"flex-1 min-w-0",children:[s.jsx("p",{className:"text-sm font-medium text-indigo-900 truncate",children:h.name}),s.jsxs("p",{className:"text-xs text-indigo-400",children:[(h.size/1024).toFixed(1)," KB"]})]}),s.jsx("button",{onClick:()=>{g(null),I(null)},className:"text-indigo-300 hover:text-red-500 transition",children:s.jsx(He,{className:"w-4 h-4"})})]}):s.jsxs("div",{onDragOver:n=>{n.preventDefault(),k(!0)},onDragLeave:()=>k(!1),onDrop:ye,onClick:()=>J.current?.click(),className:`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${A?"border-indigo-400 bg-indigo-50":"border-gray-200 hover:border-indigo-300 hover:bg-gray-50"}`,children:[s.jsx(ne,{className:"w-10 h-10 text-gray-300 mx-auto mb-3"}),s.jsx("p",{className:"text-sm font-medium text-gray-600",children:"Drag & drop your file here"}),s.jsx("p",{className:"text-xs text-gray-400 mt-1",children:"or click to browse"}),s.jsx("input",{ref:J,type:"file",accept:".csv,.xlsx,.xls",className:"hidden",onChange:n=>ee(n.target.files[0])})]}),s.jsxs("div",{className:"mt-3 flex flex-wrap gap-2",children:[["LGA NAME","WARD NAME","POLLING STATION LOCATION/NAME"].map(n=>s.jsxs("span",{className:"inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-mono",children:[s.jsx(G,{className:"w-3 h-3 text-green-500"})," ",n]},n)),s.jsx("span",{className:"text-xs text-gray-400 self-center",children:"— required columns"})]})]}),s.jsxs("div",{className:`p-6 transition ${te?"":"opacity-40 pointer-events-none"}`,children:[s.jsxs("div",{className:"flex items-center gap-2 mb-4",children:[s.jsx("div",{className:"w-6 h-6 rounded-full bg-indigo-700 text-white flex items-center justify-center text-xs font-bold",children:"3"}),s.jsx("h3",{className:"font-semibold text-gray-800",children:"Preview & Import"})]}),y?s.jsxs("div",{className:"space-y-4",children:[s.jsxs("div",{className:"flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3",children:[s.jsx(G,{className:"w-5 h-5 text-green-600 shrink-0"}),s.jsxs("div",{className:"flex-1 min-w-0",children:[s.jsxs("p",{className:"text-sm font-semibold text-green-800",children:["Matched state: ",s.jsx("span",{className:"font-bold",children:p.toUpperCase()})]}),s.jsxs("p",{className:"text-xs text-green-600 mt-0.5",children:[y.rows?.toLocaleString()," rows matched this state.",y.file_states?.length>1&&s.jsxs("span",{className:"ml-1 text-green-500",children:["(File also has: ",y.file_states.filter(n=>n.toUpperCase()!==p.toUpperCase()).join(", "),")"]})]})]})]}),s.jsxs("div",{className:"grid grid-cols-3 gap-3",children:[s.jsx(R,{icon:ae,color:"blue",label:"LGAs found",value:y.lga_count}),s.jsx(R,{icon:re,color:"green",label:"Wards found",value:y.ward_count}),s.jsx(R,{icon:oe,color:"amber",label:"Polling Units found",value:y.pu_count})]}),s.jsxs("div",{className:"bg-gray-50 rounded-xl border border-gray-100 p-4",children:[s.jsxs("p",{className:"text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2",children:["LGAs detected for ",p]}),s.jsxs("div",{className:"flex flex-wrap gap-2",children:[(y.lgas??[]).map((n,b)=>s.jsx("span",{className:"text-xs bg-white border border-gray-200 text-gray-700 px-2.5 py-1 rounded-lg font-medium",children:n},b)),y.lga_count>5&&s.jsxs("span",{className:"text-xs text-gray-400 self-center",children:["+ ",y.lga_count-5," more"]})]})]}),s.jsxs("div",{className:"flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800",children:[s.jsx($e,{className:"w-5 h-5 shrink-0 mt-0.5"}),s.jsxs("p",{children:["Existing records will be ",s.jsx("strong",{children:"skipped"})," — no duplicates created. This will add up to ",s.jsxs("strong",{children:[Number(y.pu_count).toLocaleString()," polling units"]})," to"," ",s.jsx("strong",{children:p}),"."]})]}),s.jsxs("div",{className:"flex gap-3",children:[s.jsx("button",{onClick:je,disabled:L,className:"flex-1 flex items-center justify-center gap-2 bg-indigo-700 text-white font-semibold py-3 rounded-xl hover:bg-indigo-800 disabled:opacity-50 transition text-sm",children:L?s.jsxs(s.Fragment,{children:[s.jsx(le,{})," Importing…"]}):s.jsxs(s.Fragment,{children:[s.jsx(ne,{className:"w-4 h-4"})," Confirm & Import"]})}),s.jsx("button",{onClick:()=>{I(null),t(2)},className:"px-5 py-3 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition",children:"Change File"})]})]}):s.jsx("button",{onClick:ve,disabled:!te||$,className:"w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition text-sm",children:$?s.jsxs(s.Fragment,{children:[s.jsx(le,{})," Analysing file…"]}):s.jsxs(s.Fragment,{children:[s.jsx(Te,{className:"w-4 h-4"})," Preview Import"]})})]})]}),s.jsxs("div",{className:"bg-white rounded-xl border border-gray-100 shadow-sm p-5",children:[s.jsx("p",{className:"text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3",children:"Expected File Format"}),s.jsx("div",{className:"overflow-x-auto",children:s.jsxs("table",{className:"text-xs w-full border-collapse",children:[s.jsx("thead",{children:s.jsx("tr",{className:"bg-indigo-900 text-white",children:["STATE NAME","STATE CODE","LGA NAME ✓","LGA CODE","WARD NAME ✓","WARD CODE","POLLING STATION LOCATION/NAME ✓","POLLING STATION CODE"].map(n=>s.jsx("th",{className:`px-3 py-2 text-left font-semibold whitespace-nowrap ${n.includes("✓")?"":"opacity-40"}`,children:n},n))})}),s.jsx("tbody",{children:[["OSUN","OS","OSOGBO","1","OSOGBO CENTRAL","1","SECRETARIAT - SECRETARIAT I","1"],["OSUN","OS","OSOGBO","1","OSOGBO CENTRAL","1","SECRETARIAT - SECRETARIAT II","2"],["OSUN","OS","IFE CENTRAL","2","IFE CENTRAL 1","1","OBA'S PALACE - BLOCK A","1"]].map((n,b)=>s.jsx("tr",{className:b%2===0?"bg-gray-50":"bg-white",children:n.map((j,T)=>s.jsx("td",{className:`px-3 py-2 border-b border-gray-100 ${[2,4,6].includes(T)?"font-medium text-indigo-800":"text-gray-400"}`,children:j},T))},b))})]})}),s.jsxs("p",{className:"text-xs text-gray-400 mt-2",children:["Columns marked ",s.jsx("span",{className:"text-indigo-700 font-semibold",children:"✓"})," are used. All others are ignored."]})]})]})]})}export{Gt as default};
