/* --- modules/generator/convert/convert.js --- */
Object.assign(generator, {

    // ── Numero → lettere italiane ───────────────────────────────
    _numToItalian: (n) => {
        if (n === 0) return 'zero';
        if (n < 0)   return 'meno ' + generator._numToItalian(-n);
        const u = ['','uno','due','tre','quattro','cinque','sei','sette','otto','nove',
                   'dieci','undici','dodici','tredici','quattordici','quindici','sedici',
                   'diciassette','diciotto','diciannove'];
        const t = ['','','venti','trenta','quaranta','cinquanta','sessanta','settanta','ottanta','novanta'];
        if (n < 20) return u[n];
        if (n < 100) {
            const ten = t[Math.floor(n/10)], unit = u[n%10];
            return (unit === 'uno' || unit === 'otto') ? ten.slice(0,-1) + unit : ten + unit;
        }
        if (n < 1000) {
            const h = Math.floor(n/100), rest = n%100;
            const pre = h === 1 ? 'cento' : generator._numToItalian(h) + 'cento';
            return rest === 0 ? pre : pre + generator._numToItalian(rest);
        }
        if (n < 1000000) {
            const th = Math.floor(n/1000), rest = n%1000;
            const pre = th === 1 ? 'mille' : generator._numToItalian(th) + 'mila';
            return rest === 0 ? pre : pre + generator._numToItalian(rest);
        }
        if (n < 1000000000) {
            const m = Math.floor(n/1000000), rest = n%1000000;
            const pre = m === 1 ? 'unmilione' : generator._numToItalian(m) + 'milioni';
            return rest === 0 ? pre : pre + generator._numToItalian(rest);
        }
        const b = Math.floor(n/1000000000), rest = n%1000000000;
        const pre = b === 1 ? 'unmiliardo' : generator._numToItalian(b) + 'miliardi';
        return rest === 0 ? pre : pre + generator._numToItalian(rest);
    },

    // ── Importo → lettere ───────────────────────────────────────
    // "1.000,56" → "mille/56"
    // "1000000.52" → "unmilione/52"
    // "300,00" → "trecento/00"
    euroToLetters: (str) => {
        if (!str || !str.toString().trim()) return '';
        let s = str.toString().trim();
        // Formato italiano: virgola = decimale, punto = migliaia
        if (s.includes(',')) {
            s = s.replace(/\./g, '').replace(',', '.');
        }
        const f = parseFloat(s);
        if (isNaN(f)) return '';
        const intVal = Math.floor(f);
        let cents = '00';
        if (s.includes('.')) {
            const dec = s.split('.')[1];
            cents = dec.substring(0, 2).padEnd(2, '0');
        }
        return generator._numToItalian(intVal) + '/' + cents;
    },

    // ── Auto-compila tutti i campi *_in_lettere* ────────────────
    // Il campo sorgente è il nome senza "_in_lettere"
    // Es: importo_presunto_in_lettere_atto → cerca importo_presunto_atto
    autoFillLetters: () => {
        document.querySelectorAll('#form-container input[name*="_in_lettere"]').forEach(dest => {
            const srcName = dest.name.replace(/_in_lettere/i, '');
            const src = document.querySelector(`#form-container input[name="${srcName}"]`);
            if (!src) return;
            const v = generator.euroToLetters(src.value);
            dest.value = v;
            dest.style.background = v ? '#f0fdf4' : '';
            dest.style.color      = v ? '#15803d' : '';
        });
    },

    // ── Date modal ─────────────────────────────────────────────
    openDateModal: (fieldName) => {
        generator._currentDateField = fieldName;
        document.getElementById('date-modal-field').innerText = fieldName;
        document.getElementById('date-picker').value = '';
        document.getElementById('date-letters-preview').innerText = '';
        document.getElementById('deadline-result').classList.add('hidden');
        document.getElementById('date-format-letters').checked = false;
        document.getElementById('date-modal').classList.remove('hidden');
    },

    updateDatePreview: () => {
        const val = document.getElementById('date-picker').value;
        if (!val) return;
        document.getElementById('date-letters-preview').innerText = generator.dateToLetters(new Date(val + 'T00:00:00'));
    },

    addDays: (n) => {
        const picker = document.getElementById('date-picker');
        const base = picker.value ? new Date(picker.value + 'T00:00:00') : new Date();
        base.setDate(base.getDate() + n);
        picker.value = base.toISOString().split('T')[0];
        generator.updateDatePreview();
        const res = document.getElementById('deadline-result');
        res.innerText = `→ ${base.toLocaleDateString('it-IT', {day:'numeric', month:'long', year:'numeric'})}`;
        res.classList.remove('hidden');
    },

    confirmDate: () => {
        const val = document.getElementById('date-picker').value;
        if (!val || !generator._currentDateField) return;
        const d = new Date(val + 'T00:00:00');
        const inLetters = document.getElementById('date-format-letters').checked;
        const formatted = inLetters
            ? generator.dateToLetters(d)
            : d.toLocaleDateString('it-IT', {day:'numeric', month:'long', year:'numeric'});
        const input = document.querySelector(`#form-container input[name="${generator._currentDateField}"]`);
        if (input) { input.value = formatted; generator.updateLivePreview(); }
        document.getElementById('date-modal').classList.add('hidden');
    },

    dateToLetters: (d) => {
        const days = ['zero','uno','due','tre','quattro','cinque','sei','sette','otto','nove',
            'dieci','undici','dodici','tredici','quattordici','quindici','sedici','diciassette',
            'diciotto','diciannove','venti','ventuno','ventidue','ventitre','ventiquattro',
            'venticinque','ventisei','ventisette','ventotto','ventinove','trenta','trentuno'];
        const months = ['gennaio','febbraio','marzo','aprile','maggio','giugno',
            'luglio','agosto','settembre','ottobre','novembre','dicembre'];
        return `${days[d.getDate()]} ${months[d.getMonth()]} ${generator.yearToLetters(d.getFullYear())}`;
    },

    yearToLetters: (y) => {
        const u  = ['','uno','due','tre','quattro','cinque','sei','sette','otto','nove'];
        const te = ['','dieci','venti','trenta','quaranta','cinquanta','sessanta','settanta','ottanta','novanta'];
        const h  = ['','cento','duecento','trecento','quattrocento','cinquecento','seicento','settecento','ottocento','novecento'];
        const th = ['','mille','duemila','tremila','quattromila'];
        const t_ = Math.floor(y/1000), hh = Math.floor((y%1000)/100), ten = Math.floor((y%100)/10), un = y%10;
        let s = (th[t_]||'') + (h[hh]||'');
        if (ten === 1) s += ['dieci','undici','dodici','tredici','quattordici','quindici','sedici','diciassette','diciotto','diciannove'][un];
        else s += (te[ten]||'') + (u[un]||'');
        return s;
    },

    // ── DOCX utilities ─────────────────────────────────────────
    docxToHtml: (zip, xml) => {
        const relsXml = zip.file('word/_rels/document.xml.rels')?.asText() || '';
        const imgMap  = {};
        const relMatches = relsXml.matchAll(/Id="([^"]+)"[^>]+Target="([^"]+)"/g);
        for (const m of relMatches) {
            const relId = m[1], target = m[2];
            if (/\.(png|jpg|jpeg|gif|bmp|tiff|wmf|emf)/i.test(target)) {
                const path = target.startsWith('..') ? target.replace('../','') : 'word/'+target;
                try {
                    const imgData = zip.file(path)?.asUint8Array();
                    if (imgData) {
                        const b64  = btoa(String.fromCharCode(...imgData));
                        const ext  = target.split('.').pop().toLowerCase();
                        const mime = ext==='jpg'||ext==='jpeg' ? 'image/jpeg' : ext==='gif' ? 'image/gif' : 'image/png';
                        imgMap[relId] = `data:${mime};base64,${b64}`;
                    }
                } catch(e) {}
            }
        }

        const stylesXml = zip.file('word/styles.xml')?.asText() || '';

        const getHeadingLevel = (styleId) => {
            if (!styleId) return 0;
            const m = stylesXml.match(new RegExp(`<w:style[^>]*w:styleId="${styleId}"[^>]*>[\\s\\S]*?<\\/w:style>`));
            if (!m) return 0;
            const name = m[0].match(/<w:name w:val="([^"]+)"/)?.[1]?.toLowerCase() || '';
            if (/heading 1|titolo 1|title/i.test(name)) return 1;
            if (/heading 2|titolo 2/i.test(name)) return 2;
            if (/heading 3|titolo 3/i.test(name)) return 3;
            return 0;
        };

        const parseRun = (runXml) => {
            const rPr   = runXml.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/)?.[1] || '';
            const bold  = /<w:b(?:\s[^\/]*)?\/?>/.test(rPr) && !/<w:b w:val="0"/.test(rPr);
            const ital  = /<w:i(?:\s[^\/]*)?\/?>/.test(rPr) && !/<w:i w:val="0"/.test(rPr);
            const under = /<w:u /.test(rPr) && !/<w:u w:val="none"/.test(rPr);
            const wtMatches = [...runXml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)];
            let text = wtMatches.map(m => m[1]).join('');
            text = text.replace(/&(?!{)/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            if (!text) return '';
            if (under) text = `<u>${text}</u>`;
            if (ital)  text = `<em>${text}</em>`;
            if (bold)  text = `<strong>${text}</strong>`;
            return text;
        };

        const parseParagraph = (pXml) => {
            const pPr     = pXml.match(/<w:pPr>([\s\S]*?)<\/w:pPr>/)?.[1] || '';
            const styleId = pPr.match(/<w:pStyle w:val="([^"]+)"/)?.[1] || '';
            const jc      = pPr.match(/<w:jc w:val="([^"]+)"/)?.[1] || '';
            const level   = getHeadingLevel(styleId);
            const imgs = [];
            for (const d of [...pXml.matchAll(/<w:drawing>([\s\S]*?)<\/w:drawing>/g)]) {
                const rId = d[1].match(/r:embed="([^"]+)"/)?.[1];
                if (rId && imgMap[rId]) imgs.push(`<img src="${imgMap[rId]}" style="max-width:100%;height:auto;display:block;margin:6px auto;">`);
            }
            const runs = [...pXml.matchAll(/<w:r[ >]([\s\S]*?)<\/w:r>/g)];
            let content = runs.map(m => parseRun(m[0])).join('');
            if (imgs.length) content = imgs.join('') + (content ? `<br>${content}` : '');
            if (!content.trim() && !imgs.length) return '<p>&nbsp;</p>';
            const align = jc==='center' ? 'text-align:center' : jc==='right' ? 'text-align:right' : jc==='both'||jc==='distribute' ? 'text-align:justify' : '';
            const style = align ? ` style="${align}"` : '';
            if (level === 1) return `<h1${style}>${content}</h1>`;
            if (level === 2) return `<h2${style}>${content}</h2>`;
            if (level === 3) return `<h3${style}>${content}</h3>`;
            return `<p${style}>${content}</p>`;
        };

        const parseCell = (tcXml) => {
            const pars = [...tcXml.matchAll(/<w:p[ >]([\s\S]*?)<\/w:p>/g)].map(m => parseParagraph(m[0])).join('');
            return `<td>${pars}</td>`;
        };

        const parseRow = (trXml) => {
            const cells = [...trXml.matchAll(/<w:tc>([\s\S]*?)<\/w:tc>/g)].map(m => parseCell(m[0])).join('');
            return /<w:tblHeader\/>/.test(trXml)
                ? `<tr>${cells.replace(/<td>/g,'<th>').replace(/<\/td>/g,'</th>')}</tr>`
                : `<tr>${cells}</tr>`;
        };

        const parseTable = (tblXml) => {
            const rows = [...tblXml.matchAll(/<w:tr[ >]([\s\S]*?)<\/w:tr>/g)].map(m => parseRow(m[0])).join('');
            return `<table>${rows}</table>`;
        };

        const bodyXml = xml.match(/<w:body>([\s\S]*?)<\/w:body>/)?.[1] || xml;
        let html = '', pos = 0;
        while (pos < bodyXml.length) {
            const tblStart = bodyXml.indexOf('<w:tbl', pos);
            const pA = bodyXml.indexOf('<w:p ', pos);
            const pB = bodyXml.indexOf('<w:p>', pos);
            const nextP = pB < 0 ? pA : (pA < 0 ? pB : Math.min(pA, pB));
            if (tblStart >= 0 && (nextP < 0 || tblStart < nextP)) {
                const tblEnd = bodyXml.indexOf('</w:tbl>', tblStart) + 8;
                html += parseTable(bodyXml.slice(tblStart, tblEnd));
                pos = tblEnd;
            } else if (nextP >= 0) {
                const pEnd = bodyXml.indexOf('</w:p>', nextP) + 6;
                html += parseParagraph(bodyXml.slice(nextP, pEnd));
                pos = pEnd;
            } else {
                break;
            }
        }
        return html;
    },

    buildDocxFromBody: (body, data) => {
        let text = generator.replaceTags(body, data).replace(/\[[^\]]+\]/g, '');
        const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .split('\n').map(l => `<w:p><w:r><w:t xml:space="preserve">${l}</w:t></w:r></w:p>`).join('');
        const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${escaped}<w:sectPr/></w:body></w:document>`;
        const zip = new PizZip();
        zip.file('word/document.xml', docXml);
        zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
        zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
        zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);
        return zip.generate({type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
    }
});