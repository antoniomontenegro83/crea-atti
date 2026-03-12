/* --- modules/events/events_database.js --- */
const eventsDB = {
    // Esporta gli impegni in formato .ics
    exportIcal: () => {
        if (!core.db.events || Object.keys(core.db.events).length === 0) {
            alert("Nessun evento salvato da esportare.");
            return;
        }
        let icsContent = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AttiSuite//EventsDB//IT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"].join("\n") + "\n";
        for (let dateKey in core.db.events) {
            const dayData = core.db.events[dateKey];
            const parts = dateKey.split('-'); 
            if (parts.length !== 3) continue;
            const d = parts[0].padStart(2, '0'), m = String(parseInt(parts[1]) + 1).padStart(2, '0'), y = parts[2];
            const dateStr = `${y}${m}${d}`;
            if (dayData.events) {
                dayData.events.forEach(ev => {
                    const startTime = ev.time ? ev.time.replace(':', '') : "0800";
                    icsContent += "BEGIN:VEVENT\n";
                    icsContent += `DTSTART:${dateStr}T${startTime}00\n`;
                    icsContent += `DTEND:${dateStr}T${String(parseInt(startTime) + 100).padStart(4, '0')}00\n`;
                    icsContent += `SUMMARY:${ev.text.toUpperCase()}\n`;
                    icsContent += `DESCRIPTION:${ev.notes ? ev.notes.replace(/\n/g, "\\n") : ''}\n`;
                    icsContent += "END:VEVENT\n";
                });
            }
        }
        icsContent += "END:VCALENDAR";
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `agenda_legale.ics`;
        link.click();
    },

    // Importa impegni da un file .ics
    importIcal: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.ics';
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (event) => {
                const content = event.target.result;
                const lines = content.split(/\r?\n/);
                let currentEvent = null;

                lines.forEach(line => {
                    if (line.startsWith("BEGIN:VEVENT")) currentEvent = {};
                    if (currentEvent) {
                        if (line.startsWith("DTSTART")) {
                            const val = line.split(":")[1]; // Formato YYYYMMDDTHHMMSS
                            currentEvent.year = val.substring(0, 4);
                            currentEvent.month = parseInt(val.substring(4, 6)) - 1;
                            currentEvent.day = parseInt(val.substring(6, 8));
                            currentEvent.time = val.includes("T") ? val.substring(9, 11) + ":" + val.substring(11, 13) : "08:00";
                        }
                        if (line.startsWith("SUMMARY")) currentEvent.text = line.split(":")[1];
                        if (line.startsWith("DESCRIPTION")) currentEvent.notes = line.split(":")[1]?.replace(/\\n/g, "\n");
                    }
                    if (line.startsWith("END:VEVENT")) {
                        const key = `${currentEvent.day}-${currentEvent.month}-${currentEvent.year}`;
                        if (!core.db.events[key]) core.db.events[key] = { events: [], isHoliday: false, holidayName: '' };
                        core.db.events[key].events.push({
                            text: currentEvent.text || "Evento Importato",
                            time: currentEvent.time || "08:00",
                            notes: currentEvent.notes || ""
                        });
                        currentEvent = null;
                    }
                });
                core.save();
                alert("Importazione completata!");
                calendar.render();
                dashboard.init();
            };
            reader.readAsText(file);
        };
        input.click();
    }
};