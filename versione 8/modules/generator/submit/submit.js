/* --- modules/generator/submit/submit.js --- */
Object.assign(generator, {

    // ─────────────────────────────────────────────────────────────────────────
    //  FIX TAG SPEZZATI
    //  Word spezza {{TAG}} su più run XML — fix in 4 passi su TUTTI i .xml del docx
    // ─────────────────────────────────────────────────────────────────────────
    _fixDocxTags: (xml) => {

        // 1. Rimuovi elementi rumore che Word inietta nelle graffe
        xml = xml
            .replace(/<w:proofErr[^>]*\/?>/g, '')
            .replace(/<w:proofErr[^>]*>[\s\S]*?<\/w:proofErr>/g, '')
            .replace(/<w:bookmarkStart[^>]*\/?>/g, '')
            .replace(/<w:bookmarkEnd[^>]*\/?>/g, '')
            .replace(/<w:rPrChange[\s\S]*?<\/w:rPrChange>/g, '');

        // 2. Strip XML inline dentro {{ }} già chiusi nello stesso nodo
        xml = xml.replace(/\{\{([\s\S]{1,300}?)\}\}/g, (m, inner) => {
            if (!inner.includes('<')) return m;
            const name = inner.replace(/<[^>]+>/g, '').replace(/[\s\u00A0]+/g, '_').trim();
            return name ? `{{${name}}}` : '';
        });

        // 3. Riassembla tag spezzati tra più w:t / w:r (per paragrafo)
        xml = xml.replace(/<w:p(?:[ >])[\s\S]*?<\/w:p>/g, para => {
            const flat = para.replace(/<[^>]+>/g, '');
            if (!flat.includes('{{')) return para;

            const wts = [...para.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)];
            let depth = 0, needsFix = false;
            for (const n of wts) {
                let t = n[1], i = 0;
                while (i < t.length - 1) {
                    if      (t[i] === '{' && t[i+1] === '{')  { depth++; i += 2; }
                    else if (t[i] === '}' && t[i+1] === '}')  { depth--; i += 2; }
                    else i++;
                }
                if (depth !== 0) { needsFix = true; break; }
            }
            if (!needsFix) return para;

            let result = para, iter = 0;
            while (iter++ < 60) {
                const openRe = /<w:t(?:\s[^>]*)?>([^<]*\{\{(?:(?!\}\})[^<])*)<\/w:t>/;
                const m1 = result.match(openRe);
                if (!m1) break;

                const m1Idx   = result.indexOf(m1[0]);
                const preTag  = m1[1].slice(0, m1[1].indexOf('{{'));
                const partial = m1[1].slice(m1[1].indexOf('{{') + 2);

                const afterM1 = result.slice(m1Idx + m1[0].length);
                const closeRe = /<w:t(?:\s[^>]*)?>([^<]*)\}\}([^<]*)<\/w:t>/;
                const m2      = afterM1.match(closeRe);
                if (!m2) {
                    result = result.slice(0, m1Idx) +
                             m1[0].replace(/\{\{[^}]*/g, '') +
                             result.slice(m1Idx + m1[0].length);
                    continue;
                }

                const between    = afterM1.slice(0, afterM1.indexOf(m2[0]));
                const middleText = [...between.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)]
                                       .map(x => x[1]).join('');
                const tagName    = (partial + middleText + m2[1]).replace(/[\s\u00A0]+/g, '_').trim();
                const afterTag   = m2[2];

                const beforeM1 = result.slice(Math.max(0, m1Idx - 600), m1Idx);
                const rPrAll   = beforeM1.match(/<w:rPr>[\s\S]*?<\/w:rPr>/g);
                const rPr      = rPrAll ? rPrAll[rPrAll.length - 1] : '';

                const m2InResult = result.indexOf(m2[0], m1Idx);
                const spanEnd    = m2InResult + m2[0].length;

                let repl = '';
                if (preTag)   repl += `<w:r>${rPr}<w:t xml:space="preserve">${preTag}</w:t></w:r>`;
                if (tagName)  repl += `<w:r>${rPr}<w:t>{{${tagName}}}</w:t></w:r>`;
                if (afterTag) repl += `<w:r>${rPr}<w:t xml:space="preserve">${afterTag}</w:t></w:r>`;

                result = result.slice(0, m1Idx) + repl + result.slice(spanEnd);
            }
            return result;
        });

        // 4. Safety net: rimuovi {{ o }} orfani rimasti
        xml = xml.replace(/<w:t(?:\s[^>]*)?>([^<]+)<\/w:t>/g, (match, text) => {
            if (!text.includes('{{') && !text.includes('}}')) return match;
            let clean = text
                .replace(/\{\{(?:(?!\}\})[\s\S])*$/g, '')
                .replace(/^(?:(?!\{\{)[\s\S])*\}\}/g, '');
            return match.replace(`>${text}<`, `>${clean}<`);
        });

        return xml;
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  SUBMIT — Genera atti
    // ─────────────────────────────────────────────────────────────────────────
    submit: async (event) => {
        event.preventDefault();
        const form = document.getElementById('doc-form');
        const data = Object.fromEntries(new FormData(form));
        data['ANNO'] = new Date().getFullYear().toString();

        const sel = [];
        for (let i = 1; i <= core.state.activeSlots; i++) {
            const v = document.getElementById(`gen-select-${i}`)?.value;
            if (v && core.db.tpl[v]) sel.push({ key: v, tpl: core.db.tpl[v] });
        }
        if (!sel.length)     { core.showToast('Nessun modello selezionato.'); return; }
        if (!core.dirHandle) { core.showToast('Cartella di lavoro non aperta.'); return; }

        const today     = new Date().toLocaleDateString('it-IT');
        const generated = [];
        generator._pendingRendered = [];
        generator._pendingBlobs    = {};

        for (const item of sel) {
            try {
                let blob;
                const safeName = item.tpl.name.replace(/[^a-zA-Z0-9_\-]/g, '_');
                const filename  = `${safeName}_${today.replace(/\//g, '-')}.docx`;

                if (item.tpl.file) {
                    const fh  = await core.dirHandle.getFileHandle(item.tpl.file);
                    const buf = await (await fh.getFile()).arrayBuffer();
                    const zip = new PizZip(buf);

                    // Fix tag spezzati su tutti i file XML del docx
                    Object.keys(zip.files).forEach(path => {
                        if (!path.endsWith('.xml')) return;
                        if (/styles|settings|theme|fontTable|webSettings/i.test(path)) return;
                        try {
                            const file = zip.file(path);
                            if (!file) return;
                            const original = file.asText();
                            if (!original.includes('{{')) return;
                            zip.file(path, generator._fixDocxTags(original));
                        } catch (e) { /* ignora file non leggibili */ }
                    });

                    let doc;
                    try {
                        doc = new Docxtemplater(zip, {
                            paragraphLoop : true,
                            linebreaks    : true,
                            nullGetter    : () => '',
                            delimiters    : { start: '{{', end: '}}' }
                        });
                    } catch (compileErr) {
                        const errs    = compileErr.properties?.errors || [];
                        const tagList = [...new Set(
                            errs.map(e => e.properties?.tag || e.properties?.id || e.message).filter(Boolean)
                        )].join(', ');
                        console.warn('Compile error tags:', tagList || compileErr.message);
                        console.warn('Errore completo:', compileErr);
                        core.showToast(`Errore template "${item.tpl.name}" — vedi console F12`);
                        continue;
                    }

                    try {
                        doc.render(data);
                    } catch (renderErr) {
                        const errs    = renderErr.properties?.errors || [];
                        const tagList = [...new Set(
                            errs.map(e => e.properties?.tag || e.properties?.id || e.message).filter(Boolean)
                        )].join(', ');
                        console.error('Render error tags:', tagList || renderErr.message);
                        core.showToast(`Errore render "${item.tpl.name}": ${tagList || renderErr.message}`);
                        continue;
                    }

                    blob = doc.getZip().generate({
                        type     : 'blob',
                        mimeType : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    });

                } else if (item.tpl.body) {
                    blob = generator.buildDocxFromBody(item.tpl.body, data);
                } else {
                    continue;
                }

                const link    = document.createElement('a');
                link.href     = URL.createObjectURL(blob);
                link.download = filename;
                link.click();
                URL.revokeObjectURL(link.href);

                generated.push({ name: filename, template: item.tpl.name, date: today });
                generator._pendingBlobs[filename] = blob;

                let filledText = item.tpl.body || '';
                filledText = generator.replaceTags(filledText, data).replace(/\[[^\]]+\]/g, '');
                generator._pendingRendered.push({ name: filename, filledText, tplName: item.tpl.name });

            } catch (err) {
                console.error(err);
                core.showToast(`Errore con "${item.tpl.name}": ${err.message}`);
            }
        }

        if (generated.length > 0) {
            core.save();
            generator._pendingDocs = generated;

            // ── Leggi numero fascicolo dal form (cerca campi comuni) ──────────
            const form2   = document.getElementById('doc-form');
            const fData   = form2 ? Object.fromEntries(new FormData(form2)) : {};
            const rgKeys  = ['RG','N_RG','NUMERO_RG','FASCICOLO','N_FASCICOLO','NUM_FASCICOLO','N_PROC','NUMERO_PROC'];
            let fascNum   = '';
            for (const k of rgKeys) {
                if (fData[k]?.trim()) { fascNum = fData[k].trim(); break; }
            }
            // Anche da input con name esatto "Fascicolo" / "fascicolo"
            if (!fascNum) {
                const el = document.querySelector(
                    '#form-container input[name="Fascicolo"],' +
                    '#form-container input[name="fascicolo"],' +
                    '#form-container input[name="FASCICOLO"]'
                );
                fascNum = (el?.value || '').trim();
            }

            // Trova o crea fascicolo in DB (lo crea subito se non esiste)
            const fascResult = fascNum ? archive.findOrCreateByRg(fascNum) : null;
            generator._autoFasc = fascResult;

            generator.renderFolderSelects();

            // Pre-seleziona nel dropdown del modal
            const ss = document.getElementById('save-folder-select');
            if (ss) {
                if (fascResult)      ss.value = fascResult.id;
                else {
                    const pre = document.getElementById('gen-folder-select')?.value || '';
                    if (pre) ss.value = pre;
                }
            }

            // Messaggio nel modal
            const desc = document.getElementById('output-modal-desc');
            if (desc) {
                if (fascNum && fascResult) {
                    desc.innerHTML = fascResult.isNew
                        ? `<span style="color:#16a34a;font-weight:900">${generated.length} atto/i generato/i.<br>Fascicolo <b>${fascNum}</b> creato.</span>`
                        : `<span style="color:#2563eb;font-weight:900">${generated.length} atto/i generato/i.<br>Fascicolo <b>${fascNum}</b> trovato.</span>`;
                } else {
                    desc.innerText = `${generated.length} atto/i scaricato/i correttamente.`;
                }
            }
            document.getElementById('output-modal').classList.remove('hidden');
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  ARCHIVIA — Salva nel fascicolo rilevato (o selezionato manualmente)
    //  Priorità:
    //    1. _autoFasc (fascicolo rilevato automaticamente dal form)
    //    2. save-folder-select (selezione manuale nel modal)
    //    3. prompt con nome → crea fascicolo al volo
    // ─────────────────────────────────────────────────────────────────────────
    confirmSaveToFolder: async () => {

        // 1. Determina il fascicolo di destinazione
        let fId = generator._autoFasc?.id
               || document.getElementById('save-folder-select')?.value
               || '';

        // 2. Se ancora niente → crea al volo con prompt
        if (!fId) {
            const name = prompt('Inserisci il numero/nome del fascicolo:');
            if (!name || !name.trim()) { generator.closeOutputModal(); return; }

            const existing = Object.entries(core.db.arc || {}).find(([, f]) =>
                f.rg?.trim().toLowerCase()    === name.trim().toLowerCase() ||
                f.title?.trim().toLowerCase() === name.trim().toLowerCase()
            );

            if (existing) {
                fId = existing[0];
            } else {
                if (!core.db.arc) core.db.arc = {};
                fId = 'arc_' + Date.now();
                core.db.arc[fId] = {
                    title : name.trim(),
                    rg    : name.trim(),
                    opp   : '',
                    notes : '',
                    date  : new Date().toLocaleDateString('it-IT'),
                    docs  : []
                };
                await core.save();
                generator.renderFolderSelects();
                core.showToast(`Fascicolo "${name.trim()}" creato!`);
            }
        }

        // Sicurezza: verifica che il fascicolo esista in DB
        if (!core.db.arc[fId]) { generator.closeOutputModal(); return; }

        const f = core.db.arc[fId];

        // 3. Aggiungi documenti al fascicolo nel DB
        let saved = 0;
        generator._pendingDocs.forEach(doc => { if (archive.addDocToFolder(fId, doc)) saved++; });

        // 4. Salva file fisici su disco in Fascicoli/{RG}/
        //    archive.saveToDisk crea la cartella se non esiste (File System Access API)
        const blobs = generator._pendingBlobs || {};
        if (Object.keys(blobs).length > 0 && core.dirHandle) {
            const ok = await archive.saveToDisk(fId, blobs);
            if (ok) {
                core.showToast(`${saved} atto/i salvati in Fascicoli/${f.rg || f.title}/`);
            }
        } else {
            core.showToast(`${saved} atto/i archiviato/i in "${f.title}"`);
        }

        // 5. Reset stato
        generator._pendingDocs  = [];
        generator._pendingBlobs = {};
        generator._autoFasc     = null;
        generator.closeOutputModal();
        core.save();
    },

    closeOutputModal: () => {
        generator._pendingDocs = [];
        generator._pendingBlobs = {};
        generator._autoFasc = null;
        document.getElementById('output-modal').classList.add('hidden');
    },

    clear: () => {
        document.querySelectorAll('#form-container input').forEach(el => { el.value = ''; });
        generator.updateLivePreview();
    },

});