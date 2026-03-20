/* --- modules/archive/archive.js --- */
const archive = {
    selectedFolder: null,

    html: `
        <div class="archive-view space-y-8 animate-in fade-in duration-500 h-full overflow-hidden p-4">
            <div class="flex justify-between items-end border-b border-slate-200 pb-6">
                <div>
                    <h3 class="font-black text-4xl uppercase tracking-tighter text-slate-800 leading-none">Archivio Fascicoli</h3>
                    <p class="text-slate-400 text-[12px] font-bold uppercase tracking-widest mt-2">Gestione pratiche e atti collegati</p>
                </div>
                <div class="flex gap-2 flex-wrap items-center">
                    <input type="text" id="archive-search" placeholder="Cerca per titolo, operatore..." oninput="archive.renderFolders()"
                        class="bg-white border border-slate-200 rounded-xl px-4 py-3 text-[14px] font-bold text-slate-700 outline-none focus:border-blue-400 w-56 shadow-sm">
                    <select id="filter-anno" onchange="archive._onAnnoFilter()"
                        class="bg-white border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold text-slate-700 outline-none focus:border-blue-400 shadow-sm cursor-pointer">
                        <option value="">Tutti gli Anni</option>
                    </select>
                    <select id="filter-fascicolo" onchange="archive._onFascicoloFilter()"
                        class="bg-white border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold text-slate-700 outline-none focus:border-blue-400 shadow-sm cursor-pointer">
                        <option value="">Tutti i Fascicoli</option>
                    </select>
                    <select id="filter-capitolo" onchange="archive._onCapitoloFilter()"
                        class="bg-white border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold text-slate-700 outline-none focus:border-blue-400 shadow-sm cursor-pointer">
                        <option value="">Tutti i Capitoli</option>
                    </select>
                    <select id="filter-uep" onchange="archive._onUepFilter()"
                        class="bg-white border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold text-slate-700 outline-none focus:border-blue-400 shadow-sm cursor-pointer">
                        <option value="">Tutti gli UEP</option>
                    </select>
                    <select id="filter-operatore" onchange="archive.renderFolders()"
                        class="bg-white border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold text-slate-700 outline-none focus:border-blue-400 shadow-sm cursor-pointer">
                        <option value="">Tutti gli Operatori</option>
                    </select>
                    <button onclick="archive.resetFilters()" id="btn-reset-filters" class="hidden px-4 py-3 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-[11px] hover:bg-red-50 hover:text-red-500 transition-all shadow-sm">
                        <i class="fas fa-times mr-1"></i> Reset
                    </button>
                    <button onclick="archive.openNewFolderModal()" class="bg-slate-900 text-white px-6 py-3 rounded-xl font-black uppercase text-[12px] hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm">
                        <i class="fas fa-plus"></i> Nuovo Fascicolo
                    </button>
                </div>
            </div>

            <!-- Anni come tab -->
            <div id="year-tabs" class="flex gap-2 flex-wrap shrink-0"></div>

            <div id="folder-grid" class="grid grid-cols-4 gap-6 overflow-y-auto pr-2 pb-10" style="max-height: calc(100vh - 320px);"></div>
        </div>

        <!-- ===== MODALE DETTAGLIO FASCICOLO ===== -->
        <div id="folder-modal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[600] flex items-center justify-center p-4">
            <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-[1500px] flex h-[850px] overflow-hidden border border-slate-200/50">
                <div class="w-[560px] bg-slate-50/50 p-10 border-r border-slate-200 flex flex-col">
                    <div class="mb-8">
                        <span class="text-[15px] font-black uppercase text-slate-400 tracking-widest">Fascicolo</span>
                        <p id="folder-number" class="font-black text-3xl text-blue-600 leading-tight mt-1">--</p>
                        <h3 id="folder-title" class="font-black text-xl uppercase text-slate-800 mt-2 leading-tight break-words">Titolo Pratica</h3>
                    </div>
                    <div class="flex-1 space-y-4">

                        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex gap-6">
                            <div class="flex-1">
                                <label class="text-[11px] font-bold text-slate-400 uppercase block mb-1">Capitolo / Articolo</label>
                                <p id="folder-capitolo" class="font-bold text-slate-800 text-[15px]">--</p>
                            </div>
                            <div class="flex-1">
                                <label class="text-[11px] font-bold text-slate-400 uppercase block mb-1">UEP</label>
                                <p id="folder-uep" class="font-bold text-slate-800 text-[15px]">--</p>
                            </div>
                        </div>
                        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <label class="text-[11px] font-bold text-slate-400 uppercase block mb-1">Note Pratica</label>
                            <p id="folder-notes" class="text-slate-600 text-[14px] leading-relaxed">--</p>
                        </div>
                        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex gap-6">
                            <div>
                                <label class="text-[11px] font-bold text-slate-400 uppercase block mb-1">Data Apertura</label>
                                <p id="folder-date" class="font-bold text-slate-700 text-[14px]">--</p>
                            </div>
                            <div>
                                <label class="text-[11px] font-bold text-slate-400 uppercase block mb-1">Anno</label>
                                <p id="folder-year" class="font-bold text-blue-600 text-[14px]">--</p>
                            </div>
                        </div>
                        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <label class="text-[11px] font-bold text-slate-400 uppercase block mb-1">Operatore</label>
                            <p id="folder-operatore" class="font-bold text-slate-800 text-[15px]">--</p>
                        </div>
                        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <label class="text-[11px] font-bold text-slate-400 uppercase block mb-1">Cartella su disco</label>
                            <p id="folder-path" class="font-mono text-slate-500 text-[12px] break-all">--</p>
                        </div>
                    </div>
                    <div class="flex gap-3 mt-6">
                        <button onclick="archive.openEditFolderModal()" class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-[11px] hover:bg-blue-500 transition-all">
                            <i class="fas fa-edit mr-1"></i> Modifica
                        </button>
                        <button onclick="archive.deleteFolder()" class="py-3 px-4 bg-red-50 text-red-400 rounded-xl font-bold hover:bg-red-100 transition-all">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                    <button onclick="archive.closeFolder()" class="w-full py-4 mt-3 bg-slate-200 text-slate-500 rounded-xl font-bold uppercase text-[12px] hover:bg-slate-300 transition-all">Chiudi</button>
                </div>
                <div class="flex-1 p-12 flex flex-col bg-white">
                    <div class="flex justify-between items-center mb-8">
                        <h4 class="font-black text-2xl uppercase text-slate-800">Atti / Documenti</h4>
                        <span id="docs-count" class="bg-slate-100 text-slate-500 font-black text-[12px] uppercase px-4 py-2 rounded-xl">0 documenti</span>
                    </div>
                    <div id="docs-list" class="flex-1 overflow-y-auto space-y-4 pr-4"></div>
                </div>
            </div>
        </div>

        <!-- ===== MODALE NUOVO / MODIFICA FASCICOLO ===== -->
        <div id="new-folder-modal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[700] flex items-center justify-center p-4">
            <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-12 border border-slate-200/50">
                <div class="flex justify-between items-center mb-10">
                    <h3 id="new-folder-modal-title" class="font-black text-2xl uppercase text-slate-800">Nuovo Fascicolo</h3>
                    <button onclick="archive.closeNewFolderModal()" class="text-slate-300 hover:text-red-500 transition-all">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <input type="hidden" id="edit-folder-id" value="">
                <div class="space-y-5">
                    <div>
                        <label class="text-[11px] font-bold uppercase text-slate-400 mb-2 block">Titolo Pratica *</label>
                        <input type="text" id="new-folder-title" placeholder="Es. Rossi c/ Bianchi"
                            class="w-full border border-slate-200 rounded-xl p-4 font-bold text-[15px] text-slate-800 outline-none focus:border-blue-400">
                    </div>
                    <div class="flex gap-4">
                        <div class="flex-1">
                            <label class="text-[11px] font-bold uppercase text-slate-400 mb-2 block">Numero Fascicolo</label>
                            <input type="text" id="new-folder-numero" placeholder="Es. 121"
                                oninput="archive.autoFillYear()"
                                class="w-full border border-slate-200 rounded-xl p-4 font-bold text-[15px] text-slate-800 outline-none focus:border-blue-400">
                        </div>
                        <div class="w-28">
                            <label class="text-[11px] font-bold uppercase text-slate-400 mb-2 block">Anno</label>
                            <input type="number" id="new-folder-year" placeholder="${new Date().getFullYear()}"
                                class="w-full border border-slate-200 rounded-xl p-4 font-bold text-[15px] text-slate-800 outline-none focus:border-blue-400">
                        </div>
                    </div>
                    <div>
                        <label class="text-[11px] font-bold uppercase text-slate-400 mb-2 block">Note</label>
                        <textarea id="new-folder-notes" placeholder="Annotazioni sulla pratica..." rows="2"
                            class="w-full border border-slate-200 rounded-xl p-4 font-medium text-[14px] text-slate-700 outline-none focus:border-blue-400 resize-none"></textarea>
                    </div>
                    <div class="flex gap-4">
                        <div class="flex-1">
                            <label class="text-[11px] font-bold uppercase text-slate-400 mb-2 block">Capitolo / Articolo</label>
                            <input type="text" id="new-folder-capitolo" placeholder="Es. 4386/4"
                                class="w-full border border-slate-200 rounded-xl p-4 font-bold text-[15px] text-slate-800 outline-none focus:border-blue-400">
                        </div>
                        <div class="flex-1">
                            <label class="text-[11px] font-bold uppercase text-slate-400 mb-2 block">UEP</label>
                            <input type="text" id="new-folder-uep" placeholder="Es. UEP 01"
                                class="w-full border border-slate-200 rounded-xl p-4 font-bold text-[15px] text-slate-800 outline-none focus:border-blue-400">
                        </div>
                    </div>
                    <div>
                        <label class="text-[11px] font-bold uppercase text-slate-400 mb-2 block">Operatore</label>
                        <input type="text" id="new-folder-operatore" placeholder="Es. Mario Rossi"
                            class="w-full border border-slate-200 rounded-xl p-4 font-bold text-[15px] text-slate-800 outline-none focus:border-blue-400">
                    </div>
                </div>
                <div class="flex gap-4 mt-10">
                    <button onclick="archive.saveFolder()" class="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[13px] hover:bg-blue-600 transition-all shadow-lg">
                        <i class="fas fa-save mr-2"></i> Salva Fascicolo
                    </button>
                    <button onclick="archive.closeNewFolderModal()" class="px-8 py-5 bg-slate-100 text-slate-400 rounded-2xl font-bold uppercase text-[12px] hover:bg-slate-200 transition-all">
                        Annulla
                    </button>
                </div>
            </div>
        </div>
    `,

    // ─────────────────────────────────────────────────────────────────────────
    //  HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    // Estrae anno dal numero fascicolo (es. "121/2025" → 2025)
    _extractYear: (numero) => {
        if (!numero) return new Date().getFullYear();
        const m = String(numero).match(/\b(19|20)\d{2}\b/);
        return m ? parseInt(m[0]) : new Date().getFullYear();
    },

    // Mostra il fascicolo come "numero/anno" es. "121/2005"
    _fascLabel: (numero, year) => {
        if (!numero) return '';
        const yr = year || archive._extractYear(numero);
        // Se numero contiene già l'anno (es. "121/2005") non aggiungerlo di nuovo
        if (String(numero).includes(String(yr))) return numero;
        return `${numero}/${yr}`;
    },

    // Nome cartella fisica: usa formato "numero-anno" senza caratteri invalidi
    _folderName: (numero, title, year) => {
        const label = numero ? archive._fascLabel(numero, year) : (title || 'fascicolo');
        return label.replace(/\//g, '-').replace(/[\\:*?"<>|]/g, '_').trim();
    },

    // Anno corrente selezionato nei tab
    _selectedYear: null,

    // ─────────────────────────────────────────────────────────────────────────
    //  INIT + RENDER
    // ─────────────────────────────────────────────────────────────────────────
    init: () => {
        if (!core.arcDb) core.arcDb = {};
        archive._selectedYear = undefined;
        archive.renderYearTabs();
        archive.renderFolders();
    },

    // Auto-compila anno dal numero fascicolo nel modal
    autoFillYear: () => {
        const numero = document.getElementById('new-folder-numero')?.value || '';
        const yr  = archive._extractYear(numero);
        const yEl = document.getElementById('new-folder-year');
        if (yEl && !yEl.value) yEl.value = yr;
    },

    // Tab anni in cima all'archivio
    renderYearTabs: () => {
        const tabs = document.getElementById('year-tabs');
        if (!tabs) return;
        const years = [...new Set(
            Object.values(core.arcDb).map(f => f.year || archive._extractYear(f.numero))
        )].sort((a, b) => b - a);

        if (!years.length) { tabs.innerHTML = ''; return; }

        // Se nessun anno selezionato, seleziona il più recente
        if (archive._selectedYear === undefined) archive._selectedYear = years[0];



        tabs.innerHTML =
            `<button onclick="archive._selectedYear=null;archive.renderYearTabs();archive.renderFolders()"
                class="px-5 py-2 rounded-xl font-black text-[13px] uppercase transition-all ${!archive._selectedYear ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">
                Tutti
            </button>` +
            years.map(y =>
                `<button onclick="archive._selectedYear=${y};archive.renderYearTabs();archive.renderFolders()"
                    class="px-5 py-2 rounded-xl font-black text-[13px] uppercase transition-all ${archive._selectedYear === y ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">
                    ${y}
                </button>`
            ).join('');
    },

    resetFilters: () => {
        const s = document.getElementById('archive-search');
        const a = document.getElementById('filter-anno');
        const c = document.getElementById('filter-capitolo');
        const u = document.getElementById('filter-uep');
        const o = document.getElementById('filter-operatore');
        const fasc = document.getElementById('filter-fascicolo');
        if (s) s.value = '';
        if (a) a.value = '';
        if (fasc) fasc.value = '';
        if (c) c.value = '';
        if (u) u.value = '';
        if (o) o.value = '';
        archive._selectedYear = null;
        archive.renderYearTabs();
        archive.renderFolders();
    },

    // Quando si cambia il filtro anno aggiorna _selectedYear e i tab
    _onAnnoFilter: () => {
        const val = document.getElementById('filter-anno')?.value;
        archive._selectedYear = val ? parseInt(val) : null;
        // Reset filtri a cascata
        const fEl = document.getElementById('filter-fascicolo');
        const c = document.getElementById('filter-capitolo');
        const u = document.getElementById('filter-uep');
        const o = document.getElementById('filter-operatore');
        if (fEl) fEl.value = '';
        if (c) c.value = '';
        if (u) u.value = '';
        if (o) o.value = '';
        archive.renderYearTabs();
        archive.renderFolders();
    },

    _onFascicoloFilter: () => { archive.renderFolders(); },
    _onCapitoloFilter:  () => { archive.renderFolders(); },
    _onUepFilter:       () => { archive.renderFolders(); },

    _populateFilters: (yearFilteredEntries) => {
        const all  = Object.values(core.arcDb || {});
        const pool = yearFilteredEntries
            ? yearFilteredEntries.map(([, f]) => f)
            : all;

        // Leggi tutti i valori attivi
        const fascVal = document.getElementById('filter-fascicolo')?.value || '';
        const capVal  = document.getElementById('filter-capitolo')?.value  || '';
        const uepVal  = document.getElementById('filter-uep')?.value       || '';
        const opVal   = document.getElementById('filter-operatore')?.value || '';

        // Helper: pool filtrato escludendo un campo specifico
        // Ogni dropdown mostra i valori compatibili con TUTTI gli altri filtri attivi
        const filtered = (excludeKey) => pool.filter(f => {
            if (excludeKey !== 'fascicolo' && fascVal && f.numero    !== fascVal) return false;
            if (excludeKey !== 'capitolo'  && capVal  && f.capitolo  !== capVal)  return false;
            if (excludeKey !== 'uep'       && uepVal  && f.uep       !== uepVal)  return false;
            if (excludeKey !== 'operatore' && opVal   && f.operatore !== opVal)   return false;
            return true;
        });

        const fill = (id, values, placeholder, keepVal) => {
            const el = document.getElementById(id);
            if (!el) return;
            const sorted = [...new Set(values.filter(Boolean))].sort();
            el.innerHTML = `<option value="">${placeholder}</option>` +
                sorted.map(v => `<option value="${v}" ${keepVal === v ? 'selected' : ''}>${v}</option>`).join('');
            if (keepVal && !sorted.includes(keepVal)) el.value = '';
            else if (keepVal) el.value = keepVal;
        };

        // Anno: sempre tutti gli anni disponibili
        const fillAnno = document.getElementById('filter-anno');
        if (fillAnno) {
            const years = [...new Set(all.map(f => f.year || archive._extractYear(f.numero)))].sort((a,b) => b-a);
            fillAnno.innerHTML = `<option value="">Tutti gli Anni</option>` +
                years.map(y => `<option value="${y}">${y}</option>`).join('');
            fillAnno.value = archive._selectedYear ? String(archive._selectedYear) : '';
        }

        // Ogni filtro vede i valori compatibili con tutti gli ALTRI filtri attivi
        fill('filter-fascicolo', filtered('fascicolo').map(f => f.numero),    'Tutti i Fascicoli', fascVal);
        fill('filter-capitolo',  filtered('capitolo').map(f => f.capitolo),   'Tutti i Capitoli',  capVal);
        fill('filter-uep',       filtered('uep').map(f => f.uep),             'Tutti gli UEP',     uepVal);
        fill('filter-operatore', filtered('operatore').map(f => f.operatore), 'Tutti gli Operatori', opVal);
    },

    renderFolders: () => {
        const grid = document.getElementById('folder-grid');
        if (!grid) return;

        let entries = Object.entries(core.arcDb || {});

        // Filtra per anno selezionato (tab o dropdown)
        if (archive._selectedYear) {
            entries = entries.filter(([, f]) =>
                (f.year || archive._extractYear(f.numero)) === archive._selectedYear
            );
        }

        // Popola i filtri contestuali all'anno attivo
        archive._populateFilters(entries);

        const query     = (document.getElementById('archive-search')?.value    || '').toLowerCase();
        const capFilter = (document.getElementById('filter-capitolo')?.value   || '');
        const uepFilter = (document.getElementById('filter-uep')?.value        || '');
        const opFilter  = (document.getElementById('filter-operatore')?.value  || '');

        // Mostra/nascondi bottone reset
        const fascFilter2 = (document.getElementById('filter-fascicolo')?.value || '');
        const hasFilter = query || fascFilter2 || capFilter || uepFilter || opFilter || archive._selectedYear;
        const btnReset = document.getElementById('btn-reset-filters');
        if (btnReset) btnReset.classList.toggle('hidden', !hasFilter);

        // Filtra per testo ricerca
        if (query) {
            entries = entries.filter(([, f]) => {
                const fascNum = String(f.numero || '').split('/')[0].trim();
                return f.title?.toLowerCase().includes(query)     ||
                       f.capitolo?.toLowerCase().includes(query)  ||
                       f.uep?.toLowerCase().includes(query)       ||
                       f.operatore?.toLowerCase().includes(query) ||
                       fascNum.includes(query);
            });
        }

        const fascFilter = (document.getElementById('filter-fascicolo')?.value || '');

        // Filtri dropdown
        if (fascFilter) entries = entries.filter(([, f]) => f.numero === fascFilter);
        if (capFilter)  entries = entries.filter(([, f]) => f.capitolo  === capFilter);
        if (uepFilter)  entries = entries.filter(([, f]) => f.uep       === uepFilter);
        if (opFilter)   entries = entries.filter(([, f]) => f.operatore === opFilter);

        // Ordina per anno desc poi per numero
        entries.sort(([, a], [, b]) => {
            const ya = a.year || archive._extractYear(a.numero);
            const yb = b.year || archive._extractYear(b.numero);
            if (yb !== ya) return yb - ya;
            return (a.numero || '').localeCompare(b.numero || '');
        });

        if (!entries.length) {
            grid.innerHTML = `
                <div class="col-span-4 flex flex-col items-center justify-center opacity-30 py-24">
                    <i class="fas fa-folder-open text-6xl mb-4"></i>
                    <p class="font-black uppercase text-[14px]">${query ? 'Nessun risultato' : 'Nessun fascicolo — creane uno!'}</p>
                </div>`;
            return;
        }

        grid.innerHTML = entries.map(([id, folder]) => {
            const year = folder.year || archive._extractYear(folder.numero);
            return `
            <div onclick="archive.openFolder('${id}')"
                class="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:border-blue-400 transition-all cursor-pointer group relative overflow-hidden">
                <div class="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-full -mr-10 -mt-10 group-hover:bg-blue-500/10 transition-colors"></div>
                <div class="flex items-start justify-between mb-3 relative z-10">
                    <i class="fas fa-folder text-blue-500 text-4xl group-hover:text-blue-600"></i>
                    <span class="text-[13px] font-bold text-slate-400 uppercase">${folder.docs?.length || 0} atti</span>
                </div>
                <p class="text-blue-600 font-black text-[18px] leading-tight relative z-10">${archive._fascLabel(folder.numero, folder.year) || '—'}</p>
                <h4 class="font-black text-[15px] uppercase text-slate-800 leading-tight mt-1 mb-2 relative z-10 break-words">${folder.title || 'Senza Titolo'}</h4>
                ${folder.capitolo ? `<p class="text-slate-500 font-bold text-[12px] uppercase relative z-10"><span class="text-slate-300">Cap.</span> ${folder.capitolo}${folder.uep ? ' &nbsp;·&nbsp; <span class=\'text-slate-300\'>UEP</span> '+folder.uep : ''}</p>` : ''}
                <div class="mt-4 pt-3 border-t border-slate-100 flex justify-end items-center relative z-10">
                    <i class="fas fa-arrow-right text-slate-200 group-hover:text-blue-500 transition-all"></i>
                </div>
            </div>`;
        }).join('');
    },

    openFolder: (id) => {
        const f = core.arcDb[id];
        if (!f) return;
        archive.selectedFolder = id;

        const year      = f.year || archive._extractYear(f.numero);
        const folderNm  = archive._folderName(f.numero, f.title, f.year);
        const diskPath  = `FASCICOLI/${year}/${folderNm}/`;

        document.getElementById('folder-title').innerText  = f.title || 'Senza Titolo';
        document.getElementById('folder-number').innerText = archive._fascLabel(f.numero, f.year);
        document.getElementById('folder-notes').innerText    = f.notes     || 'Nessuna nota aggiuntiva.';
        document.getElementById('folder-capitolo').innerText = f.capitolo  || '--';
        document.getElementById('folder-uep').innerText      = f.uep       || '--';
        document.getElementById('folder-operatore').innerText= f.operatore || '--';
        document.getElementById('folder-date').innerText     = f.date      || '--';
        document.getElementById('folder-year').innerText     = year;
        document.getElementById('folder-path').innerText     = diskPath;

        archive.renderDocs(f.docs || []);
        document.getElementById('folder-modal').classList.remove('hidden');
    },

    renderDocs: (docs) => {
        const list  = document.getElementById('docs-list');
        const count = document.getElementById('docs-count');
        if (count) count.innerText = `${docs.length} document${docs.length === 1 ? 'o' : 'i'}`;

        list.innerHTML = docs.length
            ? docs.map((doc, i) => `
                <div class="flex items-center gap-5 p-5 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:border-blue-300 transition-all group">
                    <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm border border-slate-100 shrink-0">
                        <i class="fas fa-file-word text-xl"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h5 class="font-bold text-slate-800 text-[14px] uppercase truncate">${doc.name}</h5>
                        <p class="text-[11px] text-slate-400 font-medium mt-0.5">
                            ${doc.date || '--'}
                            ${doc.template ? ' &nbsp;·&nbsp; ' + doc.template : ''}
                        </p>
                    </div>
                    <button onclick="archive.deleteDoc(${i})" class="text-slate-200 hover:text-red-500 transition-all px-2 py-2 shrink-0">
                        <i class="fas fa-trash-alt text-sm"></i>
                    </button>
                </div>
            `).join('')
            : `<div class="h-full flex flex-col items-center justify-center opacity-30 py-20 text-center">
                <i class="fas fa-copy text-5xl mb-4"></i>
                <p class="font-black uppercase text-[14px]">Nessun atto in questo fascicolo</p>
                <p class="text-[12px] mt-2 font-medium">Genera un atto da "Crea Atti" e seleziona questo fascicolo</p>
               </div>`;
    },

    deleteDoc: (i) => {
        if (!confirm('Eliminare questo documento dall\'archivio?')) return;
        core.arcDb[archive.selectedFolder].docs.splice(i, 1);
        core.saveArc();
        archive.renderDocs(core.arcDb[archive.selectedFolder].docs);
        archive.renderFolders();
        core.showToast('Documento rimosso.');
    },

    closeFolder: () => document.getElementById('folder-modal').classList.add('hidden'),

    // ─────────────────────────────────────────────────────────────────────────
    //  NUOVO / MODIFICA FASCICOLO
    // ─────────────────────────────────────────────────────────────────────────
    openNewFolderModal: () => {
        document.getElementById('new-folder-modal-title').innerText = 'Nuovo Fascicolo';
        document.getElementById('edit-folder-id').value   = '';
        document.getElementById('new-folder-title').value = '';
        document.getElementById('new-folder-numero').value    = '';
        document.getElementById('new-folder-year').value  = '';
        document.getElementById('new-folder-notes').value    = '';
        document.getElementById('new-folder-capitolo').value = '';
        document.getElementById('new-folder-uep').value       = '';
        document.getElementById('new-folder-operatore').value  = '';
        document.getElementById('new-folder-modal').classList.remove('hidden');
        setTimeout(() => document.getElementById('new-folder-title').focus(), 100);
    },

    openEditFolderModal: () => {
        const f = core.arcDb[archive.selectedFolder];
        if (!f) return;
        document.getElementById('new-folder-modal-title').innerText = 'Modifica Fascicolo';
        document.getElementById('edit-folder-id').value   = archive.selectedFolder;
        document.getElementById('new-folder-title').value = f.title || '';
        document.getElementById('new-folder-numero').value    = f.numero    || '';
        document.getElementById('new-folder-year').value  = f.year  || archive._extractYear(f.numero);
        document.getElementById('new-folder-notes').value = f.notes || '';
        document.getElementById('new-folder-modal').classList.remove('hidden');
        // Imposta dopo che il modal è visibile nel DOM
        setTimeout(() => {
            document.getElementById('new-folder-capitolo').value  = f.capitolo  || '';
            document.getElementById('new-folder-uep').value       = f.uep       || '';
            document.getElementById('new-folder-operatore').value = f.operatore || '';
        }, 0);
    },

    closeNewFolderModal: () => document.getElementById('new-folder-modal').classList.add('hidden'),

    saveFolder: async () => {
        const btn = document.querySelector('#new-folder-modal button[onclick="archive.saveFolder()"]');
        if (btn) { if (btn.disabled) return; btn.disabled = true; }
        const title = document.getElementById('new-folder-title').value.trim();
        if (!title) { if (btn) btn.disabled = false; alert('Il titolo è obbligatorio.'); return; }

        const numero  = document.getElementById('new-folder-numero').value.trim();
        const yearEl = document.getElementById('new-folder-year').value.trim();
        const year   = parseInt(yearEl) || archive._extractYear(numero);

        const editId   = document.getElementById('edit-folder-id').value;
        const isEdit   = !!editId;
        const id       = editId || ('arc_' + Date.now());
        const existing = isEdit ? (core.arcDb[editId] || {}) : {};

        const _v = (id) => (document.getElementById(id)?.value || '').trim();
        console.log('saveFolder capitolo:', _v('new-folder-capitolo'), 'uep:', _v('new-folder-uep'), 'op:', _v('new-folder-operatore'));

        core.arcDb[id] = {
            ...existing,
            title    : title,
            numero   : numero,
            year     : year,
            notes    : _v('new-folder-notes'),
            capitolo : _v('new-folder-capitolo'),
            uep      : _v('new-folder-uep'),
            operatore: _v('new-folder-operatore'),
            date     : existing.date || new Date().toLocaleDateString('it-IT'),
            docs     : existing.docs || []
        };

        // Crea subito cartella fisica su disco
        if (core.dirHandle && numero) {
            try {
                const fascicoliDir = await core.dirHandle.getDirectoryHandle('FASCICOLI', { create: true });
                const yearDir      = await fascicoliDir.getDirectoryHandle(String(year), { create: true });
                await yearDir.getDirectoryHandle(archive._folderName(numero, title, year), { create: true });
            } catch (e) { console.warn('Cartella non creata:', e.message); }
        }

        await core.saveArc();
        if (btn) btn.disabled = false;
        archive.closeNewFolderModal();
        archive._selectedYear = year;  // mostra sempre l'anno del fascicolo appena salvato
        archive.renderYearTabs();
        archive.renderFolders();

        if (typeof generator !== 'undefined') generator.renderFolderSelects?.();

        if (isEdit) {
            archive.openFolder(id);
            core.showToast('Fascicolo aggiornato.');
        } else {
            core.showToast('Fascicolo creato!');
        }
    },

    deleteFolder: () => {
        const f = core.arcDb[archive.selectedFolder];
        if (!f) return;
        if (!confirm(`Eliminare il fascicolo "${f.title}"?\nTutti gli atti collegati verranno rimossi dall'archivio.`)) return;
        delete core.arcDb[archive.selectedFolder];
        core.saveArc();
        archive.selectedFolder = null;
        archive.closeFolder();
        archive.renderYearTabs();
        archive.renderFolders();
        core.showToast('Fascicolo eliminato.');
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  API usate da generator/submit.js
    // ─────────────────────────────────────────────────────────────────────────

    // Aggiunge un documento generato al fascicolo nel DB archivio
    addDocToFolder: (folderId, docRecord) => {
        if (!folderId || !core.arcDb[folderId]) return false;
        if (!Array.isArray(core.arcDb[folderId].docs)) core.arcDb[folderId].docs = [];
        core.arcDb[folderId].docs.push(docRecord);
        core.saveArc();
        return true;
    },

    // Trova fascicolo per numero — oppure lo crea automaticamente
    findOrCreate: (numero, titleFallback, yearOverride) => {
        if (!numero) return null;
        if (!core.arcDb) core.arcDb = {};

        const targetYear = yearOverride || archive._extractYear(numero);

        // Cerca fascicolo con stesso numero E stesso anno
        const existing = Object.keys(core.arcDb).find(id => {
            const f = core.arcDb[id];
            const fYear = f.year || archive._extractYear(f.numero);
            return String(f.numero || '').trim().toLowerCase() === String(numero).trim().toLowerCase()
                && fYear === targetYear;
        });
        if (existing) return { id: existing, isNew: false };

        // Crea nuovo — usa yearOverride (da form ANNO_FASCICOLO) se disponibile
        const id   = 'arc_' + Date.now();
        const year = yearOverride || archive._extractYear(numero);
        core.arcDb[id] = {
            title : titleFallback || numero,
            numero: numero,
            year  : year,
            opp   : '',
            notes : '',
            date  : new Date().toLocaleDateString('it-IT'),
            docs  : []
        };
        core.saveArc();
        archive.renderYearTabs?.();
        archive.renderFolders?.();
        return { id, isNew: true };
    },

    // Salva i blob fisicamente in FASCICOLI/{anno}/{numero}/
    saveToDisk: async (folderId, blobs) => {
        if (!core.dirHandle) { core.showToast('Apri prima la cartella di lavoro.'); return false; }
        const f = core.arcDb[folderId];
        if (!f) return false;

        const year      = f.year || archive._extractYear(f.numero);
        const folderNm  = archive._folderName(f.numero, f.title, f.year);

        try {
            const fascicoliDir = await core.dirHandle.getDirectoryHandle('FASCICOLI', { create: true });
            const yearDir      = await fascicoliDir.getDirectoryHandle(String(year), { create: true });
            const fascDir      = await yearDir.getDirectoryHandle(folderNm, { create: true });

            for (const [filename, blob] of Object.entries(blobs)) {
                const fh       = await fascDir.getFileHandle(filename, { create: true });
                const writable = await fh.createWritable();
                await writable.write(blob);
                await writable.close();
            }
            return true;
        } catch (err) {
            console.error('saveToDisk:', err);
            core.showToast('Errore salvataggio: ' + err.message);
            return false;
        }
    }
};