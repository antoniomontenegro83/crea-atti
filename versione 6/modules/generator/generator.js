/* --- modules/generator/generator.js --- */

// Fix CDN: garantisce Docxtemplater e PizZip disponibili indipendentemente dal CDN usato
if (typeof Docxtemplater === 'undefined' && typeof docxtemplater !== 'undefined') window.Docxtemplater = docxtemplater;
if (typeof PizZip         === 'undefined' && typeof pizzip         !== 'undefined') window.PizZip         = pizzip;

const generator = {
    _pendingDocs: [],
    _pendingRendered: [],
    _editingTplId: null,
    _currentDateField: null,
    _previewZoom: 50,

    _numToItalian: (n) => {
        if (n === 0) return 'zero';
        if (n < 0)   return 'meno ' + generator._numToItalian(-n);
        const u = ['','uno','due','tre','quattro','cinque','sei','sette','otto','nove',
                   'dieci','undici','dodici','tredici','quattordici','quindici','sedici',
                   'diciassette','diciotto','diciannove'];
        const t = ['','','venti','trenta','quaranta','cinquanta','sessanta','settanta','ottanta','novanta'];
        if (n < 20) return u[n];
        if (n < 100) { const ten=t[Math.floor(n/10)],unit=u[n%10]; return (unit==='uno'||unit==='otto')?ten.slice(0,-1)+unit:ten+unit; }
        if (n < 1000) { const h=Math.floor(n/100),rest=n%100,pre=h===1?'cento':generator._numToItalian(h)+'cento'; return rest===0?pre:pre+generator._numToItalian(rest); }
        if (n < 1000000) { const th=Math.floor(n/1000),rest=n%1000,pre=th===1?'mille':generator._numToItalian(th)+'mila'; return rest===0?pre:pre+generator._numToItalian(rest); }
        if (n < 1000000000) { const m=Math.floor(n/1000000),rest=n%1000000,pre=m===1?'unmilione':generator._numToItalian(m)+'milioni'; return rest===0?pre:pre+generator._numToItalian(rest); }
        const b=Math.floor(n/1000000000),rest=n%1000000000,pre=b===1?'unmiliardo':generator._numToItalian(b)+'miliardi'; return rest===0?pre:pre+generator._numToItalian(rest);
    },
    euroToLetters: (str) => {
        if (!str) return '';
        const clean=str.toString().trim().replace(/\./g,'').replace(/\s/g,'').replace(',','.');
        const parts=clean.split('.'); const intVal=parseInt(parts[0],10);
        const cents=parts[1]?parts[1].substring(0,2).padEnd(2,'0'):null;
        if (isNaN(intVal)) return '';
        return cents?generator._numToItalian(intVal)+'/'+cents:generator._numToItalian(intVal);
    },
    autoFillLetters: () => {
        document.querySelectorAll('#form-container input[name*="_in_lettere"]').forEach(dest => {
            const src=document.querySelector('#form-container input[name="'+dest.name.replace(/_in_lettere/i,'')+'"]');
            if (!src) return;
            const v=generator.euroToLetters(src.value);
            dest.value=v; dest.style.background=v?'#f0fdf4':''; dest.style.color=v?'#15803d':'';
        });
    },

    // ─────────────────────────────────────────────
    //  HTML PRINCIPALE
    // ─────────────────────────────────────────────
    html: `
        <div class="h-full flex flex-col overflow-hidden">

            <!-- NAV tabs -->
            <div class="flex gap-1 bg-slate-100 p-1 rounded-2xl mb-5 shrink-0 self-start">
                <button onclick="generator.tab('compile')"  id="tab-compile"  class="gen-tab active px-6 py-2.5 rounded-xl font-black uppercase text-[11px] tracking-widest transition-all"><i class="fas fa-file-signature mr-2"></i>Compila Atto</button>
                <button onclick="generator.tab('editor')"   id="tab-editor"   class="gen-tab px-6 py-2.5 rounded-xl font-black uppercase text-[11px] tracking-widest transition-all"><i class="fas fa-pencil-alt mr-2"></i>Editor Template</button>
                <button onclick="generator.tab('firma')"    id="tab-firma"    class="gen-tab px-6 py-2.5 rounded-xl font-black uppercase text-[11px] tracking-widest transition-all"><i class="fas fa-signature mr-2"></i>Firma / Timbro</button>
            </div>

            <!-- ══════════════ TAB: COMPILA ══════════════ -->
            <div id="tab-panel-compile" class="flex-1 flex gap-6 overflow-hidden">

                <div class="flex-[2] flex flex-col gap-5 overflow-hidden">
                    <!-- Slot modelli -->
                    <div class="bg-white p-4 rounded-[2rem] border flex items-center gap-4 shadow-sm shrink-0">
                        <div id="slots-container" class="flex gap-3 flex-1 min-w-0 flex-wrap"></div>
                        <div class="flex gap-2 shrink-0">
                            <button onclick="generator.addSlot()" title="Aggiungi slot" class="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all text-sm"><i class="fas fa-plus"></i></button>
                            <button onclick="generator.tab('editor')" title="Gestisci modelli" class="w-10 h-10 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all text-sm"><i class="fas fa-cog"></i></button>
                        </div>
                    </div>
                    <!-- Form -->
                    <div class="bg-white p-7 rounded-[2rem] border shadow-sm flex-1 flex flex-col overflow-hidden">
                        <div class="flex justify-between items-center mb-5 shrink-0 flex-wrap gap-3">
                            <h4 class="font-black text-base uppercase text-slate-800 tracking-tight">Campi del Documento</h4>
                            <div class="flex items-center gap-3 flex-wrap">
                                <label class="text-[10px] font-black uppercase text-slate-400">Fascicolo</label>
                                <select id="gen-folder-select" onchange="generator.onFolderChange()" class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-[12px] text-slate-700 outline-none focus:border-blue-400 max-w-[200px]">
                                    <option value="">— Nessuno —</option>
                                </select>
                            </div>
                        </div>
                        <form id="doc-form" onsubmit="generator.submit(event)" class="flex-1 flex flex-col overflow-hidden">
                            <div id="form-container" class="gen-grid flex-1 overflow-y-auto pr-2 pb-3" style="align-content:start"></div>
                            <div class="flex gap-4 pt-5 border-t mt-3 shrink-0">
                                <button type="submit" class="flex-1 bg-emerald-600 text-white py-4 rounded-[1.5rem] font-black text-base shadow-xl hover:bg-emerald-500 uppercase tracking-widest transition-all flex items-center justify-center gap-3">
                                    <i class="fas fa-file-download"></i> Genera Atti
                                </button>
                                <button type="button" onclick="generator.clear()" class="bg-slate-100 text-slate-400 px-7 rounded-[1.5rem] font-black uppercase text-[10px] hover:bg-slate-200 transition-all">Svuota</button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Sidebar: anteprima + tag -->
                <div class="flex-[1.2] flex flex-col gap-5 overflow-hidden min-w-[240px]">
                    <div class="bg-white p-4 rounded-[2rem] border shadow-sm flex-1 flex flex-col overflow-hidden">
                        <div class="flex justify-between items-center mb-3 shrink-0">
                            <div class="flex items-center gap-2 min-w-0">
                                <h4 class="font-black text-[11px] uppercase text-slate-400 tracking-widest shrink-0">Anteprima</h4>
                                <span id="preview-tpl-name" class="text-[10px] font-bold text-blue-400 truncate">—</span>
                            </div>
                            <div class="flex items-center gap-1 shrink-0 ml-2 bg-slate-100 rounded-xl px-2 py-1">
                                <button onclick="generator.setZoom(generator._previewZoom-10)" class="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-blue-600 font-black text-base leading-none select-none">−</button>
                                <span id="zoom-label" class="text-[11px] font-black text-slate-600 w-9 text-center">50%</span>
                                <button onclick="generator.setZoom(generator._previewZoom+10)" class="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-blue-600 font-black text-base leading-none select-none">+</button>
                                <button onclick="generator.setZoom(50)" title="Reset" class="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-blue-500 ml-1"><i class="fas fa-undo text-[9px]"></i></button>
                            </div>
                        </div>
                        <div id="preview-scroll" class="flex-1 rounded-xl overflow-auto" style="background:#94a3b8;padding:10px;">
                            <div id="preview-sizer" style="position:relative;margin:0 auto;">
                                <div id="live-preview" style="position:absolute;top:0;left:0;width:794px;background:white;padding:96px 113px;font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.7;color:#111;transform-origin:top left;box-shadow:0 4px 24px rgba(0,0,0,0.25);"></div>
                            </div>
                        </div>
                    </div>
                    <div class="bg-slate-50 p-5 rounded-[2rem] border shrink-0">
                        <label class="gen-label border-b pb-2 mb-3 text-center block">Inserisci Tag</label>
                        <div id="composer-btns" class="tag-grid max-h-[120px] overflow-y-auto"></div>
                    </div>
                </div>
            </div>

            <!-- ══════════════ TAB: EDITOR TEMPLATE ══════════════ -->
            <div id="tab-panel-editor" class="flex-1 flex gap-6 overflow-hidden hidden">
                <div class="w-[240px] shrink-0 flex flex-col gap-4 overflow-hidden">
                    <div class="bg-white p-5 rounded-[2rem] border shadow-sm flex-1 flex flex-col overflow-hidden">
                        <div class="flex justify-between items-center mb-4 shrink-0">
                            <h4 class="font-black text-[11px] uppercase text-slate-400 tracking-widest">Modelli</h4>
                            <button onclick="generator.newTemplate()" class="w-8 h-8 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all text-xs flex items-center justify-center"><i class="fas fa-plus"></i></button>
                        </div>
                        <div id="tpl-list" class="flex-1 overflow-y-auto space-y-2"></div>
                    </div>
                    <div onclick="generator.triggerTemplateUpload()" class="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-5 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all shrink-0">
                        <i class="fas fa-cloud-upload-alt text-2xl text-slate-300 mb-2 block"></i>
                        <p class="font-black uppercase text-slate-400 text-[11px]">Carica .docx</p>
                        <input type="file" id="template-file-input" accept=".docx" class="hidden" onchange="generator.uploadTemplate(this)">
                    </div>
                </div>
                <div class="flex-1 flex flex-col gap-4 overflow-hidden">
                    <div class="bg-white p-4 rounded-[2rem] border shadow-sm shrink-0 flex gap-3 items-center flex-wrap">
                        <input type="text" id="tpl-name-input" placeholder="Nome modello..." class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-black text-[14px] text-slate-800 outline-none focus:border-blue-400 flex-1 min-w-[140px]">
                        <div class="flex gap-2">
                            <button onclick="generator.editorFormat('bold')"      class="w-9 h-9 bg-slate-100 rounded-xl font-black text-slate-600 hover:bg-blue-600 hover:text-white transition-all"><b>B</b></button>
                            <button onclick="generator.editorFormat('italic')"    class="w-9 h-9 bg-slate-100 rounded-xl font-black text-slate-600 hover:bg-blue-600 hover:text-white transition-all"><i>I</i></button>
                            <button onclick="generator.editorFormat('underline')" class="w-9 h-9 bg-slate-100 rounded-xl font-black text-slate-600 hover:bg-blue-600 hover:text-white transition-all"><u>U</u></button>
                            <div class="w-px bg-slate-200 self-stretch"></div>
                            <button onclick="generator.editorInsertTag()" class="flex items-center gap-1.5 px-3 h-9 bg-amber-100 text-amber-700 rounded-xl font-black text-[11px] uppercase hover:bg-amber-200 transition-all"><i class="fas fa-code"></i> Tag</button>
                        </div>
                        <div class="flex gap-2 ml-auto">
                            <button onclick="generator.saveTplFromEditor()" class="flex items-center gap-2 px-4 h-9 bg-slate-900 text-white rounded-xl font-black text-[11px] uppercase hover:bg-blue-600 transition-all"><i class="fas fa-save"></i> Salva</button>
                            <button onclick="generator.exportTplAsDocx()"   class="flex items-center gap-2 px-4 h-9 bg-blue-600 text-white rounded-xl font-black text-[11px] uppercase hover:bg-blue-700 transition-all"><i class="fas fa-file-export"></i> .docx</button>
                        </div>
                    </div>
                    <div class="bg-white rounded-[2rem] border shadow-sm flex-1 flex flex-col overflow-hidden">
                        <div id="tpl-editor" contenteditable="true" spellcheck="false" oninput="generator.onEditorInput()"
                            class="flex-1 overflow-y-auto p-8 text-[15px] text-slate-800 font-mono leading-relaxed outline-none"
                            style="min-height:200px;word-break:break-word;"
                            data-placeholder="Scrivi qui il testo del modello..."></div>
                        <div class="px-8 py-3 border-t bg-slate-50/50 flex items-center justify-between rounded-b-[2rem] shrink-0">
                            <span id="editor-field-count" class="text-[11px] font-bold text-slate-400 uppercase">0 campi rilevati</span>
                            <span id="editor-char-count"  class="text-[11px] font-bold text-slate-400">0 caratteri</span>
                        </div>
                    </div>
                </div>
            </div>

<!-- ══════════════ TAB: FIRMA / TIMBRO ══════════════ -->
            <div id="tab-panel-firma" class="flex-1 flex gap-6 overflow-hidden hidden">
                <!-- Firma -->
                <div class="flex-1 bg-white p-8 rounded-[2rem] border shadow-sm flex flex-col overflow-hidden">
                    <div class="flex justify-between items-center mb-6 shrink-0">
                        <div>
                            <h4 class="font-black text-xl uppercase text-slate-800 leading-none">Firma Digitale</h4>
                            <p class="text-[11px] font-bold text-slate-400 uppercase mt-1">Disegna la tua firma</p>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="generator.clearSignature()" class="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl font-black text-[11px] uppercase hover:bg-slate-200 transition-all">
                                <i class="fas fa-eraser mr-1"></i> Pulisci
                            </button>
                            <button onclick="generator.saveSignature()" class="px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[11px] uppercase hover:bg-blue-600 transition-all">
                                <i class="fas fa-save mr-1"></i> Salva Firma
                            </button>
                        </div>
                    </div>
                    <canvas id="signature-canvas"
                        class="flex-1 w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 cursor-crosshair"
                        style="touch-action:none; min-height:200px;"></canvas>
                    <div id="firma-saved-preview" class="hidden mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-4 shrink-0">
                        <i class="fas fa-check-circle text-emerald-500 text-xl"></i>
                        <div>
                            <p class="font-black text-[13px] text-emerald-700 uppercase">Firma salvata</p>
                            <p class="text-[11px] text-emerald-500">Verrà applicata automaticamente ai documenti generati</p>
                        </div>
                        <button onclick="generator.deleteSignature()" class="ml-auto text-red-300 hover:text-red-500 transition-all"><i class="fas fa-trash text-sm"></i></button>
                    </div>
                </div>

                <!-- Timbro -->
                <div class="w-[320px] shrink-0 bg-white p-8 rounded-[2rem] border shadow-sm flex flex-col gap-6 overflow-y-auto">
                    <div>
                        <h4 class="font-black text-xl uppercase text-slate-800 leading-none">Timbro</h4>
                        <p class="text-[11px] font-bold text-slate-400 uppercase mt-1">Carica immagine PNG/JPG</p>
                    </div>
                    <div onclick="generator.triggerTimbroUpload()" class="flex-1 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all flex flex-col items-center justify-center gap-3">
                        <div id="timbro-preview-wrap">
                            <i class="fas fa-stamp text-5xl text-slate-200 block mb-3"></i>
                            <p class="font-black uppercase text-slate-300 text-[12px]">Clicca per caricare</p>
                            <p class="text-slate-300 text-[11px]">PNG con sfondo trasparente consigliato</p>
                        </div>
                        <img id="timbro-preview-img" class="hidden max-h-[140px] object-contain rounded-xl" alt="Timbro">
                        <input type="file" id="timbro-file-input" accept="image/png,image/jpeg,image/gif" class="hidden" onchange="generator.uploadTimbro(this)">
                    </div>
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <label class="text-[11px] font-black uppercase text-slate-400">Dimensione</label>
                            <span id="timbro-size-val" class="text-[11px] font-bold text-blue-500">120px</span>
                        </div>
                        <input type="range" id="timbro-size" min="60" max="250" value="120" oninput="document.getElementById('timbro-size-val').innerText=this.value+'px'" class="w-full accent-blue-600">
                        <div class="flex items-center justify-between">
                            <label class="text-[11px] font-black uppercase text-slate-400">Posizione</label>
                            <select id="timbro-position" class="gen-input py-1 text-[11px] w-auto">
                                <option value="bottom-right">Basso Destra</option>
                                <option value="bottom-left">Basso Sinistra</option>
                                <option value="top-right">Alto Destra</option>
                                <option value="top-left">Alto Sinistra</option>
                                <option value="center">Centro</option>
                            </select>
                        </div>
                        <button onclick="generator.deleteTimbro()" id="btn-delete-timbro" class="hidden w-full py-3 bg-red-50 text-red-400 rounded-xl font-bold uppercase text-[11px] hover:bg-red-100 transition-all">
                            <i class="fas fa-trash mr-1"></i> Rimuovi Timbro
                        </button>
                    </div>
                    <div id="timbro-saved-badge" class="hidden bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                        <p class="font-black text-[11px] text-emerald-700 uppercase"><i class="fas fa-check mr-1"></i> Timbro attivo</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- ══ MODAL: Output post-generazione ══ -->
        <div id="output-modal" class="hidden fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[800] flex items-center justify-center p-4">
            <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-[600px] p-10 border">
                <div class="text-center mb-8">
                    <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-check text-emerald-500 text-2xl"></i>
                    </div>
                    <h3 class="font-black text-xl uppercase text-slate-800">Atti Generati!</h3>
                    <p id="output-modal-desc" class="text-slate-400 text-[13px] font-bold mt-2"></p>
                </div>

                <!-- Azioni rapide -->
                <div class="grid grid-cols-2 gap-3 mb-6">
                    <button onclick="generator.printDocument()" class="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black uppercase text-[12px] text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all">
                        <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-500 border shadow-sm shrink-0"><i class="fas fa-print text-lg"></i></div>
                        Stampa Diretta
                    </button>
                    <button onclick="generator.exportPDF()" class="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl font-black uppercase text-[12px] text-red-600 hover:bg-red-100 transition-all">
                        <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-500 border border-red-100 shadow-sm shrink-0"><i class="fas fa-file-pdf text-lg"></i></div>
                        Esporta PDF
                    </button>
                    <button onclick="generator.applySignatureAndPrint()" class="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl font-black uppercase text-[12px] text-blue-600 hover:bg-blue-100 transition-all">
                        <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-500 border border-blue-100 shadow-sm shrink-0"><i class="fas fa-signature text-lg"></i></div>
                        Stampa + Firma
                    </button>
                    <button onclick="generator.applyTimbroAndPrint()" class="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-2xl font-black uppercase text-[12px] text-purple-600 hover:bg-purple-100 transition-all">
                        <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-purple-500 border border-purple-100 shadow-sm shrink-0"><i class="fas fa-stamp text-lg"></i></div>
                        Stampa + Timbro
                    </button>
                </div>

                <!-- Archivia -->
                <div class="border-t pt-5">
                    <label class="text-[11px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Archivia nel Fascicolo</label>
                    <!-- Badge fascicolo rilevato dal form -->
                    <div id="auto-folder-badge" class="hidden mb-3 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
                        <i class="fas fa-magic text-blue-400 text-xs"></i>
                        <span id="auto-folder-text" class="text-[12px] font-bold text-blue-700 flex-1">Fascicolo rilevato</span>
                        <span id="auto-folder-status" class="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-600">trovato</span>
                    </div>
                    <select id="save-folder-select" class="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-[13px] text-slate-700 outline-none focus:border-blue-400 transition-all mb-4">
                        <option value="">— Non archiviare —</option>
                    </select>
                    <div class="flex gap-3">
                        <button onclick="generator.closeOutputModal()" class="flex-1 py-3 bg-slate-100 text-slate-400 rounded-xl font-bold uppercase text-[12px] hover:bg-slate-200 transition-all">Chiudi</button>
                        <button onclick="generator.confirmSaveToFolder()" class="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[12px] hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
                            <i class="fas fa-folder-plus"></i> Archivia
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── MODAL: Inserisci Tag ── -->
        <div id="insert-tag-modal" class="hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[900] flex items-center justify-center p-4">
            <div class="bg-white rounded-[2rem] shadow-2xl w-full max-w-[380px] p-8 border">
                <h4 class="font-black uppercase text-slate-800 mb-1">Inserisci Campo</h4>
                <p class="text-[11px] text-slate-400 mb-5">Sarà inserito come <span class="font-black text-amber-600">{{NOME}}</span></p>
                <input type="text" id="new-tag-name" class="gen-input mb-5" placeholder="es. NOME_CLIENTE" oninput="this.value=this.value.toUpperCase().replace(/ /g,'_')">
                <div class="flex gap-3">
                    <button onclick="document.getElementById('insert-tag-modal').classList.add('hidden')" class="flex-1 py-3 bg-slate-100 text-slate-400 rounded-xl font-bold uppercase text-[11px]">Annulla</button>
                    <button onclick="generator.confirmInsertTag()" class="flex-1 py-3 bg-amber-500 text-white rounded-xl font-black uppercase text-[11px] hover:bg-amber-600 transition-all">Inserisci</button>
                </div>
            </div>
        </div>

        <!-- ── MODAL: Datepicker ── -->
        <div id="date-modal" class="hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[900] flex items-center justify-center p-4">
            <div class="bg-white rounded-[2rem] shadow-2xl w-full max-w-[420px] p-8 border">
                <h4 class="font-black uppercase text-slate-800 mb-1">Seleziona Data</h4>
                <p id="date-modal-field" class="text-[11px] font-bold text-blue-400 uppercase mb-5"></p>
                <input type="date" id="date-picker" oninput="generator.updateDatePreview()" class="gen-input text-center text-lg mb-3">
                <div id="date-letters-preview" class="text-center font-black text-blue-600 text-[15px] mb-5 min-h-[24px]"></div>
                <div class="bg-slate-50 p-4 rounded-2xl border mb-5">
                    <label class="gen-label mb-3 block">Calcola scadenza</label>
                    <div class="flex gap-2 flex-wrap">
                        <button onclick="generator.addDays(30)"  class="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-black uppercase hover:bg-blue-50 hover:border-blue-300 transition-all">+30gg</button>
                        <button onclick="generator.addDays(60)"  class="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-black uppercase hover:bg-blue-50 hover:border-blue-300 transition-all">+60gg</button>
                        <button onclick="generator.addDays(90)"  class="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-black uppercase hover:bg-blue-50 hover:border-blue-300 transition-all">+90gg</button>
                        <button onclick="generator.addDays(180)" class="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-black uppercase hover:bg-blue-50 hover:border-blue-300 transition-all">+180gg</button>
                        <button onclick="generator.addDays(365)" class="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-black uppercase hover:bg-blue-50 hover:border-blue-300 transition-all">+1 anno</button>
                    </div>
                    <div id="deadline-result" class="text-[12px] font-bold text-blue-500 mt-3 hidden"></div>
                </div>
                <label class="flex items-center gap-3 mb-6 cursor-pointer">
                    <input type="checkbox" id="date-format-letters" class="w-4 h-4 accent-blue-600">
                    <span class="text-[12px] font-bold text-slate-600">Inserisci in lettere (es. quindici gennaio duemilaventicinque)</span>
                </label>
                <div class="flex gap-3">
                    <button onclick="document.getElementById('date-modal').classList.add('hidden')" class="flex-1 py-3 bg-slate-100 text-slate-400 rounded-xl font-bold uppercase text-[11px]">Annulla</button>
                    <button onclick="generator.confirmDate()" class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[11px] hover:bg-blue-700 transition-all">Conferma</button>
                </div>
            </div>
        </div>

        <style>
            .gen-tab { color:#94a3b8; }
            .gen-tab.active { background:white; color:#1e293b; box-shadow:0 2px 8px rgba(0,0,0,0.08); }
            #tpl-editor:empty:before { content:attr(data-placeholder); color:#cbd5e1; pointer-events:none; }
            #tpl-editor .tpl-tag { background:#fef3c7; color:#b45309; padding:1px 6px; border-radius:6px; font-weight:900; font-size:12px; display:inline-block; user-select:all; }
            #tpl-editor .tpl-tag-single { background:#fce7f3; color:#9d174d; }
            .tpl-item { cursor:pointer; padding:10px 14px; border-radius:14px; border:1px solid #e2e8f0; font-weight:700; font-size:12px; text-transform:uppercase; color:#475569; display:flex; justify-content:space-between; align-items:center; transition:all 0.15s; }
            .tpl-item:hover,.tpl-item.selected { background:#eff6ff; border-color:#93c5fd; color:#1e40af; }
        </style>
    `,

    // ─────────────────────────────────────────────
    //  HELPER TAG — supporta {campo} e {{campo}}
    // ─────────────────────────────────────────────
    extractTags: (text) => {
        const found = [];
        let m;
        const re = /\{\{([^}]+)\}\}|\{([^}]+)\}/g;
        while ((m = re.exec(text)) !== null) {
            const name = (m[1] || m[2]).trim();
            if (name) found.push(name);
        }
        return Array.from(new Set(found));
    },

    replaceTags: (text, data) => {
        return text.replace(/\{\{([^}]+)\}\}|\{([^}]+)\}/g, (match, d1, d2) => {
            const key = (d1 || d2).trim();
            return (data[key] !== undefined && data[key] !== '') ? data[key] : `[${key}]`;
        });
    },

    // ─────────────────────────────────────────────
    //  INIT
    // ─────────────────────────────────────────────
    init: () => {
        if (!core.db.tpl)      core.db.tpl      = {};
        if (!core.db.arc)      core.db.arc      = {};

        generator.renderSlots();
        generator.renderFolderSelects();
        generator.renderTplList();
        generator.prepareForm();
        generator.initSignaturePad();
        generator.restoreFirmaTab();
        requestAnimationFrame(() => generator.setZoom(generator._previewZoom));
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

    renderSlots: () => {
        const c = document.getElementById('slots-container');
        if (!c) return;
        const opts = Object.keys(core.db.tpl||{}).map(k=>`<option value="${k}">${core.db.tpl[k].name}</option>`).join('');
        c.innerHTML = '';
        for (let i = 1; i <= core.state.activeSlots; i++) {
            c.innerHTML += `<div class="flex-1 bg-slate-50 p-3 rounded-2xl border min-w-[90px]">
                <span class="text-[9px] font-black uppercase text-slate-400 block mb-1">ATTO ${i}</span>
                <select id="gen-select-${i}" onchange="generator.prepareForm()" class="bg-transparent font-black text-sm outline-none w-full text-slate-700">
                    <option value="">Modello...</option>${opts}
                </select>
            </div>`;
        }
    },

    renderFolderSelects: () => {
        const opts = Object.entries(core.db.arc||{})
            .map(([id,f])=>`<option value="${id}">${f.title} (RG: ${f.rg||'N/D'})</option>`).join('');
        [['gen-folder-select','— Nessuno —'],['save-folder-select','— Non archiviare —']].forEach(([sel,def])=>{
            const el = document.getElementById(sel);
            if (el) el.innerHTML = `<option value="">${def}</option>` + opts;
        });
    },

    onFolderChange: () => {
        const fId = document.getElementById('gen-folder-select')?.value;
        if (!fId || !core.db.arc[fId]) return;
        const f = core.db.arc[fId];
        const map = {'CONTROPARTE':f.opp,'RG':f.rg,'N_RG':f.rg,'NUMERO_RG':f.rg,'TITOLO':f.title};
        Object.entries(map).forEach(([tag,val])=>{
            if (!val) return;
            const el = document.querySelector(`#form-container input[name="${tag}"]`);
            if (el && !el.value) el.value = val;
        });
        generator.updateLivePreview();
    },

    // ─────────────────────────────────────────────
    //  PREPARA FORM
    // ─────────────────────────────────────────────
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
        if(!sel.length){
            if(nameEl) nameEl.innerText='—';
            const lp=document.getElementById('live-preview');
            if(lp) lp.innerHTML='';
            requestAnimationFrame(()=>generator.setZoom(generator._previewZoom));
            return;
        }
        if(nameEl) nameEl.innerText=sel.map(s=>s.t.name).join(' + ');

        // Unisce i tag dichiarati nel template + quelli trovati nel body con singola graffa
        const allTags=Array.from(new Set(sel.flatMap(s=>{
            const fromFields=s.t.fields||[];
            const fromBody=s.t.body?generator.extractTags(s.t.body):[];
            return [...fromFields,...fromBody];
        })));
        allTags.forEach(tag=>{
            const pres=sel.filter(s=>{
                const inFields=(s.t.fields||[]).includes(tag);
                const inBody=s.t.body?generator.extractTags(s.t.body).includes(tag):false;
                return inFields||inBody;
            });
            const colClass=pres.length===1?`field-${pres[0].s}`:'';
            const isWide=/oggetto|motiv|testo|premess/i.test(tag);
            const isDate=/data|giorno|scadenz/i.test(tag);
            const isMoney=/import|somma|valore|capital/i.test(tag);
            const isLetters=/_in_lettere/i.test(tag);
            const div=document.createElement('div');
            div.className=isWide?'col-span-3':'col-span-1';
            let inputHTML;
            if(isLetters){
                inputHTML=`<div class="relative"><input type="text" name="${tag}" class="gen-input ${colClass}" value="${oldValues[tag]||''}" readonly style="background:#f0fdf4;color:#15803d;cursor:default;border-color:#bbf7d0;padding-right:46px;" placeholder="auto…"><span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:9px;font-weight:900;color:#16a34a;text-transform:uppercase;">auto</span></div>`;
            } else if(isDate){
                inputHTML=`<div class="relative"><input type="text" name="${tag}" class="gen-input ${colClass} pr-10" value="${oldValues[tag]||''}" onfocus="core.state.currentInput=this" oninput="generator.updateLivePreview()" placeholder="gg/mm/aaaa"><button type="button" onclick="generator.openDateModal('${tag}')" class="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600"><i class="fas fa-calendar-alt"></i></button></div>`;
            } else if(isMoney){
                inputHTML=`<div class="relative"><span class="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">€</span><input type="text" name="${tag}" class="gen-input ${colClass} pl-8" value="${oldValues[tag]||''}" onfocus="core.state.currentInput=this" oninput="generator.updateLivePreview()" placeholder="0,00"></div>`;
            } else {
                inputHTML=`<div class="relative"><input type="text" name="${tag}" class="gen-input ${colClass}" value="${oldValues[tag]||''}" onfocus="core.state.currentInput=this" oninput="generator.updateLivePreview()" placeholder="..."></div>`;
            }
            div.innerHTML=`<label class="gen-label flex items-center gap-1.5">${tag}${isLetters?'<i class="fas fa-magic text-emerald-300 text-[9px]"></i>':''}${isDate?'<i class="fas fa-calendar-alt text-blue-300 text-[9px]"></i>':''}${isMoney?'<i class="fas fa-euro-sign text-emerald-300 text-[9px]"></i>':''}</label>${inputHTML}`;
            fd.appendChild(div);
            if(cb) cb.innerHTML+=`<button class="tag-pill ${colClass}" onclick="event.preventDefault();core.insertTag('{{${tag}}}')">${tag}</button>`;
        });
        generator.updateLivePreview();
    },

    // ─────────────────────────────────────────────
    //  ZOOM
    // ─────────────────────────────────────────────
    setZoom: (val) => {
        generator._previewZoom=Math.min(150,Math.max(20,Math.round(val)));
        const z=generator._previewZoom/100;
        const lp=document.getElementById('live-preview');
        const sz=document.getElementById('preview-sizer');
        const lb=document.getElementById('zoom-label');
        if(!lp||!sz) return;
        lp.style.transform=`scale(${z})`;
        sz.style.width=(794*z)+'px';
        sz.style.height=(lp.scrollHeight*z)+'px';
        if(lb) lb.innerText=generator._previewZoom+'%';
    },

    // ─────────────────────────────────────────────
    //  ANTEPRIMA LIVE
    // ─────────────────────────────────────────────
    updateLivePreview: () => {
        generator.autoFillLetters();
        const lp=document.getElementById('live-preview');
        if(!lp) return;
        const form=document.getElementById('doc-form');
        const data=form?Object.fromEntries(new FormData(form)):{};
        let tpl=null;
        for(let i=1;i<=core.state.activeSlots;i++){
            const v=document.getElementById(`gen-select-${i}`)?.value;
            if(v&&core.db.tpl[v]){tpl=core.db.tpl[v];break;}
        }
        if(!tpl){
            lp.innerHTML='<div style="text-align:center;padding:80px 0;color:#cbd5e1;font-family:Inter,sans-serif;font-size:10pt;font-weight:700;letter-spacing:0.1em;">SELEZIONA UN MODELLO</div>';
            requestAnimationFrame(()=>generator.setZoom(generator._previewZoom));
            return;
        }
        const css=`<style>
            .pv-filled{color:#15803d;font-weight:700;background:#dcfce7;border-radius:2px;padding:0 2px;}
            .pv-tag{background:#fef3c7;color:#92400e;font-weight:900;border-radius:2px;padding:0 2px;outline:1px dashed #fbbf24;}
            p{margin:0 0 0.4em;text-align:justify;}
            h1{font-size:18pt;font-weight:900;margin:0.5em 0 0.25em;text-align:center;}
            h2{font-size:15pt;font-weight:900;margin:0.4em 0 0.2em;}
            h3{font-size:13pt;font-weight:900;margin:0.35em 0 0.15em;}
            strong,b{font-weight:900;}em,i{font-style:italic;}u{text-decoration:underline;}
            table{border-collapse:collapse;width:100%;margin:0.5em 0;}
            td,th{border:1px solid #334155;padding:4px 7px;vertical-align:top;}
            th{background:#f1f5f9;font-weight:900;}
            img{max-width:100%;height:auto;display:block;margin:6px auto;}
            ul{padding-left:1.4em;margin:0.3em 0;list-style:disc;}
            ol{padding-left:1.4em;margin:0.3em 0;list-style:decimal;}
        </style>`;
        const fill=(html)=>html.replace(/(<[^>]+>)|([^<]+)/g,(m,tag,txt)=>{
            if(tag)return tag;if(!txt)return'';
            return txt.replace(/\{\{([^}]+)\}\}|\{([^}]+)\}/g,(t,a,b)=>{
                const key=(a||b).trim(),val=data[key];
                return val&&val.trim()?`<span class="pv-filled">${val.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>`:`<span class="pv-tag">${t}</span>`;
            });
        });
        if(tpl.bodyHtml){ lp.innerHTML=css+fill(tpl.bodyHtml); }
        else if(tpl.body){
            const esc=tpl.body.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            const rendered=esc.replace(/\{\{([^}]+)\}\}|\{([^}]+)\}/g,(t,a,b)=>{
                const key=(a||b).trim(),val=data[key];
                return val&&val.trim()?`<span class="pv-filled">${val}</span>`:`<span class="pv-tag">${t}</span>`;
            });
            lp.innerHTML=css+`<div style="white-space:pre-wrap;">${rendered}</div>`;
        } else { lp.innerHTML='<div style="color:#cbd5e1;font-size:10pt;padding:20px 0;">Anteprima non disponibile</div>'; }
        requestAnimationFrame(()=>generator.setZoom(generator._previewZoom));
    },
    // ─────────────────────────────────────────────
    //  DATE MODAL
    // ─────────────────────────────────────────────
    openDateModal: (fieldName) => {
        generator._currentDateField=fieldName;
        document.getElementById('date-modal-field').innerText=fieldName;
        document.getElementById('date-picker').value='';
        document.getElementById('date-letters-preview').innerText='';
        document.getElementById('deadline-result').classList.add('hidden');
        document.getElementById('date-format-letters').checked=false;
        document.getElementById('date-modal').classList.remove('hidden');
    },
    updateDatePreview: () => {
        const val=document.getElementById('date-picker').value;
        if(!val) return;
        document.getElementById('date-letters-preview').innerText=generator.dateToLetters(new Date(val+'T00:00:00'));
    },
    addDays: (n) => {
        const picker=document.getElementById('date-picker');
        const base=picker.value?new Date(picker.value+'T00:00:00'):new Date();
        base.setDate(base.getDate()+n);
        picker.value=base.toISOString().split('T')[0];
        generator.updateDatePreview();
        const res=document.getElementById('deadline-result');
        res.innerText=`→ ${base.toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'})}`;
        res.classList.remove('hidden');
    },
    confirmDate: () => {
        const val=document.getElementById('date-picker').value;
        if(!val||!generator._currentDateField) return;
        const d=new Date(val+'T00:00:00');
        const inLetters=document.getElementById('date-format-letters').checked;
        const formatted=inLetters?generator.dateToLetters(d):d.toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'});
        const input=document.querySelector(`#form-container input[name="${generator._currentDateField}"]`);
        if(input){input.value=formatted;generator.updateLivePreview();}
        document.getElementById('date-modal').classList.add('hidden');
    },
    dateToLetters: (d) => {
        const days=['zero','uno','due','tre','quattro','cinque','sei','sette','otto','nove','dieci','undici','dodici','tredici','quattordici','quindici','sedici','diciassette','diciotto','diciannove','venti','ventuno','ventidue','ventitre','ventiquattro','venticinque','ventisei','ventisette','ventotto','ventinove','trenta','trentuno'];
        const months=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
        return `${days[d.getDate()]} ${months[d.getMonth()]} ${generator.yearToLetters(d.getFullYear())}`;
    },
    yearToLetters: (y) => {
        const u=['','uno','due','tre','quattro','cinque','sei','sette','otto','nove'];
        const te=['','dieci','venti','trenta','quaranta','cinquanta','sessanta','settanta','ottanta','novanta'];
        const h=['','cento','duecento','trecento','quattrocento','cinquecento','seicento','settecento','ottocento','novecento'];
        const th=['','mille','duemila','tremila','quattromila'];
        const t=Math.floor(y/1000),hh=Math.floor((y%1000)/100),ten=Math.floor((y%100)/10),un=y%10;
        let s=(th[t]||'')+(h[hh]||'');
        if(ten===1) s+=['dieci','undici','dodici','tredici','quattordici','quindici','sedici','diciassette','diciotto','diciannove'][un];
        else s+=(te[ten]||'')+(u[un]||'');
        return s;
    },

    // ─────────────────────────────────────────────
    //  SUBMIT / GENERA
    // ─────────────────────────────────────────────
    submit: async (event) => {
        event.preventDefault();
        const form=document.getElementById('doc-form');
        const data=Object.fromEntries(new FormData(form));
        data['ANNO']=new Date().getFullYear().toString();

        const sel=[];
        for(let i=1;i<=core.state.activeSlots;i++){
            const v=document.getElementById(`gen-select-${i}`)?.value;
            if(v&&core.db.tpl[v]) sel.push({key:v,tpl:core.db.tpl[v]});
        }
        if(!sel.length){core.showToast("Nessun modello selezionato.");return;}
        if(!core.dirHandle){core.showToast("Cartella di lavoro non aperta.");return;}

        const today=new Date().toLocaleDateString('it-IT');
        const generated=[];
        generator._pendingRendered=[];

        for(const item of sel){
            try{
                let blob;
                const safeName=item.tpl.name.replace(/[^a-zA-Z0-9_\-]/g,'_');
                const filename=`${safeName}_${today.replace(/\//g,'-')}.docx`;

                if(item.tpl.file){
                    const fh=await core.dirHandle.getFileHandle(item.tpl.file);
                    const buf=await (await fh.getFile()).arrayBuffer();
                    const zip=new PizZip(buf);
                    const doc=new Docxtemplater(zip,{paragraphLoop:true,linebreaks:true});
                    doc.render(data);
                    blob=doc.getZip().generate({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
                } else if(item.tpl.body){
                    blob=generator.buildDocxFromBody(item.tpl.body,data);
                } else { continue; }

                const link=document.createElement('a');
                link.href=URL.createObjectURL(blob);
                link.download=filename;
                link.click();
                URL.revokeObjectURL(link.href);

                generated.push({name:filename,template:item.tpl.name,date:today});

                // Testo compilato per PDF/Stampa (supporta {tag} e {{tag}})
                let filledText=item.tpl.body||'';
                filledText=generator.replaceTags(filledText, data).replace(/\[[^\]]+\]/g,'');
                generator._pendingRendered.push({name:filename,filledText,tplName:item.tpl.name});

            } catch(err){
                console.error(err);
                core.showToast(`Errore con "${item.tpl.name}": ${err.message}`);
            }
        }

        if(generated.length>0){
            core.save();
            generator._pendingDocs=generated;
            generator.renderFolderSelects();

            // Auto-match fascicolo dal form: cerca RG/FASCICOLO/N_RG nei campi compilati
            const _rgKeys = ['RG','N_RG','NUMERO_RG','FASCICOLO','N_FASCICOLO','NUM_FASCICOLO','N_PROC','NUMERO_PROC'];
            const _form2  = document.getElementById('doc-form');
            const _fData  = _form2 ? Object.fromEntries(new FormData(_form2)) : {};

            // 1° priorità: fascicolo già selezionato nel dropdown in alto
            let _matchId = document.getElementById('gen-folder-select')?.value || '';
            let _isNew   = false;
            let _rgFound = '';

            if (!_matchId) {
                // 2° cerca il valore RG digitato nel form
                for (const k of _rgKeys) {
                    if (_fData[k]?.trim()) { _rgFound = _fData[k].trim(); break; }
                }
                if (_rgFound) {
                    // Cerca tra i fascicoli esistenti per RG o titolo
                    const found = Object.entries(core.db.arc||{}).find(([,f]) =>
                        f.rg?.trim().toLowerCase()    === _rgFound.toLowerCase() ||
                        f.title?.trim().toLowerCase() === _rgFound.toLowerCase()
                    );
                    if (found) {
                        _matchId = found[0];  // trovato
                    } else {
                        _isNew = true;        // non esiste, verrà creato
                    }
                }
            }

            // Popola badge e select
            const _badge    = document.getElementById('auto-folder-badge');
            const _badgeTxt = document.getElementById('auto-folder-text');
            const _badgeSts = document.getElementById('auto-folder-status');
            const _ss       = document.getElementById('save-folder-select');

            if (_matchId) {
                if (_ss) _ss.value = _matchId;
                const _f = core.db.arc[_matchId];
                if (_badge)    _badge.classList.remove('hidden');
                if (_badgeTxt) _badgeTxt.innerText = _f.title + (_f.rg ? ' — RG ' + _f.rg : '');
                if (_badgeSts) { _badgeSts.innerText='trovato'; _badgeSts.className='text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-600'; }
            } else if (_isNew && _rgFound) {
                if (_ss) _ss.value = '';
                if (_badge)    _badge.classList.remove('hidden');
                if (_badgeTxt) _badgeTxt.innerText = 'Fascicolo "' + _rgFound + '" non trovato — verrà creato';
                if (_badgeSts) { _badgeSts.innerText='nuovo'; _badgeSts.className='text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-amber-100 text-amber-600'; }
                // Salva _rgFound per usarlo in confirmSaveToFolder
                generator._pendingFolderCreate = { rg: _rgFound, controparte: _fData['CONTROPARTE']||'', titolo: _fData['TITOLO']||_fData['TITOLO_FASCICOLO']||_rgFound };
            } else {
                if (_badge) _badge.classList.add('hidden');
                generator._pendingFolderCreate = null;
            }

            const desc=document.getElementById('output-modal-desc');
            if(desc) desc.innerText=`${generated.length} atto/i scaricato/i correttamente.`;
            document.getElementById('output-modal').classList.remove('hidden');
        }
    },

    // ─────────────────────────────────────────────
    //  STAMPA + PDF
    // ─────────────────────────────────────────────

    // Costruisce HTML stampabile dal testo compilato
    _buildPrintHTML: (extras='') => {
        if(!generator._pendingRendered.length) return null;
        const docs=generator._pendingRendered.map(d=>`
            <div class="doc-page">
                <h2 class="doc-title">${d.tplName}</h2>
                <div class="doc-body">${d.filledText.replace(/\n/g,'<br>')}</div>
                ${extras}
            </div>`).join('<div class="page-break"></div>');
        return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
<title>Atti Suite - Stampa</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
  * { font-family: 'Inter', serif; box-sizing: border-box; }
  body { margin: 0; padding: 0; background: white; }
  .doc-page { padding: 4cm 3.5cm; min-height: 29.7cm; position: relative; }
  .doc-title { font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 32px; }
  .doc-body { font-size: 12pt; line-height: 2; color: #1e293b; text-align: justify; white-space: pre-wrap; }
  .page-break { page-break-after: always; }
  .firma-area { position: absolute; bottom: 3cm; right: 3.5cm; text-align: center; }
  .firma-img { max-height: 80px; display: block; margin: 0 auto 8px; }
  .firma-line { border-top: 1px solid #94a3b8; width: 200px; margin: 0 auto; padding-top: 6px; font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
  .timbro-wrap { position: absolute; }
  .timbro-wrap.bottom-right  { bottom: 3cm; right: 3.5cm; }
  .timbro-wrap.bottom-left   { bottom: 3cm; left: 3.5cm; }
  .timbro-wrap.top-right     { top: 2cm;    right: 3.5cm; }
  .timbro-wrap.top-left      { top: 2cm;    left: 3.5cm; }
  .timbro-wrap.center        { bottom: 50%; right: 50%; transform: translate(50%, 50%); }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page-break { page-break-after: always; height: 0; }
  }
</style></head><body>${docs}</body></html>`;
    },

    printDocument: () => {
        const html=generator._buildPrintHTML();
        if(!html){core.showToast("Nessun documento da stampare.");return;}
        const w=window.open('','_blank','width=900,height=700');
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(()=>{w.print();},400);
    },

    exportPDF: () => {
        const html=generator._buildPrintHTML();
        if(!html){core.showToast("Nessun documento da esportare.");return;}
        const w=window.open('','_blank','width=900,height=700');
        w.document.write(html);
        w.document.close();
        w.focus();
        // Istruzione browser: salva come PDF dalla dialog di stampa
        core.showToast("Nella finestra di stampa scegli 'Salva come PDF'");
        setTimeout(()=>{w.print();},500);
    },

    applySignatureAndPrint: () => {
        const firma=core.db.firma?.signatureDataUrl;
        if(!firma){core.showToast("Nessuna firma salvata. Vai su 'Firma / Timbro'.");return;}
        const extra=`<div class="firma-area"><img src="${firma}" class="firma-img" alt="Firma"><div class="firma-line">Firma</div></div>`;
        const html=generator._buildPrintHTML(extra);
        if(!html) return;
        const w=window.open('','_blank','width=900,height=700');
        w.document.write(html);
        w.document.close();
        setTimeout(()=>{w.print();},400);
    },

    applyTimbroAndPrint: () => {
        const timbro=core.db.firma?.timbroDataUrl;
        if(!timbro){core.showToast("Nessun timbro salvato. Vai su 'Firma / Timbro'.");return;}
        const size=core.db.firma?.timbroSize||120;
        const pos=core.db.firma?.timbroPosition||'bottom-right';
        const extra=`<div class="timbro-wrap ${pos}"><img src="${timbro}" style="width:${size}px;opacity:0.85;" alt="Timbro"></div>`;
        const html=generator._buildPrintHTML(extra);
        if(!html) return;
        const w=window.open('','_blank','width=900,height=700');
        w.document.write(html);
        w.document.close();
        setTimeout(()=>{w.print();},400);
    },

    // ─────────────────────────────────────────────
    //  OUTPUT MODAL
    // ─────────────────────────────────────────────
    _pendingFolderCreate: null,

    confirmSaveToFolder: async () => {
        let fId = document.getElementById('save-folder-select')?.value;

        // Se nessun fascicolo selezionato ma c'è uno da creare (rilevato dal form)
        if (!fId && generator._pendingFolderCreate) {
            const p = generator._pendingFolderCreate;
            if (!core.db.arc) core.db.arc = {};
            fId = 'arc_' + Date.now();
            core.db.arc[fId] = {
                title : p.titolo || p.rg,
                rg    : p.rg,
                opp   : p.controparte,
                notes : 'Creato automaticamente dalla generazione atto',
                date  : new Date().toLocaleDateString('it-IT'),
                docs  : []
            };
            await core.save();
            generator.renderFolderSelects();
            core.showToast('Fascicolo "' + (p.titolo||p.rg) + '" creato!');
        }

        // Se ancora nessun fascicolo: chiedi nome
        if (!fId) {
            const name = prompt('Inserisci il numero/nome del fascicolo (vuoto = non archiviare):');
            if (!name || !name.trim()) { generator.closeOutputModal(); return; }
            // cerca se esiste già
            const existing = Object.entries(core.db.arc||{}).find(([,f]) =>
                f.rg?.trim().toLowerCase() === name.trim().toLowerCase() ||
                f.title?.trim().toLowerCase() === name.trim().toLowerCase()
            );
            if (existing) {
                fId = existing[0];
            } else {
                if (!core.db.arc) core.db.arc = {};
                fId = 'arc_' + Date.now();
                core.db.arc[fId] = { title: name.trim(), rg: name.trim(), opp: '', notes: '', date: new Date().toLocaleDateString('it-IT'), docs: [] };
                await core.save();
                generator.renderFolderSelects();
                core.showToast('Fascicolo "' + name.trim() + '" creato!');
            }
        }

        generator._pendingDocs.forEach(doc => archive.addDocToFolder(fId, doc));
        const saved = generator._pendingDocs.length;
        generator._pendingDocs = [];
        generator._pendingFolderCreate = null;
        generator.closeOutputModal();
        core.showToast(saved + ' atto/i archiviato/i in "' + (core.db.arc[fId]?.title||'') + '"');
    },

    closeOutputModal: () => {
        generator._pendingDocs=[];
        document.getElementById('output-modal').classList.add('hidden');
    },

    clear: () => {
        document.querySelectorAll('#form-container input').forEach(el=>{el.value='';});
        generator.updateLivePreview();
    },

    // ─────────────────────────────────────────────
    //  FIRMA DIGITALE — Canvas Pad
    // ─────────────────────────────────────────────
    _sigPad: { drawing:false, lastX:0, lastY:0 },

    initSignaturePad: () => {
        const canvas=document.getElementById('signature-canvas');
        if(!canvas||canvas._padInit) return;
        canvas._padInit=true;
        const ctx=canvas.getContext('2d');

        const resize=()=>{ canvas.width=canvas.offsetWidth; canvas.height=canvas.offsetHeight; ctx.strokeStyle='#1e293b'; ctx.lineWidth=2.5; ctx.lineCap='round'; ctx.lineJoin='round'; };
        resize();
        window.addEventListener('resize',resize);

        const getPos=(e)=>{
            const r=canvas.getBoundingClientRect();
            if(e.touches) return {x:e.touches[0].clientX-r.left,y:e.touches[0].clientY-r.top};
            return {x:e.clientX-r.left,y:e.clientY-r.top};
        };
        canvas.addEventListener('pointerdown',e=>{
            generator._sigPad.drawing=true;
            const p=getPos(e);
            generator._sigPad.lastX=p.x;
            generator._sigPad.lastY=p.y;
            ctx.beginPath();
            ctx.arc(p.x,p.y,1.2,0,Math.PI*2);
            ctx.fill();
        });
        canvas.addEventListener('pointermove',e=>{
            if(!generator._sigPad.drawing) return;
            const p=getPos(e);
            ctx.beginPath();
            ctx.moveTo(generator._sigPad.lastX,generator._sigPad.lastY);
            ctx.lineTo(p.x,p.y);
            ctx.stroke();
            generator._sigPad.lastX=p.x;
            generator._sigPad.lastY=p.y;
        });
        ['pointerup','pointerleave','pointercancel'].forEach(ev=>canvas.addEventListener(ev,()=>{generator._sigPad.drawing=false;}));
    },

    clearSignature: () => {
        const canvas=document.getElementById('signature-canvas');
        if(!canvas) return;
        canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
    },

    saveSignature: () => {
        const canvas=document.getElementById('signature-canvas');
        if(!canvas) return;
        const dataUrl=canvas.toDataURL('image/png');
        if(!core.db.firma) core.db.firma={};
        core.db.firma.signatureDataUrl=dataUrl;
        core.save();
        generator.restoreFirmaTab();
        core.showToast("Firma salvata!");
    },

    deleteSignature: () => {
        if(!confirm("Eliminare la firma salvata?")) return;
        if(core.db.firma) delete core.db.firma.signatureDataUrl;
        core.save();
        generator.clearSignature();
        generator.restoreFirmaTab();
        core.showToast("Firma eliminata.");
    },

    // ─────────────────────────────────────────────
    //  TIMBRO — Upload immagine
    // ─────────────────────────────────────────────
    triggerTimbroUpload: () => {
        document.getElementById('timbro-file-input').value='';
        document.getElementById('timbro-file-input').click();
    },

    uploadTimbro: (input) => {
        const file=input.files[0];
        if(!file) return;
        const reader=new FileReader();
        reader.onload=(e)=>{
            const dataUrl=e.target.result;
            if(!core.db.firma) core.db.firma={};
            core.db.firma.timbroDataUrl=dataUrl;
            core.db.firma.timbroSize=parseInt(document.getElementById('timbro-size')?.value||120);
            core.db.firma.timbroPosition=document.getElementById('timbro-position')?.value||'bottom-right';
            core.save();
            generator.restoreFirmaTab();
            core.showToast("Timbro caricato!");
        };
        reader.readAsDataURL(file);
    },

    deleteTimbro: () => {
        if(!confirm("Eliminare il timbro?")) return;
        if(core.db.firma) { delete core.db.firma.timbroDataUrl; }
        core.save();
        generator.restoreFirmaTab();
        core.showToast("Timbro rimosso.");
    },

    // Ripristina lo stato UI della tab firma/timbro
    restoreFirmaTab: () => {
        const firma=core.db.firma||{};
        const savedBadge=document.getElementById('firma-saved-preview');
        if(savedBadge) savedBadge.classList.toggle('hidden',!firma.signatureDataUrl);

        const timbroImg=document.getElementById('timbro-preview-img');
        const timbroWrap=document.getElementById('timbro-preview-wrap');
        const timbroDelBtn=document.getElementById('btn-delete-timbro');
        const timbroBadge=document.getElementById('timbro-saved-badge');
        if(firma.timbroDataUrl){
            if(timbroImg){ timbroImg.src=firma.timbroDataUrl; timbroImg.classList.remove('hidden'); }
            if(timbroWrap) timbroWrap.style.display='none';
            if(timbroDelBtn) timbroDelBtn.classList.remove('hidden');
            if(timbroBadge) timbroBadge.classList.remove('hidden');
        } else {
            if(timbroImg) timbroImg.classList.add('hidden');
            if(timbroWrap) timbroWrap.style.display='';
            if(timbroDelBtn) timbroDelBtn.classList.add('hidden');
            if(timbroBadge) timbroBadge.classList.add('hidden');
        }
        const sizeEl=document.getElementById('timbro-size');
        const posEl=document.getElementById('timbro-position');
        if(sizeEl&&firma.timbroSize) sizeEl.value=firma.timbroSize;
        if(posEl&&firma.timbroPosition) posEl.value=firma.timbroPosition;
    },

    // ─────────────────────────────────────────────
    //  EDITOR TEMPLATE
    // ─────────────────────────────────────────────
    renderTplList: () => {
        const list=document.getElementById('tpl-list');
        if(!list) return;
        const entries=Object.entries(core.db.tpl||{});
        if(!entries.length){ list.innerHTML='<p class="text-[11px] text-slate-300 text-center py-8 font-bold uppercase">Nessun modello</p>'; return; }
        list.innerHTML=entries.map(([id,tpl])=>`<div class="tpl-item ${generator._editingTplId===id?'selected':''}" onclick="generator.loadTplInEditor('${id}')"><span class="truncate">${tpl.name}</span><button onclick="event.stopPropagation();generator.deleteTpl('${id}')" class="text-slate-200 hover:text-red-500 ml-2 shrink-0"><i class="fas fa-trash text-[10px]"></i></button></div>`).join('');
    },

    newTemplate: () => {
        generator._editingTplId=null;
        const el=document.getElementById('tpl-name-input');
        const ed=document.getElementById('tpl-editor');
        if(el) el.value=''; if(ed) ed.innerHTML='';
        generator.onEditorInput();
        generator.renderTplList();
    },

    loadTplInEditor: (id) => {
        const tpl=core.db.tpl[id];
        if(!tpl) return;
        generator._editingTplId=id;
        const el=document.getElementById('tpl-name-input');
        const ed=document.getElementById('tpl-editor');
        if(el) el.value=tpl.name;
        if(ed){
            const html=(tpl.body||'')
                .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                .replace(/\n/g,'<br>')
                // Doppia graffa prima, poi singola (ordine importante)
                .replace(/\{\{([^}]+)\}\}/g,'<span class="tpl-tag" contenteditable="false">{{$1}}</span>')
                .replace(/\{([^{][^}]*)\}/g,'<span class="tpl-tag tpl-tag-single" contenteditable="false">{$1}</span>');            ed.innerHTML=html;
        }
        generator.onEditorInput();
        generator.renderTplList();
    },

    onEditorInput: () => {
        const text=generator.getEditorPlainText();
        const unique=new Set(generator.extractTags(text));
        const fc=document.getElementById('editor-field-count');
        const cc=document.getElementById('editor-char-count');
        if(fc) fc.innerText=`${unique.size} campo/i rilevato/i`;
        if(cc) cc.innerText=`${text.length} caratteri`;
    },

    getEditorPlainText: () => {
        const ed=document.getElementById('tpl-editor');
        if(!ed) return '';
        const clone=ed.cloneNode(true);
        clone.querySelectorAll('br').forEach(br=>br.replaceWith('\n'));
        return clone.innerText||clone.textContent||'';
    },

    editorFormat: (cmd) => { document.getElementById('tpl-editor')?.focus(); document.execCommand(cmd,false,null); },

    editorInsertTag: () => {
        document.getElementById('new-tag-name').value='';
        document.getElementById('insert-tag-modal').classList.remove('hidden');
        setTimeout(()=>document.getElementById('new-tag-name')?.focus(),100);
    },

    confirmInsertTag: () => {
        const name=document.getElementById('new-tag-name')?.value.trim();
        if(!name) return;
        document.getElementById('insert-tag-modal').classList.add('hidden');
        const ed=document.getElementById('tpl-editor');
        if(!ed) return;
        ed.focus();
        const span=document.createElement('span');
        span.className='tpl-tag'; span.contentEditable='false'; span.innerText=`{{${name}}}`;
        const sel=window.getSelection();
        if(sel&&sel.rangeCount>0){
            const range=sel.getRangeAt(0);
            range.deleteContents(); range.insertNode(span);
            range.setStartAfter(span); range.collapse(true);
            sel.removeAllRanges(); sel.addRange(range);
        } else { ed.appendChild(span); }
        generator.onEditorInput();
    },

    saveTplFromEditor: () => {
        const name=document.getElementById('tpl-name-input')?.value.trim();
        if(!name){alert('Inserisci un nome per il modello.');return;}
        const body=generator.getEditorPlainText();
        const fields=generator.extractTags(body);
        if(!core.db.tpl) core.db.tpl={};
        const id=generator._editingTplId||('tpl_'+Date.now());
        core.db.tpl[id]={name,body,fields,file:null};
        generator._editingTplId=id;
        core.save();
        generator.renderTplList();
        generator.renderSlots();
        core.showToast(`"${name}" salvato con ${fields.length} campi.`);
    },

    deleteTpl: (id) => {
        if(!confirm(`Eliminare "${core.db.tpl[id]?.name}"?`)) return;
        delete core.db.tpl[id];
        if(generator._editingTplId===id){
            generator._editingTplId=null;
            const ed=document.getElementById('tpl-editor'); if(ed) ed.innerHTML='';
            const el=document.getElementById('tpl-name-input'); if(el) el.value='';
        }
        core.save();
        generator.renderTplList();
        generator.renderSlots();
        generator.prepareForm();
        core.showToast("Modello eliminato.");
    },

    exportTplAsDocx: () => {
        const name=document.getElementById('tpl-name-input')?.value.trim()||'template';
        const body=generator.getEditorPlainText();
        if(!body.trim()){core.showToast("Editor vuoto.");return;}
        const blob=generator.buildDocxFromBody(body,{});
        const link=document.createElement('a');
        link.href=URL.createObjectURL(blob);
        link.download=name.replace(/\s/g,'_')+'.docx';
        link.click();
        URL.revokeObjectURL(link.href);
        core.showToast("Template esportato come .docx");
    },

    // ─────────────────────────────────────────────
    //  UPLOAD .DOCX
    // ─────────────────────────────────────────────
    triggerTemplateUpload: () => { document.getElementById('template-file-input').value=''; document.getElementById('template-file-input').click(); },

    uploadTemplate: async (input) => {
        const file=input.files[0];
        if(!file) return;
        if(!core.dirHandle){alert("Apri prima la cartella di lavoro.");return;}
        try{
            const buf=await file.arrayBuffer();
            const zip=new PizZip(buf);
            const xml=zip.file('word/document.xml')?.asText()||'';

            // 1. Estrai campi (strip XML → testo piatto → regex)
            const plainFlat=xml.replace(/<[^>]+>/g,'').replace(/\s+/g,' ');
            const fields=generator.extractTags(plainFlat);

            // 2. Body testuale per submit
            const paragraphs=xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g)||[];
            const bodyLines=paragraphs.map(p=>p.replace(/<[^>]+>/g,'').replace(/[ \t]+/g,' ').trim()).filter(l=>l.length>0);
            const body=bodyLines.join('\n');

            // 3. Converti docx → HTML con parser interno
            const bodyHtml=generator.docxToHtml(zip, xml);

            // 4. Salva file nella cartella
            const name=file.name.replace(/\.docx$/i,'');
            const fh=await core.dirHandle.getFileHandle(file.name,{create:true});
            const wr=await fh.createWritable();
            await wr.write(buf); await wr.close();

            if(!core.db.tpl) core.db.tpl={};
            core.db.tpl['tpl_'+Date.now()]={name,file:file.name,fields,body,bodyHtml};
            await core.save();
            generator.renderTplList();
            generator.renderSlots();
            core.showToast(`"${name}" caricato — ${fields.length} campi rilevati.`);
        } catch(err){console.error(err);alert("Errore: "+err.message);}
    },

    // ─────────────────────────────────────────────
    //  CONVERTITORE DOCX → HTML (nessuna dipendenza esterna)
    // ─────────────────────────────────────────────
    docxToHtml: (zip, xml) => {
        // Leggi i relationship per le immagini
        const relsXml = zip.file('word/_rels/document.xml.rels')?.asText() || '';
        const imgMap  = {};
        const relMatches = relsXml.matchAll(/Id="([^"]+)"[^>]+Target="([^"]+)"/g);
        for(const m of relMatches){
            const relId=m[1], target=m[2];
            if(/\.(png|jpg|jpeg|gif|bmp|tiff|wmf|emf)/i.test(target)){
                const path = target.startsWith('..') ? target.replace('../','') : 'word/'+target;
                try{
                    const imgData = zip.file(path)?.asUint8Array();
                    if(imgData){
                        const b64 = btoa(String.fromCharCode(...imgData));
                        const ext = target.split('.').pop().toLowerCase();
                        const mime = ext==='jpg'||ext==='jpeg'?'image/jpeg':ext==='gif'?'image/gif':'image/png';
                        imgMap[relId] = `data:${mime};base64,${b64}`;
                    }
                }catch(e){}
            }
        }

        // Leggi gli stili
        const stylesXml = zip.file('word/styles.xml')?.asText() || '';

        // Helper: determina il livello heading da uno stile
        const getHeadingLevel = (styleId) => {
            if(!styleId) return 0;
            const m = stylesXml.match(new RegExp(`<w:style[^>]*w:styleId="${styleId}"[^>]*>[\\s\\S]*?<\\/w:style>`));
            if(!m) return 0;
            const baseOn = m[0].match(/<w:basedOn w:val="([^"]+)"/)?.[1]||'';
            const name   = m[0].match(/<w:name w:val="([^"]+)"/)?.[1]?.toLowerCase()||'';
            if(/heading 1|titolo 1|title/i.test(name)) return 1;
            if(/heading 2|titolo 2/i.test(name)) return 2;
            if(/heading 3|titolo 3/i.test(name)) return 3;
            return 0;
        };

        // Parser di un singolo run <w:r>
        const parseRun = (runXml) => {
            const rPr  = runXml.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/)?.[1]||'';
            const bold  = /<w:b(?:\s[^\/]*)?\/?>/.test(rPr) && !/<w:b w:val="0"/.test(rPr);
            const ital  = /<w:i(?:\s[^\/]*)?\/?>/.test(rPr) && !/<w:i w:val="0"/.test(rPr);
            const under = /<w:u /.test(rPr) && !/<w:u w:val="none"/.test(rPr);

            // Testo (gestisce più w:t nel run)
            let text = '';
            const wtMatches = [...runXml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)];
            text = wtMatches.map(m=>m[1]).join('');
            // Escape HTML ma NON i tag {campo}
            text = text.replace(/&(?!{)/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

            if(!text) return '';
            if(under) text=`<u>${text}</u>`;
            if(ital)  text=`<em>${text}</em>`;
            if(bold)  text=`<strong>${text}</strong>`;
            return text;
        };

        // Parser di un paragrafo <w:p>
        const parseParagraph = (pXml) => {
            const pPr     = pXml.match(/<w:pPr>([\s\S]*?)<\/w:pPr>/)?.[1]||'';
            const styleId = pPr.match(/<w:pStyle w:val="([^"]+)"/)?.[1]||'';
            const jc      = pPr.match(/<w:jc w:val="([^"]+)"/)?.[1]||'';
            const level   = getHeadingLevel(styleId);

            // Immagini
            const imgs = [];
            const drawMatches = [...pXml.matchAll(/<w:drawing>([\s\S]*?)<\/w:drawing>/g)];
            for(const d of drawMatches){
                const rId = d[1].match(/r:embed="([^"]+)"/)?.[1];
                if(rId && imgMap[rId]) imgs.push(`<img src="${imgMap[rId]}" style="max-width:100%;height:auto;display:block;margin:6px auto;">`);
            }

            // Testo dei run
            const runs = [...pXml.matchAll(/<w:r[ >]([\s\S]*?)<\/w:r>/g)];
            let content = runs.map(m=>parseRun(m[0])).join('');

            // Aggiungi immagini
            if(imgs.length) content = imgs.join('')+(content?`<br>${content}`:'');
            if(!content.trim()&&!imgs.length) return '<p>&nbsp;</p>';

            const align = jc==='center'?'text-align:center':jc==='right'?'text-align:right':jc==='both'||jc==='distribute'?'text-align:justify':'';
            const style = align?` style="${align}"`:'';

            if(level===1) return `<h1${style}>${content}</h1>`;
            if(level===2) return `<h2${style}>${content}</h2>`;
            if(level===3) return `<h3${style}>${content}</h3>`;
            return `<p${style}>${content}</p>`;
        };

        // Parser di una cella <w:tc>
        const parseCell = (tcXml) => {
            const pars = [...tcXml.matchAll(/<w:p[ >]([\s\S]*?)<\/w:p>/g)].map(m=>parseParagraph(m[0])).join('');
            return `<td>${pars}</td>`;
        };

        // Parser di una riga <w:tr>
        const parseRow = (trXml) => {
            const cells = [...trXml.matchAll(/<w:tc>([\s\S]*?)<\/w:tc>/g)].map(m=>parseCell(m[0])).join('');
            const isHeader = /<w:tblHeader\/>/.test(trXml);
            return isHeader ? `<tr>${cells.replace(/<td>/g,'<th>').replace(/<\/td>/g,'</th>')}</tr>` : `<tr>${cells}</tr>`;
        };

        // Parser di una tabella <w:tbl>
        const parseTable = (tblXml) => {
            const rows = [...tblXml.matchAll(/<w:tr[ >]([\s\S]*?)<\/w:tr>/g)].map(m=>parseRow(m[0])).join('');
            return `<table>${rows}</table>`;
        };

        // ── MAIN: scorri il body elemento per elemento ──
        const bodyXml = xml.match(/<w:body>([\s\S]*?)<\/w:body>/)?.[1] || xml;
        let html = '';
        let pos  = 0;
        const bodyLen = bodyXml.length;

        while(pos < bodyLen){
            // Tabella
            const tblStart = bodyXml.indexOf('<w:tbl',pos);
            const pStart   = bodyXml.indexOf('<w:p ',pos);
            const pStart2  = bodyXml.indexOf('<w:p>',pos);
            const nextP    = pStart2<0?pStart:(pStart<0?pStart2:Math.min(pStart,pStart2));

            if(tblStart>=0 && (nextP<0 || tblStart<nextP)){
                const tblEnd = bodyXml.indexOf('</w:tbl>',tblStart)+8;
                html += parseTable(bodyXml.slice(tblStart,tblEnd));
                pos = tblEnd;
            } else if(nextP>=0){
                const pEnd = bodyXml.indexOf('</w:p>',nextP)+6;
                html += parseParagraph(bodyXml.slice(nextP,pEnd));
                pos = pEnd;
            } else {
                break;
            }
        }
        return html;
    },

    // ─────────────────────────────────────────────
    //  BUILD DOCX DA CORPO TESTO
    // ─────────────────────────────────────────────
    buildDocxFromBody: (body,data) => {
        // Sostituisce sia {{campo}} che {campo}
        let text = generator.replaceTags(body, data).replace(/\[[^\]]+\]/g,'');
        const escaped=text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .split('\n').map(l=>`<w:p><w:r><w:t xml:space="preserve">${l}</w:t></w:r></w:p>`).join('');
        const docXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${escaped}<w:sectPr/></w:body></w:document>`;
        const zip=new PizZip();
        zip.file('word/document.xml',docXml);
        zip.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
        zip.file('_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
        zip.file('word/_rels/document.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);
        return zip.generate({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
    },

};