/* --- modules/dashboard/dashboard.js --- */
const dashboard = {
    html: `
        <div class="dash-view space-y-6 animate-in fade-in duration-500 h-full overflow-hidden p-4">
            
            <div id="dash-alerts" class="hidden">
                <div class="bg-red-50 border-l-4 border-red-500 p-3 rounded-xl shadow-sm flex items-center gap-4 mb-2">
                    <div class="text-red-500 text-xl animate-pulse"><i class="fas fa-exclamation-triangle"></i></div>
                    <div class="flex-1 flex justify-between items-center">
                        <div>
                            <h4 class="font-black text-red-600 uppercase text-[12px] tracking-widest leading-none">Scadenze Imminenti</h4>
                            <div id="alert-list" class="flex flex-wrap gap-2 mt-2"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-3 gap-6">
                <div class="flex items-center gap-4 bg-white rounded-xl border p-3 shadow-sm">
                    <div class="w-10 h-10 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center text-lg shrink-0">
                        <i class="fas fa-folder-open"></i>
                    </div>
                    <div>
                        <h4 id="dash-folders" class="text-lg font-black leading-none text-slate-800">0</h4>
                        <p class="text-[12px] font-bold text-slate-400 uppercase mt-1">Fascicoli</p>
                    </div>
                </div>
                <div class="flex items-center gap-4 bg-white rounded-xl border p-3 shadow-sm">
                    <div class="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center text-lg shrink-0">
                        <i class="fas fa-file-invoice"></i>
                    </div>
                    <div>
                        <h4 id="dash-files" class="text-lg font-black leading-none text-slate-800">0</h4>
                        <p class="text-[12px] font-bold text-slate-400 uppercase mt-1">Atti</p>
                    </div>
                </div>
                <div class="flex items-center gap-4 bg-white rounded-xl border p-3 shadow-sm">
                    <div class="w-10 h-10 bg-purple-50 text-purple-500 rounded-lg flex items-center justify-center text-lg shrink-0">
                        <i class="fas fa-layer-group"></i>
                    </div>
                    <div>
                        <h4 id="dash-tpls" class="text-lg font-black leading-none text-slate-800">0</h4>
                        <p class="text-[12px] font-bold text-slate-400 uppercase mt-1">Modelli</p>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-[2rem] border p-6 shadow-sm h-full overflow-hidden">
                <div class="flex justify-between items-center mb-6 px-4">
                    <button onclick="calendar.changeMonth(-1)" class="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-all text-slate-400">
                        <i class="fas fa-chevron-left text-lg"></i>
                    </button>
                    <h3 id="cal-title" class="font-black text-xl uppercase text-slate-800 tracking-tighter">Mese</h3>
                    <button onclick="calendar.changeMonth(1)" class="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-all text-slate-400">
                        <i class="fas fa-chevron-right text-lg"></i>
                    </button>
                </div>
                <div id="cal-grid"></div>
            </div>
        </div>

        <div id="event-modal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[500] flex items-center justify-center p-4">
            <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-[1700px] flex h-[800px] overflow-hidden border border-slate-200/50">
                
                <!-- Colonna sinistra: form -->
                <div class="w-[850px] min-w-[850px] bg-slate-50/50 p-12 flex flex-col border-r border-slate-200">
                    <div class="mb-10 border-b pb-6 flex justify-between items-end">
                        <div class="flex items-center">
                            <h3 class="font-black text-3xl uppercase text-slate-800 leading-none">Scadenza</h3>
                            <span id="modal-date-display" class="font-bold text-2xl text-blue-500 ml-3 lowercase"></span>
                        </div>
                        <button onclick="calendar.resetForm()" class="text-blue-500 font-bold uppercase text-[12px] bg-white px-4 py-2 rounded-full border shadow-sm hover:bg-blue-50">Nuovo</button>
                    </div>
                    <div class="space-y-8 flex-1 flex flex-col overflow-hidden">
                        <div class="grid grid-cols-4 gap-6 shrink-0">
                            <div class="col-span-3">
                                <label class="text-[12px] font-bold uppercase text-slate-400 mb-2 block tracking-widest">Descrizione</label>
                                <input type="text" id="event-input" class="w-full bg-white border border-slate-200 rounded-xl p-4 font-semibold text-[16px] text-slate-800 outline-none focus:border-blue-400">
                            </div>
                            <div class="col-span-1 text-center">
                                <label class="text-[12px] font-bold uppercase text-slate-400 mb-2 block uppercase text-center">Ora</label>
                                <input type="time" id="event-time" class="w-full bg-white border border-slate-200 rounded-xl p-4 font-bold text-[18px] text-slate-800 text-center">
                            </div>
                        </div>
                        <div class="flex-1 flex flex-col min-h-0">
                            <label class="text-[12px] font-bold uppercase text-slate-400 mb-2 block uppercase">Note</label>
                            <textarea id="event-notes" class="flex-1 w-full bg-white border border-slate-200 rounded-xl p-6 font-medium text-[15px] resize-none"></textarea>
                        </div>
                        <div class="flex items-center justify-between pt-8 border-t">
                            <div class="flex flex-col gap-4">
                                <label class="flex items-center gap-4 cursor-pointer group">
                                    <input type="checkbox" id="event-holiday-check" onchange="calendar.toggleHoliday()" class="w-5 h-5 accent-red-600">
                                    <span class="text-[12px] font-bold uppercase text-slate-500">Giorno Festivo</span>
                                </label>
                                <div id="holiday-name-container" style="display:none">
                                    <input type="text" id="holiday-name-input" oninput="calendar.saveHolidayName()" class="w-64 bg-white border border-red-100 rounded-lg p-3 font-bold text-[12px] text-red-500" placeholder="Nome festa...">
                                </div>
                            </div>
                            <button onclick="calendar.addEvent()" class="bg-slate-900 text-white px-12 py-4 rounded-xl font-black uppercase text-[12px] shadow-lg hover:bg-blue-600 transition-all flex items-center gap-3">
                                <i class="fas fa-check-circle text-lg"></i> <span id="btn-add-text">Aggiungi</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Colonna destra: lista eventi -->
                <div class="flex-1 p-12 flex flex-col bg-white overflow-hidden relative">
                    <button onclick="calendar.closeModal()" class="absolute top-8 right-8 text-slate-300 hover:text-red-500 transition-all">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                    <div class="mb-10 flex justify-between items-start shrink-0">
                        <div>
                            <h4 class="font-black text-2xl uppercase tracking-tighter text-slate-800 leading-none">Agenda</h4>
                            <div class="w-12 h-1.5 bg-blue-600 mt-3 rounded-full"></div>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="eventsDB.importIcal()" class="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm">
                                <i class="fas fa-file-import text-[12px]"></i>
                                <span class="text-[12px] font-bold uppercase">Importa</span>
                            </button>
                            <button onclick="eventsDB.exportIcal()" class="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                                <i class="fas fa-file-export text-[12px]"></i>
                                <span class="text-[12px] font-bold uppercase">Esporta</span>
                            </button>
                        </div>
                    </div>
                    <div id="event-list" class="flex-1 overflow-y-auto space-y-2 pr-2 custom-scroll min-w-0"></div>
                    <div class="mt-10 shrink-0">
                        <button onclick="calendar.closeModal()" class="w-full py-4 bg-slate-100 text-slate-400 rounded-xl font-bold uppercase text-[12px] tracking-[0.2em]">Esci</button>
                    </div>
                </div>
            </div>
        </div>
    `,

    init: () => {
        const arc = core.db.arc || {};
        const tpl = core.db.tpl || {};

        // Numero fascicoli
        const folderCount = Object.keys(arc).length;

        // FIX: conteggio corretto degli atti — ogni fascicolo ha un array "docs"
        const docsCount = Object.values(arc).reduce((acc, folder) => {
            return acc + (Array.isArray(folder.docs) ? folder.docs.length : 0);
        }, 0);

        // Numero modelli
        const tplCount = Object.keys(tpl).length;

        const elFolders = document.getElementById('dash-folders');
        const elFiles   = document.getElementById('dash-files');
        const elTpls    = document.getElementById('dash-tpls');

        if (elFolders) elFolders.innerText = folderCount;
        if (elFiles)   elFiles.innerText   = docsCount;
        if (elTpls)    elTpls.innerText    = tplCount;

        // Banner scadenze imminenti
        const alertList = document.getElementById('alert-list');
        const alertCont = document.getElementById('dash-alerts');
        const urgent    = calendar.getUrgentEvents();

        if (urgent.length > 0) {
            if (alertCont) alertCont.classList.remove('hidden');
            if (alertList) alertList.innerHTML = urgent.map(ev => `
                <div class="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-red-100 flex items-center gap-2">
                    <span class="text-[10px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded">${ev.dayLabel}</span>
                    <span class="text-[12px] font-bold text-slate-700">${ev.time} - ${ev.text}</span>
                </div>
            `).join('');
        } else {
            if (alertCont) alertCont.classList.add('hidden');
        }

        if (typeof calendar !== 'undefined') calendar.init();
    }
};
