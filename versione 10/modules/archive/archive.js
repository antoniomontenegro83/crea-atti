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
                <div class="flex gap-3">
                    <input type="text" id="archive-search" placeholder="Cerca fascicolo..." oninput="archive.renderFolders()"
                        class="bg-white border border-slate-200 rounded-xl px-5 py-3 text-[13px] font-bold text-slate-700 outline-none focus:border-blue-400 w-64 shadow-sm">
                    <button onclick="archive.openNewFolderModal()" class="bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase text-[12px] hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm">
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
                <div class="w-[420px] bg-slate-50/50 p-10 border-r border-slate-200 flex flex-col">
                    <div class="mb-8">
                        <span class="bg-blue-100 text-blue-600 px-3 py-1 rounded-lg font-black text-[12px] uppercase">Fascicolo</span>
                        <h3 id="folder-title" class="font-black text-3xl uppercase text-slate-800 mt-4 leading-tight break-words">Titolo Pratica</h3>
                        <p id="folder-number" class="text-slate-400 font-bold text-[14px] mt-2 italic">N. --</p>
                    </div>
                    <div class="flex-1 space-y-4">

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
                            <input type="text" id="new-folder-rg" placeholder="Es. 121/2025"
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
                        <textarea id="new-folder-notes" placeholder="Annotazioni sulla pratica..." rows="3"
                            class="w-full border border-slate-200 rounded-xl p-4 font-medium text-[14px] text-slate-700 outline-none focus:border-blue-400 resize-none"></textarea>
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

    // Estrae anno da stringa RG (es. "121/2025" → 2025, "2025/121" → 2025)
    _extractYear: (rg) => {
        if (!rg) return new Date().getFullYear();
        const m = String(rg).match(/\b(19|20)\d{2}\b/);
        return m ? parseInt(m[0]) : new Date().getFullYear();
    },

    // Mostra il fascicolo come "numero/anno" es. "121/2005"
    _fascLabel: (rg, year) => {
        if (!rg) return '';
        const yr = year || archive._extractYear(rg);
        // Se rg contiene già l'anno (es. "121/2005") non aggiungerlo di nuovo
        if (String(rg).includes(String(yr))) return rg;
        return `${rg}/${yr}`;
    },

    // Nome cartella fisica: usa formato "numero-anno" senza caratteri invalidi
    _folderName: (rg, title, year) => {
        const label = rg ? archive._fascLabel(rg, year) : (title || 'fascicolo');
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

    // Auto-compila anno dal campo RG nel modal
    autoFillYear: () => {
        const rg  = document.getElementById('new-folder-rg')?.value || '';
        const yr  = archive._extractYear(rg);
        const yEl = document.getElementById('new-folder-year');
        if (yEl && !yEl.value) yEl.value = yr;
    },

    // Tab anni in cima all'archivio
    renderYearTabs: () => {
        const tabs = document.getElementById('year-tabs');
        if (!tabs) return;
        const years = [...new Set(
            Object.values(core.arcDb).map(f => f.year || archive._extractYear(f.rg))
        )].sort((a, b) => b - a);

        if (!years.length) { tabs.innerHTML = ''; return; }

        // Se nessun anno selezionato, seleziona il più recente
        if (archive._selectedYear === undefined) archive._selectedYear = years[0];

        tabs.innerHTML =
            `<button onclick="archive._selectedYear=null;archive.renderYearTabs();archive.renderFolders()"
                class="px-2 py-1 rounded-lg font-black text-[10px] uppercase transition-all ${!archive._selectedYear ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">
                Tutti
            </button>` +
            years.map(y =>
                `<button onclick="archive._selectedYear=${y};archive.renderYearTabs();archive.renderFolders()"
                    class="px-2 py-1 rounded-lg font-black text-[10px] uppercase transition-all ${archive._selectedYear === y ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">
                    ${y}
                </button>`
            ).join('');
    },

    renderFolders: () => {
        const grid = document.getElementById('folder-grid');
        if (!grid) return;
        const query = (document.getElementById('archive-search')?.value || '').toLowerCase();

        let entries = Object.entries(core.arcDb || {});

        // Filtra per anno selezionato
        if (archive._selectedYear) {
            entries = entries.filter(([, f]) =>
                (f.year || archive._extractYear(f.rg)) === archive._selectedYear
            );
        }

        // Filtra per testo ricerca
        if (query) {
            entries = entries.filter(([, f]) =>
                f.title?.toLowerCase().includes(query) ||
                f.rg?.toLowerCase().includes(query)    ||
                f.opp?.toLowerCase().includes(query)
            );
        }

        // Ordina per anno desc poi per RG
        entries.sort(([, a], [, b]) => {
            const ya = a.year || archive._extractYear(a.rg);
            const yb = b.year || archive._extractYear(b.rg);
            if (yb !== ya) return yb - ya;
            return (a.rg || '').localeCompare(b.rg || '');
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
            const year = folder.year || archive._extractYear(folder.rg);
            return `
            <div onclick="archive.openFolder('${id}')"
                class="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:border-blue-400 transition-all cursor-pointer group relative overflow-hidden">
                <div class="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-full -mr-10 -mt-10 group-hover:bg-blue-500/10 transition-colors"></div>
                <div class="flex items-start justify-between mb-3 relative z-10">
                    <i class="fas fa-folder text-blue-500 text-4xl group-hover:text-blue-600"></i>
                    <span class="bg-slate-100 text-slate-500 font-black text-[12px] uppercase px-2 py-1 rounded-lg">${year}</span>
                </div>
                <h4 class="font-black text-[17px] uppercase text-slate-800 leading-tight mb-1 relative z-10 break-words">${folder.title || 'Senza Titolo'}</h4>
                <p class="text-slate-400 font-bold text-[13px] uppercase tracking-tighter relative z-10">${archive._fascLabel(folder.rg, folder.year)}</p>
                <div class="mt-5 pt-4 border-t border-slate-50 flex justify-between items-center relative z-10">
                    <span class="text-[13px] font-bold text-slate-400 uppercase">${folder.docs?.length || 0} atti</span>
                    <i class="fas fa-arrow-right text-slate-200 group-hover:text-blue-500 transition-all"></i>
                </div>
            </div>`;
        }).join('');
    },

    openFolder: (id) => {
        const f = core.arcDb[id];
        if (!f) return;
        archive.selectedFolder = id;

        const year      = f.year || archive._extractYear(f.rg);
        const folderNm  = archive._folderName(f.rg, f.title, f.year);
        const diskPath  = `FASCICOLI/${year}/${folderNm}/`;

        document.getElementById('folder-title').innerText  = f.title || 'Senza Titolo';
        document.getElementById('folder-number').innerText = archive._fascLabel(f.rg, f.year);
        document.getElementById('folder-notes').innerText  = f.notes || 'Nessuna nota aggiuntiva.';
        document.getElementById('folder-date').innerText   = f.date  || '--';
        document.getElementById('folder-year').innerText   = year;
        document.getElementById('folder-path').innerText   = diskPath;

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
        document.getElementById('new-folder-rg').value    = '';
        document.getElementById('new-folder-year').value  = '';
        document.getElementById('new-folder-notes').value = '';
        document.getElementById('new-folder-modal').classList.remove('hidden');
        setTimeout(() => document.getElementById('new-folder-title').focus(), 100);
    },

    openEditFolderModal: () => {
        const f = core.arcDb[archive.selectedFolder];
        if (!f) return;
        document.getElementById('new-folder-modal-title').innerText = 'Modifica Fascicolo';
        document.getElementById('edit-folder-id').value   = archive.selectedFolder;
        document.getElementById('new-folder-title').value = f.title || '';
        document.getElementById('new-folder-rg').value    = f.rg    || '';
        document.getElementById('new-folder-year').value  = f.year  || archive._extractYear(f.rg);
        document.getElementById('new-folder-notes').value = f.notes || '';
        document.getElementById('new-folder-modal').classList.remove('hidden');
    },

    closeNewFolderModal: () => document.getElementById('new-folder-modal').classList.add('hidden'),

    saveFolder: async () => {
        const title = document.getElementById('new-folder-title').value.trim();
        if (!title) { alert('Il titolo è obbligatorio.'); return; }

        const rg     = document.getElementById('new-folder-rg').value.trim();
        const yearEl = document.getElementById('new-folder-year').value.trim();
        const year   = parseInt(yearEl) || archive._extractYear(rg);

        const editId   = document.getElementById('edit-folder-id').value;
        const isEdit   = !!editId;
        const id       = editId || ('arc_' + Date.now());
        const existing = isEdit ? (core.arcDb[editId] || {}) : {};

        core.arcDb[id] = {
            ...existing,
            title : title,
            rg    : rg,
            year  : year,
            opp   : document.getElementById('new-folder-opp').value.trim(),
            notes : document.getElementById('new-folder-notes').value.trim(),
            date  : existing.date || new Date().toLocaleDateString('it-IT'),
            docs  : existing.docs || []
        };

        // Crea subito cartella fisica su disco
        if (core.dirHandle && rg) {
            try {
                const fascicoliDir = await core.dirHandle.getDirectoryHandle('FASCICOLI', { create: true });
                const yearDir      = await fascicoliDir.getDirectoryHandle(String(year), { create: true });
                await yearDir.getDirectoryHandle(archive._folderName(rg, title, year), { create: true });
            } catch (e) { console.warn('Cartella non creata:', e.message); }
        }

        await core.saveArc();
        archive.closeNewFolderModal();
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

    // Trova fascicolo per RG — oppure lo crea automaticamente
    findOrCreateByRg: (rg, titleFallback, yearOverride) => {
        if (!rg) return null;
        if (!core.arcDb) core.arcDb = {};

        const existing = Object.keys(core.arcDb).find(id => {
            const f = core.arcDb[id];
            return String(f.rg || '').trim().toLowerCase() === rg.toLowerCase();
        });
        if (existing) return { id: existing, isNew: false };

        // Crea nuovo — usa yearOverride (da form ANNO_FASCICOLO) se disponibile
        const id   = 'arc_' + Date.now();
        const year = yearOverride || archive._extractYear(rg);
        core.arcDb[id] = {
            title : titleFallback || rg,
            rg    : rg,
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

    // Salva i blob fisicamente in FASCICOLI/{anno}/{rg}/
    saveToDisk: async (folderId, blobs) => {
        if (!core.dirHandle) { core.showToast('Apri prima la cartella di lavoro.'); return false; }
        const f = core.arcDb[folderId];
        if (!f) return false;

        const year      = f.year || archive._extractYear(f.rg);
        const folderNm  = archive._folderName(f.rg, f.title, f.year);

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