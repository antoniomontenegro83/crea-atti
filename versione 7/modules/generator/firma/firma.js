/* --- modules/generator/firma/firma.js --- */
Object.assign(generator, {

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
    }
});
