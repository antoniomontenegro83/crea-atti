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

    renderFolderSelects: () => {
        const opts = Object.entries(core.arcDb||{})
            .map(([id,f])=>{ const label=archive._fascLabel(f.numero,f.year); return `<option value="${id}">${label?'Fasc. '+label+' - ':''}${f.title}</option>`; }).join('');
        [['gen-folder-select','— Nessuno —'],['save-folder-select','— Non archiviare —']].forEach(([sel,def])=>{
            const el = document.getElementById(sel);
            if (el) el.innerHTML = `<option value="">${def}</option>` + opts;
        });
    },

    onFolderChange: () => {
        const fId = document.getElementById('gen-folder-select')?.value;
        if (!fId || !core.arcDb[fId]) return;
        const f = core.arcDb[fId];

        // Mappa tag esatti → valore fascicolo
        const exactMap = {
            'TITOLO'    : f.title,
            'NUMERO'    : f.numero,
            'N_FASC'    : f.numero,
            'FASCICOLO' : f.numero,
            'CONTROPARTE': f.opp,
        };
        Object.entries(exactMap).forEach(([tag, val]) => {
            if (!val) return;
            const el = document.querySelector(`#form-container input[name="${tag}"]`);
            if (el && !el.value) el.value = val;
        });

        // Compila per corrispondenza parziale nel nome del campo
        const partialMap = [
            { match: 'oggetto',   value: f.title    },
            { match: 'capitolo',  value: f.capitolo },
            { match: 'articolo',  value: f.capitolo },
            { match: 'uep',       value: f.uep      },
            { match: 'operatore', value: f.operatore},
        ];
        console.log('onFolderChange fascicolo:', f);
        const allFields = document.querySelectorAll('#form-container input[name], #form-container textarea[name]');
        console.log('campi nel form:', [...allFields].map(el => el.name));
        allFields.forEach(el => {
            const nm = el.name.toLowerCase();
            partialMap.forEach(({ match, value }) => {
                if (value && nm.includes(match) && !el.value) {
                    console.log(`compilo ${el.name} con ${value}`);
                    el.value = value;
                }
            });
        });

        generator.updateLivePreview();
    },

    // ─────────────────────────────────────────────
    //  PREPARA FORM

});