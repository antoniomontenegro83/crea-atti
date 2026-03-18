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

        // Normalizza le chiavi di data: spazi → underscore, trim spazi finali
        // (il fixer XML converte i tag spezzati nello stesso modo)
        const dataRaw = { ...data };
        Object.keys(dataRaw).forEach(k => {
            const kNorm = k.trim().replace(/\s+/g, '_');
            if (kNorm !== k) { data[kNorm] = data[k]; }
        });

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

                // ── Costruisce il nome file dal form ──────────────────────
                // Formato: {numero_xxx}-AA-{data_xxx}-FASC_{fascicolo}_{anno_fascicolo}.docx
                // Funziona per qualsiasi tipo di atto: cerca dinamicamente
                // il primo campo "numero_*" e il primo campo "data_*" nei dati del form

                // Sanitizza un valore per usarlo nel nome file
                const _sanitize = (v) => (v || '').toString().trim()
                    .replace(/\//g, '-').replace(/[\\:*?"<>|]/g, '-').replace(/\s+/g, '_');

                // Cerca il primo campo che inizia con "numero" (esclude fascicolo/anno)
                const _findNumero = () => {
                    // Cerca in data (chiavi normalizzate con underscore)
                    const priority = Object.keys(data).filter(k => {
                        const kl = k.toLowerCase();
                        return kl.startsWith('numero') && !kl.includes('fascicolo') && data[k]?.trim();
                    });
                    if (priority.length) return _sanitize(data[priority[0]]);
                    // Fallback: cerca tra gli input del DOM (nome con spazi o underscore)
                    let val = '';
                    document.querySelectorAll('#form-container input[name]').forEach(inp => {
                        const kl = inp.name.toLowerCase().replace(/\s+/g,'_');
                        if (!val && kl.startsWith('numero') && !kl.includes('fascicolo') && inp.value.trim())
                            val = inp.value.trim();
                    });
                    return _sanitize(val);
                };

                // Cerca il primo campo che inizia con "data" (esclude pa/msg ambigui)
                const _findData = () => {
                    const priority = Object.keys(data).filter(k => {
                        const kl = k.toLowerCase();
                        return kl.startsWith('data') && !kl.includes('pa') && !kl.includes('msg') && data[k]?.trim();
                    });
                    if (!priority.length) return '';
                    const key = priority[0];
                    // Se "in lettere" è attivo, usa il valore numerico originale (rawDate)
                    const inp = document.getElementById(`input-${key}`);
                    const raw = inp?.dataset?.rawDate || data[key];
                    return _sanitize(raw).replace(/\//g, '-');
                };

                const numAtto  = _findNumero();
                const dataAtto = _findData();
                const fascNum2 = _sanitize(data['Fascicolo'] || data['fascicolo'] || data['FASCICOLO'] || '');
                const annoFasc = _sanitize(data['anno_fascicolo'] || '');

                let filename;
                if (numAtto && dataAtto && fascNum2) {
                    // Formato completo: numero-AA-data-FASC_fascicolo_anno
                    const fascPart = annoFasc ? `${fascNum2}_${annoFasc}` : fascNum2;
                    filename = `${numAtto}-AA-${dataAtto}-FASC_${fascPart}.docx`;
                } else {
                    // Fallback: nome template + data odierna
                    const baseName = item.tpl.file
                        ? item.tpl.file.replace(/\.docx$/i, '').replace(/\//g, '-').replace(/[\\:*?"<>|]/g, '-')
                        : item.tpl.name.replace(/[^a-zA-Z0-9_\-]/g, '_');
                    filename = `${baseName}_${today.replace(/\//g, '-')}.docx`;
                }

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
                        console.warn('Compile error:', tagList || compileErr.message, compileErr);
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
                        console.error('Render error:', tagList || renderErr.message);
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
            core.save();  // salva DB principale (tpl + eventi)
            generator._pendingDocs = generated;

            // ── Leggi numero fascicolo e anno direttamente dal DOM ──────
            // Legge dagli input del form per nome (case-insensitive)
            // così funziona anche se il template è stato caricato con una versione vecchia
            const _getField = (nameExact) => {
                // 1. Cerca esatto in data (normalizzato)
                for (const k of Object.keys(data)) {
                    if (k.toLowerCase() === nameExact.toLowerCase() && data[k]?.trim())
                        return data[k].trim();
                }
                // 2. Cerca nel DOM per name case-insensitive
                let val = '';
                document.querySelectorAll('#form-container input[name]').forEach(inp => {
                    if (!val && inp.name.toLowerCase() === nameExact.toLowerCase() && inp.value.trim())
                        val = inp.value.trim();
                });
                return val;
            };

            // Numero fascicolo: cerca per nomi comuni (escludi nomi che contengono "anno")
            let fascNum = _getField('Fascicolo') || _getField('fascicolo') ||
                          _getField('FASCICOLO') || _getField('RG') ||
                          _getField('N_RG') || _getField('NUMERO_RG') || '';
            // Fallback DOM: qualsiasi input il cui nome contiene "fascicolo" ma non "anno"
            if (!fascNum) {
                document.querySelectorAll('#form-container input[name]').forEach(inp => {
                    const nm = inp.name.toLowerCase();
                    if (!fascNum && nm.includes('fascicolo') && !nm.includes('anno') && inp.value.trim())
                        fascNum = inp.value.trim();
                });
            }

            // Anno fascicolo: legge ESATTAMENTE "anno_fascicolo" dal DOM o da data
            const fascYear = parseInt(_getField('anno_fascicolo')) || null;


            // Trova o crea fascicolo in arcDb — passa anno dal form
            const fascResult    = fascNum ? archive.findOrCreateByRg(fascNum, null, fascYear) : null;
            generator._autoFasc = fascResult;

            generator.renderFolderSelects();

            const ss = document.getElementById('save-folder-select');
            if (ss) {
                if (fascResult) ss.value = fascResult.id;
                else {
                    const pre = document.getElementById('gen-folder-select')?.value || '';
                    if (pre) ss.value = pre;
                }
            }

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
    //  Struttura su disco: FASCICOLI/{anno}/{rg}/
    //
    //  Priorità fascicolo:
    //    1. _autoFasc  — rilevato automaticamente dal campo RG nel form
    //    2. save-folder-select — selezione manuale nel modal
    //    3. prompt → crea al volo
    // ─────────────────────────────────────────────────────────────────────────
    confirmSaveToFolder: async () => {

        // 1. Determina fascicolo di destinazione
        let fId = generator._autoFasc?.id
               || document.getElementById('save-folder-select')?.value
               || '';

        // 2. Nessun fascicolo → chiedi con prompt e crea al volo
        if (!fId) {
            const name = prompt('Inserisci il numero/nome del fascicolo:');
            if (!name?.trim()) { generator.closeOutputModal(); return; }

            const match = Object.entries(core.arcDb || {}).find(([, f]) =>
                f.rg?.trim().toLowerCase()    === name.trim().toLowerCase() ||
                f.title?.trim().toLowerCase() === name.trim().toLowerCase()
            );

            if (match) {
                fId = match[0];
            } else {
                // Crea fascicolo + cartella su disco
                const res = archive.findOrCreateByRg(name.trim());
                fId = res.id;
                // Crea cartella fisica
                if (core.dirHandle) {
                    const f    = core.arcDb[fId];
                    const year = f.year || archive._extractYear(f.rg);
                    const nm   = archive._folderName(f.rg, f.title);
                    try {
                        const fascicoliDir = await core.dirHandle.getDirectoryHandle('FASCICOLI', { create: true });
                        const yearDir      = await fascicoliDir.getDirectoryHandle(String(year), { create: true });
                        await yearDir.getDirectoryHandle(nm, { create: true });
                    } catch (e) { console.warn('Cartella non creata:', e); }
                }
                core.showToast(`Fascicolo "${name.trim()}" creato!`);
            }
        }

        // Verifica esistenza
        if (!core.arcDb?.[fId]) { generator.closeOutputModal(); return; }

        const f    = core.arcDb[fId];
        const year = f.year || archive._extractYear(f.rg);
        const nm   = archive._folderName(f.rg, f.title);

        // 3. Aggiungi doc nel DB archivio
        let saved = 0;
        generator._pendingDocs.forEach(doc => { if (archive.addDocToFolder(fId, doc)) saved++; });

        // 4. Salva file fisici in FASCICOLI/{anno}/{rg}/
        const blobs = generator._pendingBlobs || {};
        if (Object.keys(blobs).length > 0 && core.dirHandle) {
            const ok = await archive.saveToDisk(fId, blobs);
            if (ok) {
                const label = archive._fascLabel(f.rg, f.year);
                core.showToast(`${saved} atto/i salvati in FASCICOLI/${year}/${label}/`);
            }
        } else {
            core.showToast(`${saved} atto/i archiviato/i in "${f.title}"`);
        }

        // 5. Reset
        generator._pendingDocs  = [];
        generator._pendingBlobs = {};
        generator._autoFasc     = null;
        generator.closeOutputModal();
    },

    closeOutputModal: () => {
        generator._pendingDocs  = [];
        generator._pendingBlobs = {};
        generator._autoFasc     = null;
        document.getElementById('output-modal').classList.add('hidden');
    },

    clear: () => {
        document.querySelectorAll('#form-container input').forEach(el => { el.value = ''; });
        generator.updateLivePreview();
    },

});