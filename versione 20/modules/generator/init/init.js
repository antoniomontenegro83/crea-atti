/* --- modules/generator/init/init.js --- */
Object.assign(generator, {

    init: () => {
        if (!core.db.tpl)      core.db.tpl      = {};
        if (!core.arcDb)      core.arcDb      = {};

        generator.renderSlots();
        generator.renderFolderSelects();
        generator.renderTplList();
        generator.prepareForm();
        generator.initSignaturePad();
        generator.restoreFirmaTab();
    },

    // ─────────────────────────────────────────────
    //  TABS
    // ─────────────────────────────────────────────
    tab: (name) => {
        ['compile','editor','firma'].forEach(t => {
            document.getElementById(`tab-panel-${t}`)?.classList.toggle('hidden', t !== name);
            document.getElementById(`tab-${t}`)?.classList.toggle('active', t === name);
        });
        if (name === 'editor')   generator.renderTplList();
        if (name === 'firma')    generator.initSignaturePad();
    },

    // ─────────────────────────────────────────────
    //  SLOTS + FOLDER SELECTS
    // ─────────────────────────────────────────────
    addSlot: () => {
        if (core.state.activeSlots < 4) { core.state.activeSlots++; generator.renderSlots(); generator.prepareForm(); }
    },

    removeSlot: () => {
        if (core.state.activeSlots > 1) { core.state.activeSlots--; generator.renderSlots(); generator.prepareForm(); }
    },

    renderSlots: () => {
        const c = document.getElementById('slots-container');
        if (!c) return;
        const opts = Object.keys(core.db.tpl||{}).map(k=>`<option value="${k}">${core.db.tpl[k].name}</option>`).join('');
        c.innerHTML = '';
        for (let i = 1; i <= core.state.activeSlots; i++) {
            c.innerHTML += `<div class="flex-1 bg-slate-50 p-3 rounded-2xl border min-w-[90px]">
                <span class="text-[13px] font-black uppercase text-slate-400 block mb-1">ATTO ${i}</span>
                <select id="gen-select-${i}" onchange="generator.prepareForm()" class="bg-transparent font-black text-[15px] outline-none w-full text-slate-700">
                    <option value="">Modello...</option>${opts}
                </select>
            </div>`;
        }
    },

    filterFolderByAnno: () => {
        const anno = document.getElementById('gen-anno-filter')?.value || '';
        const sel  = document.getElementById('gen-folder-select');
        if (!sel) return;
        const prev = sel.value;
        const opts = Object.entries(core.arcDb || {})
            .filter(([, f]) => !anno || String(f.year) === anno)
            .sort(([,a],[,b]) => (b.year||0)-(a.year||0))
            .map(([id, f]) => {
                const label  = archive._fascLabel(f.numero, f.year);
                const titolo = f.title && f.title.trim() !== String(f.numero).trim() ? ` — ${f.title}` : '';
                return `<option value="${id}">Fasc. ${label}${titolo}</option>`;
            }).join('');
        const handler = sel.onchange;
        sel.onchange = null;
        sel.innerHTML = `<option value="">— Nessuno —</option>` + opts;
        sel.value = prev;
        sel.onchange = handler;
    },

    renderFolderSelects: () => {
        // Popola filtro anno
        const annoEl = document.getElementById('gen-anno-filter');
        if (annoEl) {
            const prevAnno = annoEl.value;
            const years = [...new Set(Object.values(core.arcDb||{}).map(f => f.year||archive._extractYear(f.numero)))].sort((a,b)=>b-a);
            annoEl.innerHTML = `<option value="">Tutti</option>` + years.map(y=>`<option value="${y}" ${String(y)===prevAnno?'selected':''}>${y}</option>`).join('');
        }

        const annoFiltro = annoEl?.value || '';
        const _opts = (filterAnno) => Object.entries(core.arcDb||{})
            .filter(([,f]) => !filterAnno || String(f.year) === filterAnno)
            .sort(([,a],[,b]) => (b.year||0)-(a.year||0))
            .map(([id,f])=>{
                const label  = archive._fascLabel(f.numero,f.year);
                const titolo = f.title && f.title.trim() !== String(f.numero).trim() ? ` — ${f.title}` : '';
                return `<option value="${id}">Fasc. ${label}${titolo}</option>`;
            }).join('');

        [['gen-folder-select','— Nessuno —'],['save-folder-select','— Non archiviare —']].forEach(([sel,def])=>{
            const el = document.getElementById(sel);
            if (!el) return;
            const prev = el.value;
            const handler = el.onchange;
            el.onchange = null;
            el.innerHTML = `<option value="">${def}</option>` + _opts(sel === 'gen-folder-select' ? annoFiltro : '');
            el.value = prev;
            el.onchange = handler;
        });
    },

    onFolderChange: () => {
        const fId = document.getElementById('gen-folder-select')?.value;
        if (!fId || !core.arcDb[fId]) return;
        const f = core.arcDb[fId];

        // Mappa diretta: nome campo template → valore dal fascicolo
        const map = {
            'Fascicolo'      : f.numero,
            'anno_fascicolo' : String(f.year || ''),
            'oggetto'        : f.title,
            'capitolo'       : f.capitolo,
            'articolo'       : f.capitolo,
            'uep'            : f.uep,
            'operatore'      : f.operatore,
        };

        Object.entries(map).forEach(([name, value]) => {
            if (!value) return;
            const el = document.querySelector(
                `#form-container input[name="${name}"], #form-container textarea[name="${name}"]`
            );
            if (el) el.value = value;
        });

        generator.updateLivePreview();
    },

    // ─────────────────────────────────────────────
    //  PREPARA FORM

});