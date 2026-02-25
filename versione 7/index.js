/* --- index.js --- */
const core = {
    dirHandle: null,
    db: { tpl: {}, arc: {}, events: {} },
    state: { activeSlots: 2, currentInput: null },

    connect: async () => {
        try {
            core.dirHandle = await window.showDirectoryPicker();
            document.getElementById('lock-overlay').style.display = 'none';
            try {
                const fh = await core.dirHandle.getFileHandle('database_atti.json');
                core.db = JSON.parse(await (await fh.getFile()).text());
                if (!core.db.events) core.db.events = {};
                if (!core.db.arc)    core.db.arc    = {};
                if (!core.db.tpl)    core.db.tpl    = {};
            } catch (e) {
                console.log("Nuovo DB creato");
                await core.save();
            }
            core.init();
        } catch (err) {
            alert("Seleziona la cartella di lavoro.");
        }
    },

    init: () => {
        core.renderNav();
        if (typeof dashboard !== 'undefined') {
            core.nav('dashboard');
        } else {
            console.error("ERRORE CRITICO: dashboard non definita.");
        }
    },

    renderNav: () => {
        const nav = document.getElementById('main-nav');
        nav.innerHTML = `
            <div onclick="core.nav('dashboard')"  class="nav-item" id="nav-dashboard">
                <i class="fas fa-house"></i> <span>Home</span>
            </div>
            <div onclick="core.nav('templates')"  class="nav-item" id="nav-templates">
                <i class="fas fa-layer-group"></i> <span>Template</span>
            </div>
            <div onclick="core.nav('generator')"  class="nav-item" id="nav-generator">
                <i class="fas fa-file-signature"></i> <span>Crea Atti</span>
            </div>
            <div onclick="core.nav('archive')"    class="nav-item" id="nav-archive">
                <i class="fas fa-folder-open"></i> <span>Archivio</span>
            </div>
        `;
    },

    nav: (modId) => {
        document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('active'));
        const activeNav = document.getElementById('nav-' + modId);
        if (activeNav) activeNav.classList.add('active');

        const container = document.getElementById('module-container');
        const title     = document.getElementById('page-title');

        if (modId === 'dashboard' && typeof dashboard !== 'undefined') {
            container.innerHTML = dashboard.html;
            dashboard.init();
            title.innerText = 'Dashboard';

        } else if (modId === 'templates' && typeof generator !== 'undefined') {
            container.innerHTML = generator.html;
            generator.init();
            generator.tab('editor');
            title.innerText = 'Template';

        } else if (modId === 'generator' && typeof generator !== 'undefined') {
            container.innerHTML = generator.html;
            generator.init();
            title.innerText = 'Crea Atti';

        } else if (modId === 'archive' && typeof archive !== 'undefined') {
            container.innerHTML = archive.html;
            archive.init();
            title.innerText = 'Archivio Fascicoli';
        }
    },

    save: async () => {
        if (!core.dirHandle) return;
        const fh = await core.dirHandle.getFileHandle('database_atti.json', { create: true });
        const wr = await fh.createWritable();
        await wr.write(JSON.stringify(core.db));
        await wr.close();
    },

    insertTag: (tag) => {
        if (!core.state.currentInput) return;
        const i = core.state.currentInput;
        const p = i.selectionStart;
        i.value = i.value.slice(0, p) + tag + i.value.slice(i.selectionEnd);
    },

    showToast: (m) => {
        const t = document.getElementById('toast');
        t.innerText = m;
        t.classList.remove('translate-y-48');
        setTimeout(() => t.classList.add('translate-y-48'), 3000);
    }
};
