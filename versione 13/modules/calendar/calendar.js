/* --- modules/calendar/calendar.js --- */
const calendar = {
    date: new Date(),
    selectedDayKey: null,
    editingIndex: null,

    init: () => {
        if (!calendar.date) calendar.date = new Date();
        calendar.render();
    },

    getUrgentEvents: () => {
        const urgent = [];
        const now = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(now.getDate() + 1);
        const checkList = [{ d: now, label: 'OGGI' }, { d: tomorrow, label: 'DOMANI' }];
        checkList.forEach(item => {
            const k = `${item.d.getDate()}-${item.d.getMonth()}-${item.d.getFullYear()}`;
            if (core.db.events && core.db.events[k] && core.db.events[k].events) {
                core.db.events[k].events.forEach(ev => urgent.push({ ...ev, dayLabel: item.label }));
            }
        });
        return urgent;
    },

    render: () => {
        const grid = document.getElementById('cal-grid');
        const title = document.getElementById('cal-title');
        if(!grid || !title) return;

        const now = new Date();
        const y = calendar.date.getFullYear();
        const m = calendar.date.getMonth();
        title.innerText = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(calendar.date);
        
        grid.style.display = "grid";
        grid.style.gridTemplateColumns = "repeat(7, 1fr)"; 
        grid.style.width = "100%"; 
        grid.style.border = "1px solid #e2e8f0";

        grid.innerHTML = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]
            .map(d => `<div class="text-center text-[14px] font-bold text-slate-500 uppercase py-4 border-b border-slate-100 bg-slate-50/30">${d}</div>`)
            .join('');

        const firstDay = (new Date(y, m, 1).getDay() + 6) % 7;
        const daysInMonth = new Date(y, m + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) grid.innerHTML += `<div class="h-[120px] border-[0.5px] border-slate-100 bg-slate-50/10"></div>`;

        for (let d = 1; d <= daysInMonth; d++) {
            const k = `${d}-${m}-${y}`;
            const dayData = (core.db.events && core.db.events[k]) ? core.db.events[k] : { events: [], isHoliday: false, holidayName: '' };
            const natHol = calendar.getNationalHoliday(d, m, y);
            const isHol = natHol || dayData.isHoliday;
            const holText = (natHol === "Domenica") ? "" : (natHol || dayData.holidayName || "");
            const isToday = d === now.getDate() && m === now.getMonth() && y === now.getFullYear();
            
            let style = `h-[120px] flex flex-col items-center justify-center border-[0.5px] cursor-pointer transition-all font-bold text-[20px] relative group ${isHol ? 'bg-red-50 text-red-500 border-red-100' : 'bg-white text-slate-700 border-slate-100'} ${isToday ? 'ring-2 ring-blue-500 ring-inset z-20 bg-blue-50/30' : 'hover:bg-slate-50 hover:z-30'}`;

            const dot = (dayData.events?.length > 0) ? `<span class="absolute bottom-3 w-2 h-2 rounded-full ${isHol ? 'bg-red-400' : 'bg-blue-500'}"></span>` : '';
            const holDiv = holText ? `<span class="absolute top-7 text-[12px] font-black text-red-500 uppercase px-1">${holText}</span>` : '';

            grid.innerHTML += `<div onclick="calendar.openModal(${d})" class="${style}">${isToday ? '<span class="absolute top-3 left-3 text-[12px] font-black text-blue-600 uppercase">Oggi</span>' : ''}${holDiv}${d}${dot}</div>`;
        }
    },

    getNationalHoliday: (d, m, y) => {
        const hols = {"1-0":"Capodanno","6-0":"Epifania","25-4":"Liberazione","1-5":"Lavoro","2-6":"Repubblica","15-7":"Ferragosto","1-10":"Ognissanti","8-11":"Immacolata","25-11":"Natale","26-11":"S. Stefano"};
        if (hols[`${d}-${m}`]) return hols[`${d}-${m}`];
        const date = new Date(y, m, d);
        return (date.getDay() === 0) ? "Domenica" : null;
    },

    changeMonth: (dir) => {
        calendar.date.setMonth(calendar.date.getMonth() + dir);
        calendar.render();
    },

    openModal: (d) => {
        const m = calendar.date.getMonth();
        const y = calendar.date.getFullYear();
        calendar.selectedDayKey = `${d}-${m}-${y}`;
        const formattedDate = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y, m, d));
        document.getElementById('modal-date-display').innerText = " - " + formattedDate;

        if (!core.db.events[calendar.selectedDayKey]) core.db.events[calendar.selectedDayKey] = { events: [], isHoliday: false, holidayName: '' };
        calendar.resetForm();
        calendar.renderDayPage();
        document.getElementById('event-modal').classList.remove('hidden');
    },

    renderDayPage: () => {
        const data = core.db.events[calendar.selectedDayKey];
        document.getElementById('event-holiday-check').checked = data.isHoliday;
        document.getElementById('holiday-name-input').value = data.holidayName || '';
        document.getElementById('holiday-name-container').style.display = data.isHoliday ? 'block' : 'none';
        
        const listEl = document.getElementById('event-list');
        listEl.innerHTML = data.events.length ? data.events.map((ev, i) => `
            <div class="flex items-start gap-4 py-4 border-b border-slate-50 group px-2">
                <div class="text-blue-500 font-bold text-[14px] w-14 shrink-0">${ev.time || '--:--'}</div>
                <div class="flex-1 min-w-0">
                    <div class="text-[14px] font-bold text-slate-700 uppercase break-words">${ev.text}</div>
                    <div class="text-[13px] text-slate-500 mt-1">${ev.notes || ''}</div>
                </div>
                <div class="flex gap-2">
                    <button onclick="calendar.editEvent(${i})" class="text-slate-300 hover:text-blue-500"><i class="fas fa-edit text-sm"></i></button>
                    <button onclick="calendar.deleteEvent(${i})" class="text-slate-300 hover:text-red-400"><i class="fas fa-trash text-sm"></i></button>
                </div>
            </div>`).join('') : '<p class="text-[12px] text-center py-10 opacity-40 uppercase font-bold">Nessun impegno</p>';
    },

    addEvent: () => {
        const t = document.getElementById('event-input').value, h = document.getElementById('event-time').value, n = document.getElementById('event-notes').value;
        if (!t) return;
        if (calendar.editingIndex !== null) core.db.events[calendar.selectedDayKey].events[calendar.editingIndex] = {text:t, time:h, notes:n};
        else core.db.events[calendar.selectedDayKey].events.push({text:t, time:h, notes:n});
        calendar.saveAndRefresh();
        dashboard.init();
    },

    editEvent: (i) => {
        const ev = core.db.events[calendar.selectedDayKey].events[i];
        document.getElementById('event-input').value = ev.text;
        document.getElementById('event-time').value = ev.time;
        document.getElementById('event-notes').value = ev.notes;
        calendar.editingIndex = i;
        document.getElementById('btn-add-text').innerText = "Salva";
    },

    deleteEvent: (i) => {
        if(confirm("Eliminare questa nota?")) {
            core.db.events[calendar.selectedDayKey].events.splice(i, 1);
            calendar.saveAndRefresh();
            dashboard.init();
        }
    },

    resetForm: () => {
        document.getElementById('event-input').value = '';
        document.getElementById('event-time').value = '';
        document.getElementById('event-notes').value = '';
        document.getElementById('btn-add-text').innerText = "Aggiungi";
        calendar.editingIndex = null;
    },

    toggleHoliday: () => {
        const chk = document.getElementById('event-holiday-check').checked;
        core.db.events[calendar.selectedDayKey].isHoliday = chk;
        document.getElementById('holiday-name-container').style.display = chk ? 'block' : 'none';
        calendar.saveAndRefresh();
    },

    saveHolidayName: () => {
        core.db.events[calendar.selectedDayKey].holidayName = document.getElementById('holiday-name-input').value;
        core.save();
        calendar.render();
    },

    saveAndRefresh: () => { core.save(); calendar.renderDayPage(); calendar.render(); },
    closeModal: () => document.getElementById('event-modal').classList.add('hidden')
};