/* --- modules/generator/submit/submit.js --- */
Object.assign(generator, {

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

            // Auto-match fascicolo dal form (RG/FASCICOLO/N_RG)
            const _rgKeys=['RG','N_RG','NUMERO_RG','FASCICOLO','N_FASCICOLO','NUM_FASCICOLO','N_PROC','NUMERO_PROC'];
            const _form2=document.getElementById('doc-form');
            const _fData=_form2?Object.fromEntries(new FormData(_form2)):{};
            let _matchId=document.getElementById('gen-folder-select')?.value||'';
            let _isNew=false, _rgFound='';

            if(!_matchId){
                for(const k of _rgKeys){ if(_fData[k]?.trim()){_rgFound=_fData[k].trim();break;} }
                if(_rgFound){
                    const found=Object.entries(core.db.arc||{}).find(([,f])=>
                        f.rg?.trim().toLowerCase()===_rgFound.toLowerCase()||
                        f.title?.trim().toLowerCase()===_rgFound.toLowerCase()
                    );
                    if(found){ _matchId=found[0]; } else { _isNew=true; }
                }
            }

            const _badge=document.getElementById('auto-folder-badge');
            const _badgeTxt=document.getElementById('auto-folder-text');
            const _badgeSts=document.getElementById('auto-folder-status');
            const _ss=document.getElementById('save-folder-select');

            if(_matchId){
                if(_ss) _ss.value=_matchId;
                const _f=core.db.arc[_matchId];
                if(_badge) _badge.classList.remove('hidden');
                if(_badgeTxt) _badgeTxt.innerText=_f.title+(_f.rg?' — RG '+_f.rg:'');
                if(_badgeSts){_badgeSts.innerText='trovato';_badgeSts.className='text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-600';}
            } else if(_isNew&&_rgFound){
                if(_ss) _ss.value='';
                if(_badge) _badge.classList.remove('hidden');
                if(_badgeTxt) _badgeTxt.innerText='Fascicolo "'+_rgFound+'" non trovato — verrà creato';
                if(_badgeSts){_badgeSts.innerText='nuovo';_badgeSts.className='text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-amber-100 text-amber-600';}
                generator._pendingFolderCreate={rg:_rgFound,controparte:_fData['CONTROPARTE']||'',titolo:_fData['TITOLO']||_fData['TITOLO_FASCICOLO']||_rgFound};
            } else {
                if(_badge) _badge.classList.add('hidden');
                generator._pendingFolderCreate=null;
            }

            const desc=document.getElementById('output-modal-desc');
            if(desc) desc.innerText=`${generated.length} atto/i scaricato/i correttamente.`;
            document.getElementById('output-modal').classList.remove('hidden');
        }
    },

    // ─────────────────────────────────────────────
    confirmSaveToFolder: async () => {
        let fId=document.getElementById('save-folder-select')?.value;

        // Se c'è un fascicolo da creare (rilevato automaticamente dal form)
        if(!fId&&generator._pendingFolderCreate){
            const p=generator._pendingFolderCreate;
            if(!core.db.arc) core.db.arc={};
            fId='arc_'+Date.now();
            core.db.arc[fId]={
                title:p.titolo||p.rg, rg:p.rg, opp:p.controparte,
                notes:'Creato automaticamente dalla generazione atto',
                date:new Date().toLocaleDateString('it-IT'), docs:[]
            };
            await core.save();
            generator.renderFolderSelects();
            core.showToast('Fascicolo "'+( p.titolo||p.rg)+'" creato!');
        }

        // Se ancora nessun fascicolo → chiedi nome con prompt
        if(!fId){
            const name=prompt('Inserisci il numero/nome del fascicolo (vuoto = non archiviare):');
            if(!name||!name.trim()){generator.closeOutputModal();return;}
            const existing=Object.entries(core.db.arc||{}).find(([,f])=>
                f.rg?.trim().toLowerCase()===name.trim().toLowerCase()||
                f.title?.trim().toLowerCase()===name.trim().toLowerCase()
            );
            if(existing){
                fId=existing[0];
            } else {
                if(!core.db.arc) core.db.arc={};
                fId='arc_'+Date.now();
                core.db.arc[fId]={title:name.trim(),rg:name.trim(),opp:'',notes:'',date:new Date().toLocaleDateString('it-IT'),docs:[]};
                await core.save();
                generator.renderFolderSelects();
                core.showToast('Fascicolo "'+name.trim()+'" creato!');
            }
        }

        generator._pendingDocs.forEach(doc=>archive.addDocToFolder(fId,doc));
        const saved=generator._pendingDocs.length;
        generator._pendingDocs=[];
        generator._pendingFolderCreate=null;
        generator.closeOutputModal();
        core.showToast(saved+' atto/i archiviato/i in "'+(core.db.arc[fId]?.title||'')+'"');
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
});
