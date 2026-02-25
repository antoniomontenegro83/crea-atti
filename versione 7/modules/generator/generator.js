/* --- modules/generator/generator.js --- */

// Fix CDN: garantisce Docxtemplater e PizZip disponibili
if (typeof Docxtemplater === 'undefined' && typeof docxtemplater !== 'undefined') window.Docxtemplater = docxtemplater;
if (typeof PizZip         === 'undefined' && typeof pizzip         !== 'undefined') window.PizZip         = pizzip;

const generator = {
    // ── Stato ──────────────────────────────────────────────────
    _pendingDocs: [],
    _pendingRendered: [],
    _editingTplId: null,
    _currentDateField: null,
    _previewZoom: 50,
    _pendingFolderCreate: null,

    // ── HTML template ──────────────────────────────────────────
    html: `
        <div class="h-full flex flex-col overflow-hidden">

            <!-- NAV tabs -->
            <div class="flex gap-1 bg-slate-100 p-1 rounded-2xl mb-5 shrink-0 self-start">
                <button onclick="generator.tab('compile')"  id="tab-compile"  class="gen-tab active px-6 py-2.5 rounded-xl font-black uppercase text-[11px] tracking-widest transition-all"><i class="fas fa-file-signature mr-2"></i>Compila Atto</button>
                <button onclick="generator.tab('editor')"   id="tab-editor"   class="gen-tab px-6 py-2.5 rounded-xl font-black uppercase text-[11px] tracking-widest transition-all"><i class="fas fa-pencil-alt mr-2"></i>Editor Template</button>
                <button onclick="generator.tab('contacts')" id="tab-contacts" class="gen-tab px-6 py-2.5 rounded-xl font-black uppercase text-[11px] tracking-widest transition-all"><i class="fas fa-address-book mr-2"></i>Rubrica</button>
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
                                <div class="w-px h-6 bg-slate-100"></div>
                                <label class="text-[10px] font-black uppercase text-slate-400">N° Atto</label>
                                <input type="number" id="gen-act-number" min="1" class="w-16 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black text-[13px] text-slate-700 outline-none text-center" value="1">
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
                <div class="flex-[1.2] flex flex-col gap-5 overflow-hidden min-w-[220px]">
                    <div class="bg-white p-6 rounded-[2rem] border shadow-sm flex-1 flex flex-col overflow-hidden">
                        <div class="flex justify-between items-center mb-4 shrink-0">
                            <h4 class="font-black text-[11px] uppercase text-slate-400 tracking-widest">Anteprima Live</h4>
                            <span id="preview-tpl-name" class="text-[10px] font-bold text-blue-400 truncate max-w-[100px]">—</span>
                        </div>
                        <div id="live-preview" class="flex-1 overflow-y-auto bg-slate-100 rounded-xl p-3 border border-slate-200"></div>
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

            <!-- ══════════════ TAB: RUBRICA ══════════════ -->
            <div id="tab-panel-contacts" class="flex-1 flex gap-6 overflow-hidden hidden">
                <div class="w-[280px] shrink-0 bg-white p-7 rounded-[2rem] border shadow-sm flex flex-col gap-4 overflow-y-auto">
                    <h4 class="font-black text-base uppercase text-slate-800 tracking-tight shrink-0">Nuovo Contatto</h4>
                    <div><label class="gen-label">Nome / Ragione Sociale *</label><input type="text" id="ct-name" class="gen-input" placeholder="Mario Rossi"></div>
                    <div><label class="gen-label">Codice Fiscale / P.IVA</label><input type="text" id="ct-cf" class="gen-input" placeholder="RSSMRA80A01H501Z"></div>
                    <div><label class="gen-label">Indirizzo</label><input type="text" id="ct-address" class="gen-input" placeholder="Via Roma 1, Milano"></div>
                    <div class="grid grid-cols-2 gap-3">
                        <div><label class="gen-label">Telefono</label><input type="text" id="ct-phone" class="gen-input" placeholder="333 1234567"></div>
                        <div><label class="gen-label">Email</label><input type="text" id="ct-email" class="gen-input" placeholder="mario@email.it"></div>
                    </div>
                    <div>
                        <label class="gen-label">Tipo</label>
                        <select id="ct-type" class="gen-input">
                            <option>Cliente</option><option>Controparte</option><option>Perito / CTU</option><option>Altro</option>
                        </select>
                    </div>
                    <button onclick="generator.saveContact()" class="bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[11px] hover:bg-blue-600 transition-all flex items-center justify-center gap-2 mt-auto shrink-0">
                        <i class="fas fa-user-plus"></i> Aggiungi
                    </button>
                </div>
                <div class="flex-1 flex flex-col gap-4 overflow-hidden">
                    <div class="bg-white px-5 py-3 rounded-2xl border flex items-center gap-4 shrink-0">
                        <i class="fas fa-search text-slate-300"></i>
                        <input type="text" id="contact-search" oninput="generator.renderContacts()" placeholder="Cerca nella rubrica..." class="flex-1 outline-none font-bold text-[14px] text-slate-700 bg-transparent">
                        <span id="contact-count" class="text-[11px] font-black text-slate-300 uppercase">0 contatti</span>
                    </div>
                    <div id="contacts-grid" class="flex-1 overflow-y-auto grid grid-cols-2 gap-4 pr-2 content-start"></div>
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
            .contact-card { background:white; border:1px solid #e2e8f0; border-radius:20px; padding:16px; transition:all 0.2s; }
            .contact-card:hover { border-color:#93c5fd; box-shadow:0 4px 16px rgba(0,0,0,0.06); }
            .autocomplete-dropdown { position:absolute; left:0; right:0; top:100%; margin-top:4px; background:white; border:1px solid #e2e8f0; border-radius:14px; box-shadow:0 8px 24px rgba(0,0,0,0.1); z-index:50; max-height:180px; overflow-y:auto; }
        </style>
    `,

    // ─────────────────────────────────────────────
    //  HELPER TAG — supporta {campo} e {{campo}}
    // ─────────────────────────────────────────────

    // ── Utility tag ────────────────────────────────────────────
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

};
