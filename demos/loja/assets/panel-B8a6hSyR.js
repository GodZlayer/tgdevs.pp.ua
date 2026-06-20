import{b as pa,s as ga,l as Ke,p as Wt,P as We,i as j,e as Yt,f as Zt,r as fa,D as Xt,L as ba,a as va,m as ya}from"./mobile-CGD7LI3b.js";import{M as x}from"./bootstrap.esm-D7Q7Nh7Y.js";const Ye=(le,ue)=>va(le,ue),N={createIcons:ga};document.addEventListener("DOMContentLoaded",()=>{pa("panel");const le=document.getElementById("panel-login-screen"),ue=document.getElementById("panel-app-shell"),Ze=document.getElementById("panel-login-form"),z=document.getElementById("panel-login-username"),me=document.getElementById("panel-login-password"),Se=document.getElementById("panel-login-error"),pe=document.getElementById("panel-login-submit"),Xe=document.getElementById("panel-logout-trigger"),Ae=document.getElementById("panel-admin-name"),et=document.querySelectorAll(".nav-link[data-section]"),eo=document.getElementById("section-title"),V=document.getElementById("content-area"),K=document.getElementById("store-hours-trigger"),O=document.getElementById("print-queue-trigger"),tt=document.getElementById("panel-store-link"),to=["operations","stock","ifood","logistics","finance"];let E=he(),c={products:[],product_categories:[],promotions:[],orders:[],queues:{to_print:0,preparing:0,in_route:0,completed:0,attention:0},stats:{revenue:0,total_orders:0,products_count:0,uber_costs:0,cancelled_count:0,awaiting_payment_count:0,print_pending_count:0,infinitepay_total:0},logistics:[],store_meta:{name:"Lumix Ice"},integrations:{storage_driver:"dnl_data_api"},store_settings:{ordering_enabled:!0,opening_time:"08:00",closing_time:"22:00",courier_rule_mode:"items_count",courier_items_threshold:8,courier_type_until_threshold:"moto",courier_type_above_threshold:"carro",courier_motorcycle_max_weight_kg:20,courier_motorcycle_max_size_cm:120,courier_car_max_weight_kg:80,courier_car_max_size_cm:260,uber_test_courier_type:"auto",private_dispatch_enabled:!1,private_dispatch_regions:[],is_open_now:!0},ifood:{configured:!1,merchant_id:"",sync_enabled:!1,catalog:{items:[],count:0},orders:[],events:[]}},R="",Ne=null,Ce=null,H=null,ot=0,ge=null,$=null,q=null,fe=!1,be=0,W=0,at=0,Y=[],Z="";const C=new Set;let X=null;const ve=new Set;let P={authenticated:!1,display_name:null,username:null};const k={unlockBound:!1,pendingBell:!1,hasSnapshotBaseline:!1,lastPendingPrintOrderIds:new Set};let Pe=null,Q=null,ee=null,Be=null,T={key:"name",direction:"asc"};const oo={operations:"Operacao",stock:"Estoque",ifood:"iFood",logistics:"Entregas",finance:"Financeiro"},ye="gelocrm_panel_snapshot_cache_v1",ao=5*60*1e3,io=6e4,no=9e4,it=I(void 0,!0);function I(e,t=!1){if(e==null||e==="")return t;if(typeof e=="boolean")return e;if(typeof e=="number")return e!==0;const o=String(e).trim().toLowerCase();return["0","false","no","nao","não","off"].includes(o)?!1:["1","true","yes","sim","on"].includes(o)?!0:t}const nt="/alerta.mp3",Te=[{key:"monday",ifood:"MONDAY",label:"Segunda"},{key:"tuesday",ifood:"TUESDAY",label:"Terca"},{key:"wednesday",ifood:"WEDNESDAY",label:"Quarta"},{key:"thursday",ifood:"THURSDAY",label:"Quinta"},{key:"friday",ifood:"FRIDAY",label:"Sexta"},{key:"saturday",ifood:"SATURDAY",label:"Sabado"},{key:"sunday",ifood:"SUNDAY",label:"Domingo"}];function ro(){k.pendingBell=!1,k.hasSnapshotBaseline=!1,k.lastPendingPrintOrderIds=new Set}function so(){try{const e=localStorage.getItem(ye);if(!e)return null;const t=JSON.parse(e),o=Number((t==null?void 0:t.savedAt)||0);return!o||Date.now()-o>ao?(localStorage.removeItem(ye),null):(t==null?void 0:t.data)??null}catch{return localStorage.removeItem(ye),null}}function co(e){try{localStorage.setItem(ye,JSON.stringify({savedAt:Date.now(),data:e}))}catch{}}function lo(){let e=document.getElementById("bulk-action-loading-modal");return e||(e=document.createElement("div"),e.id="bulk-action-loading-modal",e.className="modal fade",e.tabIndex=-1,e.setAttribute("aria-hidden","true"),e.setAttribute("data-bs-backdrop","static"),e.setAttribute("data-bs-keyboard","false"),e.innerHTML=`
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border border-secondary" style="background: var(--bg-card); color: var(--text-main);">
                        <div class="modal-body p-4 text-center">
                            <div class="spinner-border text-info mb-3" role="status" aria-hidden="true"></div>
                            <h5 class="fw-bold mb-2" id="bulk-action-loading-title">Aplicando alteracoes...</h5>
                            <p class="text-muted mb-0" id="bulk-action-loading-detail">Aguarde enquanto os itens selecionados sao atualizados.</p>
                        </div>
                    </div>
                </div>
            `,document.body.appendChild(e)),H||(H=new x(e)),H}function rt(e="Aplicando alteracoes...",t="Aguarde enquanto os itens selecionados sao atualizados."){const o=lo(),a=document.getElementById("bulk-action-loading-title"),i=document.getElementById("bulk-action-loading-detail");a&&(a.innerText=e),i&&(i.innerText=t),o.show()}function st(){H==null||H.hide()}function Fe(e={}){const t=Math.max(0,Number(e.stock_quantity||0)),o=Math.max(0,Math.min(t,Number(e.reserved_stock||0))),a=Math.max(0,Number(e.min_stock_alert||0)),i=Math.max(0,t-o);return{...e,id:Number(e.id||0),price:Number(e.price||0),stock_quantity:t,reserved_stock:o,min_stock_alert:a,available_stock:i,low_stock:i<=a,category:A(e.category),barcode:String(e.barcode||"").trim(),age_restricted:Number((e==null?void 0:e.age_restricted)||0)===1||(e==null?void 0:e.age_restricted)===!0,store_enabled:I(e.store_enabled,!0),ifood_enabled:I(e.ifood_enabled,!1)}}window.testNewOrderBell=()=>{const e=new Audio(nt);e.volume=1,e.play().then(()=>{k.pendingBell=!1}).catch(t=>console.error("Sound test failed:",t))};function dt(){const e=new Audio(nt);return e.volume=1,e.play().catch(t=>{console.warn("Auto-play blocked or sound failed, marked as pending:",t),k.pendingBell=!0,O&&(O.title="Clique em Testar Alerta para liberar o som do navegador.")}),!0}function uo(){if(k.unlockBound)return;k.unlockBound=!0;const e=["pointerdown","touchend","keydown"],t=()=>{e.forEach(a=>{document.removeEventListener(a,o)})},o=()=>{dt()&&t()};e.forEach(a=>{document.addEventListener(a,o,{passive:!0})})}function te(e){const t=String(e||"").trim().toLowerCase();return to.includes(t)?t:"operations"}function he(e=window.location.hash){return te(String(e||"").replace(/^#/,""))}function Ue(e=E){const t=te(e);et.forEach(o=>{const a=o.dataset.section===t;o.classList.toggle("active",a),o.classList.toggle("text-secondary",!a),a?o.setAttribute("aria-current","page"):o.removeAttribute("aria-current")})}function mo(e,{replace:t=!1}={}){const a=`#${te(e)}`;if(window.location.hash===a)return;const i=`${window.location.pathname}${window.location.search}${a}`;t?window.history.replaceState(null,"",i):window.history.pushState(null,"",i)}function _(e){return`R$ ${Number(e||0).toFixed(2)}`}function r(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function Oe(e){if(!e)return"--";const t=new Date(e);return Number.isNaN(t.getTime())?"--":t.toLocaleString("pt-BR")}function po(e){if(!e)return"--";const t=new Date(e);return Number.isNaN(t.getTime())?"--":t.toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}function Re(e){if(Array.isArray(e==null?void 0:e.items))return e.items;try{const t=JSON.parse((e==null?void 0:e.items)||"[]");return Array.isArray(t)?t:[]}catch{return[]}}function b(e,t="Erro inesperado."){var o;return((o=e==null?void 0:e.details)==null?void 0:o.message)||(e==null?void 0:e.details)||(e==null?void 0:e.error)||t}function oe(e=""){Se&&(Se.hidden=!e,Se.textContent=e)}function go(e){const t=String((e==null?void 0:e.display_name)||(e==null?void 0:e.username)||"Admin").trim()||"Admin";if(!j())return t;const o=t.split(/\s+/)[0]||t;if(o.length<=6)return o;const a=String((e==null?void 0:e.username)||"").trim();return a&&a.length<=6?a:"Admin"}function ae(e){P={authenticated:!!(e!=null&&e.authenticated),display_name:(e==null?void 0:e.display_name)||"Administrador",username:(e==null?void 0:e.username)||null},le&&(le.hidden=P.authenticated),ue&&(ue.hidden=!P.authenticated),Ae&&(Ae.textContent=go(P),Ae.title=P.display_name),P.authenticated?(W=0,Me(20,"Autenticado..."),oe(""),me&&(me.value=""),Ht()):ro(),N.createIcons()}async function ct(e){try{return await e.json()}catch{return{}}}function ie(e){const t=String((e==null?void 0:e.name)||""),o=String((e==null?void 0:e.code)||""),a=String((e==null?void 0:e.message)||"").toLowerCase();return t==="AbortError"||t==="TimeoutError"||o==="REQUEST_TIMEOUT"||a.includes("aborted")||a.includes("abort")}function lt(e){const t=new Error("Tempo limite da requisicao excedido.");return t.name="RequestTimeoutError",t.code="REQUEST_TIMEOUT",t.cause=e,t}function fo(e,t={},o=12e3){if(!o||t.signal)return Ye(e,t);const a=new AbortController,i=window.setTimeout(()=>{try{a.abort(new DOMException("Tempo limite da requisicao excedido.","TimeoutError"))}catch{a.abort()}},o);return Ye(e,{...t,signal:a.signal}).catch(n=>{throw ie(n)?lt(n):n}).finally(()=>window.clearTimeout(i))}function bo(e="Faca login no painel para continuar."){Qe(),Ge(),ae({authenticated:!1}),oe(e)}async function g(e,t={}){const{timeoutMs:o,...a}=t;let i;try{i=await fo(e,a,o??15e3)}catch(d){throw ie(d)?lt(d):d}const n=await ct(i);if(i.status===401){bo(b(n,"Faca login no painel para continuar."));const d=new Error("AUTH_REQUIRED");throw d.code="AUTH_REQUIRED",d}return{resp:i,data:n}}function ut(e){const t=Array.isArray(e==null?void 0:e.products)?e.products:[],o=Array.isArray(e==null?void 0:e.product_categories)?e.product_categories:[],a=M(Array.isArray(e==null?void 0:e.orders)?e.orders:[]),i=M(Array.isArray(e==null?void 0:e.logistics)?e.logistics:[]),n=e!=null&&e.stats&&!Array.isArray(e.stats)?e.stats:{},d=e!=null&&e.store_settings&&!Array.isArray(e.store_settings)?e.store_settings:{},m=e!=null&&e.ifood&&!Array.isArray(e.ifood)?e.ifood:{};return JSON.stringify({products:t.map(s=>[s.id,s.name,s.category,s.barcode,s.price,s.stock_quantity,s.img,s.age_restricted,s.store_enabled,s.ifood_enabled]),promotions:(Array.isArray(e==null?void 0:e.promotions)?e.promotions:[]).map(s=>[s.id,s.kind,s.title,s.min_subtotal,s.target_product_id,s.reward_product_id,s.special_price,s.trigger_keywords]),orders:a.map(s=>[s.id,s.status,s.payment_status,s.print_status,s.delivery_mode,s.delivery_region,s.delivery_status,s.uber_delivery_id,s.uber_order_id,s.uber_tracking_url,s.uber_error_message,s.uber_dropoff_eta,s.uber_courier_name,s.uber_courier_phone,s.uber_courier_vehicle,s.uber_courier_plate,s.printed_at,s.dispatched_at,s.ifood_delivery_localizer,s.ifood_pickup_code,s.ifood_display_id,s.ifood_delivery_by,s.total,s.delivery_fee]),product_categories:o.map(s=>[s.id,s.name,s.products_count]),logistics:i.map(s=>[s.id,s.status,s.delivery_mode,s.delivery_status,s.uber_delivery_id,s.uber_order_id,s.uber_tracking_url,s.uber_error_message,s.uber_courier_name,s.uber_courier_phone,s.dispatched_at]),stats:n,storeSettings:d,ifood:{merchant_id:m.merchant_id,sync_enabled:m.sync_enabled,synced_categories:Array.isArray(m.synced_categories)?m.synced_categories:[],orders_count:Array.isArray(m.orders)?m.orders.length:0,events_count:Array.isArray(m.events)?m.events.length:0},error:(e==null?void 0:e.error)??R})}function M(e=[]){const t=Array.isArray(e)?e:[],o=new Set,a=[];return t.forEach(i=>{const n=String((i==null?void 0:i.id)??"");!n||o.has(n)||(o.add(n),a.push(i))}),a}function mt(){Z=ut(c)}async function vo({showOverlay:e=!0}={}){if(!j()||!Array.isArray(c.products)||!c.products.length)return;const t=c.products.map(o=>({sourceUrl:o.img||Xt,version:`${o.id}:${o.img||""}`}));await Yt({namespace:"panel-products",signature:Zt(t),items:t,showOverlay:e,title:"Atualizando painel",message:"Baixando imagens dos produtos para o aparelho."})}async function yo(e=[],{showOverlay:t=!1,onProgress:o}={}){if(!j()||!Array.isArray(e)||!e.length)return;const a=e.map(i=>({sourceUrl:i.public_url||i.url||"",version:`${i.path||i.name||""}:${i.public_url||i.url||""}`}));await Yt({namespace:"panel-library",signature:Zt(a),items:a,showOverlay:t,title:"Atualizando biblioteca",message:"Baixando imagens da biblioteca para o aparelho.",onProgress:o})}function pt({message:e=""}={}){const t=document.getElementById("btn-storage-badge"),o=document.getElementById("drive-upload-area"),a=document.getElementById("upload-status");t&&(t.classList.remove("bg-secondary","bg-danger"),t.classList.add("bg-info","text-dark")),o&&(o.style.display="block"),a&&e&&(a.innerHTML=e),N.createIcons()}function Me(e,t){const o=document.getElementById("init-progress-bar"),a=document.getElementById("loader-status");o&&(o.style.width=`${e}%`),a&&(a.innerText=t)}function De(){const e=document.getElementById("content-loader");e&&(e.classList.add("fade-out"),setTimeout(()=>e.remove(),500))}function Le(e,t="Imagem",o="mobile-record-thumb"){return`
            <img
                src="${r(fa(e,Xt))}"
                data-fallback-src="${r(ba)}"
                onerror="this.onerror=null;this.src=this.dataset.fallbackSrc;"
                referrerpolicy="no-referrer"
                alt="${r(t)}"
                class="${o}"
                loading="lazy"
                decoding="async"
                style="object-fit: contain; background: var(--image-surface);"
            >
        `}function _e(){var o;const e=document.getElementById("product-image-library-body"),t=((o=document.getElementById("prod-img"))==null?void 0:o.value)||"";if(e){if(!Y.length){e.innerHTML='<div class="text-muted">Nenhuma imagem encontrada no storage.</div>';return}e.innerHTML=`
            <div class="product-image-library-grid">
                ${Y.map(a=>{const i=a.public_url||a.url||"",n=t&&i===t,d=encodeURIComponent(i);return`
                        <button type="button" class="product-image-tile ${n?"product-image-tile-active":""}" onclick="selectProductImageFromLibrary('${d}')">
                            <div class="product-image-thumb-wrap">
                                ${Le(i,a.name||"Imagem","product-image-thumb")}
                            </div>
                            <div class="product-image-caption">${r(a.name||"Imagem")}</div>
                        </button>
                    `}).join("")}
            </div>
        `,N.createIcons()}}async function je(e=!1){const t=document.getElementById("product-image-library-body");if(t){if(!e&&Y.length){_e();return}t.innerHTML='<div class="text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Carregando imagens salvas...</div>';try{const{resp:o,data:a}=await g("/api.php?action=list_product_images&limit=48");if(!o.ok||a!=null&&a.error)throw new Error(b(a,"Nao foi possivel carregar a biblioteca de imagens."));Y=Array.isArray(a==null?void 0:a.items)?a.items:[],await yo(Y,{showOverlay:!1,onProgress:({completed:i,total:n,percent:d})=>{t.innerHTML=`<div class="text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Baixando imagens salvas... ${n>0?`${i}/${n}`:`${d||0}%`}</div>`}}),_e()}catch(o){t.innerHTML=`<div class="text-danger">${r(o.message||"Erro ao carregar imagens salvas.")}</div>`}}}window.refreshProductImageLibrary=(e=!1)=>{je(!!e)};function gt(){Pe=window.clearTimeout(Pe),Pe=window.setTimeout(async()=>{try{await g("/api.php?action=sync_ifood_catalog",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"stock_only"})})}catch(e){console.warn("iFood stock sync skipped",e)}},700)}function D(e){e!=null&&e.ifood_catalog||gt()}async function ho(e,t={},o={}){const{resp:a,data:i}=await g(e,o);if(!a.ok||i&&!Array.isArray(i)&&i.error)throw new Error(b(i,"Falha ao carregar dados."));return i&&!Array.isArray(i)?i:t}function _o(){const e=localStorage.getItem("gelocrm_admin_theme")||"dark";document.documentElement.setAttribute("data-bs-theme",e);const t=document.getElementById("theme-icon");t&&t.setAttribute("data-lucide",e==="light"?"moon":"sun")}window.toggleTheme=()=>{const e=document.documentElement,o=(e.getAttribute("data-bs-theme")||"dark")==="light"?"dark":"light";e.setAttribute("data-bs-theme",o),localStorage.setItem("gelocrm_admin_theme",o);const a=document.getElementById("theme-icon");a&&a.setAttribute("data-lucide",o==="light"?"moon":"sun"),N.createIcons()};async function wo(){const{resp:e,data:t}=await g("/api.php?action=admin_session",{timeoutMs:12e3});if(!e.ok||t!=null&&t.error)throw new Error(b(t,"Nao foi possivel validar a sessao do painel."));return ae(t),t}async function Eo(e){var t;if(e==null||e.preventDefault(),!(!z||!me)){oe(""),pe&&(pe.disabled=!0);try{const o=await Ye("/api.php?action=admin_login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:z.value.trim(),password:me.value})}),a=await ct(o);if(!o.ok||a!=null&&a.error||!((t=a==null?void 0:a.session)!=null&&t.authenticated))throw new Error(b(a,"Nao foi possivel entrar no painel."));ae(a.session),await S(he(),{replaceHash:!0})}catch(o){(o==null?void 0:o.code)!=="AUTH_REQUIRED"&&oe(o.message||"Nao foi possivel entrar no painel.")}finally{pe&&(pe.disabled=!1)}}}async function ft(){Qe(),Ge();try{await g("/api.php?action=admin_logout",{method:"POST",headers:{"Content-Type":"application/json"}})}catch{}ae({authenticated:!1}),z&&z.focus()}function bt(){const e=document.getElementById("printQueueModal");return e?(Ne||(Ne=new x(e)),Ne):null}function vt(){const e=document.getElementById("storeHoursModal");return e?(Ce||(Ce=new x(e)),Ce):null}function yt(e){return!e||e.payment_status!=="paid"||e.status==="awaiting_payment"?"hidden":B(e)==="pdv"?"completed":e.status==="cancelled"||e.delivery_status==="failed"?"attention":e.print_status!=="printed"?"to_print":e.status==="delivered"||e.delivery_status==="delivered"?"completed":e.status==="shipped"||e.delivery_status==="in_transit"?"in_route":"preparing"}function we(){const e={to_print:[],preparing:[],in_route:[],completed:[],attention:[]};return M(c.orders).forEach(t=>{const o=yt(t);o!=="hidden"&&e[o]&&e[o].push(t)}),e}function J(){return we().to_print}function ht(e=c.orders){const t=new Set;return(Array.isArray(e)?e:[]).forEach(a=>{yt(a)==="to_print"&&(a==null?void 0:a.id)!=null&&t.add(String(a.id))}),t}function xo(e=c.orders){k.hasSnapshotBaseline=!0,k.lastPendingPrintOrderIds=ht(e)}function Io(e=c.orders){const t=ht(e);if(!k.hasSnapshotBaseline){k.hasSnapshotBaseline=!0,k.lastPendingPrintOrderIds=t;return}const o=Array.from(t).some(a=>!k.lastPendingPrintOrderIds.has(a));k.lastPendingPrintOrderIds=t,o&&dt()}function _t(e){return(e==null?void 0:e.print_status)==="printed"?"Reimprimir":"Imprimir"}function ne(e,t="moto"){const o=String(e||"").trim().toLowerCase();return["moto","carro"].includes(o)?o:t}function ko(e){return ne(e,"moto")==="carro"?"Carro":"Moto"}function $o(e){const t=[{key:"barreiro",label:"Barreiro",fee:10},{key:"centro_sul",label:"Centro-Sul",fee:10},{key:"leste",label:"Leste",fee:10},{key:"nordeste",label:"Nordeste",fee:10},{key:"noroeste",label:"Noroeste",fee:10},{key:"norte",label:"Norte",fee:10},{key:"oeste",label:"Oeste",fee:10},{key:"pampulha",label:"Pampulha",fee:10},{key:"venda_nova",label:"Venda Nova",fee:10}];return!Array.isArray(e)||!e.length?t:t.map(o=>{const a=e.find(i=>String((i==null?void 0:i.key)||"")===o.key);return{key:o.key,label:String((a==null?void 0:a.label)||o.label),fee:Math.max(0,Number((a==null?void 0:a.fee)??o.fee)||o.fee)}})}function B(e){const t=String((e==null?void 0:e.delivery_mode)||"uber").toLowerCase();return["private","pdv","ifood"].includes(t)?t:"uber"}function Ee(e){return B(e)==="private"}function xe(e){return B(e)==="ifood"&&String((e==null?void 0:e.ifood_delivery_by)||"").toUpperCase()==="MERCHANT"}function wt(e){const t=B(e);return t==="private"?"Venda propria + entrega propria":t==="pdv"?"PDV - venda direta na loja":t==="ifood"?xe(e)?"iFood + entrega propria":"iFood + entrega iFood":"Venda propria + entrega Uber"}function Et(e){return B(e)==="ifood"||String((e==null?void 0:e.payment_provider)||"").toLowerCase()==="ifood"?"ifood":"app"}function xt(e,t=!1){const o=String(e||"").trim().toLowerCase();return o==="pix"?t?"PIX":"Pago PIX":o==="debit_card"?t?"Debito":"Pago debito":o==="credit_card"||o==="card"?t?"Credito":"Pago credito":o==="cash"?t?"Dinheiro":"Pago dinheiro":o==="ifood"?t?"iFood":"Pago iFood":o==="infinitepay"?t?"InfinitePay":"Pago InfinitePay":o?`Pago ${o.toUpperCase()}`:"Pagamento pendente"}function So(e){const t=Number((e==null?void 0:e.items_count)??0);return Number.isFinite(t)&&t>0?t:Re(e).reduce((o,a)=>o+Math.max(0,Number((a==null?void 0:a.quantity)||0)),0)}function It(e){const t=c.store_settings||{};if(String(t.courier_rule_mode||"items_count")!=="items_count")return null;const o=Math.max(1,Number(t.courier_items_threshold||8)),a=So(e),i=a<=o?ne(t.courier_type_until_threshold,"moto"):ne(t.courier_type_above_threshold,"carro");return{type:i,label:ko(i),items_count:a,threshold:o}}function kt(e){return!e||B(e)!=="uber"||Ee(e)||e.payment_status!=="paid"||e.status==="cancelled"||e.status==="delivered"||e.print_status!=="printed"||e.uber_delivery_id?!1:["not_requested","failed",""].includes(String(e.delivery_status||"not_requested"))}function $t(){const e=document.getElementById("store-courier-rule-mode"),t=document.getElementById("store-courier-items-threshold"),o=document.getElementById("store-courier-type-until-threshold"),a=document.getElementById("store-courier-type-above-threshold"),i=document.getElementById("store-courier-motorcycle-max-weight"),n=document.getElementById("store-courier-motorcycle-max-size"),d=document.getElementById("store-courier-car-max-weight"),m=document.getElementById("store-courier-car-max-size");document.getElementById("store-private-dispatch-enabled"),document.getElementById("store-private-dispatch-regions");const s=((e==null?void 0:e.value)||"items_count")==="items_count";t&&(t.disabled=!s),o&&(o.disabled=!s),a&&(a.disabled=!s),[i,n,d,m].forEach(u=>{u&&(u.disabled=!s)})}function Ao(e){const t=Array.isArray(e)?e:[],o=new Map(t.map(a=>[String((a==null?void 0:a.day)||(a==null?void 0:a.key)||"").toLowerCase(),a]));return Te.map(a=>{const i=o.get(a.key)||{};return{day:a.key,label:a.label,ifood_day:a.ifood,enabled:i.enabled!==!1,opening_time:String(i.opening_time||i.open||"08:00").slice(0,5),closing_time:String(i.closing_time||i.close||"22:00").slice(0,5)}})}function St(e,t){const o=document.getElementById(e);o&&(o.innerHTML=At(t))}function At(e){return Ao(e).map(t=>`
            <div class="weekly-hours-row" data-day="${r(t.day)}">
                <div class="weekly-hours-day">
                    <input class="form-check-input weekly-hours-enabled" type="checkbox" ${t.enabled?"checked":""} aria-label="${r(t.label)}">
                    <span>${r(t.label)}</span>
                </div>
                <input type="time" class="form-control bg-transparent border-secondary text-body weekly-hours-open" value="${r(t.opening_time)}">
                <input type="time" class="form-control bg-transparent border-secondary text-body weekly-hours-close" value="${r(t.closing_time)}">
            </div>
        `).join("")}function ze(e){return Array.from(document.querySelectorAll(`#${e} .weekly-hours-row`)).map(t=>{var i,n,d;const o=String(t.dataset.day||"").toLowerCase(),a=Te.find(m=>m.key===o)||Te[0];return{day:a.key,label:a.label,ifood_day:a.ifood,enabled:((i=t.querySelector(".weekly-hours-enabled"))==null?void 0:i.checked)===!0,opening_time:((n=t.querySelector(".weekly-hours-open"))==null?void 0:n.value)||"08:00",closing_time:((d=t.querySelector(".weekly-hours-close"))==null?void 0:d.value)||"22:00"}})}function re(){const e=c.store_settings||{},t=document.getElementById("store-hours-status"),o=document.getElementById("store-ordering-enabled"),a=document.getElementById("store-courier-rule-mode"),i=document.getElementById("store-courier-items-threshold"),n=document.getElementById("store-courier-type-until-threshold"),d=document.getElementById("store-courier-type-above-threshold"),m=document.getElementById("store-courier-motorcycle-max-weight"),s=document.getElementById("store-courier-motorcycle-max-size"),u=document.getElementById("store-courier-car-max-weight"),f=document.getElementById("store-courier-car-max-size"),p=document.getElementById("store-private-dispatch-enabled"),l=document.getElementById("store-private-dispatch-regions");if(t&&(t.innerText=e.is_open_now?"Aberto":"Fechado"),K&&(K.classList.toggle("btn-outline-info",!!e.is_open_now),K.classList.toggle("btn-outline-danger",!e.is_open_now)),o&&(o.checked=e.ordering_enabled!==!1),St("site-weekly-hours",e.site_weekly_hours),St("ifood-weekly-hours",e.ifood_weekly_hours),a&&(a.value=e.courier_rule_mode||"items_count"),i&&(i.value=String(Math.max(1,Number(e.courier_items_threshold||8)))),n&&(n.value=ne(e.courier_type_until_threshold,"moto")),d&&(d.value=ne(e.courier_type_above_threshold,"carro")),m&&(m.value=Number(e.courier_motorcycle_max_weight_kg??20).toFixed(2)),s&&(s.value=Number(e.courier_motorcycle_max_size_cm??120).toFixed(2)),u&&(u.value=Number(e.courier_car_max_weight_kg??80).toFixed(2)),f&&(f.value=Number(e.courier_car_max_size_cm??260).toFixed(2)),p&&(p.checked=e.private_dispatch_enabled===!0),l){const y=$o(e.private_dispatch_regions);l.innerHTML=y.map(v=>`
                <div class="col-12 col-md-6">
                    <label class="form-label small fw-bold text-muted text-uppercase">${r(v.label)}</label>
                    <div class="input-group">
                        <span class="input-group-text bg-transparent border-secondary text-body">R$</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            class="form-control bg-transparent border-secondary text-body store-private-region-fee"
                            data-region-key="${r(v.key)}"
                            data-region-label="${r(v.label)}"
                            value="${Number(v.fee||0).toFixed(2)}"
                            ${e.private_dispatch_enabled===!0?"":"disabled"}
                        >
                    </div>
                </div>
            `).join("")}$t(),N.createIcons()}function No(){const e=document.getElementById("print-queue-body");if(!e)return;const t=J();if(t.length===0){e.innerHTML='<div class="text-center py-4 text-muted">Nenhum pedido pago aguardando impressao.</div>';return}e.innerHTML=t.map(o=>`
            <div class="d-flex justify-content-between align-items-center gap-3 border border-secondary rounded-4 p-3 mb-3 bg-glass">
                <div>
                    <div class="fw-bold">Pedido #${o.id}</div>
                    <div class="small text-muted">Telefone: ${r(o.customer_phone||"Nao informado")}</div>
                </div>
                <button class="btn btn-warning btn-sm rounded-pill px-4" onclick="printOrder(${o.id})">
                    ${_t(o)}
                </button>
            </div>
        `).join("")}function se({autoOpen:e=!1}={}){var a;const t=J().length,o=document.getElementById("print-queue-count");o&&(o.innerText=String(t),o.style.display=t>0?"inline-flex":"none"),O&&(O.classList.toggle("btn-outline-warning",t>0),O.classList.toggle("btn-outline-secondary",t===0)),No(),e&&t>0&&t>ot&&((a=bt())==null||a.show()),ot=t,N.createIcons()}function Nt(e={}){const t=Array.isArray(e.products)?e.products.map(n=>Fe(n)):[],o={products:t,product_categories:Array.isArray(e.product_categories)?e.product_categories:c.product_categories,promotions:Array.isArray(e.promotions)?e.promotions:[],orders:M(Array.isArray(e.orders)?e.orders:[]),logistics:M(Array.isArray(e.logistics)?e.logistics:[]),stats:e.stats&&!Array.isArray(e.stats)?e.stats:c.stats,store_settings:e.store_settings&&!Array.isArray(e.store_settings)?e.store_settings:c.store_settings,ifood:e.ifood&&!Array.isArray(e.ifood)?e.ifood:c.ifood,error:""};return ut(o)!==Z||R!==""?(c.products=t,c.promotions=Array.isArray(e.promotions)?e.promotions:[],c.orders=M(Array.isArray(e.orders)?e.orders:[]),c.queues=e.queues&&!Array.isArray(e.queues)?e.queues:c.queues,c.stats=e.stats&&!Array.isArray(e.stats)?e.stats:c.stats,c.logistics=M(Array.isArray(e.logistics)?e.logistics:[]),c.store_meta=e.store_meta&&!Array.isArray(e.store_meta)?e.store_meta:c.store_meta,c.store_settings=e.store_settings&&!Array.isArray(e.store_settings)?e.store_settings:c.store_settings,c.ifood=e.ifood&&!Array.isArray(e.ifood)?e.ifood:c.ifood,c.store_settings.is_open_now=c.store_settings.ordering_enabled!==!1,Io(c.orders),R="",mt(),re(),se(),pt(),!0):!1}function Ct(){window.setTimeout(()=>{vo({showOverlay:!1}).catch(e=>{console.error("Failed to sync panel product images",e)})},0)}async function L({force:e=!1}={}){return X||(X=(async()=>{try{Me(50,"Carregando dados...");const t=await ho("/api.php?action=get_admin_snapshot",{},{timeoutMs:e?2e4:15e3}),o=Nt(t);return o&&(co(t),Ct()),Me(100,"Pronto!"),De(),o}catch(t){if(De(),(t==null?void 0:t.code)==="AUTH_REQUIRED"||ie(t)&&Z)return!1;console.error("Failed to fetch admin data",t);const o=(t==null?void 0:t.message)||"Falha ao carregar dados do painel.",a=R!==o;return R=o,a}finally{X=null}})(),X)}function Ie(e){if(!(e!=null&&e.id))return;const t={...e,items_count:e.items_count??0,items_preview:e.items_preview??""},o=c.orders.findIndex(a=>Number(a.id)===Number(e.id));o>=0?c.orders[o]={...c.orders[o],...t}:c.orders.unshift(t),c.queues={...c.queues,...Object.fromEntries(Object.entries(we()).map(([a,i])=>[a,i.length]))},mt(),xo(c.orders),se()}function Co(e){return`
            <div class="queue-summary-grid mb-4">
                <div class="summary-tile">
                    <div class="summary-kicker">A imprimir</div>
                    <div class="summary-value text-warning">${e.to_print.length}</div>
                </div>
                <div class="summary-tile">
                    <div class="summary-kicker">Em preparo</div>
                    <div class="summary-value text-info">${e.preparing.length}</div>
                </div>
                <div class="summary-tile">
                    <div class="summary-kicker">Em rota</div>
                    <div class="summary-value text-primary">${e.in_route.length}</div>
                </div>
                <div class="summary-tile">
                    <div class="summary-kicker">Finalizados</div>
                    <div class="summary-value text-success">${e.completed.length}</div>
                </div>
                <div class="summary-tile">
                    <div class="summary-kicker">Acao necessaria</div>
                    <div class="summary-value text-danger">${e.attention.length}</div>
                </div>
            </div>
        `}function Po(e,t=!1){const o={pending:"Pago / aguardando impressao",preparing:"Preparando pedido",shipped:"Em rota",delivered:"Entregue",cancelled:"Cancelado"},a={pending:"Pago",preparing:"Preparando",shipped:"Em rota",delivered:"Entregue",cancelled:"Cancelado"},i=o[e.status]||(e.payment_status==="paid"?xt(e.payment_method):"Pagamento pendente"),n=a[e.status]||(e.payment_status==="paid"?xt(e.payment_method,!0):"Pagamento"),d=e.print_status==="printed"?"Impresso":"A imprimir",m={not_requested:"Uber nao iniciada",dispatching:"Chamando Uber",created:"Uber criada",in_transit:"Em rota",delivered:"Entregue",failed:"Falha Uber"},s={not_requested:"Uber",dispatching:"Chamando",created:"Uber criada",in_transit:"Em rota",delivered:"Entregue",failed:"Falha Uber"},u={not_requested:"Particular pendente",dispatching:"Particular",created:"Particular",in_transit:"Em rota",delivered:"Entregue",failed:"Falha entrega"},f={not_requested:"Particular",dispatching:"Particular",created:"Particular",in_transit:"Em rota",delivered:"Entregue",failed:"Falha"},p={not_requested:"iFood pendente",created:"Entrega iFood",in_transit:"Entregador iFood",delivered:"Entregue iFood",failed:"Falha iFood"},l={not_requested:"Entrega propria pendente",created:"Entrega propria",in_transit:"Em rota",delivered:"Entregue",failed:"Falha entrega"},y=B(e),v=y==="pdv"?"Venda direta":y==="ifood"?t?"iFood":xe(e)?l[e.delivery_status]||"Entrega propria":p[e.delivery_status]||"Entrega iFood":Ee(e)?t?f[e.delivery_status]||"Particular":u[e.delivery_status]||"Particular":t?s[e.delivery_status]||"Uber":m[e.delivery_status]||"Uber pendente",w=e.print_status==="printed"?"success":"warning",U={not_requested:"secondary",dispatching:"warning",created:"info",in_transit:"primary",delivered:"success",failed:"danger"}[e.delivery_status]||"secondary";return`
            <div class="order-badges">
                <span class="status-chip status-chip-paid">${r(t?n:i)}</span>
                <span class="status-chip status-chip-${w}">${r(d)}</span>
                <span class="status-chip status-chip-${U}">${r(v)}</span>
            </div>
        `}function Bo(e){const t=[],o=B(e),a=e.ifood_details&&!Array.isArray(e.ifood_details)?e.ifood_details:{};if(o==="pdv")return t.push('<div><i data-lucide="store" size="14"></i> Venda direta no PDV da loja</div>'),t.push('<div><i data-lucide="check-circle" size="14"></i> Entrega/retirada concluida no ato</div>'),`<div class="order-meta mt-2">${t.join("")}</div>`;if(o==="ifood")return t.push('<div><i data-lucide="store" size="14"></i> Pedido recebido pelo iFood</div>'),(a.order_type||a.order_timing)&&t.push(`<div><i data-lucide="clock" size="14"></i> ${r([a.order_type,a.order_timing].filter(Boolean).join(" / "))}</div>`),a.document&&t.push(`<div><i data-lucide="id-card" size="14"></i> CPF/CNPJ: ${r(a.document)}</div>`),xe(e)?(t.push('<div><i data-lucide="truck" size="14"></i> Entrega propria da loja</div>'),e.ifood_delivery_localizer&&t.push(`<div><i data-lucide="key-round" size="14"></i> Codigo entrega: ${r(e.ifood_delivery_localizer)}</div>`)):t.push('<div><i data-lucide="bike" size="14"></i> Entrega gerenciada pelo iFood</div>'),a.delivery_observations&&t.push(`<div><i data-lucide="message-square" size="14"></i> Obs. entrega: ${r(a.delivery_observations)}</div>`),`<div class="order-meta mt-2">${t.join("")}</div>`;if(Ee(e))return e.delivery_region&&t.push(`<div><i data-lucide="map-pinned" size="14"></i> Regiao: ${r(e.delivery_region)}</div>`),t.push('<div><i data-lucide="truck" size="14"></i> Entrega particular da loja</div>'),`<div class="order-meta mt-2">${t.join("")}</div>`;if(e.uber_courier_name&&t.push(`<div><i data-lucide="user-round" size="14"></i> Entregador: ${r(e.uber_courier_name)}</div>`),e.uber_courier_vehicle||e.uber_courier_plate){const n=[e.uber_courier_vehicle,e.uber_courier_plate?`Placa ${e.uber_courier_plate}`:""].filter(Boolean).join(" · ");t.push(`<div><i data-lucide="bike" size="14"></i> ${r(n)}</div>`)}if(e.uber_courier_phone){const n=e.uber_courier_pin?` · PIN ${e.uber_courier_pin}`:"";t.push(`<div><i data-lucide="phone-call" size="14"></i> ${r(e.uber_courier_phone)}${r(n)}</div>`)}const i=e.uber_delivery_id||e.uber_order_id;return i&&t.push(`<div><i data-lucide="hash" size="14"></i> Codigo Uber: ${r(i)}</div>`),t.length?`<div class="order-meta mt-2">${t.join("")}</div>`:""}function To(e,t){const o=[],a=It(e),i=B(e);return t==="to_print"?o.push(`<button class="btn btn-warning btn-sm rounded-pill px-3" onclick="printOrder(${e.id})"><i data-lucide="printer" size="14"></i> Imprimir</button>`):o.push(`<button class="btn btn-sm btn-outline-primary rounded-pill px-3" onclick="printOrder(${e.id})"><i data-lucide="printer" size="14"></i> ${_t(e)}</button>`),kt(e)&&o.push(`<button class="btn btn-sm btn-outline-warning rounded-pill px-3" onclick="dispatchOrder(${e.id})"><i data-lucide="truck" size="14"></i> Despachar${a?` (${r(a.label)})`:""}</button>`),t==="preparing"&&Ee(e)&&o.push(`<button class="btn btn-sm btn-outline-info rounded-pill px-3" onclick="updateOrderStatus(${e.id}, 'shipped')"><i data-lucide="truck" size="14"></i> Marcar em rota</button>`),t==="preparing"&&i==="ifood"&&o.push(`<button class="btn btn-sm btn-outline-info rounded-pill px-3" onclick="updateOrderStatus(${e.id}, 'shipped')"><i data-lucide="package-check" size="14"></i> Pronto para coleta</button>`),t==="preparing"&&i==="uber"&&!kt(e)&&e.uber_delivery_id&&o.push(`<button class="btn btn-sm btn-outline-info rounded-pill px-3" onclick="updateOrderStatus(${e.id}, 'shipped')"><i data-lucide="truck" size="14"></i> Marcar em rota</button>`),t==="in_route"&&i==="ifood"&&e.delivery_status!=="in_transit"?o.push(`<button class="btn btn-sm btn-outline-warning rounded-pill px-3" onclick="updateOrderStatus(${e.id}, 'shipped')"><i data-lucide="truck" size="14"></i> Saiu para entrega</button>`):t==="in_route"&&i==="ifood"?o.push('<span class="status-chip status-chip-info">Entrega confirma no iFood</span>'):t==="in_route"&&o.push(`<button class="btn btn-sm btn-outline-success rounded-pill px-3" onclick="updateOrderStatus(${e.id}, 'delivered')"><i data-lucide="check" size="14"></i> Marcar entregue</button>`),t==="attention"&&e.print_status==="printed"&&i==="uber"&&o.push(`<button class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="retryUberDispatch(${e.id})"><i data-lucide="refresh-cw" size="14"></i> Tentar despacho</button>`),e.uber_tracking_url&&o.push(`<a class="btn btn-sm btn-outline-secondary rounded-pill px-3" href="${r(e.uber_tracking_url)}" target="_blank" rel="noreferrer"><i data-lucide="external-link" size="14"></i> Tracking</a>`),`<div class="order-actions">${o.join("")}</div>`}function Fo(e,t){const o=ve.has(e.id),a=Re(e),i=a.length?a.slice(0,4).map(w=>`<li>${Number(w.quantity||0)}x ${r(w.name||"Item")}${w.observation?`<div class="small text-warning">${r(w.observation)}</div>`:""}</li>`).join(""):"<li>Itens indisponiveis</li>",n=e.uber_error_message?`<div class="order-alert">${r(e.uber_error_message)}</div>`:"",d=e.uber_dropoff_eta?`<div class="small text-muted">ETA Uber: ${Oe(e.uber_dropoff_eta)}</div>`:"",m=e.dispatched_at?`<div class="small text-muted">Despachado em ${Oe(e.dispatched_at)}</div>`:"",s=It(e),u=B(e),f=s&&u==="uber"&&!e.dispatched_at?`<div class="small text-muted">Sugestao de despacho: ${r(s.label)} para ${s.items_count} item(ns).</div>`:"",p=u==="pdv"?"Venda presencial":u==="ifood"?xe(e)?e.address||"Endereco nao informado":"Endereco gerenciado pelo iFood":e.address||"Endereco nao informado",l=e.ifood_details&&!Array.isArray(e.ifood_details)?e.ifood_details:{},y=u==="ifood"&&Array.isArray(l.payment_methods)&&l.payment_methods.length?`<div class="small text-muted">Pagamento iFood: ${r(l.payment_methods.join(", "))}${Number(l.cash_change_for||0)>0?` | Troco para ${_(l.cash_change_for)}`:""}</div>`:"",v=u==="ifood"&&Array.isArray(l.benefits)&&l.benefits.length?`<div class="small text-muted">Cupons: ${r(l.benefits.join(" | "))}</div>`:"";return`
            <article class="order-ticket ${t==="attention"?"order-ticket-error":""} ${o?"order-ticket-expanded":""}">
                <button class="order-ticket-summary" type="button" onclick="toggleOrderExpansion(${e.id})" aria-expanded="${o?"true":"false"}">
                    <div class="order-ticket-head">
                        <div>
                            <div class="order-kicker">Pedido #${e.id}</div>
                            <h3>${r(e.customer_name||"Cliente")}</h3>
                        </div>
                        <div class="order-ticket-head-side">
                            <div class="small text-muted text-end">
                                <div>${po(e.created_at)}</div>
                                <div>${_(e.total)}</div>
                            </div>
                            <span class="order-ticket-toggle-icon" aria-hidden="true">
                                <i data-lucide="chevron-down" size="18"></i>
                            </span>
                        </div>
                    </div>
                    ${Po(e,!0)}
                </button>
                <div class="order-ticket-details" ${o?"":"hidden"}>
                    <div class="order-meta">
                        <div><i data-lucide="route" size="14"></i> ${r(wt(e))}</div>
                        <div><i data-lucide="phone" size="14"></i> ${r(e.customer_phone||"Nao informado")}</div>
                        <div><i data-lucide="map-pin" size="14"></i> ${r(p)}</div>
                        <div><i data-lucide="package-2" size="14"></i> ${a.length} item(ns)</div>
                        ${e.uber_delivery_id?`<div><i data-lucide="truck" size="14"></i> Uber ${r(e.uber_delivery_id)}</div>`:""}
                    </div>
                    ${Bo(e)}
                    <ul class="order-items-list">${i}</ul>
                    ${f}
                    ${y}
                    ${v}
                    ${d}
                    ${m}
                    ${n}
                    ${To(e,t)}
                </div>
            </article>
        `}function Pt(e,t,o,a){return`
            <div class="queue-source-group">
                <div class="queue-source-title">
                    <span>${e}</span>
                    <span>${t.length}</span>
                </div>
                ${t.length?t.map(i=>Fo(i,o)).join(""):`<div class="queue-empty queue-empty-compact">${a}</div>`}
            </div>
        `}function de(e,t,o,a){const i=t.filter(d=>Et(d)!=="ifood"),n=t.filter(d=>Et(d)==="ifood");return`
            <section class="queue-column">
                <header class="queue-column-head">
                    <div>
                        <div class="queue-title">${e}</div>
                        <div class="queue-subtitle">App ${i.length} · iFood ${n.length}</div>
                    </div>
                    <span class="queue-count">${t.length}</span>
                </header>
                <div class="queue-column-body">
                    ${t.length?`${Pt("App",i,o,a)}${Pt("iFood",n,o,a)}`:`<div class="queue-empty">${a}</div>`}
                </div>
            </section>
        `}function Uo(){const e=we(),t=e.completed.slice(0,8);return`
            <div class="operations-shell animate__animated animate__fadeIn">
                ${Co(e)}
                <div class="queue-grid">
                    ${de("Recebidos",e.to_print,"to_print","Nenhum pedido recebido.")}
                    ${de("Preparando",e.preparing,"preparing","Nenhum pedido preparando.")}
                    ${de("Em Rota",e.in_route,"in_route","Nenhum pedido em rota.")}
                    ${de("Entregues",t,"completed","Nenhum pedido entregue.")}
                    ${de("Problemas",e.attention,"attention","Nenhuma pendencia operacional.")}
                </div>
            </div>
        `}function Bt(e,t=""){const o=I(e.ifood_enabled,!1);if(!o&&!G(e))return'<span class="badge text-bg-secondary rounded-pill px-3" title="Envie esta categoria ao iFood antes de ativar itens">Categoria fora do iFood</span>';const a=Number(e.id||0),n=Number(e.available_stock??e.stock_quantity??0)>0,d=_(e.ifood_effective_price??e.ifood_price??e.price),m=o&&n,s=n?m?`iFood Ativo - ${d}`:"iFood Inativo":"iFood Sem estoque";return`<button type="button" class="btn btn-xs ${n?m?"btn-success":"btn-outline-secondary":"btn-outline-warning"} rounded-pill px-3 ifood-status-toggle ${t}" onclick="toggleProductIfood(${a}, ${o?"false":"true"})" title="${n?o?"Desativar item no iFood":"Ativar item no iFood":"Reponha estoque para ativar no iFood"}" ${!n&&!o?"disabled":""}>${s}</button>`}function Tt(e,t=""){const o=I(e.store_enabled,!0),a=Number(e.id||0);return`<button type="button" class="btn btn-xs ${o?"btn-success":"btn-outline-secondary"} rounded-pill px-3 ifood-status-toggle ${t}" onclick="toggleProductStore(${a}, ${o?"false":"true"})" title="${o?"Desativar item na loja":"Ativar item na loja"}">${o?"Loja Ativo":"Loja Inativo"}</button>`}function He(){return c.products.map(e=>Number(e.id||0)).filter(e=>e>0)}function ce(){const e=new Set(He());return Array.from(C).forEach(t=>{e.has(Number(t))||C.delete(Number(t))}),Array.from(C).map(Number).filter(t=>e.has(t))}function Oo(){const e=ce().length,t=He().length,o=document.getElementById("stock-selected-count");o&&(o.textContent=`${e} selecionado${e===1?"":"s"}`),document.querySelectorAll("[data-stock-bulk-action]").forEach(a=>{a.disabled=e===0}),document.querySelectorAll("#stock-select-all, #stock-select-all-table").forEach(a=>{a.checked=t>0&&e===t,a.indeterminate=e>0&&e<t})}function Ro(){const e=ce(),t=e.map(d=>c.products.find(m=>Number(m.id||0)===Number(d))).filter(Boolean),o=e.length>0,a=t.length>0&&t.every(d=>G(d)),i=o?"":"disabled",n=!o||a?`<button type="button" class="btn btn-outline-success btn-sm rounded-pill px-3" data-stock-bulk-action onclick="bulkUpdateSelectedProducts('ifood_enabled', true)" ${i}>Ativar iFood</button>`:'<span class="badge text-bg-secondary rounded-pill px-3">Ativar iFood indisponivel para categoria nao enviada</span>';return`
            <div class="d-flex flex-wrap align-items-center gap-2 rounded-3 border border-secondary p-3 mb-3 theme-surface-soft">
                <div class="form-check me-2">
                    <input class="form-check-input" type="checkbox" id="stock-select-all" onchange="toggleAllStockSelection(this.checked)">
                    <label class="form-check-label small text-muted" for="stock-select-all">Selecionar todos</label>
                </div>
                <span class="badge text-bg-light rounded-pill" id="stock-selected-count">${e.length} selecionados</span>
                <button type="button" class="btn btn-outline-success btn-sm rounded-pill px-3" data-stock-bulk-action onclick="bulkUpdateSelectedProducts('store_enabled', true)" ${i}>Ativar loja</button>
                <button type="button" class="btn btn-outline-secondary btn-sm rounded-pill px-3" data-stock-bulk-action onclick="bulkUpdateSelectedProducts('store_enabled', false)" ${i}>Desativar loja</button>
                ${n}
                <button type="button" class="btn btn-outline-secondary btn-sm rounded-pill px-3" data-stock-bulk-action onclick="bulkUpdateSelectedProducts('ifood_enabled', false)" ${i}>Desativar iFood</button>
                <button type="button" class="btn btn-outline-info btn-sm rounded-pill px-3" data-stock-bulk-action onclick="bulkUpdateSelectedProductsCategory()" ${i}>Editar categoria</button>
                <button type="button" class="btn btn-outline-danger btn-sm rounded-pill px-3" data-stock-bulk-action onclick="bulkDeleteSelectedProducts()" ${i}>Excluir selecionados</button>
                <button type="button" class="btn btn-outline-light btn-sm rounded-pill px-3" onclick="clearStockSelection()">Limpar</button>
            </div>
        `}function A(e){return String(e||"Geral").trim()||"Geral"}function ke(){const e=(c.product_categories||[]).length?c.product_categories.map(t=>t.name):(c.products||[]).map(t=>t.category);return Array.from(new Set(e.map(t=>A(t)).filter(Boolean))).sort((t,o)=>t.localeCompare(o,"pt-BR"))}function Ft(e){return A(e).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"")}function Mo(){var t;const e=Array.isArray((t=c.ifood)==null?void 0:t.synced_categories)?c.ifood.synced_categories:[];return new Set(e.map(o=>Ft(o)).filter(Boolean))}function G(e){const t=Ft((e==null?void 0:e.category)||"Geral");return t!==""&&Mo().has(t)}function Do(){return(c.products||[]).reduce((e,t)=>{const o=A(t.category);return e[o]=(e[o]||0)+1,e},{})}function Lo(){const e=Do(),t=Array.isArray(c.product_categories)?c.product_categories:[];return t.length?t.map(o=>({id:Number(o.id||0),name:A(o.name),products_count:Number(o.products_count??e[A(o.name)]??0),persisted:Number(o.id||0)>0})):ke().map(o=>({id:0,name:o,products_count:Number(e[o]||0),persisted:!1}))}function Ut(e,t){const o=A(e.category),a=Number(e.available_stock??e.stock_quantity??0),i=Number(e.stock_quantity||0),n=I(e.store_enabled,!0)?1:0,d=I(e.ifood_enabled,!1)&&a>0?1:0;return{id:Number(e.id||0),name:String(e.name||""),category:o,barcode:String(e.barcode||""),stock:a,total_stock:i,min_stock:Number(e.min_stock_alert||0),price:Number(e.price||0),store_enabled:n,ifood_enabled:d}[t]??String(e.name||"")}function Ot(){const e=T.key||"name",t=T.direction==="desc"?-1:1;return[...c.products||[]].sort((o,a)=>{const i=Ut(o,e),n=Ut(a,e);return typeof i=="number"&&typeof n=="number"?(i-n||Number(o.id||0)-Number(a.id||0))*t:(String(i).localeCompare(String(n),"pt-BR",{numeric:!0,sensitivity:"base"})||Number(o.id||0)-Number(a.id||0))*t})}function F(e,t){const o=T.key===e,a=o?T.direction==="asc"?"arrow-up":"arrow-down":"chevrons-up-down",i=o&&T.direction==="asc"?"Ordenar decrescente":"Ordenar crescente";return`<button type="button" class="btn btn-link btn-sm p-0 text-reset text-decoration-none fw-semibold d-inline-flex align-items-center gap-1" onclick="setStockSort('${e}')" title="${i}">
            <span>${t}</span><i data-lucide="${a}" size="14"></i>
        </button>`}function jo(){let e=document.getElementById("ifood-category-selection-modal");return e||(e=document.createElement("div"),e.id="ifood-category-selection-modal",e.className="modal fade",e.tabIndex=-1,e.setAttribute("aria-hidden","true"),e.innerHTML=`
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border border-secondary" style="background: var(--bg-card); color: var(--text-main);">
                        <div class="modal-header border-secondary">
                            <div>
                                <h5 class="modal-title mb-1">Categorias para iFood</h5>
                                <div class="small text-muted">Marque as categorias locais que devem ser criadas ou atualizadas no iFood.</div>
                            </div>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div id="ifood-category-selection-list" class="d-flex flex-column gap-2"></div>
                            <div id="ifood-category-selection-error" class="text-danger small mt-3" hidden>Selecione pelo menos uma categoria.</div>
                        </div>
                        <div class="modal-footer border-secondary">
                            <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-danger rounded-pill px-4" id="ifood-category-selection-submit">Enviar ao iFood</button>
                        </div>
                    </div>
                </div>
            `,document.body.appendChild(e)),e}function zo(){let e=document.getElementById("ifood-catalog-progress-modal");return e||(e=document.createElement("div"),e.id="ifood-catalog-progress-modal",e.className="modal fade",e.tabIndex=-1,e.setAttribute("aria-hidden","true"),e.setAttribute("data-bs-backdrop","static"),e.setAttribute("data-bs-keyboard","false"),e.innerHTML=`
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border border-secondary" style="background: var(--bg-card); color: var(--text-main);">
                        <div class="modal-header border-secondary">
                            <div>
                                <h5 class="modal-title mb-1">Enviando cardapio iFood</h5>
                                <div class="small text-muted" id="ifood-catalog-progress-message">Preparando sincronizacao.</div>
                            </div>
                        </div>
                        <div class="modal-body">
                            <div class="progress mb-3" role="progressbar" aria-label="Progresso do cardapio iFood">
                                <div class="progress-bar progress-bar-striped progress-bar-animated bg-danger" id="ifood-catalog-progress-bar" style="width: 0%"></div>
                            </div>
                            <div class="d-flex justify-content-between small text-muted mb-3">
                                <span id="ifood-catalog-progress-phase">Iniciando</span>
                                <span id="ifood-catalog-progress-count">0 de 0 itens</span>
                            </div>
                            <div class="theme-surface-soft border border-secondary rounded-3 p-3">
                                <div class="small text-muted text-uppercase fw-bold mb-1">Categoria atual</div>
                                <div class="fw-semibold mb-3" id="ifood-catalog-progress-category">--</div>
                                <div class="small text-muted text-uppercase fw-bold mb-1">Item atual</div>
                                <div class="fw-semibold" id="ifood-catalog-progress-item">Aguardando o iFood...</div>
                            </div>
                        </div>
                    </div>
                </div>
            `,document.body.appendChild(e)),Q||(Q=x.getOrCreateInstance(e)),Q}function Ho(e){return{waiting:"Aguardando",starting:"Iniciando",catalog:"Catalogo remoto",category:"Categoria",item:"Itens",prices:"Precos",status:"Status",completed:"Concluido",error:"Erro"}[String(e||"").toLowerCase()]||"Sincronizando"}function $e(e={}){const t=Math.max(0,Number(e.total_items||0)),o=Math.max(0,Number(e.processed_items||0)),a=Math.max(o,Number(e.current_item||0)),i=t>0?Math.min(100,Math.round(o/t*100)):4,n=document.getElementById("ifood-catalog-progress-bar"),d=document.getElementById("ifood-catalog-progress-message"),m=document.getElementById("ifood-catalog-progress-phase"),s=document.getElementById("ifood-catalog-progress-count"),u=document.getElementById("ifood-catalog-progress-category"),f=document.getElementById("ifood-catalog-progress-item");n&&(n.style.width=`${String(e.phase||"")==="completed"?100:i}%`,n.classList.toggle("bg-danger",String(e.phase||"")!=="error"),n.classList.toggle("bg-warning",String(e.phase||"")==="error"),n.classList.toggle("progress-bar-animated",!["completed","error"].includes(String(e.phase||"")))),d&&(d.innerText=e.message||"Sincronizando com o iFood."),m&&(m.innerText=Ho(e.phase)),s&&(s.innerText=t>0?`${a||o} de ${t} itens`:"Aguardando itens"),u&&(u.innerText=e.category||(Array.isArray(e.categories)?e.categories.join(", "):"--")),f&&(f.innerText=e.item||(o>0?"Itens enviados, concluindo atualizacoes.":"Aguardando o iFood..."))}function qo(){var e;return(e=window.crypto)!=null&&e.randomUUID?window.crypto.randomUUID():`ifood-${Date.now()}-${Math.random().toString(16).slice(2)}`}function Rt(){ee&&(window.clearTimeout(ee),ee=null)}function Qo(e){Rt();const t=async()=>{try{const{resp:o,data:a}=await g(`/api.php?action=get_ifood_sync_progress&progress_id=${encodeURIComponent(e)}`,{timeoutMs:1e4});o.ok&&!a.error&&a.progress&&$e(a.progress)}catch(o){if((o==null?void 0:o.code)==="AUTH_REQUIRED")return}ee=window.setTimeout(t,900)};ee=window.setTimeout(t,250)}function Jo(){const e=ke();if(!e.length)return alert("Nenhuma categoria encontrada no estoque."),Promise.resolve(null);const t=jo(),o=document.getElementById("ifood-category-selection-list"),a=document.getElementById("ifood-category-selection-error"),i=document.getElementById("ifood-category-selection-submit");return!o||!i?Promise.resolve(null):(o.innerHTML=e.map((n,d)=>`
            <label class="form-check rounded-3 border border-secondary p-3 theme-surface-soft" for="ifood-category-${d}">
                <input class="form-check-input me-2" type="checkbox" id="ifood-category-${d}" value="${r(n)}">
                <span class="form-check-label fw-semibold">${r(n)}</span>
            </label>
        `).join(""),a&&(a.hidden=!0),new Promise(n=>{const d=x.getOrCreateInstance(t);let m=!1;const s=()=>{i.removeEventListener("click",f),t.removeEventListener("hidden.bs.modal",p)},u=l=>{m||(m=!0,s(),n(l))},f=()=>{const l=Array.from(o.querySelectorAll('input[type="checkbox"]:checked')).map(y=>y.value).filter(Boolean);if(!l.length){a&&(a.hidden=!1);return}d.hide(),u(l)},p=()=>u(null);i.addEventListener("click",f),t.addEventListener("hidden.bs.modal",p,{once:!0}),d.show()}))}function Mt(){const e=document.getElementById("prod-category");if(!e)return;const t=A(e.value),o=ke();e.innerHTML=o.map(a=>`<option value="${r(a)}">${r(a)}</option>`).join(""),e.value=o.includes(t)?t:o.includes("Geral")?"Geral":o[0]||""}function Dt(){const e=document.getElementById("product-categories-list");e&&(e.innerHTML=Lo().map(t=>`
            <tr>
                <td class="fw-semibold">${r(t.name||"Categoria")}</td>
                <td>${Number(t.products_count||0)}</td>
                <td class="text-end">
                    <button type="button" class="btn btn-sm btn-outline-info rounded-pill px-3" onclick="editProductCategory(${Number(t.id||0)}, decodeURIComponent('${encodeURIComponent(t.name||"")}'))">Editar</button>
                    <button type="button" class="btn btn-sm btn-outline-danger border-0" onclick="deleteProductCategory(${Number(t.id||0)})" title="Excluir categoria" ${t.persisted?"":"disabled"}>
                        <i data-lucide="trash-2" size="16"></i>
                    </button>
                </td>
            </tr>
        `).join("")||'<tr><td colspan="3" class="text-center text-muted py-3">Nenhuma categoria cadastrada.</td></tr>',N.createIcons())}function Go(){var t;let e=document.getElementById("product-categories-modal");return e||(e=document.createElement("div"),e.id="product-categories-modal",e.className="modal fade",e.tabIndex=-1,e.setAttribute("aria-hidden","true"),e.innerHTML=`
                <div class="modal-dialog modal-lg modal-dialog-centered">
                    <div class="modal-content border border-secondary" style="background: var(--bg-card); color: var(--text-main);">
                        <div class="modal-header border-secondary">
                            <h5 class="modal-title">Categorias de produtos</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="product-category-form" class="row g-2 align-items-end mb-4">
                                <input type="hidden" id="product-category-id">
                                <div class="col-md">
                                    <label class="form-label small text-muted text-uppercase fw-bold">Nome</label>
                                    <input id="product-category-name" class="form-control bg-transparent border-secondary text-body" maxlength="100" required>
                                </div>
                                <div class="col-md-auto d-flex gap-2">
                                    <button class="btn btn-primary rounded-pill px-4" type="submit" id="product-category-save">Criar</button>
                                    <button class="btn btn-outline-secondary rounded-pill px-3" type="button" onclick="resetProductCategoryForm()">Limpar</button>
                                </div>
                            </form>
                            <div class="table-responsive">
                                <table class="premium-table">
                                    <thead><tr><th>Categoria</th><th>Produtos</th><th class="text-end">Acoes</th></tr></thead>
                                    <tbody id="product-categories-list"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `,document.body.appendChild(e),(t=e.querySelector("#product-category-form"))==null||t.addEventListener("submit",Vo)),e}function qe(e){c.product_categories=Array.isArray(e)?e:[],Mt(),Dt()}window.resetProductCategoryForm=()=>{const e=document.getElementById("product-category-id"),t=document.getElementById("product-category-name"),o=document.getElementById("product-category-save");e&&(e.value=""),t&&(t.value="",t.focus()),o&&(o.innerText="Criar")},window.openProductCategoriesModal=async()=>{const e=Go();Dt(),window.resetProductCategoryForm(),x.getOrCreateInstance(e).show();try{const{resp:t,data:o}=await g("/api.php?action=get_product_categories");if(!t.ok||o!=null&&o.error)throw new Error(b(o,"Nao foi possivel carregar as categorias."));qe(Array.isArray(o)?o:[])}catch(t){if((t==null?void 0:t.code)==="AUTH_REQUIRED")return;console.warn("Product categories refresh failed",t)}};async function Vo(e){var a,i;e==null||e.preventDefault();const t=Number(((a=document.getElementById("product-category-id"))==null?void 0:a.value)||0),o=String(((i=document.getElementById("product-category-name"))==null?void 0:i.value)||"").trim();if(o)try{const{resp:n,data:d}=await g("/api.php?action=save_product_category",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:t,name:o})});if(!n.ok||d.error)throw new Error(b(d,"Nao foi possivel salvar a categoria."));qe(d.product_categories),window.resetProductCategoryForm(),await L({force:!0}).catch(()=>{})}catch(n){if((n==null?void 0:n.code)==="AUTH_REQUIRED")return;alert(n.message||"Nao foi possivel salvar a categoria.")}}window.editProductCategory=(e,t="")=>{const o=(c.product_categories||[]).find(i=>Number(i.id)===Number(e)),a=(o==null?void 0:o.name)||t||"";a&&(document.getElementById("product-category-id").value=o?String(o.id||""):"",document.getElementById("product-category-name").value=a,document.getElementById("product-category-save").innerText="Salvar")},window.deleteProductCategory=async e=>{const t=(c.product_categories||[]).find(o=>Number(o.id)===Number(e));if(!(!t||!confirm(`Excluir a categoria "${t.name}"?`)))try{const{resp:o,data:a}=await g(`/api.php?action=delete_product_category&id=${encodeURIComponent(e)}`);if(!o.ok||a.error)throw new Error(b(a,"Nao foi possivel excluir a categoria."));qe(a.product_categories),await L({force:!0}).catch(()=>{})}catch(o){if((o==null?void 0:o.code)==="AUTH_REQUIRED")return;alert(o.message||"Nao foi possivel excluir a categoria.")}};function Ko(e="Selecionar categoria"){const t=ke();if(!t.length)return alert("Cadastre uma categoria antes de continuar."),Promise.resolve(null);let o=document.getElementById("product-category-pick-modal");o||(o=document.createElement("div"),o.id="product-category-pick-modal",o.className="modal fade",o.tabIndex=-1,o.setAttribute("aria-hidden","true"),o.innerHTML=`
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border border-secondary" style="background: var(--bg-card); color: var(--text-main);">
                        <div class="modal-header border-secondary"><h5 class="modal-title" id="product-category-pick-title"></h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                        <div class="modal-body"><select id="product-category-pick-select" class="form-select bg-transparent border-secondary text-body"></select></div>
                        <div class="modal-footer border-secondary"><button class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Cancelar</button><button class="btn btn-primary rounded-pill px-4" id="product-category-pick-submit">Aplicar</button></div>
                    </div>
                </div>
            `,document.body.appendChild(o)),o.querySelector("#product-category-pick-title").innerText=e;const a=o.querySelector("#product-category-pick-select"),i=o.querySelector("#product-category-pick-submit");return a.innerHTML=t.map(n=>`<option value="${r(n)}">${r(n)}</option>`).join(""),new Promise(n=>{const d=x.getOrCreateInstance(o),m=()=>{i.removeEventListener("click",u),o.removeEventListener("hidden.bs.modal",f)},s=p=>{m(),n(p)},u=()=>{const p=a.value||null;d.hide(),s(p)},f=()=>s(null);i.addEventListener("click",u),o.addEventListener("hidden.bs.modal",f,{once:!0}),d.show()})}function Wo(){return`
            <div class="mobile-record-list">
                ${Ot().map(t=>`
            <article class="mobile-record-card">
                <div class="mobile-record-head">
                    <input class="form-check-input stock-row-checkbox mt-1" type="checkbox" aria-label="Selecionar ${r(t.name)}" ${C.has(Number(t.id||0))?"checked":""} onchange="toggleStockProductSelection(${Number(t.id||0)}, this.checked)">
                    ${Le(t.img,t.name,"mobile-record-thumb")}
                    <div class="min-w-0">
                        <div class="mobile-record-title">${r(t.name)}</div>
                        <div class="mobile-record-subtitle">Produto #${Number(t.id||0)} - ${r(A(t.category))}</div>
                        ${t.barcode?`<div class="small text-muted mt-1">Cod. barras: ${r(t.barcode)}</div>`:""}
                        ${t.age_restricted?'<div class="mt-2"><span class="badge text-bg-danger rounded-pill">18+</span></div>':""}
                    </div>
                </div>
                <div class="mobile-record-meta">
                        <div class="mobile-record-row">
                            <span>Estoque</span>
                            <span>${Number(t.available_stock??t.stock_quantity??0)} disp. / ${Number(t.stock_quantity||0)} total</span>
                        </div>
                        <div class="mobile-record-row">
                            <span>Status loja</span>
                            <span>${Tt(t,"ifood-status-toggle-mobile")}</span>
                        </div>
                        <div class="mobile-record-row">
                            <span>Status iFood</span>
                            <span>${Bt(t,"ifood-status-toggle-mobile")}</span>
                        </div>
                    <div class="mobile-record-row">
                        <span>Preco</span>
                        <span>${_(t.price)}</span>
                    </div>
                </div>
                <div class="mobile-record-actions">
                    <div class="d-flex gap-2 w-100 mb-2">
                        <button class="btn btn-sm btn-outline-success flex-grow-1" onclick="quickIncrementStock(${t.id}, 1)">+1</button>
                        <button class="btn btn-sm btn-outline-success flex-grow-1" onclick="quickIncrementStock(${t.id}, 10)">+10</button>
                    </div>
                    <button class="btn btn-dark border-secondary rounded-pill px-3" onclick="openProductModal(${t.id})">Editar produto</button>
                    <button class="btn btn-outline-danger rounded-pill px-3" onclick="deleteProduct(${t.id})">Excluir produto</button>
                </div>
            </article>
        `).join("")||'<div class="text-center py-4 text-muted">Nenhum produto cadastrado.</div>'}
            </div>
        `}function Yo(){const e=Array.isArray(c.promotions)?c.promotions:[];return e.length?`
            <div class="row g-3 mb-4">
                ${e.map(t=>`
                    <div class="col-12 col-xl-6">
                        <div class="rounded-4 border border-danger-subtle p-3 h-100 theme-surface-danger">
                            <div class="small fw-bold text-uppercase text-danger mb-2">${r(t.kind||"promocao")}</div>
                            <div class="fw-bold mb-1">${r(t.title||"Promocao ativa")}</div>
                            ${t.description?`<div class="small text-muted">${r(t.description)}</div>`:""}
                        </div>
                    </div>
                `).join("")}
            </div>
        `:`
                <div class="rounded-4 border border-secondary p-3 mb-4 theme-surface-soft">
                    <div class="small fw-bold text-uppercase text-muted mb-1">Promocoes automaticas</div>
                    <div class="small text-muted">Nenhuma promocao cadastrada. Use "Importar Lista" para subir catalogo e promocoes de uma vez.</div>
                </div>
            `}function Zo(){const e=Ot(),t=j()?Wo():`
                <div class="table-responsive">
                    <table class="premium-table">
                        <thead><tr><th><input class="form-check-input" type="checkbox" id="stock-select-all-table" onchange="toggleAllStockSelection(this.checked)" aria-label="Selecionar todos os produtos"></th><th>${F("id","ID")}</th><th>${F("name","Produto")}</th><th>${F("category","Categoria")}</th><th>${F("barcode","Cod. barras")}</th><th>${F("stock","Estoque")}</th><th>${F("min_stock","Min.")}</th><th>${F("price","Preco")}</th><th>${F("store_enabled","Status loja")}</th><th>${F("ifood_enabled","Status iFood")}</th><th>Acoes</th></tr></thead>
                        <tbody>
                            ${e.map(o=>`
                                <tr class="${o.low_stock?"table-warning":""}">
                                    <td><input class="form-check-input stock-row-checkbox" type="checkbox" aria-label="Selecionar ${r(o.name)}" ${C.has(Number(o.id||0))?"checked":""} onchange="toggleStockProductSelection(${Number(o.id||0)}, this.checked)"></td>
                                    <td>${o.id}</td>
                                    <td>
                                        <div class="d-flex align-items-center gap-3">
                                            ${Le(o.img,o.name,"rounded table-product-thumb")}
                                            <span>${r(o.name)}${o.age_restricted?' <span class="badge text-bg-danger rounded-pill ms-2">18+</span>':""}${o.low_stock?' <span class="badge text-bg-warning rounded-pill ms-2">baixo</span>':""}</span>
                                        </div>
                                    </td>
                                    <td><span class="badge text-bg-light rounded-pill">${r(A(o.category))}</span></td>
                                    <td>${o.barcode?r(o.barcode):'<span class="text-muted">--</span>'}</td>
                                    <td>
                                        <div class="d-flex align-items-center gap-2">
                                            <span class="fw-bold">${Number(o.available_stock??o.stock_quantity??0)}</span>
                                            <span class="small text-muted">/ ${Number(o.stock_quantity||0)}</span>
                                            <div class="btn-group">
                                                <button class="btn btn-xs btn-outline-success py-0 px-1" onclick="quickIncrementStock(${o.id}, 1)" title="Adicionar 1">+1</button>
                                                <button class="btn btn-xs btn-outline-success py-0 px-1" onclick="quickIncrementStock(${o.id}, 10)" title="Adicionar 10">+10</button>
                                                <button class="btn btn-xs btn-outline-light py-0 px-1" onclick="openStockAdjustPrompt(${o.id})" title="Ajuste manual">Ajustar</button>
                                            </div>
                                        </div>
                                    </td>
                                    <td>${Number(o.min_stock_alert||0)}</td>
                                    <td>${_(o.price)}</td>
                                    <td>${Tt(o)}</td>
                                    <td>${Bt(o)}</td>
                                    <td>
                                        <div class="d-flex gap-2">
                                            <button class="btn btn-sm btn-dark border-secondary rounded-pill px-3" onclick="openProductModal(${o.id})">Editar</button>
                                            <button class="btn btn-sm btn-outline-danger border-0 rounded-pill" onclick="deleteProduct(${o.id})"><i data-lucide="trash-2"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            `).join("")||'<tr><td colspan="11" class="text-center py-4 text-muted">Nenhum produto cadastrado.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            `;return`
            <div class="glass-card animate__animated animate__fadeIn">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h5 class="mb-1">Gestao de Estoque</h5>
                    </div>
                    <div class="d-flex flex-wrap gap-2">
                        <button class="btn btn-success btn-sm rounded-pill px-4" onclick="bulkIncrementStock()">
                            <i data-lucide="plus-circle" class="me-1" size="14"></i> Reposição Geral
                        </button>
                        <button class="btn btn-outline-warning btn-sm rounded-pill px-4" onclick="openPromotionsModal()">
                            <i data-lucide="sparkles" class="me-1" size="14"></i> Gerenciar Promoções
                        </button>
                        <button class="btn btn-outline-light btn-sm rounded-pill px-4" onclick="openCatalogImportModal()">Importar Lista</button>
                        <button class="btn btn-outline-info btn-sm rounded-pill px-4" onclick="downloadCatalogExportZip()">Exportar ZIP</button>
                        <button class="btn btn-outline-info btn-sm rounded-pill px-4" onclick="openProductCategoriesModal()">Categorias</button>
                        <button class="btn btn-outline-danger btn-sm rounded-pill px-4" onclick="syncIfoodCatalog()">
                            <i data-lucide="send" class="me-1" size="14"></i> Enviar cardapio iFood
                        </button>
                        <button class="btn btn-outline-success btn-sm rounded-pill px-4" onclick="activateAllProductsForIfood()">
                            Ativar lista iFood
                        </button>
                        <button class="btn btn-outline-secondary btn-sm rounded-pill px-4" onclick="deactivateAllProductsForIfood()">
                            Desativar lista iFood
                        </button>
                        <button class="btn btn-primary btn-sm rounded-pill px-4" onclick="openProductModal()">Novo Produto</button>
                    </div>
                </div>
                ${Yo()}
                ${Ro()}
                ${t}
            </div>
        `}function Xo(){var s;const e=c.ifood||{},t=Array.isArray(e.orders)?e.orders:[],o=Array.isArray(e.events)?e.events:[],a=Number.isFinite(Number((s=e.remote_catalog)==null?void 0:s.items_count))?Number(e.remote_catalog.items_count):null,i=e.auth||{},n=c.store_settings||{},d=e.authorized?"App autorizado":"Pendente",m=e.authorized?"conexao feita pelo app iFood":e.app_configured?"aguardando autorizacao pelo app iFood":"clientId/clientSecret pendentes";return`
            <div class="glass-card animate__animated animate__fadeIn">
                <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
                    <div>
                        <h5 class="mb-1">Gestao iFood</h5>
                    </div>
                    <div class="d-flex flex-wrap gap-2">
                        <button class="btn btn-outline-primary btn-sm rounded-pill px-4" onclick="startIfoodAuthorization()">
                            <i data-lucide="key-round" size="14" class="me-1"></i> Gerar codigo
                        </button>
                        <button class="btn btn-outline-success btn-sm rounded-pill px-4" onclick="finishIfoodAuthorization()">
                            <i data-lucide="check-circle" size="14" class="me-1"></i> Autorizar
                        </button>
                        <button class="btn btn-outline-light btn-sm rounded-pill px-4" onclick="refreshIfoodDashboard()">
                            <i data-lucide="refresh-cw" size="14" class="me-1"></i> Atualizar
                        </button>
                        <button class="btn btn-outline-warning btn-sm rounded-pill px-4" onclick="loadIfoodRemoteStatus()">
                            <i data-lucide="activity" size="14" class="me-1"></i> Status da loja
                        </button>
                        <button class="btn btn-outline-secondary btn-sm rounded-pill px-4" onclick="pauseIfoodStore()">
                            <i data-lucide="pause-circle" size="14" class="me-1"></i> Pausar 30 min
                        </button>
                        <button class="btn btn-outline-danger btn-sm rounded-pill px-4" onclick="syncIfoodCatalog()">
                            <i data-lucide="send" size="14" class="me-1"></i> Enviar catalogo
                        </button>
                    </div>
                </div>

                ${i.pending_user_code?`
                    <div class="theme-surface-soft rounded-3 border border-primary p-3 mb-4">
                        <div class="d-flex flex-wrap justify-content-between gap-3 align-items-center">
                            <div>
                                <div class="small text-muted text-uppercase fw-bold mb-1">Codigo de autorizacao</div>
                                <div class="h4 mb-0">${r(i.pending_user_code)}</div>
                            </div>
                            <a class="btn btn-primary rounded-pill px-4" href="${r(i.pending_verification_url||"https://portal.ifood.com.br/apps/code")}" target="_blank" rel="noopener">Abrir portal iFood</a>
                        </div>
                    </div>
                `:""}

                <div class="row g-3 mb-4">
                    <div class="col-12 col-lg-3">
                        <div class="theme-surface-soft rounded-3 border border-secondary p-3 h-100">
                            <div class="small text-muted text-uppercase fw-bold mb-1">Credenciais</div>
                            <div class="h5 mb-1">${r(d)}</div>
                            <div class="small text-muted">${r(m)}</div>
                        </div>
                    </div>
                    <div class="col-12 col-lg-3">
                        <div class="theme-surface-soft rounded-3 border border-secondary p-3 h-100">
                            <div class="small text-muted text-uppercase fw-bold mb-1">Itens no iFood</div>
                            <div class="h5 mb-1" id="ifood-remote-catalog-count">${a===null?"--":a}</div>
                            <div class="small text-muted" id="ifood-remote-catalog-hint">${a===null?"consultando catalogo remoto":"catalogo remoto retornado pelo iFood"}</div>
                        </div>
                    </div>
                    <div class="col-12 col-lg-3">
                        <div class="theme-surface-soft rounded-3 border border-secondary p-3 h-100">
                            <div class="small text-muted text-uppercase fw-bold mb-1">Pedidos importados</div>
                            <div class="h5 mb-1">${t.length}</div>
                            <div class="small text-muted">ultimos 50 no banco local</div>
                        </div>
                    </div>
                    <div class="col-12 col-lg-3">
                        <div class="theme-surface-soft rounded-3 border border-secondary p-3 h-100">
                            <div class="small text-muted text-uppercase fw-bold mb-1">Eventos</div>
                            <div class="h5 mb-1">${o.length}</div>
                            <div class="small text-muted">${e.sync_enabled?"estoque ativo":"estoque em dry run"}</div>
                        </div>
                    </div>
                </div>

                <div id="ifood-remote-status" class="small mb-4"></div>

                <div class="row g-4">
                    <div class="col-12 col-xl-5">
                        <h6 class="mb-3">Loja iFood</h6>
                        <div class="theme-surface-soft rounded-3 border border-secondary p-3 mb-3">
                            <div class="form-check form-switch mb-3">
                                <input id="ifood-settings-sync-enabled" class="form-check-input" type="checkbox" ${e.sync_enabled?"checked":""}>
                                <label class="form-check-label" for="ifood-settings-sync-enabled">Sincronizacao ativa somente de estoque</label>
                            </div>
                            <div class="mb-3">
                                <label class="form-label small text-muted text-uppercase fw-bold">Acrecimo nos itens iFood (%)</label>
                                <input id="ifood-settings-price-markup" type="number" min="28" step="0.01" class="form-control bg-transparent border-secondary text-body" value="${Math.max(28,Number(e.price_markup_percent||28))}">
                                <div class="form-text text-muted">Minimo permitido: 28%.</div>
                            </div>
                            <div class="d-flex flex-wrap gap-2">
                                <button class="btn btn-primary btn-sm rounded-pill px-4" onclick="saveIfoodPanelSettings()">Salvar loja</button>
                                <button class="btn btn-outline-light btn-sm rounded-pill px-4" onclick="discoverIfoodMerchants()">Lojas vinculadas</button>
                                <button class="btn btn-outline-info btn-sm rounded-pill px-4" onclick="loadIfoodStoreDetails()">Nome e endereco</button>
                            </div>
                        </div>

                        <div class="theme-surface-soft rounded-3 border border-secondary p-3 mb-3">
                            <div class="d-flex justify-content-between align-items-center gap-3 mb-3">
                                <h6 class="mb-0">Horario iFood</h6>
                                <button class="btn btn-outline-success btn-sm rounded-pill px-4" onclick="saveIfoodPanelHours()">Salvar horarios</button>
                            </div>
                            <div id="ifood-panel-weekly-hours" class="weekly-hours-grid">
                                ${At(n.ifood_weekly_hours)}
                            </div>
                        </div>

                        <div class="theme-surface-soft rounded-3 border border-secondary p-3">
                            <div class="d-flex justify-content-between align-items-center gap-3 mb-3">
                                <h6 class="mb-0">Pausa operacional</h6>
                                <button class="btn btn-outline-secondary btn-sm rounded-pill px-4" onclick="pauseIfoodStore()">Pausar 30 min</button>
                            </div>
                            <div id="ifood-store-editor-result" class="small text-muted"></div>
                        </div>
                    </div>
                    <div class="col-12 col-xl-7">
                        <h6 class="mb-3">Pedidos iFood</h6>
                        <div class="table-responsive">
                            <table class="premium-table">
                                <thead><tr><th>Pedido</th><th>Cliente</th><th>Status</th><th>Total</th><th>Acoes</th></tr></thead>
                                <tbody>
                                    ${t.map(u=>`
                                        <tr>
                                            <td>
                                                <div class="fw-bold">#${r(u.display_id||u.ifood_order_id||"")}</div>
                                                <div class="small text-muted">${r(u.ifood_order_id||"")}</div>
                                            </td>
                                            <td>${r(u.customer_name||"Cliente iFood")}</td>
                                            <td>${r(u.status||"--")}</td>
                                            <td>${_(u.total||0)}</td>
                                            <td>
                                                <div class="d-flex flex-wrap gap-1">
                                                    <button class="btn btn-xs btn-outline-success" onclick="ifoodOrderAction('${encodeURIComponent(u.ifood_order_id||"")}', 'confirm')">Confirmar</button>
                                                    <button class="btn btn-xs btn-outline-light" onclick="ifoodOrderAction('${encodeURIComponent(u.ifood_order_id||"")}', 'start_preparation')">Preparo</button>
                                                    <button class="btn btn-xs btn-outline-info" onclick="ifoodOrderAction('${encodeURIComponent(u.ifood_order_id||"")}', 'ready_to_pickup')">Pronto</button>
                                                    <button class="btn btn-xs btn-outline-warning" onclick="ifoodOrderAction('${encodeURIComponent(u.ifood_order_id||"")}', 'dispatch')">Saiu</button>
                                                    <button class="btn btn-xs btn-outline-secondary" onclick="openIfoodOrderDetails('${encodeURIComponent(u.ifood_order_id||"")}')">Detalhes</button>
                                                    <button class="btn btn-xs btn-outline-primary" onclick="openIfoodTracking('${encodeURIComponent(u.ifood_order_id||"")}')">Tracking</button>
                                                    <button class="btn btn-xs btn-outline-light" onclick="validateIfoodPickupCode('${encodeURIComponent(u.ifood_order_id||"")}')">Coleta</button>
                                                    <button class="btn btn-xs btn-outline-danger" onclick="requestIfoodOrderCancellation('${encodeURIComponent(u.ifood_order_id||"")}')">Cancelar</button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join("")||'<tr><td colspan="5" class="text-center py-4 text-muted">Nenhum pedido iFood importado.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="col-12">
                        <h6 class="mb-3">Eventos recentes</h6>
                        <div class="d-flex flex-column gap-2">
                            ${o.slice(0,12).map(u=>`
                                <div class="rounded-3 border border-secondary p-3 theme-surface-soft">
                                    <div class="d-flex justify-content-between gap-2">
                                        <span class="fw-bold">${r(u.full_code||u.event_code||"EVENT")}</span>
                                        <span class="small ${u.acked_at?"text-success":"text-warning"}">${u.acked_at?"ACK":"pendente"}</span>
                                    </div>
                                    <div class="small text-muted">${r(u.order_id||u.id||"")}</div>
                                    ${oa(u)}
                                </div>
                            `).join("")||'<div class="text-center py-4 text-muted border border-secondary rounded-3">Nenhum evento recebido.</div>'}
                        </div>
                    </div>
                </div>
            </div>
        `}function ea(e){if(!(e!=null&&e.payload))return{};if(typeof e.payload=="object")return e.payload;try{return JSON.parse(e.payload)}catch{return{}}}function ta(e){var o,a;const t=ea(e);return String(((o=t==null?void 0:t.metadata)==null?void 0:o.disputeId)||((a=t==null?void 0:t.dispute)==null?void 0:a.id)||(t==null?void 0:t.disputeId)||(t==null?void 0:t.id)||"").trim()}function oa(e){const t=String((e==null?void 0:e.full_code)||(e==null?void 0:e.event_code)||"").toUpperCase(),o=ta(e);return!t.includes("HANDSHAKE_DISPUTE")||!o?"":`
            <div class="d-flex flex-wrap gap-1 mt-2">
                <button class="btn btn-xs btn-outline-success" onclick="answerIfoodDispute('${encodeURIComponent(o)}', 'accept')">Aceitar acordo</button>
                <button class="btn btn-xs btn-outline-danger" onclick="answerIfoodDispute('${encodeURIComponent(o)}', 'reject')">Rejeitar acordo</button>
            </div>
        `}function aa(e){return`
            <div class="mobile-record-list">
                ${e.map(t=>{const o=encodeURIComponent(t.uber_tracking_url||"");return`
                        <article class="mobile-record-card">
                            <div class="mobile-record-head">
                                <div class="min-w-0">
                                    <div class="mobile-record-title">Pedido #${Number(t.id||0)}</div>
                                    <div class="mobile-record-subtitle">${r(t.customer_name||"Cliente")} · ${r(t.customer_phone||"Sem telefone")}</div>
                                </div>
                            </div>
                            <div class="mobile-record-meta">
                                <div class="mobile-record-row">
                                    <span>Status Uber</span>
                                    <span>${r(t.delivery_status||"not_requested")}</span>
                                </div>
                                <div class="mobile-record-row">
                                    <span>Entregador</span>
                                    <span>${r(t.uber_courier_name||"Aguardando atribuicao")}</span>
                                </div>
                                <div class="mobile-record-row">
                                    <span>Codigo</span>
                                    <span>${r(t.uber_delivery_id||t.uber_order_id||"--")}</span>
                                </div>
                                <div class="mobile-record-row">
                                    <span>Veiculo</span>
                                    <span>${r([t.uber_courier_vehicle,t.uber_courier_plate?`Placa ${t.uber_courier_plate}`:""].filter(Boolean).join(" · ")||"--")}</span>
                                </div>
                                ${t.uber_error_message?`<div class="customer-track-alert">${r(t.uber_error_message)}</div>`:""}
                            </div>
                            <div class="mobile-record-actions">
                                ${t.uber_tracking_url?`<button class="btn btn-outline-primary rounded-pill px-3" onclick="openLogisticsTracking('${o}')">Abrir tracking</button>`:'<div class="text-muted small text-center">Tracking indisponivel</div>'}
                            </div>
                        </article>
                    `}).join("")||'<div class="text-center py-4 text-muted">Nenhuma entrega ativa no momento.</div>'}
            </div>
        `}function ia(){const e=c.orders.filter(a=>a.uber_delivery_id||a.delivery_status==="dispatching"||a.delivery_status==="failed"||a.delivery_status==="in_transit"),t=`
            <div class="glass-card mb-4">
                <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
                    <div>
                        <h5 class="mb-1">Despacho particular</h5>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-info btn-sm rounded-pill px-4" data-bs-toggle="modal" data-bs-target="#courierRulesModal">Courier</button>
                        <button class="btn btn-primary btn-sm rounded-pill px-4" onclick="saveStoreHours()">Salvar</button>
                    </div>
                </div>
                <div class="form-check form-switch mb-3">
                    <input class="form-check-input" type="checkbox" id="store-private-dispatch-enabled">
                    <label class="form-check-label" for="store-private-dispatch-enabled">Permitir despacho particular no checkout</label>
                </div>
                <div id="store-private-dispatch-regions" class="row g-3"></div>
            </div>
        `,o=`
            <div class="modal fade" id="courierRulesModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border border-secondary" style="background: var(--bg-card); color: var(--text-main);">
                        <div class="modal-header border-secondary">
                            <h5 class="modal-title">Regra de courier</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <input type="hidden" id="store-courier-rule-mode" value="items_count">
                            <input type="hidden" id="store-courier-items-threshold" value="8">
                            <input type="hidden" id="store-courier-type-until-threshold" value="moto">
                            <input type="hidden" id="store-courier-type-above-threshold" value="carro">
                            <div class="row g-3">
                                <div class="col-6">
                                    <label class="form-label small fw-bold text-muted text-uppercase">Moto peso max. kg</label>
                                    <input type="number" min="0" step="0.01" id="store-courier-motorcycle-max-weight" class="form-control bg-transparent border-secondary text-body">
                                </div>
                                <div class="col-6">
                                    <label class="form-label small fw-bold text-muted text-uppercase">Moto tamanho max. cm</label>
                                    <input type="number" min="0" step="0.01" id="store-courier-motorcycle-max-size" class="form-control bg-transparent border-secondary text-body">
                                </div>
                                <div class="col-6">
                                    <label class="form-label small fw-bold text-muted text-uppercase">Carro peso max. kg</label>
                                    <input type="number" min="0" step="0.01" id="store-courier-car-max-weight" class="form-control bg-transparent border-secondary text-body">
                                </div>
                                <div class="col-6">
                                    <label class="form-label small fw-bold text-muted text-uppercase">Carro tamanho max. cm</label>
                                    <input type="number" min="0" step="0.01" id="store-courier-car-max-size" class="form-control bg-transparent border-secondary text-body">
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer border-secondary">
                            <button type="button" class="btn btn-outline-secondary btn-sm px-4 rounded-pill" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary btn-sm px-4 rounded-pill" onclick="saveStoreHours()">Salvar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;return j()?`
                ${t}
                ${o}
                <div class="glass-card animate__animated animate__fadeIn">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h5 class="mb-1">Logistica Uber</h5>
                            <p class="text-muted small mb-0">Status de despacho, tracking e falhas da operacao.</p>
                        </div>
                        <span class="badge bg-dark-subtle text-body border border-secondary px-3 py-2 rounded-pill">Monitoramento Uber</span>
                    </div>
                    ${aa(e)}
                </div>
            `:`
            ${t}
            ${o}
            <div class="glass-card animate__animated animate__fadeIn">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h5 class="mb-1">Logistica Uber</h5>
                        <p class="text-muted small mb-0">Status de despacho, tracking e falhas da operacao.</p>
                    </div>
                    <span class="badge bg-dark-subtle text-body border border-secondary px-3 py-2 rounded-pill">Monitoramento Uber</span>
                </div>
                <div class="table-responsive">
                    <table class="premium-table w-100">
                        <thead><tr><th>Pedido</th><th>Cliente</th><th>Status Uber</th><th>Entregador / Codigo</th><th>Tracking</th><th>Erro</th></tr></thead>
                        <tbody>
                            ${e.map(a=>`
                                <tr>
                                    <td>#${a.id}</td>
                                    <td>
                                        <div class="fw-bold">${r(a.customer_name||"Cliente")}</div>
                                        <div class="small text-muted">${r(a.customer_phone||"Sem telefone")}</div>
                                    </td>
                                    <td>${r(a.delivery_status||"not_requested")}</td>
                                    <td>
                                        <div class="small">
                                            ${a.uber_courier_name?`<div class="fw-bold">${r(a.uber_courier_name)}</div>`:'<div class="text-muted">Aguardando atribuicao</div>'}
                                            ${a.uber_courier_phone?`<div>${r(a.uber_courier_phone)}${a.uber_courier_pin?` · PIN ${r(a.uber_courier_pin)}`:""}</div>`:""}
                                            ${a.uber_courier_vehicle||a.uber_courier_plate?`<div class="text-muted">${r([a.uber_courier_vehicle,a.uber_courier_plate?`Placa ${a.uber_courier_plate}`:""].filter(Boolean).join(" · "))}</div>`:""}
                                            ${a.uber_delivery_id||a.uber_order_id?`<div class="text-muted">Codigo ${r(a.uber_delivery_id||a.uber_order_id)}</div>`:""}
                                        </div>
                                    </td>
                                    <td>
                                        ${a.uber_tracking_url?`<a href="${r(a.uber_tracking_url)}" target="_blank" rel="noreferrer">Abrir</a>`:'<span class="text-muted">--</span>'}
                                    </td>
                                    <td class="small text-danger">${r(a.uber_error_message||"--")}</td>
                                </tr>
                            `).join("")||'<tr><td colspan="6" class="text-center py-4 text-muted">Nenhuma entrega ativa no momento.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `}function na(){const e=c.stats,t=we(),o=Number(e.revenue||0),a=Number(e.ifood_fee_total||0),i=Number(e.ifood_fixed_fee_total||0),n=Number(e.ifood_delivery_fee_total||0),d=Number(e.uber_costs||0),m=Number(e.private_delivery_costs||0),s=o-a-d-m;return`
            <div class="finance-flow-shell animate__animated animate__fadeIn">
                <div class="finance-flow">
                    <section class="finance-stage">
                        <div class="finance-stage-title">Entradas</div>
                        <article class="finance-node finance-node-input">
                            <span>PDV</span>
                            <strong>${_(e.pdv_total)}</strong>
                            <div class="finance-node-grid">
                                <span>Pix ${_(e.pdv_pix_total??e.pix_total)}</span>
                                <span>Debito ${_(e.pdv_debit_card_total??0)}</span>
                                <span>Credito ${_(e.pdv_credit_card_total??0)}</span>
                                <span>Dinheiro ${_(e.pdv_cash_total??e.cash_total)}</span>
                            </div>
                        </article>
                        <article class="finance-node finance-node-input">
                            <span>Site/App</span>
                            <strong>${_(e.site_app_total??e.infinitepay_total)}</strong>
                        </article>
                        <article class="finance-node finance-node-input">
                            <span>iFood</span>
                            <strong>${_(e.ifood_total)}</strong>
                        </article>
                    </section>
                    <section class="finance-stage finance-stage-costs">
                        <div class="finance-stage-title">Custos</div>
                        <article class="finance-node finance-node-cost">
                            <span>Taxas iFood</span>
                            <strong>${_(a)}</strong>
                            <div class="finance-node-grid">
                                <span>Fixa ${_(i)}</span>
                                <span>Entrega iFood ${_(n)}</span>
                            </div>
                        </article>
                        <article class="finance-node finance-node-cost">
                            <span>Taxa Uber</span>
                            <strong>${_(d)}</strong>
                        </article>
                        <article class="finance-node finance-node-cost">
                            <span>Taxa entregador</span>
                            <strong>${_(m)}</strong>
                        </article>
                    </section>
                    <section class="finance-stage">
                        <div class="finance-stage-title">Saida</div>
                        <article class="finance-node finance-node-output">
                            <span>Bruto estimado</span>
                            <strong>${_(o)}</strong>
                        </article>
                        <article class="finance-node finance-node-output finance-node-muted">
                            <span>Apos taxas logisticas</span>
                            <strong>${_(s)}</strong>
                        </article>
                        <article class="finance-node finance-node-muted">
                            <span>Fila ativa</span>
                            <strong>${t.to_print.length+t.preparing.length+t.in_route.length}</strong>
                        </article>
                    </section>
                </div>
            </div>
        `}const Lt={operations:Uo,stock:Zo,ifood:Xo,logistics:ia,finance:na};function h(){E=te(E),eo.innerText=oo[E]||"Operacao",Ue(E);const e=Lt[E]?Lt[E]():"Secao em desenvolvimento";V.innerHTML=`
            ${R?`<div class="alert alert-danger border-0 rounded-4 mb-4">${r(R)}</div>`:""}
            ${e}
        `,V.dataset.section=E,re(),se({autoOpen:E==="operations"}),E==="stock"&&Oo(),N.createIcons()}window.toggleOrderExpansion=e=>{ve.has(e)?ve.delete(e):ve.add(e),h()};function Qe(){ge&&(clearInterval(ge),ge=null)}function Je(){fe=!0,W=0,be=Date.now()+no}function ra(){return fe||Date.now()<be}function Ge(){fe=!1,be=0,q&&(clearTimeout(q),q=null),$&&($.close(),$=null)}function jt(){!it||!P.authenticated||q||Date.now()<W||(q=setTimeout(()=>{q=null,zt()},3e3))}function zt(){!it||!P.authenticated||typeof EventSource>"u"||Date.now()<W||$||($=new EventSource(ya("/api.php?action=admin_events"),{withCredentials:!0}),$.addEventListener("open",()=>{Je()}),$.addEventListener("admin.heartbeat",()=>{Je()}),$.addEventListener("admin.snapshot.changed",async e=>{try{Je();let t={};try{t=JSON.parse(e.data||"{}")}catch{t={}}const o=Z,a=J().length;(await L({force:!0})||t.signature!==o)&&(h(),se({autoOpen:J().length>a}))}catch(t){if(ie(t))return;console.error("Failed to refresh realtime snapshot",t)}}),$.addEventListener("admin.reconnect",()=>{Ge(),jt()}),$.addEventListener("error",()=>{fe=!1,be=0,W=0,$&&($.close(),$=null),jt()}))}function Ht(){Qe(),P.authenticated&&(zt(),ge=setInterval(async()=>{var e,t;try{if(document.visibilityState!=="visible"||ra())return;((e=c.ifood)==null?void 0:e.configured)&&((t=c.ifood)==null?void 0:t.sync_enabled)&&Date.now()-at>3e4&&(at=Date.now(),await g("/api.php?action=ifood_poll_events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})}).catch(()=>{}));const a=J().length;await L()&&(h(),se({autoOpen:J().length>a}))}catch(o){if(ie(o))return;console.error("Failed to poll admin snapshot",o)}},io))}async function S(e,{syncHash:t=!0,replaceHash:o=!1,refreshSnapshot:a=!1}={}){var i;if(E=te(e),t&&mo(E,{replace:o}),h(),Ht(),E==="ifood"&&((i=window.loadIfoodRemoteStatus)==null||i.call(window).catch(()=>{})),!Z||a){await L({force:a}),h();return}["operations","logistics","ifood"].includes(E)&&L().then(n=>{n&&h()}).catch(n=>{console.error("Falha ao atualizar snapshot da secao.",n)})}function sa(e){const t=String(e||"").replace(/\D+/g,"");return t.length===8?`${t.slice(0,5)}-${t.slice(5)}`:t}function da(e){const t=[e.address_line||"",e.address_number?`No ${e.address_number}`:"",e.address_complement||"",e.customer_cep?`CEP ${sa(e.customer_cep)}`:""].filter(Boolean);return t.length?t.join(`
`):e.address||"Nao informado"}function ca(e){const t=String(e||"").trim().toLowerCase();return t==="pix"?"PIX":t==="debit_card"?"CARTAO DEBITO":t==="credit_card"||t==="card"?"CARTAO CREDITO":t==="ifood"?"IFOOD":t==="cash"?"DINHEIRO":t?t.toUpperCase():"PENDENTE"}function la(){return{id:"TESTE",created_at:new Date().toISOString(),customer_name:"Cliente Exemplo",customer_phone:"(31) 99999-0000",address_line:"Rua Exemplo",address_number:"123",address_complement:"Apto 202",address:"Rua Exemplo, No 123, Apto 202, Centro - Belo Horizonte/MG",customer_cep:"30110000",payment_method:"pix",delivery_mode:"uber",delivery_fee:6.5,total:46.3,items:[{name:"Gelo Cubo 10 Kg",quantity:1,price:24},{name:"Agua Fardo 500 ml",quantity:1,price:15.8,promotion_label:"Brinde promocional aplicado"}]}}function ua(e){var p,l,y;const t=Re(e),o=Math.max(0,Number(e.total||0)-Number(e.delivery_fee||0)),a=da(e),i=B(e)==="ifood"||String(e.payment_provider||"").toLowerCase()==="ifood",n=e.ifood_details&&!Array.isArray(e.ifood_details)?e.ifood_details:{},d=String(e.ifood_display_id||"").trim(),m=String(e.ifood_delivery_localizer||"").replace(/\D+/g,""),s=String(e.ifood_pickup_code||"").replace(/\D+/g,""),u=i?`
            <div class="receipt-section">
                <div class="receipt-line"><strong>Cliente:</strong> ${r(e.customer_name||"Cliente")}</div>
                <div class="receipt-line"><strong>IFOOD</strong>${d?` #${r(d)}`:""}</div>
                ${n.order_type||n.order_timing?`<div class="receipt-line"><strong>Tipo:</strong> ${r([n.order_type,n.order_timing].filter(Boolean).join(" / "))}</div>`:""}
                ${n.document?`<div class="receipt-line"><strong>CPF/CNPJ:</strong> ${r(n.document)}</div>`:""}
                ${m?`
                    <div class="receipt-line" style="font-size:14pt;text-align:center;border:1px solid #000;padding:2mm;margin:2mm 0">
                        <div style="font-size:9pt">CODIGO ENTREGA</div>
                        <strong>${r(m)}</strong>
                    </div>
                `:""}
                ${s?`<div class="receipt-line"><strong>Codigo retirada:</strong> ${r(s)}</div>`:""}
                ${n.delivery_observations?`<div class="receipt-line"><strong>Obs. entrega:</strong> ${r(n.delivery_observations)}</div>`:""}
            </div>
        `:`
            <div class="receipt-section">
                <div class="receipt-line"><strong>Cliente:</strong> ${r(e.customer_name||"Cliente")}</div>
                <div class="receipt-line"><strong>WhatsApp:</strong> ${r(e.customer_phone||"Nao informado")}</div>
                <div class="receipt-line"><strong>Endereco:</strong></div>
                <div class="receipt-address">${r(a)}</div>
            </div>
        `,f=(t.length?t:[{name:"Pedido",quantity:1,price:Number(e.total||0)-Number(e.delivery_fee||0)}]).map(v=>`
            <div class="receipt-item">
                <span>
                    ${Number(v.quantity||0)}x ${r(v.name||"Item")}
                    ${v.observation?`<div class="receipt-line" style="font-size:8pt">OBS: ${r(v.observation)}</div>`:""}
                    ${v.promotion_label?`<div class="receipt-line" style="font-size:8pt">${r(v.promotion_label)}</div>`:""}
                </span>
                <span>R$ ${(Number(v.price||0)*Number(v.quantity||0)).toFixed(2)}</span>
            </div>
        `).join("");return`
            <div class="receipt-header">
                <img class="receipt-logo" src="/logo/quadrada.png" alt="Logo ${r(((p=c.store_meta)==null?void 0:p.name)||"Lumix Ice")}">
                <div class="receipt-title">${r(((l=c.store_meta)==null?void 0:l.name)||"Lumix Ice")}</div>
                <div class="receipt-subtitle">CUPOM NAO FISCAL</div>
                <div class="receipt-meta">Pedido #${e.id}</div>
                <div class="receipt-meta">${r(Oe(e.created_at))}</div>
            </div>
            <div class="receipt-body">
                ${u}
                <div class="receipt-divider"></div>
                <div class="receipt-section">
                ${f}
                </div>
                <div class="receipt-divider"></div>
                <div class="receipt-section">
                <div class="receipt-item" style="font-weight:bold">
                    <span>Subtotal</span>
                    <span>${_(o)}</span>
                </div>
                <div class="receipt-item">
                    <span>${r(wt(e))}</span>
                    <span>${_(e.delivery_fee)}</span>
                </div>
                <div class="receipt-item receipt-total">
                    <span>TOTAL</span>
                    <span>${_(e.total)}</span>
                </div>
                <div class="receipt-line" style="margin-top:3mm"><strong>Pagamento:</strong> ${r(ca(e.payment_method))}</div>
                ${i&&Array.isArray(n.payment_methods)&&n.payment_methods.length?`<div class="receipt-line"><strong>Pag. iFood:</strong> ${r(n.payment_methods.join(", "))}</div>`:""}
                ${i&&Number(n.cash_change_for||0)>0?`<div class="receipt-line"><strong>Troco para:</strong> ${_(n.cash_change_for)}</div>`:""}
                ${i&&Array.isArray(n.benefits)&&n.benefits.length?`<div class="receipt-line"><strong>Cupons:</strong> ${r(n.benefits.join(" | "))}</div>`:""}
                </div>
            </div>
            <div class="receipt-footer">
                <p>Obrigado pela preferencia!</p>
                <small>${r(((y=c.store_meta)==null?void 0:y.name)||"Lumix Ice")}</small>
            </div>
        `}function qt(e){return`<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Cupom Pedido #${Number(e.id||0)}</title>
    <style>
        @page { size: 80mm 220mm; margin: 0; }
        * { box-sizing: border-box; }
        html, body {
            margin: 0;
            padding: 0;
            width: 80mm;
            background: #ffffff;
            color: #000000;
            font-family: "Courier New", Courier, monospace;
            font-size: 10pt;
            font-weight: 700;
            line-height: 1.35;
        }
        .receipt-print {
            width: 72mm;
            margin: 0 auto;
            padding: 5mm 0;
        }
        .receipt-header {
            text-align: center;
            border-bottom: 1px dashed #000;
            margin-bottom: 4mm;
            padding-bottom: 2mm;
        }
        .receipt-logo {
            display: block;
            width: 18mm;
            height: 18mm;
            object-fit: contain;
            margin: 0 auto 2mm;
        }
        .receipt-title {
            font-size: 16pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            margin: 0 0 1mm;
        }
        .receipt-subtitle, .receipt-meta {
            font-size: 9pt;
            margin: 0.5mm 0;
            font-weight: 700;
        }
        .receipt-section {
            margin-bottom: 3mm;
        }
        .receipt-line {
            margin-bottom: 1.5mm;
        }
        .receipt-address {
            white-space: pre-wrap;
        }
        .receipt-divider {
            border-top: 1px dashed #000;
            margin: 3mm 0;
        }
        .receipt-item {
            display: flex;
            justify-content: space-between;
            gap: 3mm;
            margin-bottom: 1mm;
        }
        .receipt-item span:last-child {
            text-align: right;
        }
        .receipt-total {
            font-size: 12pt;
            font-weight: 700;
            margin-top: 2mm;
        }
        .receipt-footer {
            border-top: 1px dashed #000;
            margin-top: 4mm;
            padding-top: 2mm;
            text-align: center;
        }
        @media screen {
            html, body {
                width: 100%;
                min-height: 100%;
                background: #d9e2ea;
            }
            body {
                padding: 12px;
            }
            .receipt-print {
                width: 72mm;
                margin: 0 auto;
                background: #fff;
                box-shadow: 0 0 0 1px rgba(0,0,0,0.06), 0 14px 28px rgba(0,0,0,0.12);
                padding: 5mm 0;
            }
        }
        @media print {
            html, body {
                width: 80mm;
                background: #ffffff !important;
            }
            body {
                padding: 0;
            }
            .receipt-print {
                width: 72mm;
                margin: 0;
                margin-left: auto;
                margin-right: auto;
                padding: 5mm 0;
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <div class="receipt-print">
        ${ua(e)}
    </div>
</body>
</html>`}window.openProductModal=(e=null)=>{const t=x.getOrCreateInstance(document.getElementById("productModal"));document.getElementById("productForm").reset(),document.getElementById("prod-id").value=e||"",document.getElementById("modalTitle").innerText=e?"Editar Produto":"Novo Produto",Mt();const o=document.getElementById("product-flavors-list"),a=document.getElementById("flavors-empty-msg");if(o&&(o.innerHTML=""),a&&a.classList.remove("d-none"),e){const i=c.products.find(n=>Number(n.id)===Number(e));i&&(document.getElementById("prod-name").value=i.name,document.getElementById("prod-price").value=i.price,document.getElementById("prod-stock").value=i.stock_quantity,document.getElementById("prod-category").value=A(i.category),document.getElementById("prod-barcode").value=i.barcode||"",document.getElementById("prod-min-stock").value=Math.max(0,Number(i.min_stock_alert||0)),document.getElementById("prod-reserved-stock").value=Math.max(0,Number(i.reserved_stock||0)),document.getElementById("prod-ifood-enabled").checked=I(i.ifood_enabled,!1),document.getElementById("prod-ifood-price").value=i.ifood_price??"",document.getElementById("prod-ifood-code").value=i.ifood_external_code||"",document.getElementById("prod-uber-weight").value=Math.max(1,Number(i.uber_item_weight_grams||1e3)),document.getElementById("prod-uber-length").value=Math.max(1,Number(i.uber_item_length_cm||20)),document.getElementById("prod-uber-height").value=Math.max(1,Number(i.uber_item_height_cm||20)),document.getElementById("prod-uber-depth").value=Math.max(1,Number(i.uber_item_depth_cm||20)),document.getElementById("prod-img").value=i.img||"",document.getElementById("prod-age-restricted").checked=!!i.age_restricted,Array.isArray(i.flavors)&&i.flavors.length>0&&(a&&a.classList.add("d-none"),i.flavors.forEach(n=>window.addProductFlavorRow(n.name,n.stock_quantity,n.min_stock_alert,n.reserved_stock))))}else document.getElementById("prod-age-restricted").checked=!1,document.getElementById("prod-category").value="Geral",document.getElementById("prod-barcode").value="",document.getElementById("prod-min-stock").value=0,document.getElementById("prod-reserved-stock").value=0,document.getElementById("prod-ifood-enabled").checked=!0,document.getElementById("prod-ifood-price").value="",document.getElementById("prod-ifood-code").value="",document.getElementById("prod-uber-weight").value=1e3,document.getElementById("prod-uber-length").value=20,document.getElementById("prod-uber-height").value=20,document.getElementById("prod-uber-depth").value=20;t.show(),pt(),je()},window.addProductFlavorRow=(e="",t=0,o=0,a=0)=>{const i=document.getElementById("product-flavors-list"),n=document.getElementById("flavors-empty-msg");if(!i)return;n&&n.classList.add("d-none");const d=document.createElement("tr");d.className="flavor-row",d.innerHTML=`
            <td><input type="text" class="form-control form-control-sm bg-transparent border-secondary text-body flavor-name" value="${r(e)}" placeholder="ex: Morango"></td>
            <td><input type="number" class="form-control form-control-sm bg-transparent border-secondary text-body flavor-stock" value="${t}" min="0"></td>
            <td><input type="number" class="form-control form-control-sm bg-transparent border-secondary text-body flavor-min-stock" value="${o}" min="0"></td>
            <td><input type="number" class="form-control form-control-sm bg-transparent border-secondary text-body flavor-reserved-stock" value="${a}" min="0"></td>
            <td><button type="button" class="btn btn-link btn-sm text-danger p-0" onclick="this.closest('tr').remove(); checkFlavorsEmpty();"><i data-lucide="x-circle" size="14"></i></button></td>
        `,i.appendChild(d),N.createIcons()},window.checkFlavorsEmpty=()=>{const e=document.getElementById("product-flavors-list"),t=document.getElementById("flavors-empty-msg");e&&t&&e.children.length===0&&t.classList.remove("d-none")},window.selectProductImageFromLibrary=e=>{const t=decodeURIComponent(e||""),o=document.getElementById("prod-img"),a=document.getElementById("upload-status");o&&(o.value=t),a&&(a.innerHTML='<span class="text-success"><i data-lucide="check-circle" size="14"></i> Imagem selecionada da biblioteca.</span>'),_e(),N.createIcons()},window.saveProduct=async()=>{const e=document.getElementById("productForm");if(e&&!e.reportValidity())return;const t=[];let o=0;document.querySelectorAll(".flavor-row").forEach(u=>{const f=u.querySelector(".flavor-name").value.trim(),p=parseInt(u.querySelector(".flavor-stock").value,10),l=parseInt(u.querySelector(".flavor-min-stock").value,10),y=parseInt(u.querySelector(".flavor-reserved-stock").value,10);if(f){const v=isNaN(p)?0:p;t.push({name:f,stock_quantity:v,min_stock_alert:isNaN(l)?0:Math.max(0,l),reserved_stock:isNaN(y)?0:Math.max(0,Math.min(v,y))}),o+=v}});const a=t.length>0?o:document.getElementById("prod-stock").value;if(t.length>0){const u=document.getElementById("prod-stock");u&&(u.value=o)}const i=Number(document.getElementById("prod-id").value||0),n=c.products.find(u=>Number(u.id)===i),d=Math.max(0,Number(a||0)),m=Math.max(0,Math.min(d,Number(document.getElementById("prod-reserved-stock").value||0))),s={...n||{},id:i||void 0,name:document.getElementById("prod-name").value.trim(),price:Number(document.getElementById("prod-price").value||0),category:A(document.getElementById("prod-category").value),barcode:document.getElementById("prod-barcode").value.trim(),stock_quantity:d,min_stock_alert:Math.max(0,Number(document.getElementById("prod-min-stock").value||0)),reserved_stock:m,store_enabled:I(n==null?void 0:n.store_enabled,!0),ifood_enabled:document.getElementById("prod-ifood-enabled").checked,ifood_price:document.getElementById("prod-ifood-price").value===""?null:Number(document.getElementById("prod-ifood-price").value||0),ifood_external_code:document.getElementById("prod-ifood-code").value,uber_item_weight_grams:Number(document.getElementById("prod-uber-weight").value||1e3),uber_item_length_cm:Number(document.getElementById("prod-uber-length").value||20),uber_item_height_cm:Number(document.getElementById("prod-uber-height").value||20),uber_item_depth_cm:Number(document.getElementById("prod-uber-depth").value||20),img:document.getElementById("prod-img").value,age_restricted:document.getElementById("prod-age-restricted").checked,flavors:t};try{const{resp:u,data:f}=await g("/api.php?action=save_product",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)});if(!u.ok||f.error)throw new Error(b(f,"Erro ao salvar produto."));const p=x.getInstance(document.getElementById("productModal"));p==null||p.hide(),await S("stock",{refreshSnapshot:!0}),D(f),Ct()}catch(u){if((u==null?void 0:u.code)==="AUTH_REQUIRED")return;alert(u.message||"Erro ao salvar produto.")}},window.deleteProduct=async e=>{if(confirm("Deseja realmente excluir este produto?"))try{const{resp:t,data:o}=await g(`/api.php?action=delete_product&id=${encodeURIComponent(e)}`,{method:"POST"});if(!t.ok||o.error)throw new Error(b(o,"Erro ao excluir produto."));await S("stock",{refreshSnapshot:!0}),D(o)}catch(t){if((t==null?void 0:t.code)==="AUTH_REQUIRED")return;alert(t.message||"Erro ao excluir produto.")}},window.toggleStockProductSelection=(e,t)=>{const o=Number(e||0);o<=0||(t?C.add(o):C.delete(o),h())},window.toggleAllStockSelection=e=>{const t=He();e?t.forEach(o=>C.add(o)):t.forEach(o=>C.delete(o)),document.querySelectorAll(".stock-row-checkbox").forEach(o=>{o.checked=!!e}),h()},window.clearStockSelection=()=>{C.clear(),document.querySelectorAll(".stock-row-checkbox").forEach(e=>{e.checked=!1}),h()},window.setStockSort=e=>{T.key===e?T={key:e,direction:T.direction==="asc"?"desc":"asc"}:T={key:e,direction:"asc"},h()};async function Ve(e,t,o="Aplicando alteracoes..."){const a=ce();if(!a.length)return alert("Selecione pelo menos um produto."),null;if(t&&!confirm(t.replace("{count}",String(a.length))))return null;rt(o,`Processando ${a.length} produto(s). Aguarde a conclusao.`);try{const{resp:i,data:n}=await g("/api.php?action=bulk_product_action",{method:"POST",headers:{"Content-Type":"application/json"},timeoutMs:12e4,body:JSON.stringify({ids:a,...e})});if(!i.ok||n!=null&&n.error)throw new Error(b(n,"Nao foi possivel aplicar a acao em lote."));return C.clear(),await S("stock",{refreshSnapshot:!0}),D(n),n}finally{st()}}window.bulkUpdateSelectedProducts=async(e,t)=>{if(e==="ifood_enabled"&&t===!0&&ce().map(i=>c.products.find(n=>Number(n.id||0)===Number(i))).filter(i=>i&&!G(i)).length){alert("Envie a categoria destes produtos ao iFood antes de ativar em massa.");return}const o=e==="store_enabled"?t?"ativar na loja":"desativar na loja":t?"ativar no iFood":"desativar no iFood";try{const a=await Ve({bulk_action:e,enabled:t},`Deseja ${o} {count} produto(s) selecionado(s)?`,`${t?"Ativando":"Desativando"} produtos...`);if(!a)return;const i=Array.isArray(a.skipped_products)?a.skipped_products.length:0;i>0&&alert(`Acao concluida, mas ${i} produto(s) foram ignorados. Verifique estoque e se a categoria ja foi enviada ao iFood.`)}catch(a){if((a==null?void 0:a.code)==="AUTH_REQUIRED")return;alert(a.message||"Nao foi possivel aplicar a acao em lote.")}},window.bulkUpdateSelectedProductsCategory=async()=>{const e=ce();if(!e.length){alert("Selecione pelo menos um produto.");return}const t=await Ko(`Categoria para ${e.length} produto(s)`);if(t)try{await Ve({bulk_action:"category",category:t},`Deseja alterar a categoria de {count} produto(s) selecionado(s) para "${t}"?`,"Alterando categoria...")}catch(o){if((o==null?void 0:o.code)==="AUTH_REQUIRED")return;alert(o.message||"Nao foi possivel alterar a categoria dos produtos selecionados.")}},window.bulkDeleteSelectedProducts=async()=>{try{await Ve({bulk_action:"delete"},"Deseja excluir definitivamente {count} produto(s) selecionado(s)?","Excluindo produtos...")}catch(e){if((e==null?void 0:e.code)==="AUTH_REQUIRED")return;alert(e.message||"Nao foi possivel excluir os produtos selecionados.")}},window.bulkIncrementStock=async()=>{const e=prompt("Quantidade a adicionar em TODOS os produtos:","20");if(e===null)return;const t=parseInt(e,10);if(!(isNaN(t)||t===0))try{rt("Atualizando estoque...","Aplicando a quantidade em todos os produtos. Aguarde a conclusao.");try{const{resp:o,data:a}=await g("/api.php?action=bulk_increment_stock",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:t})});if(!o.ok||a.error)throw new Error(b(a,"Erro ao incrementar estoque."));await S("stock",{refreshSnapshot:!0}),D(a)}finally{st()}}catch(o){if((o==null?void 0:o.code)==="AUTH_REQUIRED")return;alert(o.message||"Erro ao incrementar estoque.")}},window.quickIncrementStock=async(e,t)=>{const o=c.products.find(i=>Number(i.id)===Number(e));if(!o)return;const a=Math.max(0,(Number(o.stock_quantity)||0)+t);try{const{resp:i,data:n}=await g("/api.php?action=save_product",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...o,stock_quantity:a})});if(!i.ok||n.error)throw new Error(b(n,"Erro ao atualizar estoque."));await S("stock",{refreshSnapshot:!0}),D(n)}catch(i){if((i==null?void 0:i.code)==="AUTH_REQUIRED")return;alert(i.message||"Erro ao atualizar estoque.")}},window.toggleProductIfood=async(e,t)=>{const o=c.products.find(i=>Number(i.id)===Number(e));if(t===!0&&o&&!G(o)){alert("Envie esta categoria ao iFood antes de ativar o item.");return}const a=Number((o==null?void 0:o.available_stock)??(o==null?void 0:o.stock_quantity)??0);if(t===!0&&a<=0){alert("Produto sem estoque nao pode ficar ativo no iFood.");return}try{const{resp:i,data:n}=await g("/api.php?action=toggle_product_ifood",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:e,ifood_enabled:t===!0})});if(!i.ok||n.error)throw new Error(b(n,"Erro ao atualizar iFood do produto."));const d=c.products.findIndex(m=>Number(m.id)===Number(e));d>=0&&n.product&&(c.products[d]=Fe({...c.products[d],...n.product,store_enabled:I(n.product.store_enabled,I(c.products[d].store_enabled,!0)),ifood_enabled:t===!0})),h(),D(n)}catch(i){if((i==null?void 0:i.code)==="AUTH_REQUIRED")return;alert(i.message||"Erro ao atualizar iFood do produto.")}},window.toggleProductStore=async(e,t)=>{try{const{resp:o,data:a}=await g("/api.php?action=toggle_product_store",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:e,store_enabled:t===!0})});if(!o.ok||a.error)throw new Error(b(a,"Erro ao atualizar produto na loja."));const i=c.products.findIndex(n=>Number(n.id)===Number(e));i>=0&&a.product&&(c.products[i]=Fe({...c.products[i],...a.product,store_enabled:t===!0,ifood_enabled:I(a.product.ifood_enabled,I(c.products[i].ifood_enabled,!1))})),h()}catch(o){if((o==null?void 0:o.code)==="AUTH_REQUIRED")return;alert(o.message||"Erro ao atualizar produto na loja.")}};async function Qt(e){const t=c.products||[],o=t.filter(p=>G(p)),a=o.filter(p=>Number(p.available_stock??p.stock_quantity??0)>0),i=e?o.filter(p=>I(p.ifood_enabled,!1)!==e&&Number(p.available_stock??p.stock_quantity??0)<=0).length:0,n=e?t.filter(p=>!G(p)).length:0,d=(e?a:t).filter(p=>I(p.ifood_enabled,!1)!==e),m=e?"ativar":"desativar",s=e?"ativos":"inativos";if(!d.length){alert(i>0?`Nenhum produto com estoque para ativar. ${i} produto(s) sem estoque ficaram inativos.`:n>0?"Nenhum produto de categoria enviada para ativar. Envie as categorias ao iFood primeiro.":`Todos os produtos ja estao ${s} no iFood.`);return}const u=[];i>0&&u.push(`${i} produto(s) sem estoque serao ignorados.`),n>0&&e&&u.push(`${n} produto(s) de categorias nao enviadas ao iFood nao serao ativados.`);const f=u.length?` ${u.join(" ")}`:"";if(confirm(`${e?"Ativar":"Desativar"} ${d.length} produto(s) no iFood?${f}`))try{let p=!1;for(const l of d){const{resp:y,data:v}=await g("/api.php?action=toggle_product_ifood",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:l.id,ifood_enabled:e})});if(!y.ok||v.error)throw new Error(b(v,`Erro ao ${m} produtos no iFood.`));p=p||!!(v!=null&&v.ifood_catalog)}await S("stock",{refreshSnapshot:!0}),p||gt()}catch(p){if((p==null?void 0:p.code)==="AUTH_REQUIRED")return;alert(p.message||`Erro ao ${m} produtos no iFood.`)}}window.activateAllProductsForIfood=async()=>{await Qt(!0)},window.deactivateAllProductsForIfood=async()=>{await Qt(!1)},window.openStockAdjustPrompt=async e=>{const t=c.products.find(i=>Number(i.id)===Number(e));if(!t)return;const o=prompt(`Novo estoque total para ${t.name}:`,String(t.stock_quantity||0));if(o===null)return;const a=parseInt(o,10);if(Number.isNaN(a)||a<0){alert("Informe um estoque valido.");return}try{const{resp:i,data:n}=await g("/api.php?action=adjust_stock",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({product_id:e,quantity:a,mode:"set",channel:"panel",note:"Ajuste manual pelo painel"})});if(!i.ok||n.error)throw new Error(b(n,"Erro ao ajustar estoque."));await S("stock",{refreshSnapshot:!0}),D(n)}catch(i){if((i==null?void 0:i.code)==="AUTH_REQUIRED")return;alert(i.message||"Erro ao ajustar estoque.")}},window.syncIfoodCatalog=async()=>{var o,a;const e=await Jo();if(!e||!confirm(`Sincronizar o iFood somente com as categorias selecionadas?

${e.join(", ")}`))return;const t=qo();zo().show(),$e({phase:"starting",message:"Preparando envio das categorias selecionadas.",categories:e}),Qo(t);try{const{resp:i,data:n}=await g("/api.php?action=sync_ifood_catalog",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({selected_categories:e,progress_id:t}),timeoutMs:3e5});if(!i.ok||n.error)throw new Error(b(n,"Nao foi possivel sincronizar o iFood."));$e({phase:"completed",message:"Cardapio enviado ao iFood.",categories:e,processed_items:Number(((o=n.sync)==null?void 0:o.items_synced)??n.items_count??0),total_items:Number(n.items_count||0)});const d=n.status==="dry_run"?"Dry run concluido":"Sincronizacao enviada",m=Number(((a=n.sync)==null?void 0:a.items_synced)??n.items_count??0);alert(`${d}. Categorias: ${e.join(", ")}. Itens enviados/criados: ${m}. Itens locais selecionados: ${n.items_count||0}`),Array.isArray(n.synced_categories)&&(c.ifood={...c.ifood||{},synced_categories:n.synced_categories}),await L({force:!0}).catch(()=>{}),h(),await loadIfoodRemoteStatus().catch(()=>{})}catch(i){if((i==null?void 0:i.code)==="AUTH_REQUIRED")return;$e({phase:"error",message:i.message||"Nao foi possivel sincronizar o iFood.",categories:e}),alert(i.message||"Nao foi possivel sincronizar o iFood.")}finally{Rt(),Q==null||Q.hide()}},window.refreshIfoodDashboard=async()=>{try{const{resp:e,data:t}=await g("/api.php?action=get_ifood_dashboard");if(!e.ok||t.error)throw new Error(b(t,"Nao foi possivel atualizar o painel iFood."));c.ifood=t,h()}catch(e){if((e==null?void 0:e.code)==="AUTH_REQUIRED")return;alert(e.message||"Nao foi possivel atualizar o painel iFood.")}},window.startIfoodAuthorization=async()=>{var e,t;try{const{resp:o,data:a}=await g("/api.php?action=ifood_authorization_start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});if(!o.ok||a.error)throw new Error(b(a,"Nao foi possivel gerar o codigo iFood."));c.ifood=a.dashboard||c.ifood,h();const i=a.verificationUrlComplete||a.verificationUrl;i&&Ke(i),alert(`Codigo iFood: ${a.userCode||((t=(e=c.ifood)==null?void 0:e.auth)==null?void 0:t.pending_user_code)||""}`)}catch(o){if((o==null?void 0:o.code)==="AUTH_REQUIRED")return;alert(o.message||"Nao foi possivel gerar o codigo iFood.")}},window.finishIfoodAuthorization=async()=>{const e=prompt("Cole o authorizationCode gerado pelo portal iFood:");if(e)try{const{resp:t,data:o}=await g("/api.php?action=ifood_authorization_finish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({authorization_code:e.trim()})});if(!t.ok||o.error)throw new Error(b(o,"Nao foi possivel finalizar a autorizacao iFood."));c.ifood=o.dashboard||o.discovery||c.ifood,await S("ifood",{refreshSnapshot:!0}),alert("iFood autorizado e merchant sincronizado.")}catch(t){if((t==null?void 0:t.code)==="AUTH_REQUIRED")return;alert(t.message||"Nao foi possivel finalizar a autorizacao iFood.")}},window.saveIfoodPanelSettings=async()=>{var o,a;const e=((o=document.getElementById("ifood-settings-sync-enabled"))==null?void 0:o.checked)===!0,t=Math.max(28,Number(((a=document.getElementById("ifood-settings-price-markup"))==null?void 0:a.value)||28));try{const{resp:i,data:n}=await g("/api.php?action=ifood_save_settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sync_enabled:e,catalog_sync_path:"",price_markup_percent:t})});if(!i.ok||n.error)throw new Error(b(n,"Nao foi possivel salvar a loja iFood."));c.ifood=n.dashboard||c.ifood,h()}catch(i){if((i==null?void 0:i.code)==="AUTH_REQUIRED")return;alert(i.message||"Nao foi possivel salvar a loja iFood.")}},window.saveIfoodPanelHours=async()=>{const e=c.store_settings||{};try{const{resp:t,data:o}=await g("/api.php?action=update_store_settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...e,ifood_weekly_hours:ze("ifood-panel-weekly-hours")})});if(!t.ok||o.error)throw new Error(b(o,"Nao foi possivel salvar os horarios iFood."));c.store_settings=o.store_settings||c.store_settings;const a=document.getElementById("ifood-store-editor-result");if(a){const i=o.ifood_hours_sync||{};a.innerHTML=`<span class="${i.status==="error"?"text-danger":"text-success"}">Horario salvo${i.status?`: ${r(i.status)}`:""}</span>`}}catch(t){if((t==null?void 0:t.code)==="AUTH_REQUIRED")return;alert(t.message||"Nao foi possivel salvar os horarios iFood.")}},window.discoverIfoodMerchants=async()=>{const e=document.getElementById("ifood-store-editor-result")||document.getElementById("ifood-remote-status");e&&(e.innerHTML='<div class="text-muted">Buscando lojas...</div>');try{const{resp:t,data:o}=await g("/api.php?action=ifood_merchants");if(!t.ok||o.error)throw new Error(b(o,"Nao foi possivel listar lojas iFood."));const a=Array.isArray(o.data)?o.data:[];e&&(e.innerHTML=`
                    <div class="d-flex flex-column gap-2">
                        ${a.map(i=>{const n=i.name||i.corporateName||i.tradingName||"Loja iFood";return`
                                <div class="rounded-3 border border-secondary p-2">
                                    <span class="fw-bold">${r(n)}</span>
                                    <span class="d-block small text-muted">vinculada ao app iFood</span>
                                </div>
                            `}).join("")||'<div class="text-muted">Nenhuma loja vinculada ao token.</div>'}
                    </div>
                `)}catch(t){if((t==null?void 0:t.code)==="AUTH_REQUIRED")return;e&&(e.innerHTML=`<span class="text-danger">${r(t.message||"Nao foi possivel listar lojas iFood.")}</span>`)}},window.loadIfoodStoreDetails=async()=>{var t,o,a,i,n;const e=document.getElementById("ifood-store-editor-result")||document.getElementById("ifood-remote-status");e&&(e.innerHTML='<div class="text-muted">Consultando dados remotos...</div>');try{const[d,m,s,u]=await Promise.all([g("/api.php?action=ifood_merchant_details"),g("/api.php?action=ifood_merchant_status"),g("/api.php?action=ifood_opening_hours"),g("/api.php?action=ifood_interruptions")]);if([d,m,s,u].forEach(f=>{var p;if(!f.resp.ok||(p=f.data)!=null&&p.error)throw new Error(b(f.data,"Nao foi possivel consultar a loja iFood."))}),e){const f=((t=d.data)==null?void 0:t.data)||{},p=f.address||{},l=Array.isArray((o=m.data)==null?void 0:o.data)?m.data.data:[],y=Array.isArray((a=u.data)==null?void 0:a.data)?u.data.data:[];e.innerHTML=`
                    <div class="rounded-3 border border-secondary p-3 theme-surface-soft">
                        <div class="row g-3 mb-3">
                            <div class="col-12 col-md-6">
                                <div class="small text-muted text-uppercase fw-bold mb-1">Nome no iFood</div>
                                <div class="fw-bold">${r(f.name||f.tradingName||"Loja iFood")}</div>
                            </div>
                            <div class="col-12 col-md-6">
                                <div class="small text-muted text-uppercase fw-bold mb-1">Razao social</div>
                                <div class="fw-bold">${r(f.corporateName||"--")}</div>
                            </div>
                            <div class="col-12">
                                <div class="small text-muted text-uppercase fw-bold mb-1">Descricao</div>
                                <div>${r(f.description||"--")}</div>
                            </div>
                            <div class="col-12">
                                <div class="small text-muted text-uppercase fw-bold mb-1">Endereco</div>
                                <div>${r([p.street,p.number,p.district,p.city,p.state,p.postalCode].filter(Boolean).join(", ")||"--")}</div>
                            </div>
                        </div>
                        <div class="small text-muted mb-2">dados vinculados pelo app iFood</div>
                        <div class="d-flex flex-column gap-2">
                            ${l.map(v=>`
                                <div class="d-flex justify-content-between gap-3">
                                    <span>${r(v.operation||v.salesChannel||"Operacao")}</span>
                                    <span class="${v.available?"text-success":"text-warning"}">${r(v.state||(v.available?"OK":"FECHADO"))}</span>
                                </div>
                            `).join("")||'<div class="small text-muted">Sem status retornado.</div>'}
                        </div>
                        <hr class="border-secondary">
                        <div class="small text-muted">Pausas: ${y.length} | Horarios remotos: ${Array.isArray((i=s.data)==null?void 0:i.data)?s.data.data.length:(n=s.data)!=null&&n.data?1:0}</div>
                    </div>
                `}}catch(d){if((d==null?void 0:d.code)==="AUTH_REQUIRED")return;e&&(e.innerHTML=`<span class="text-danger">${r(d.message||"Nao foi possivel consultar a loja iFood.")}</span>`)}},window.loadIfoodRemoteStatus=async()=>{var t,o,a;const e=document.getElementById("ifood-remote-status");e&&(e.innerHTML='<div class="text-muted">Consultando iFood...</div>');try{const[i,n,d,m]=await Promise.all([g("/api.php?action=ifood_merchants"),g("/api.php?action=ifood_merchant_status"),g("/api.php?action=ifood_interruptions"),g("/api.php?action=get_ifood_remote_catalog_status")]),s=Array.isArray((t=i.data)==null?void 0:t.data)?i.data.data:[],u=Array.isArray((o=n.data)==null?void 0:o.data)?n.data.data:[],f=Array.isArray((a=d.data)==null?void 0:a.data)?d.data.data:[],p=m.data||{},l=Array.isArray(p.categories)?p.categories:[];c.ifood={...c.ifood||{},remote_catalog:p};const y=document.getElementById("ifood-remote-catalog-count"),v=document.getElementById("ifood-remote-catalog-hint");y&&(y.innerText=String(Number(p.items_count||0))),v&&(v.innerText="catalogo remoto retornado pelo iFood"),e&&(e.innerHTML=`
                    <div class="rounded-3 border border-secondary p-3 theme-surface-soft">
                        <div class="fw-bold mb-2">Status remoto iFood</div>
                        <div class="small text-muted mb-2">Lojas vinculadas: ${s.length} | Pausas: ${f.length} | Itens no catalogo remoto: ${Number(p.items_count||0)}</div>
                        <div class="d-flex flex-column gap-2">
                            ${u.map(w=>`
                                <div class="d-flex justify-content-between gap-3">
                                    <span>${r(w.operation||w.salesChannel||"Operacao")}</span>
                                    <span class="${w.available?"text-success":"text-warning"}">${r(w.state||(w.available?"OK":"FECHADO"))}</span>
                                </div>
                            `).join("")||'<div class="small text-muted">Sem status retornado.</div>'}
                        </div>
                        <hr class="border-secondary">
                        <div class="fw-bold small mb-2">Catalogo remoto</div>
                        <div class="small text-muted mb-2">Catalogos: ${Number(p.catalogs_count||0)} | Categorias: ${Number(p.categories_count||0)} | Itens: ${Number(p.items_count||0)}</div>
                        <div class="d-flex flex-column gap-1">
                            ${l.slice(0,8).map(w=>`
                                <div class="d-flex justify-content-between gap-3">
                                    <span>${r(w.name||w.id||"Categoria")}</span>
                                    <span class="text-muted">${Number(w.items_count||0)} item(ns)</span>
                                </div>
                            `).join("")||'<div class="small text-warning">O iFood retornou 0 categorias/itens para este catalogo.</div>'}
                        </div>
                        ${f.length?`
                            <hr class="border-secondary">
                            <div class="fw-bold small mb-2">Pausas ativas/futuras</div>
                            <div class="d-flex flex-column gap-2">
                                ${f.map(w=>`
                                    <div class="d-flex justify-content-between align-items-center gap-3">
                                        <span class="small">${r(w.description||w.id||"Pausa")}</span>
                                        <button class="btn btn-xs btn-outline-success" onclick="deleteIfoodInterruption('${encodeURIComponent(w.id||"")}')">Remover</button>
                                    </div>
                                `).join("")}
                            </div>
                        `:""}
                    </div>
                `)}catch(i){if((i==null?void 0:i.code)==="AUTH_REQUIRED")return;e&&(e.innerHTML=`<div class="text-danger small">${r(i.message||"Nao foi possivel consultar o iFood.")}</div>`)}},window.pauseIfoodStore=async()=>{const e=prompt("Motivo da pausa iFood:","Pausa operacional");if(e===null)return;const t=new Date,o=new Date(Date.now()+30*60*1e3);try{const{resp:a,data:i}=await g("/api.php?action=ifood_create_interruption",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({description:e.trim()||"Pausa operacional",start:t.toISOString(),end:o.toISOString()})});if(!a.ok||i.error)throw new Error(b(i,"Nao foi possivel pausar a loja iFood."));await loadIfoodRemoteStatus()}catch(a){if((a==null?void 0:a.code)==="AUTH_REQUIRED")return;alert(a.message||"Nao foi possivel pausar a loja iFood.")}},window.deleteIfoodInterruption=async e=>{const t=decodeURIComponent(e||"");if(t)try{const{resp:o,data:a}=await g("/api.php?action=ifood_delete_interruption",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({interruption_id:t})});if(!o.ok||a.error)throw new Error(b(a,"Nao foi possivel remover a pausa iFood."));await loadIfoodRemoteStatus()}catch(o){if((o==null?void 0:o.code)==="AUTH_REQUIRED")return;alert(o.message||"Nao foi possivel remover a pausa iFood.")}},window.pollIfoodEvents=async()=>{try{const{resp:e,data:t}=await g("/api.php?action=ifood_poll_events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});if(!e.ok||t.error)throw new Error(b(t,"Nao foi possivel buscar eventos iFood."));c.ifood=t.dashboard||c.ifood,h(),alert(`Polling concluido. Eventos recebidos: ${t.events_count||0}`)}catch(e){if((e==null?void 0:e.code)==="AUTH_REQUIRED")return;alert(e.message||"Nao foi possivel buscar eventos iFood.")}};function Jt(){let e=document.getElementById("ifood-order-details-modal");return e||(e=document.createElement("div"),e.id="ifood-order-details-modal",e.className="modal fade",e.tabIndex=-1,e.setAttribute("aria-hidden","true"),e.innerHTML=`
                <div class="modal-dialog modal-xl modal-dialog-scrollable">
                    <div class="modal-content border border-secondary" style="background: var(--bg-card); color: var(--text-main);">
                        <div class="modal-header border-secondary">
                            <h5 class="modal-title">Detalhes do pedido iFood</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fechar"></button>
                        </div>
                        <div class="modal-body" id="ifood-order-details-body"></div>
                    </div>
                </div>
            `,document.body.appendChild(e)),Be||(Be=x.getOrCreateInstance(e)),Be}function ma(e){var s,u,f,p;const t=Array.isArray(e==null?void 0:e.items)?e.items:[],o=Array.isArray((s=e==null?void 0:e.payments)==null?void 0:s.methods)?e.payments.methods:[],a=Array.isArray(e==null?void 0:e.benefits)?e.benefits:[],i=(e==null?void 0:e.customer)||{},n=(e==null?void 0:e.delivery)||{},d=(i==null?void 0:i.documentNumber)||(i==null?void 0:i.document)||(e==null?void 0:e.documentNumber)||"",m=t.map(l=>(l==null?void 0:l.observations)||(l==null?void 0:l.observation)||(l==null?void 0:l.note)||"").filter(Boolean);return`
            <div class="row g-3 mb-3">
                <div class="col-md-4"><div class="theme-surface-soft border border-secondary rounded-3 p-3 h-100"><div class="small text-muted">Pedido</div><div class="fw-bold">${r((e==null?void 0:e.displayId)||(e==null?void 0:e.id)||"--")}</div><div class="small text-muted">${r((e==null?void 0:e.status)||"--")}</div></div></div>
                <div class="col-md-4"><div class="theme-surface-soft border border-secondary rounded-3 p-3 h-100"><div class="small text-muted">Cliente</div><div class="fw-bold">${r((i==null?void 0:i.name)||"Cliente iFood")}</div><div class="small text-muted">${r(d||"Documento nao informado")}</div></div></div>
                <div class="col-md-4"><div class="theme-surface-soft border border-secondary rounded-3 p-3 h-100"><div class="small text-muted">Coleta / entrega</div><div class="fw-bold">${r((n==null?void 0:n.pickupCode)||((u=i==null?void 0:i.phone)==null?void 0:u.localizer)||"--")}</div><div class="small text-muted">${r((n==null?void 0:n.deliveredBy)||(e==null?void 0:e.orderType)||"--")}</div></div></div>
            </div>
            <div class="row g-3 mb-3">
                <div class="col-lg-6">
                    <h6>Itens</h6>
                    <div class="d-flex flex-column gap-2">
                        ${t.map(l=>`
                            <div class="theme-surface-soft border border-secondary rounded-3 p-2">
                                <div class="d-flex justify-content-between gap-2"><strong>${r((l==null?void 0:l.name)||"Item")}</strong><span>${r(String((l==null?void 0:l.quantity)||1))}x</span></div>
                                ${l!=null&&l.observations||l!=null&&l.observation||l!=null&&l.note?`<div class="small text-warning">${r(l.observations||l.observation||l.note)}</div>`:""}
                            </div>
                        `).join("")||'<div class="text-muted">Nenhum item retornado.</div>'}
                    </div>
                </div>
                <div class="col-lg-6">
                    <h6>Pagamento e descontos</h6>
                    <div class="theme-surface-soft border border-secondary rounded-3 p-3 mb-2">
                        ${o.map(l=>{var y;return`<div>${r((l==null?void 0:l.method)||(l==null?void 0:l.type)||"Pagamento")} ${r((l==null?void 0:l.brand)||((y=l==null?void 0:l.card)==null?void 0:y.brand)||"")}</div>`}).join("")||'<div class="text-muted">Pagamento sem metodos detalhados.</div>'}
                        ${(p=(f=e==null?void 0:e.payments)==null?void 0:f.cash)!=null&&p.changeFor?`<div class="small text-muted">Troco para ${_(e.payments.cash.changeFor)}</div>`:""}
                    </div>
                    <div class="theme-surface-soft border border-secondary rounded-3 p-3">
                        ${a.map(l=>{var y,v,w;return`<div>${r(((v=(y=l==null?void 0:l.sponsorshipValues)==null?void 0:y.map)==null?void 0:v.call(y,U=>(U==null?void 0:U.name)||(U==null?void 0:U.responsible)||"").filter(Boolean).join(", "))||(l==null?void 0:l.target)||"Cupom")} ${r(String((l==null?void 0:l.value)||((w=l==null?void 0:l.amount)==null?void 0:w.value)||""))}</div>`}).join("")||'<div class="text-muted">Nenhum beneficio retornado.</div>'}
                    </div>
                </div>
            </div>
            ${m.length?`<div class="alert alert-warning py-2">${r(m.join(" | "))}</div>`:""}
            <details>
                <summary class="small text-muted">Payload completo</summary>
                <pre class="small border border-secondary rounded-3 p-3 mt-2 mb-0 text-body overflow-auto">${r(JSON.stringify(e||{},null,2))}</pre>
            </details>
        `}window.openIfoodOrderDetails=async e=>{const t=decodeURIComponent(e||"");if(!t)return;const o=document.getElementById("ifood-order-details-body");Jt().show(),o&&(o.innerHTML='<div class="text-muted">Carregando pedido...</div>');try{const{resp:a,data:i}=await g(`/api.php?action=ifood_order_details&order_id=${encodeURIComponent(t)}`);if(!a.ok||i.error)throw new Error(b(i,"Nao foi possivel consultar detalhes do pedido iFood."));const n=document.getElementById("ifood-order-details-body");n&&(n.innerHTML=ma(i.data||{}))}catch(a){if((a==null?void 0:a.code)==="AUTH_REQUIRED")return;const i=document.getElementById("ifood-order-details-body");i&&(i.innerHTML=`<div class="text-danger">${r(a.message||"Nao foi possivel consultar detalhes do pedido iFood.")}</div>`)}},window.requestIfoodOrderCancellation=async e=>{var o;const t=decodeURIComponent(e||"");if(t)try{const{resp:a,data:i}=await g(`/api.php?action=ifood_order_cancellation_reasons&order_id=${encodeURIComponent(t)}`);if(!a.ok||i.error)throw new Error(b(i,"Nao foi possivel consultar motivos de cancelamento."));const d=(Array.isArray((o=i.data)==null?void 0:o.reasons)?i.data.reasons:Array.isArray(i.data)?i.data:[]).map(s=>`${s.code||s.id}: ${s.description||s.name||""}`).join(`
`),m=prompt(`Motivo de cancelamento iFood:
${d||"Informe um codigo valido retornado pelo iFood."}`);if(!m)return;await window.ifoodOrderAction(e,"request_cancellation",{reason:m.trim().split(":")[0]})}catch(a){if((a==null?void 0:a.code)==="AUTH_REQUIRED")return;alert(a.message||"Nao foi possivel solicitar cancelamento no iFood.")}},window.openIfoodTracking=async e=>{const t=decodeURIComponent(e||"");if(!t)return;Jt().show();const o=document.getElementById("ifood-order-details-body");o&&(o.innerHTML='<div class="text-muted">Carregando tracking iFood...</div>');try{const{resp:a,data:i}=await g(`/api.php?action=ifood_order_tracking&order_id=${encodeURIComponent(t)}`);if(!a.ok||i.error)throw new Error(b(i,"Nao foi possivel consultar tracking iFood."));const n=i.data||{},d=document.getElementById("ifood-order-details-body");d&&(d.innerHTML=`
                    <div class="row g-3 mb-3">
                        <div class="col-md-4"><div class="theme-surface-soft border border-secondary rounded-3 p-3"><div class="small text-muted">Posicao</div><strong>${r(String(n.latitude||"--"))}, ${r(String(n.longitude||"--"))}</strong></div></div>
                        <div class="col-md-4"><div class="theme-surface-soft border border-secondary rounded-3 p-3"><div class="small text-muted">Entrega esperada</div><strong>${r(n.expectedDelivery||"--")}</strong></div></div>
                        <div class="col-md-4"><div class="theme-surface-soft border border-secondary rounded-3 p-3"><div class="small text-muted">Atualizado</div><strong>${r(n.trackDate||"--")}</strong></div></div>
                    </div>
                    <pre class="small border border-secondary rounded-3 p-3 mb-0 text-body overflow-auto">${r(JSON.stringify(n,null,2))}</pre>
                `)}catch(a){if((a==null?void 0:a.code)==="AUTH_REQUIRED")return;const i=document.getElementById("ifood-order-details-body");i&&(i.innerHTML=`<div class="text-danger">${r(a.message||"Nao foi possivel consultar tracking iFood.")}</div>`)}},window.validateIfoodPickupCode=async e=>{const t=prompt("Codigo de coleta informado pelo entregador iFood:");t&&await window.ifoodOrderAction(e,"validate_pickup_code",{code:t})},window.ifoodOrderAction=async(e,t,o={})=>{const a=decodeURIComponent(e||"");if(!(!a||!t))try{const{resp:i,data:n}=await g("/api.php?action=ifood_order_action",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({order_id:a,order_action:t,body:o})});if(!i.ok||n.error)throw new Error(b(n,"Nao foi possivel executar acao no iFood."));c.ifood=n.dashboard||c.ifood,h()}catch(i){if((i==null?void 0:i.code)==="AUTH_REQUIRED")return;alert(i.message||"Nao foi possivel executar acao no iFood.")}},window.answerIfoodDispute=async(e,t)=>{const o=decodeURIComponent(e||"");if(!o||!t)return;const a=prompt(`Motivo iFood para ${t==="accept"?"aceitar":"rejeitar"} a negociacao:`);if(!a)return;const i=t==="accept"&&prompt("Detalhe da aceitacao, se necessario:","")||"";try{const{resp:n,data:d}=await g("/api.php?action=ifood_dispute_action",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dispute_id:o,dispute_action:t,body:{reason:a.trim(),...i?{detailReason:i.trim()}:{}}})});if(!n.ok||d.error)throw new Error(b(d,"Nao foi possivel responder a negociacao iFood."));c.ifood=d.dashboard||c.ifood,h()}catch(n){if((n==null?void 0:n.code)==="AUTH_REQUIRED")return;alert(n.message||"Nao foi possivel responder a negociacao iFood.")}},window.openCatalogImportModal=()=>{const e=document.getElementById("catalogImportModal");if(!e)return;const t=document.getElementById("catalog-import-zip"),o=document.getElementById("catalog-import-text");t&&(t.value=""),o&&(o.value=""),document.getElementById("catalog-import-feedback").innerHTML="",x.getOrCreateInstance(e).show()},window.submitCatalogImport=async()=>{var d,m,s;const e=document.getElementById("catalog-import-zip"),t=document.getElementById("catalog-import-text"),o=document.getElementById("catalog-import-feedback"),a=document.getElementById("catalog-import-submit"),i=((d=e==null?void 0:e.files)==null?void 0:d[0])||null,n=((m=t==null?void 0:t.value)==null?void 0:m.trim())||"";if(!i&&!n){o&&(o.innerHTML='<div class="text-danger small">Selecione o ZIP do catalogo antes de importar.</div>');return}try{a&&(a.disabled=!0),o&&(o.innerHTML='<div class="text-muted small"><span class="spinner-border spinner-border-sm me-2"></span>Importando catalogo...</div>');let u;if(i){const l=new FormData;l.append("file",i),u=await g("/api.php?action=import_catalog_zip",{method:"POST",timeoutMs:12e4,body:l})}else u=await g("/api.php?action=import_catalog_text",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:n})});const{resp:f,data:p}=u;if(!f.ok||p!=null&&p.error)throw new Error(b(p,"Nao foi possivel importar o catalogo."));(s=x.getInstance(document.getElementById("catalogImportModal")))==null||s.hide(),await S("stock",{refreshSnapshot:!0}),alert(`Catalogo importado. ${Number(p.created_products||0)} criados, ${Number(p.updated_products||0)} atualizados, ${Number(p.uploaded_images||0)} imagens e ${Number(p.promotion_count||0)} promocoes ativas.`)}catch(u){if((u==null?void 0:u.code)==="AUTH_REQUIRED")return;o&&(o.innerHTML=`<div class="text-danger small">${r(u.message||"Nao foi possivel importar o catalogo.")}</div>`)}finally{a&&(a.disabled=!1)}},window.openCatalogExportModal=async()=>{const e=document.getElementById("catalogExportModal"),t=document.getElementById("catalog-export-text"),o=document.getElementById("catalog-export-meta");if(!(!e||!t)){t.value="",o&&(o.innerText="Carregando catalogo..."),x.getOrCreateInstance(e).show();try{const{resp:a,data:i}=await g("/api.php?action=export_catalog_text");if(!a.ok||i!=null&&i.error)throw new Error(b(i,"Nao foi possivel exportar o catalogo."));t.value=i.text||"",o&&(o.innerText=`${Number(i.products_count||0)} produtos e ${Number(i.promotions_count||0)} promocoes exportadas.`)}catch(a){if((a==null?void 0:a.code)==="AUTH_REQUIRED")return;o&&(o.innerText=a.message||"Nao foi possivel exportar o catalogo.")}}},window.copyCatalogExportText=async()=>{var t;const e=((t=document.getElementById("catalog-export-text"))==null?void 0:t.value)||"";if(e)try{await navigator.clipboard.writeText(e);const o=document.getElementById("catalog-export-meta");o&&(o.innerText="Catalogo copiado para a area de transferencia.")}catch{alert("Nao foi possivel copiar o catalogo.")}},window.downloadCatalogExportText=()=>{var i;const e=((i=document.getElementById("catalog-export-text"))==null?void 0:i.value)||"";if(!e)return;const t=new Blob([e],{type:"application/json;charset=utf-8"}),o=URL.createObjectURL(t),a=document.createElement("a");a.href=o,a.download="catalogo-lumix-ice.json",document.body.appendChild(a),a.click(),a.remove(),URL.revokeObjectURL(o)},window.downloadCatalogExportZip=()=>{const e=document.createElement("a");e.href=`/api.php?action=export_catalog_zip&_=${Date.now()}`,e.download="",document.body.appendChild(e),e.click(),e.remove()},window.updateOrderStatus=async(e,t)=>{try{const{resp:o,data:a}=await g("/api.php?action=update_order_status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:e,status:t})});if(!o.ok||a.error)throw new Error(b(a,"Nao foi possivel atualizar o pedido."));Ie(a.order),h()}catch(o){if((o==null?void 0:o.code)==="AUTH_REQUIRED")return;alert(o.message||"Nao foi possivel atualizar o pedido.")}},window.saveStoreHours=async()=>{var p;const e=document.getElementById("store-ordering-enabled"),t=document.getElementById("store-courier-rule-mode"),o=document.getElementById("store-courier-items-threshold"),a=document.getElementById("store-courier-type-until-threshold"),i=document.getElementById("store-courier-type-above-threshold"),n=document.getElementById("store-courier-motorcycle-max-weight"),d=document.getElementById("store-courier-motorcycle-max-size"),m=document.getElementById("store-courier-car-max-weight"),s=document.getElementById("store-courier-car-max-size"),u=document.getElementById("store-private-dispatch-enabled"),f=Array.from(document.querySelectorAll(".store-private-region-fee")).map(l=>({key:l.dataset.regionKey||"",label:l.dataset.regionLabel||"",fee:Math.max(0,Number(l.value||0))}));try{const{resp:l,data:y}=await g("/api.php?action=update_store_settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ordering_enabled:(e==null?void 0:e.checked)??!0,site_weekly_hours:ze("site-weekly-hours"),ifood_weekly_hours:ze("ifood-weekly-hours"),courier_rule_mode:(t==null?void 0:t.value)||"items_count",courier_items_threshold:Number((o==null?void 0:o.value)||8),courier_type_until_threshold:(a==null?void 0:a.value)||"moto",courier_type_above_threshold:(i==null?void 0:i.value)||"carro",courier_motorcycle_max_weight_kg:Number((n==null?void 0:n.value)||20),courier_motorcycle_max_size_cm:Number((d==null?void 0:d.value)||120),courier_car_max_weight_kg:Number((m==null?void 0:m.value)||80),courier_car_max_size_cm:Number((s==null?void 0:s.value)||260),private_dispatch_enabled:(u==null?void 0:u.checked)===!0,private_dispatch_regions:f})});if(!l.ok||y.error)throw new Error(b(y,"Nao foi possivel salvar o horario da loja."));c.store_settings={...y.store_settings||c.store_settings},re(),(p=vt())==null||p.hide()}catch(l){if((l==null?void 0:l.code)==="AUTH_REQUIRED")return;alert(l.message||"Nao foi possivel salvar o horario da loja.")}},window.dispatchOrder=async e=>{if(confirm("Despachar este pedido para a Uber agora?"))try{const{resp:t,data:o}=await g("/api.php?action=dispatch_order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:e})});if(!t.ok||o.error)throw new Error(b(o,"Nao foi possivel despachar o pedido para a Uber."));o.order&&Ie(o.order),h(),o.dispatch_error&&alert(`A Uber recusou o despacho: ${o.dispatch_error}`)}catch(t){if((t==null?void 0:t.code)==="AUTH_REQUIRED")return;alert(t.message||"Nao foi possivel despachar o pedido para a Uber.")}},window.retryUberDispatch=async e=>{if(confirm("Tentar o despacho deste pedido na Uber novamente?"))try{const{resp:t,data:o}=await g("/api.php?action=retry_uber_dispatch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:e})});if(!t.ok||o.error)throw new Error(b(o,"Nao foi possivel reenviar o pedido para a Uber."));o.order&&Ie(o.order),h(),o.dispatch_error&&alert(`A Uber recusou o reenvio: ${o.dispatch_error}`)}catch(t){if((t==null?void 0:t.code)==="AUTH_REQUIRED")return;alert(t.message||"Nao foi possivel reenviar o pedido para a Uber.")}},window.printOrder=async e=>{var o;const t=c.orders.find(a=>Number(a.id)===Number(e));if(t){try{await Wt({jobName:`receipt-${e}`,html:qt(t),baseUrl:We})}catch(a){alert(a.message||"Nao foi possivel abrir a impressao.");return}if(t.payment_status==="paid"&&t.print_status!=="printed")try{const{resp:a,data:i}=await g("/api.php?action=mark_order_printed",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:e})});if(!a.ok||i.error)throw new Error(b(i,"Nao foi possivel marcar o pedido como impresso."));Ie(i.order),h(),((o=i.ifood_flow)==null?void 0:o.status)==="warning"&&alert(`Pedido impresso no CRM, mas o iFood nao confirmou automaticamente: ${i.ifood_flow.message||"verifique o status no painel iFood."}`)}catch(a){if((a==null?void 0:a.code)==="AUTH_REQUIRED")return;alert(a.message||"Nao foi possivel finalizar o fluxo de impressao.")}else h()}},window.printTestOrder=async()=>{try{await Wt({jobName:"receipt-test",html:qt(la()),baseUrl:We})}catch(e){alert(e.message||"Nao foi possivel abrir a impressao de teste.")}},window.uploadProductImage=async e=>{var n;if(!((n=e==null?void 0:e.files)!=null&&n.length))return;const t=e.files[0],o=document.getElementById("upload-status"),a=document.getElementById("prod-img"),i=new FormData;i.append("file",t),o&&(o.innerHTML='<span class="text-warning"><i class="spinner-border spinner-border-sm"></i> Enviando imagem para o storage...</span>');try{const{resp:d,data:m}=await g("/api.php?action=upload_product_image",{method:"POST",timeoutMs:6e4,body:i});if(!d.ok||m!=null&&m.error||!(m!=null&&m.url))throw new Error(b(m,"Falha ao enviar imagem para o storage."));if(a&&(a.value=m.url),o){const s=m.public_url_expires_at?`<div class="small text-muted mt-1">Link publico valido ate ${r(m.public_url_expires_at)}</div>`:"";o.innerHTML=`<span class="text-success"><i data-lucide="check-circle" size="14"></i> Imagem enviada. Clique em Salvar para atualizar o produto.</span><div class="small text-muted mt-1">${r(m.path||"")}</div>${s}`}await je(!0),N.createIcons()}catch(d){console.error(d),o&&((d==null?void 0:d.code)==="AUTH_REQUIRED"?o.innerHTML='<span class="text-danger">Sessao expirada. Faca login no painel novamente.</span>':o.innerHTML=`<span class="text-danger">${r(d.message||"Erro ao enviar imagem.")}</span>`)}finally{e.value=""}},window.uploadToDrive=window.uploadProductImage,et.forEach(e=>{e.addEventListener("click",async t=>{t.preventDefault(),P.authenticated&&await S(e.dataset.section)})}),window.addEventListener("hashchange",()=>{var t;const e=he();E=e,Ue(e),!(!P.authenticated||e===((t=V==null?void 0:V.dataset)==null?void 0:t.section))&&S(e,{syncHash:!1}).catch(o=>{console.error("Nao foi possivel trocar a secao pelo menu.",o)})}),O&&O.addEventListener("click",()=>{var e;(e=bt())==null||e.show()}),K&&K.addEventListener("click",()=>{var e;re(),(e=vt())==null||e.show()});const Gt=document.getElementById("store-courier-rule-mode");Gt&&Gt.addEventListener("change",()=>{$t()});const Vt=document.getElementById("store-private-dispatch-enabled");Vt&&Vt.addEventListener("change",()=>{re()});const Kt=document.getElementById("prod-img");Kt&&Kt.addEventListener("input",()=>{_e()}),Ze&&Ze.addEventListener("submit",Eo),Xe&&Xe.addEventListener("click",ft),tt&&tt.addEventListener("click",async e=>{j()&&(e.preventDefault(),await Ke(We))}),window.openLogisticsTracking=async e=>{const t=decodeURIComponent(e||"");if(t){if(j()){await Ke(t);return}window.open(t,"_blank","noopener,noreferrer")}},window.logoutAdmin=ft,_o(),uo(),Ue(E),wo().then(e=>{if(e!=null&&e.authenticated){const t=so();t&&(Nt(t),h(),De()),S(he(),{replaceHash:!0})}else z&&z.focus()}).catch(e=>{console.error("Nao foi possivel iniciar a sessao do painel.",e),ae({authenticated:!1}),oe("Nao foi possivel validar a sessao do painel.")}),window.openPromotionsModal=async()=>{x.getOrCreateInstance(document.getElementById("promotionModal")).show(),await renderPromotionsList()},window.renderPromotionsList=async()=>{const e=document.getElementById("promotions-list-body");if(e){e.innerHTML='<tr><td colspan="5" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Carregando...</td></tr>';try{const{resp:t,data:o}=await g("/api.php?action=get_promotions");if(!t.ok)throw new Error("Falha ao carregar promoções");if(c.promotions=Array.isArray(o)?o:[],c.promotions.length===0){e.innerHTML='<tr><td colspan="5" class="text-center py-4 text-muted">Ainda não há promoções configuradas.</td></tr>';return}e.innerHTML=c.promotions.map(a=>`
                <tr class="${a.is_active?"":"opacity-50"}">
                    <td>
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" ${a.is_active?"checked":""} onchange="togglePromotionStatus(${a.id}, this.checked)">
                        </div>
                    </td>
                    <td><span class="badge bg-secondary text-uppercase">${r(a.kind)}</span></td>
                    <td>
                        <div class="fw-bold">${r(a.title)}</div>
                        <div class="small text-muted">${r(a.description||"")}</div>
                    </td>
                    <td class="small">
                        ${a.min_subtotal?`<div>Min: <strong>${_(a.min_subtotal)}</strong></div>`:""}
                        ${a.target_product_id?`<div>Alvo: <strong>${r(a.target_product_name||a.target_product_id)}</strong></div>`:""}
                        ${a.reward_product_id?`<div>Ganhe: <strong>${r(a.reward_product_name||a.reward_product_id)}</strong></div>`:""}
                        ${a.special_price?`<div>Por: <strong>${_(a.special_price)}</strong></div>`:""}
                        ${a.trigger_keywords?`<div>Termos: <em>${r(a.trigger_keywords)}</em></div>`:""}
                    </td>
                    <td>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-dark border-secondary rounded-pill" onclick="openPromotionEditModal(${a.id})">Editar</button>
                            <button class="btn btn-sm btn-outline-danger border-0" onclick="deletePromotion(${a.id})"><i data-lucide="trash-2" size="14"></i></button>
                        </div>
                    </td>
                </tr>
            `).join(""),N.createIcons()}catch(t){e.innerHTML=`<tr><td colspan="5" class="text-center py-4 text-danger">${r(t.message)}</td></tr>`}}},window.openPromotionEditModal=(e=null)=>{const t=document.getElementById("promotionEditModal");if(!t)return;const o=x.getOrCreateInstance(t),a=document.getElementById("promotionForm"),i=document.getElementById("promoEditTitle");if(!a)return;a.reset(),document.getElementById("promo-id").value=e||"",i.innerText=e?"Editar Promoção":"Nova Promoção";const n=document.getElementById("promo-target-product-id"),d=document.getElementById("promo-reward-product-id"),m='<option value="">Selecione o produto...</option>'+c.products.map(s=>`<option value="${s.id}">${r(s.name)}</option>`).join("");if(n&&(n.innerHTML=m),d&&(d.innerHTML=m),e){const s=c.promotions.find(u=>Number(u.id)===Number(e));s&&(document.getElementById("promo-kind").value=s.kind,document.getElementById("promo-title").value=s.title,document.getElementById("promo-description").value=s.description||"",document.getElementById("promo-min-subtotal").value=s.min_subtotal||"",document.getElementById("promo-target-product-id").value=s.target_product_id||"",document.getElementById("promo-special-price").value=s.special_price||"",document.getElementById("promo-reward-product-id").value=s.reward_product_id||"",document.getElementById("promo-trigger-keywords").value=s.trigger_keywords||"",document.getElementById("promo-sort-order").value=s.sort_order||0,document.getElementById("promo-is-active").checked=!!s.is_active,document.getElementById("promo-message-color").value=s.message_color||"#ffffff",document.getElementById("promo-price-color").value=s.price_color||"#ffc107")}else document.getElementById("promo-message-color").value="#ffffff",document.getElementById("promo-price-color").value="#ffc107";window.togglePromotionFields(),o.show()},window.togglePromotionFields=()=>{const e=document.getElementById("promo-kind");if(!e)return;const t=e.value,o=i=>{var n;return(n=document.getElementById(i))==null?void 0:n.classList.add("d-none")},a=i=>{var n;return(n=document.getElementById(i))==null?void 0:n.classList.remove("d-none")};["field-min-subtotal","field-target-product","field-special-price","field-reward-product","field-trigger-keywords"].forEach(o),t==="threshold_free_item"?(a("field-min-subtotal"),a("field-reward-product")):t==="threshold_special_price"?(a("field-min-subtotal"),a("field-target-product"),a("field-special-price")):t==="cart_note"&&(a("field-min-subtotal"),a("field-trigger-keywords"))},window.savePromotion=async()=>{var i,n,d;if(!document.getElementById("promotionForm"))return;const t=document.getElementById("promo-target-product-id"),o=document.getElementById("promo-reward-product-id"),a={id:document.getElementById("promo-id").value,kind:document.getElementById("promo-kind").value,title:document.getElementById("promo-title").value,description:document.getElementById("promo-description").value,min_subtotal:document.getElementById("promo-min-subtotal").value,target_product_id:t.value,target_product_name:((i=t.options[t.selectedIndex])==null?void 0:i.text)||"",special_price:document.getElementById("promo-special-price").value,reward_product_id:o.value,reward_product_name:((n=o.options[o.selectedIndex])==null?void 0:n.text)||"",trigger_keywords:document.getElementById("promo-trigger-keywords").value,sort_order:document.getElementById("promo-sort-order").value,is_active:document.getElementById("promo-is-active").checked,message_color:document.getElementById("promo-message-color").value,price_color:document.getElementById("promo-price-color").value};a.target_product_id===""&&delete a.target_product_name,a.reward_product_id===""&&delete a.reward_product_name;try{const{resp:m}=await g("/api.php?action=save_promotion",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)});if(!m.ok)throw new Error("Falha ao salvar promoção");(d=x.getInstance(document.getElementById("promotionEditModal")))==null||d.hide(),await renderPromotionsList(),h()}catch(m){alert(m.message)}},window.deletePromotion=async e=>{if(confirm("Tem certeza que deseja excluir esta promoção?"))try{const{resp:t}=await g(`/api.php?action=delete_promotion&id=${e}`);if(!t.ok)throw new Error("Falha ao excluir promoção");await renderPromotionsList(),h()}catch(t){alert(t.message)}},window.togglePromotionStatus=async(e,t)=>{const o=c.promotions.find(a=>Number(a.id)===Number(e));if(o)try{const{resp:a}=await g("/api.php?action=save_promotion",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...o,is_active:t})});if(!a.ok)throw new Error("Falha ao atualizar status");h()}catch(a){alert(a.message)}}});
