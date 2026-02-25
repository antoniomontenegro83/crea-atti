/* --- modules/generator/print/print.js --- */
Object.assign(generator, {

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
    }
});
