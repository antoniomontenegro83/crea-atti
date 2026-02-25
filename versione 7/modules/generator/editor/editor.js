/* --- modules/generator/editor/editor.js --- */
Object.assign(generator, {

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
});
