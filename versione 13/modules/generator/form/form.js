/* --- modules/generator/form/form.js --- */
Object.assign(generator, {

    prepareForm: () => {
        const fd = document.getElementById('form-container');
        const cb = document.getElementById('composer-btns');
        if (!fd) return;
        const oldValues = {};
        fd.querySelectorAll('input[name]').forEach(el=>{ oldValues[el.name]=el.value; });
        fd.innerHTML=''; if(cb) cb.innerHTML='';

        const sel=[];
        for(let i=1;i<=core.state.activeSlots;i++){
            const v=document.getElementById(`gen-select-${i}`)?.value;
            if(v&&core.db.tpl[v]) sel.push({key:v,t:core.db.tpl[v],s:i});
        }
        const nameEl=document.getElementById('preview-tpl-name');
        if(!sel.length){ if(nameEl) nameEl.innerText='—'; const lp=document.getElementById('live-preview'); if(lp) lp.innerText=''; return; }
        if(nameEl) nameEl.innerText=sel.map(s=>s.t.name).join(' + ');

        // Unisce i tag dichiarati nel template + quelli trovati nel body con singola graffa
        const allTagsRaw=Array.from(new Set(sel.flatMap(s=>{
            const fromFields=s.t.fields||[];
            const fromBody=s.t.body?generator.extractTags(s.t.body):[];
            return [...fromFields,...fromBody];
        })));
        // Applica ordine salvato se esiste
        const orderKey = sel.map(s=>s.key).join('+');
        const savedOrder = core.db.fieldOrder?.[orderKey] || [];
        const allTags = savedOrder.length
            ? [...savedOrder.filter(t=>allTagsRaw.includes(t)), ...allTagsRaw.filter(t=>!savedOrder.includes(t))]
            : allTagsRaw;
        allTags.forEach(tag=>{
            const pres=sel.filter(s=>{
                const inFields=(s.t.fields||[]).includes(tag);
                const inBody=s.t.body?generator.extractTags(s.t.body).includes(tag):false;
                return inFields||inBody;
            });
            const colClass=pres.length===1?`field-${pres[0].s}`:'';
            const isWide=/oggetto|motiv|testo|premess/i.test(tag);
            const isHalf=/^(fascicolo|anno_fascicolo|numero_atto_autorizzativo|data_atto_autorizzativo|numero_atto_dispositivo|data_atto_dispositivo|numero_determina|data_determina|numero_provvedimento|data_provvedimento)$/i.test(tag) && !/pa|msg|mess/i.test(tag);
            const isDate=/data|giorno|scadenz/i.test(tag);
            const isMoney=/import|somma|valore|capital/i.test(tag);
            const isLetters=/_in_lettere/i.test(tag);
            const div=document.createElement('div');
            div.className=isWide?'gf-full':isHalf?'gf-half':'gf-1';
            div.dataset.tag=tag;
            let inputHTML;
            if(isLetters){
                inputHTML=`<div class="relative"><input type="text" name="${tag}" class="gen-input ${colClass}" value="${oldValues[tag]||''}" readonly style="background:#f0fdf4;color:#15803d;cursor:default;border-color:#bbf7d0;padding-right:46px;" placeholder="auto…"><span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:9px;font-weight:900;color:#16a34a;text-transform:uppercase;pointer-events:none;">AUTO</span></div>`;
            } else if(isDate){
                inputHTML=`<div class="flex flex-col gap-1"><div class="relative"><input type="text" name="${tag}" id="input-${tag}" class="gen-input ${colClass} pr-10" value="${oldValues[tag]||''}" onfocus="core.state.currentInput=this" oninput="generator.updateLivePreview()" placeholder="gg/mm/aaaa"><button type="button" onclick="generator.openDateModal('${tag}')" class="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600"><i class="fas fa-calendar-alt"></i></button></div><label class="flex items-center gap-1.5 cursor-pointer select-none w-fit"><input type="checkbox" onchange="generator.toggleDateLetters('${tag}',this.checked)" class="accent-blue-500 w-3 h-3"><span class="text-[10px] font-bold text-slate-400 uppercase">in lettere</span></label></div>`;
            } else if(isMoney){
                inputHTML=`<div class="relative"><span class="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">€</span><input type="text" name="${tag}" class="gen-input ${colClass} pl-8" value="${oldValues[tag]||''}" onfocus="core.state.currentInput=this" oninput="generator.updateLivePreview()" placeholder="0,00"></div>`;
            } else {
                inputHTML=`<div class="relative"><input type="text" name="${tag}" class="gen-input ${colClass}" value="${oldValues[tag]||''}" onfocus="core.state.currentInput=this" oninput="generator.updateLivePreview()" placeholder="..."></div>`;
            }
            div.innerHTML=`<label class="gen-label flex items-center gap-1.5 cursor-grab active:cursor-grabbing"><i class="fas fa-grip-vertical text-slate-300 text-[11px] mr-1"></i>${tag}${isLetters?'<i class="fas fa-magic text-emerald-300 text-[9px]"></i>':''}${isDate?'<i class="fas fa-calendar-alt text-blue-300 text-[9px]"></i>':''}${isMoney?'<i class="fas fa-euro-sign text-emerald-300 text-[9px]"></i>':''}</label>${inputHTML}`;
            div.draggable = true;
            div.addEventListener('dragstart', e => {
                generator._dragSrc = div;
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => div.style.opacity = '0.4', 0);
            });
            div.addEventListener('dragend', () => { div.style.opacity = ''; generator._dragSrc = null; });
            div.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; div.style.outline = '2px dashed #3b82f6'; });
            div.addEventListener('dragleave', () => { div.style.outline = ''; });
            div.addEventListener('drop', e => {
                e.preventDefault();
                div.style.outline = '';
                const src = generator._dragSrc;
                if (!src || src === div) return;
                const kids = [...fd.children];
                const srcIdx = kids.indexOf(src);
                const dstIdx = kids.indexOf(div);
                if (srcIdx < dstIdx) fd.insertBefore(src, div.nextSibling);
                else fd.insertBefore(src, div);
                // Mostra pulsante salva ordine
                generator._showSaveOrder();
            });
            fd.appendChild(div);
            if(cb) cb.innerHTML+=`<button class="tag-pill ${colClass}" onclick="event.preventDefault();core.insertTag('{{${tag}}}')">${tag}</button>`;
        });
        generator.updateLivePreview();
        // Rimuovi pulsante salva ordine (ordine appena rigenerato)
        document.getElementById('btn-save-order')?.remove();
    },

    _showSaveOrder: () => {
        if (document.getElementById('btn-save-order')) return;
        const fd = document.getElementById('form-container');
        if (!fd) return;
        const btn = document.createElement('button');
        btn.id = 'btn-save-order';
        btn.type = 'button';
        btn.className = 'col-span-full mt-2 py-2 px-4 bg-blue-600 text-white rounded-xl font-black uppercase text-[12px] hover:bg-blue-700 transition-all';
        btn.innerHTML = '<i class="fas fa-save mr-2"></i>Salva ordine campi';
        btn.onclick = () => {
            const sel = [];
            for(let i=1;i<=core.state.activeSlots;i++){
                const v=document.getElementById(`gen-select-${i}`)?.value;
                if(v) sel.push(v);
            }
            const orderKey = sel.join('+');
            if (!core.db.fieldOrder) core.db.fieldOrder = {};
            core.db.fieldOrder[orderKey] = [...fd.querySelectorAll('[data-tag]')].map(d=>d.dataset.tag);
            core.save();
            btn.remove();
            core.showToast('Ordine campi salvato');
        };
        fd.appendChild(btn);
    },

    // ─────────────────────────────────────────────
    //  AUTOCOMPLETE
    // ─────────────────────────────────────────────
    // ─────────────────────────────────────────────
    //  ANTEPRIMA LIVE
    // ─────────────────────────────────────────────,

    setZoom: (val) => {
        generator._previewZoom = Math.min(150, Math.max(20, Math.round(val)));
        const z  = generator._previewZoom / 100;
        const lp = document.getElementById('live-preview');
        const sz = document.getElementById('preview-sizer');
        const lb = document.getElementById('zoom-label');
        if (!lp || !sz) return;
        lp.style.transform = `scale(${z})`;
        sz.style.width     = (794 * z) + 'px';
        sz.style.height    = (lp.scrollHeight * z) + 'px';
        if (lb) lb.innerText = generator._previewZoom + '%';
    },
    updateLivePreview: () => {
        generator.autoFillLetters();
        const lp=document.getElementById('live-preview');
        if(!lp) return;

        const form=document.getElementById('doc-form');
        const rawData = form ? Object.fromEntries(new FormData(form)) : {};
        // Normalizza TUTTE le chiavi: spazi→underscore, così il lookup funziona sempre
        const data = {};
        Object.entries(rawData).forEach(([k, v]) => {
            data[k] = v;                                    // chiave originale
            data[generator._normKey(k)] = v;               // chiave normalizzata
        });

        let tpl=null;
        for(let i=1;i<=core.state.activeSlots;i++){
            const v=document.getElementById(`gen-select-${i}`)?.value;
            if(v&&core.db.tpl[v]){ tpl=core.db.tpl[v]; break; }
        }
        if(!tpl){ lp.innerHTML='<span style="color:#cbd5e1;font-size:11px;">Seleziona un modello</span>'; return; }

        // Scegli la sorgente: HTML convertito > testo puro (body) > messaggio
        let sourceHtml = tpl.bodyHtml || null;
        let sourcePlain = tpl.body    || null;

        // Pre-processa l'HTML: riassembla {{TAG}} frammentati da Word su più span/run
        // Word spezza sia il contenuto che i delimitatori { { e } } su run separati
        const fixHtmlTags = (html) => {
            // Passo 1: rimuove tag HTML tra } e } e tra { e { (delimitatori frammentati)
            let h = html
                .replace(/\}(<[^>]+>)+\}/g, '}}')   // }...tag...} → }}
                .replace(/\{(<[^>]+>)+\{/g, '{{');   // {...tag...{ → {{
            // Passo 2: rimuove tag HTML all'interno di {{ ... }} e normalizza nome
            h = h.replace(/\{\{((?:[^{}]|<[^>]+>){1,500}?)\}\}/g, (m, inner) => {
                const name = generator._normKey(inner.replace(/<[^>]+>/g, ''));
                return name ? `{{${name}}}` : '';
            });
            return h;
        };

        // Sostituisce {{campo}} nell'HTML con il valore dal form
        const replaceInHtml = (html) => {
            const fixed = fixHtmlTags(html);
            return fixed.replace(/\{\{([^{}]+?)\}\}/g, (m, d1) => {
                const key = generator._normKey(d1);
                const val = data[key] ?? data[key.replace(/_/g, ' ')];
                if (val && val.trim() !== '') {
                    return `<span class="preview-filled">${val.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>`;
                } else {
                    return `<span class="preview-tag">{${d1.trim()}}</span>`;
                }
            });
        };

        if(sourceHtml){
            lp.innerHTML = `
                <style>
                    #live-preview {
                        font-family: Calibri, 'Segoe UI', Arial, sans-serif;
                        font-size: 11pt;
                        line-height: 1.5;
                        color: #000;
                        background: white;
                        padding: 2.54cm 3.17cm;
                        box-shadow: 0 4px 24px rgba(0,0,0,0.13);
                        border-radius: 2px;
                        width: 21cm;
                        min-height: 29.7cm;
                        margin: 0 auto;
                        box-sizing: border-box;
                    }
                    #live-preview h1 { font-size: 16pt; font-weight: bold; margin: 12pt 0 6pt; }
                    #live-preview h2 { font-size: 13pt; font-weight: bold; margin: 10pt 0 4pt; }
                    #live-preview h3 { font-size: 11pt; font-weight: bold; margin: 8pt 0 3pt; }
                    #live-preview p  { margin: 0 0 8pt; text-align: justify; orphans: 2; widows: 2; }
                    #live-preview strong, #live-preview b { font-weight: bold; }
                    #live-preview em, #live-preview i { font-style: italic; }
                    #live-preview u  { text-decoration: underline; }
                    #live-preview table { border-collapse: collapse; width: 100%; margin: 6pt 0; font-size: 10pt; }
                    #live-preview td, #live-preview th { border: 1px solid #000; padding: 3pt 5pt; vertical-align: top; }
                    #live-preview th { background: #f2f2f2; font-weight: bold; }
                    #live-preview img { max-width: 100%; height: auto; display: block; margin: 6pt auto; }
                    #live-preview ul  { padding-left: 1.5em; margin: 0 0 8pt; }
                    #live-preview ol  { padding-left: 1.5em; margin: 0 0 8pt; }
                    #live-preview li  { margin-bottom: 2pt; }
                    #live-preview .preview-filled { color: #166534; font-weight: 600; background: #dcfce7; border-radius: 2px; padding: 0 2px; }
                    #live-preview .preview-tag    { background: #fef9c3; color: #854d0e; font-weight: 600; border-radius: 2px; padding: 0 2px; outline: 1px dashed #fbbf24; }
                </style>
                ${replaceInHtml(sourceHtml)}`;
        } else if(sourcePlain){
            const escaped=sourcePlain.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            const rendered=escaped.replace(/\{\{([^}]+)\}\}/g,(m,d1)=>{
                const key=generator._normKey(d1);
                const val=data[key];
                return val&&val.trim()!==''
                    ? `<span class="preview-filled">${val}</span>`
                    : `<span class="preview-tag">${m}</span>`;
            });
            lp.innerHTML=`<style>
                #live-preview { font-family:'Times New Roman',serif; font-size:12pt; line-height:1.8; background:white; padding:2cm 2.5cm; box-shadow:0 2px 16px rgba(0,0,0,0.1); border-radius:4px; max-width:21cm; margin:0 auto; }
                .preview-filled{color:#15803d;font-weight:700;background:#dcfce7;border-radius:3px;padding:0 3px;}
                .preview-tag{background:#fef3c7;color:#92400e;font-weight:900;border-radius:3px;padding:0 3px;outline:1px dashed #fbbf24;}
            </style><div style="white-space:pre-wrap">${rendered}</div>`;
        } else {
            lp.innerHTML='<span style="color:#cbd5e1;font-size:11px;">Anteprima non disponibile — ricarica il file .docx</span>';
        }
    },

});