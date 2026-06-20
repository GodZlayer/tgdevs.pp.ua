import{s as tt,p as et,r as at,D as it,a as nt}from"./mobile-CGD7LI3b.js";import{b as j,f as d,c as rt}from"./catalog-pricing-CTyFJyEE.js";const E=(v,h)=>nt(v,h),A={createIcons:tt};document.addEventListener("DOMContentLoaded",()=>{var R;const v=document.getElementById("product-list"),h=document.getElementById("cart-items"),y=document.getElementById("total-price"),$=document.getElementById("checkout-btn"),b=document.getElementById("product-search"),_=Array.from(document.querySelectorAll("[data-payment-method]"));let s=[],c=[],f=[],l=rt(),u=null,w=((R=_.find(t=>t.classList.contains("active")))==null?void 0:R.dataset.paymentMethod)||"pix",C=null,I="";const T="gelocrm_pos_products_cache_v1",O="gelocrm_pos_promotions_cache_v1",z="gelocrm_panel_snapshot_cache_v1",H=10*60*1e3;function P(t,e={},a=8e3){if(!a||e.signal)return E(t,e);const i=new AbortController,r=window.setTimeout(()=>i.abort(),a);return E(t,{...e,signal:i.signal}).finally(()=>window.clearTimeout(r))}function S(t,e=H){try{const a=JSON.parse(localStorage.getItem(t)||"null"),i=Number((a==null?void 0:a.savedAt)||0);return!i||Date.now()-i>e?(localStorage.removeItem(t),null):a.data??null}catch{return localStorage.removeItem(t),null}}function k(t,e){try{localStorage.setItem(t,JSON.stringify({savedAt:Date.now(),data:e}))}catch{}}function x(t){return(Array.isArray(t)?t:[]).map(e=>({...e,id:Number(e.id||0),price:Number(e.price||0),stock_quantity:Number(e.stock_quantity||0),available_stock:Number(e.available_stock??e.stock_quantity??0),barcode:String(e.barcode||"")}))}function F(){const t=S(T);if(Array.isArray(t)&&t.length)return s=x(t),g(s),!0;const e=S(z);return Array.isArray(e==null?void 0:e.products)&&e.products.length?(s=x(e.products),g(s),!0):!1}async function V(){try{const t=await P("/api.php?action=admin_session",{credentials:"include"},5e3),e=await t.json().catch(()=>({}));return!t.ok||!(e!=null&&e.authenticated)?(window.location.replace("/panel/"),!1):!0}catch(t){return s.length>0?(console.warn("POS session check timed out; using cached products while API recovers.",t),!0):(window.location.replace("/panel/"),!1)}}function J(){const t=localStorage.getItem("gelocrm_theme")||"dark";document.documentElement.setAttribute("data-bs-theme",t);const e=document.getElementById("theme-icon");e&&e.setAttribute("data-lucide",t==="light"?"moon":"sun")}window.toggleTheme=()=>{const t=document.documentElement,a=(t.getAttribute("data-bs-theme")||"dark")==="light"?"dark":"light";t.setAttribute("data-bs-theme",a),localStorage.setItem("gelocrm_theme",a);const i=document.getElementById("theme-icon");i&&i.setAttribute("data-lucide",a==="light"?"moon":"sun"),A.createIcons()};function U(){var t;return u||!y||(u=document.createElement("div"),u.className="small mt-2",(t=y.parentElement)==null||t.insertAdjacentElement("afterend",u)),u}function q(){_.forEach(t=>{const e=(t.dataset.paymentMethod||"pix")===w;t.classList.toggle("active",e),t.setAttribute("aria-pressed",e?"true":"false")})}function D(){let t=!1;c=c.map(e=>{const a=s.find(n=>Number(n.id)===Number(e.id));if(!a)return t=!0,null;const i=Number(a.available_stock||0),r=Math.min(Number(e.quantity||0),i);return r<=0?(t=!0,null):(r!==Number(e.quantity||0)&&(t=!0),{...a,quantity:r})}).filter(Boolean),t&&p()}async function N(t={}){try{const e=t.force===!0,a=e?`/api.php?action=get_products&_=${Date.now()}`:"/api.php?action=get_products",r=await(await P(a,e?{cache:"no-store"}:void 0,8e3)).json();if(!Array.isArray(r))throw new Error("Falha ao carregar produtos");s=x(r),k(T,s);const n=JSON.stringify(s.map(o=>[o.id,o.name,o.price,o.available_stock,o.img,o.barcode]));if(n===I&&!t.forceRender){D();return}I=n,g(s),D()}catch(e){console.error("Failed to load POS products",e)}}function Q(){window.clearInterval(C),C=window.setInterval(()=>{document.visibilityState==="visible"&&N({force:!0})},3e4)}async function L(){try{const e=await(await P("/api.php?action=get_active_promotions",{},8e3)).json();if(!Array.isArray(e))throw new Error("Falha ao carregar promocoes");f=e.map(a=>({...a,min_subtotal:a.min_subtotal==null?null:Number(a.min_subtotal||0),reward_quantity:Math.max(1,Number(a.reward_quantity||1)),special_price:a.special_price==null?null:Number(a.special_price||0)})),k(O,f)}catch(t){console.error("Failed to load POS promotions",t),f=S(O)||[]}}function g(t){v.innerHTML=t.map(e=>`
            <div class="col animate__animated animate__fadeIn">
                <div class="card bg-dark border-secondary h-100 p-2 ${e.available_stock>0?"cursor-pointer":"opacity-50"}" ${e.available_stock>0?`onclick="addToCartPOS(${e.id})"`:""}>
                    <img src="${at(e.img,it)}" class="card-img-top rounded mb-2 theme-image-surface" style="height: 100px; object-fit: cover;">
                    <div class="small fw-bold text-center">${e.name}</div>
                    ${e.barcode?`<div class="small text-muted text-center">${m(e.barcode)}</div>`:""}
                    <div class="text-primary text-center fw-bold mt-1">R$ ${parseFloat(e.price).toFixed(2)}</div>
                    <div class="small text-center mt-1 ${e.available_stock>0?"text-muted":"text-danger"}">${e.available_stock>0?`${e.available_stock} disponivel`:"Esgotado"}</div>
                </div>
            </div>
        `).join("")}function B(t){var r;const e=s.find(n=>n.id==t);if(!e)return!1;const a=((r=c.find(n=>n.id==t))==null?void 0:r.quantity)||0;if((e.available_stock||0)<=0)return alert("Produto sem estoque."),!1;if(a>=e.available_stock)return alert(`Estoque disponivel para ${e.name}: ${e.available_stock}`),!1;const i=c.find(n=>n.id==t);return i?i.quantity++:c.push({...e,quantity:1}),p(),!0}window.addToCartPOS=t=>{B(t)};function M(t){return String(t||"").replace(/\D+/g,"")}function Y(t){const e=M(t);if(!e)return null;const a=s.filter(i=>M(i.barcode)===e);return a.length===1?a[0]:null}function K(){b&&(b.value="",g(s),window.setTimeout(()=>b.focus(),0))}function p(){l=j(c,f,s);const t=l.items.length?l.items:c;h.innerHTML=t.map(a=>`
            <div class="pos-cart-item d-flex justify-content-between align-items-center mb-3 p-2 rounded border border-secondary border-opacity-25 animate__animated animate__fadeInRight">
                <div>
                    <div class="small fw-bold">${a.name}</div>
                    <small class="text-muted">${a.quantity}x ${d(a.price)}</small>
                    ${a.promotion_label?`<div class="text-success small fw-bold mt-1">${a.promotion_label}</div>`:""}
                </div>
                <div class="d-flex align-items-center gap-2">
                    <button class="btn btn-sm btn-outline-secondary rounded-circle pos-qty-btn" onclick="changeCartQtyPOS(${a.id}, -1)" title="Diminuir"><i data-lucide="minus" size="14"></i></button>
                    <div class="fw-bold text-end" style="min-width: 72px;">${d(a.quantity*a.price)}</div>
                    <button class="btn btn-sm btn-outline-secondary rounded-circle pos-qty-btn" onclick="changeCartQtyPOS(${a.id}, 1)" title="Aumentar"><i data-lucide="plus" size="14"></i></button>
                    <button class="btn btn-sm btn-outline-danger rounded-circle pos-qty-btn" onclick="removeCartItemPOS(${a.id})" title="Remover"><i data-lucide="trash-2" size="14"></i></button>
                </div>
            </div>
        `).join(""),y.innerText=d(l.subtotal),$.disabled=c.length===0;const e=U();if(e){e.className="small mt-2";const a=[];l.discountTotal>0&&a.push(`<div class="text-success fw-bold">Desconto: ${d(l.discountTotal)}</div>`),l.giftTotal>0&&a.push(`<div class="text-info fw-bold">Brindes: ${d(l.giftTotal)}</div>`),l.notices.length&&a.push(`<div class="text-muted">${l.notices.join(" | ")}</div>`),e.innerHTML=a.join("")}A.createIcons()}function m(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function W(t){const e=t?new Date(t):new Date;return Number.isNaN(e.getTime())?"--":e.toLocaleString("pt-BR")}function G(t){if(Array.isArray(t==null?void 0:t.items))return t.items;try{const e=JSON.parse((t==null?void 0:t.items)||"[]");return Array.isArray(e)?e:[]}catch{return[]}}function X(t){const e=String(t||"").trim().toLowerCase();return e==="pix"?"PIX":e==="debit_card"?"CARTAO DEBITO":e==="credit_card"||e==="card"?"CARTAO CREDITO":e==="cash"?"DINHEIRO":e?e.toUpperCase():"PENDENTE"}function Z(t){const e=G(t),a=Number((t==null?void 0:t.delivery_fee)||0),i=Number((t==null?void 0:t.total)||0),r=Math.max(0,i-a),n=(e.length?e:[{name:"Venda PDV",quantity:1,price:r}]).map(o=>`
            <div class="receipt-item">
                <span>
                    ${Number(o.quantity||0)}x ${m(o.name||"Item")}
                    ${o.promotion_label?`<div class="receipt-line" style="font-size:8pt">${m(o.promotion_label)}</div>`:""}
                </span>
                <span>${d(Number(o.price||0)*Number(o.quantity||0))}</span>
            </div>
        `).join("");return`<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <title>Cupom Pedido #${m((t==null?void 0:t.id)||"")}</title>
    <style>
        @page { size: 80mm 220mm; margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; width: 80mm; background: #fff; color: #000; font-family: "Courier New", monospace; font-size: 10pt; font-weight: 700; line-height: 1.35; }
        .receipt-print { width: 72mm; margin: 0 auto; padding: 5mm 0; }
        .receipt-header { text-align: center; border-bottom: 1px dashed #000; margin-bottom: 4mm; padding-bottom: 2mm; }
        .receipt-logo { display: block; width: 18mm; height: 18mm; object-fit: contain; margin: 0 auto 2mm; }
        .receipt-title { font-size: 16pt; text-transform: uppercase; margin: 0 0 1mm; }
        .receipt-subtitle, .receipt-meta, .receipt-line { margin: 0.5mm 0; }
        .receipt-section { margin-bottom: 3mm; }
        .receipt-divider { border-top: 1px dashed #000; margin: 3mm 0; }
        .receipt-item { display: flex; justify-content: space-between; gap: 3mm; margin-bottom: 1mm; }
        .receipt-item span:last-child { text-align: right; }
        .receipt-total { font-size: 12pt; font-weight: 700; margin-top: 2mm; }
        .receipt-footer { border-top: 1px dashed #000; margin-top: 4mm; padding-top: 2mm; text-align: center; }
    </style>
</head>
<body>
    <main class="receipt-print">
        <div class="receipt-header">
            <img class="receipt-logo" src="/logo/quadrada.png" alt="Lumix Ice">
            <div class="receipt-title">Lumix Ice</div>
            <div class="receipt-subtitle">CUPOM NAO FISCAL</div>
            <div class="receipt-meta">Pedido #${m((t==null?void 0:t.id)||"")}</div>
            <div class="receipt-meta">${m(W(t==null?void 0:t.created_at))}</div>
        </div>
        <div class="receipt-section">
            <div class="receipt-line"><strong>Cliente:</strong> ${m((t==null?void 0:t.customer_name)||"Venda PDV")}</div>
            <div class="receipt-line"><strong>Canal:</strong> PDV</div>
        </div>
        <div class="receipt-divider"></div>
        <div class="receipt-section">${n}</div>
        <div class="receipt-divider"></div>
        <div class="receipt-section">
            <div class="receipt-item"><span>Subtotal</span><span>${d(r)}</span></div>
            ${a>0?`<div class="receipt-item"><span>Entrega</span><span>${d(a)}</span></div>`:""}
            <div class="receipt-item receipt-total"><span>TOTAL</span><span>${d(i)}</span></div>
            <div class="receipt-line" style="margin-top:3mm"><strong>Pagamento:</strong> ${m(X(t==null?void 0:t.payment_method))}</div>
        </div>
        <div class="receipt-footer"><p>Obrigado pela preferencia!</p><small>Lumix Ice</small></div>
    </main>
</body>
</html>`}window.changeCartQtyPOS=(t,e)=>{const a=c.find(n=>Number(n.id)===Number(t)),i=s.find(n=>Number(n.id)===Number(t));if(!a||!i)return;const r=Math.max(0,Number(a.quantity||0)+e);if(r===0)c=c.filter(n=>Number(n.id)!==Number(t));else if(r>Number(i.available_stock||0)){alert(`Estoque disponivel para ${i.name}: ${i.available_stock}`);return}else a.quantity=r;p()},window.removeCartItemPOS=t=>{c=c.filter(e=>Number(e.id)!==Number(t)),p()},b.addEventListener("input",t=>{const e=t.target.value||"",a=Y(e);if(a){B(a.id)&&K();return}const i=e.toLowerCase(),r=s.filter(n=>n.name.toLowerCase().includes(i)||String(n.barcode||"").includes(e.trim()));g(r)}),_.forEach(t=>{t.addEventListener("click",()=>{w=t.dataset.paymentMethod||"pix",q()})}),$.onclick=async()=>{var e;if(c.length===0)return;l=j(c,f,s);const t=l.subtotal;try{const i=await(await E("/api.php?action=save_order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"Venda PDV",customer_name:"Venda PDV",items:c,total:t,delivery_fee:0,delivery_mode:"pdv",payment_method:w,payment_provider:"pdv",payment_status:"paid",print_status:"printed",delivery_status:"delivered",status:"delivered"})})).json();i.status==="success"?(i.order&&await et({jobName:`pos-receipt-${i.order.id||Date.now()}`,html:Z(i.order)}),alert("Venda realizada com sucesso!"),c=[],p(),await Promise.all([N({force:!0}),L()])):alert(((e=i==null?void 0:i.details)==null?void 0:e.message)||(i==null?void 0:i.error)||"Erro ao finalizar venda.")}catch(a){alert(a.message||"Erro ao finalizar venda.")}},(async()=>(J(),F(),await V()&&(q(),await Promise.all([N({force:!0}),L()]),p(),Q(),A.createIcons())))()});
