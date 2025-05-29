class Persone {
  constructor(title, start, end, color) {
    this.title = title;
    this.start = start;
    this.end = end;
    this.color = color;
  }
}

const events = [];
const utenti = {};
const coloriUtente = {};
const coloriDisponibili = [
  '#e57373', '#64b5f6', '#81c784', '#ffb74d', '#9575cd',
  '#4db6ac', '#f06292', '#a1887f', '#ba68c8', '#7986cb',
  '#aed581', '#ffd54f', '#4fc3f7'
];

const reparti = [
  "TV", "GED-PED", "TELEFONIA-AREA SERVIZI",
  "IT", "HE-FOTO-TOYS", "CASSE", "MAGAZZINO"
];

let currentUser = '';
let currentReparto = '';
let isLoggedIn = false;
let calendar;

function popolaReparti() {
  const filtroSelect = document.getElementById("filtroReparto");
  filtroSelect.innerHTML = '<option value="TUTTI">Tutti i reparti</option>' +
    reparti.map(r => `<option value="${r}">${r}</option>`).join('');

  const repartoSelect = document.getElementById("reparto");
  repartoSelect.innerHTML = '<option value="">-- Seleziona reparto --</option>' +
    reparti.map(r => `<option value="${r}">${r}</option>`).join('');
}

function aggiornaSidebar() {
  const userList = document.getElementById('userList');
  userList.innerHTML = '';
  const filtro = document.getElementById('filtroReparto').value;
  const nomiUnici = [...new Set(events.map(e => e.title.split('-')[0].trim()))];

  nomiUnici.forEach(nome => {
    const reparto = utenti[nome];
    if (filtro === "TUTTI" || reparto === filtro) {
      const colore = coloriUtente[nome] || 'gray';
      const div = document.createElement('div');
      div.className = 'utente';
      const colorBox = document.createElement('div');
      colorBox.className = 'color-box';
      colorBox.style.backgroundColor = colore;
      div.appendChild(colorBox);
      div.appendChild(document.createTextNode(`${nome} (${reparto})`));
      userList.appendChild(div);
    }
  });
}

function aggiornaCalendario() {
  const filtro = document.getElementById('filtroReparto').value;
  const eventiFiltrati = events.filter(e => {
    const nome = e.title.split('-')[0].trim();
    const reparto = utenti[nome];
    return filtro === "TUTTI" || reparto === filtro;
  });
  calendar.removeAllEvents();
  eventiFiltrati.forEach(e => calendar.addEvent(e));
}

function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  calendarEl.innerHTML = '';
  aggiornaSidebar();

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'it',
    selectable: true,
    selectMirror: true,
    select: function (info) {
      const start = new Date(info.startStr);
      const end = new Date(info.endStr);
      end.setDate(end.getDate() - 1);

      if (!checkVincoli(start, end)) {
        calendar.unselect();
        return;
      }

      const conferma = confirm(`Vuoi salvare le ferie dal ${info.startStr} al ${end.toISOString().split('T')[0]} per ${currentUser}?`);
      if (conferma) {
        const ferie = new Persone(`${currentUser} - Ferie`, info.startStr, info.endStr, coloriUtente[currentUser]);
        events.push(ferie);
        aggiornaCalendario();
        aggiornaSidebar();
      }
      calendar.unselect();
    },
    eventClick: function (info) {
      const nomeEvento = info.event.title.split(" - ")[0].trim();
      if (nomeEvento !== currentUser) {
        alert("Puoi modificare solo le tue ferie.");
        return;
      }

      const azione = prompt("Vuoi eliminare o modificare le ferie? Scrivi:\n- 'elimina' per rimuoverle\n- 'modifica' per selezionare nuove date");

      if (azione === "elimina") {
        if (confirm("Sei sicuro di voler eliminare queste ferie?")) {
          info.event.remove();
          const index = events.findIndex(e => e.title === info.event.title && e.start === info.event.startStr);
          if (index > -1) events.splice(index, 1);
          aggiornaCalendario();
          aggiornaSidebar();
        }
      } else if (azione === "modifica") {
        info.event.remove();
        const index = events.findIndex(e => e.title === info.event.title && e.start === info.event.startStr);
        if (index > -1) events.splice(index, 1);
        alert("Seleziona ora un nuovo intervallo sul calendario.");
        aggiornaCalendario();
      }
    },
    events: []
  });
  calendar.render();
  aggiornaCalendario();
}

function checkVincoli(start, end) {
  const weekStart = new Date(start);
  const weekEnd = new Date(start);
  weekEnd.setDate(weekStart.getDate() + 6);

  if (start.getDay() !== 1 || (end.getTime() - start.getTime()) !== 6 * 24 * 3600 * 1000) {
    alert("È possibile scegliere solo una settimana intera da lunedì a domenica.");
    return false;
  }

  const ferieSettimana = events.filter(e => {
    const data = new Date(e.start);
    return data >= weekStart && data <= weekEnd;
  });

  if (ferieSettimana.length >= 6) {
    alert("Massimo 6 RC in ferie contemporaneamente.");
    return false;
  }

  const delloStessoReparto = ferieSettimana.filter(e => utenti[e.title.split(" - ")[0]] === currentReparto);
  if (currentReparto === "GED-PED") {
    if (delloStessoReparto.length >= 1) {
      alert("Solo un RC di GED-PED può andare in ferie per settimana.");
      return false;
    }
  } else if (currentReparto === "CASSE") {
    // CASSE può andare con GED-PED
  } else {
    if (delloStessoReparto.length >= 1) {
      alert("Non è possibile avere due RC dello stesso reparto in ferie nella stessa settimana.");
      return false;
    }
  }

  if (currentReparto === "IT") {
    const giorno31 = new Date("2025-08-31");
    if (start <= giorno31 && end >= giorno31) {
      alert("IT non può andare in ferie nella settimana del 31 agosto.");
      return false;
    }
  }

  const repartiCritici = ferieSettimana.map(e => utenti[e.title.split(" - ")[0]]);
  if (currentReparto === "MAGAZZINO") {
    if (repartiCritici.includes("TV") || repartiCritici.includes("GED-PED")) {
      alert("Il MAGAZZINO non può andare in ferie nella stessa settimana di un RC del TV o GED-PED.");
      return false;
    }
  } else if (["TV", "GED-PED"].includes(currentReparto)) {
    if (repartiCritici.includes("MAGAZZINO")) {
      alert(`${currentReparto} non può andare in ferie nella settimana del MAGAZZINO.`);
      return false;
    }
  }

  const mese = start.getMonth() + 1;
  if (mese < 6 || mese > 9) {
    alert("Il periodo di ferie è consentito solo da giugno a settembre.");
    return false;
  }

  // const ferieUtente = events.filter(e => e.title.startsWith(currentUser));
  // if (ferieUtente.some(e => {
  //   const existingStart = new Date(e.start);
  //   const diff = Math.abs((start - existingStart) / (1000 * 60 * 60 * 24));
  //   return diff <= 7;
  // })) {
  //   alert("Non puoi prenotare due settimane consecutive.");
  //   return false;
  // }

  return true;
}

document.addEventListener("DOMContentLoaded", () => {
  popolaReparti();

  document.getElementById("registerBtn").addEventListener("click", () => {
    if (!isLoggedIn) {
      document.getElementById("loginModal").style.display = "flex";
    } else {
      if (confirm("Vuoi effettuare il logout?")) {
        isLoggedIn = false;
        currentUser = "";
        document.getElementById("main").style.display = "none";
        document.getElementById("access-denied").style.display = "flex";
        document.getElementById("registerBtn").textContent = "Registrazione";
      }
    }
  });

  document.getElementById("confirmLogin").addEventListener("click", () => {
    const nome = document.getElementById("username").value.trim();
    const reparto = document.getElementById("reparto").value;
    if (!nome || !reparto) return alert("Inserisci nome e reparto");
    if (utenti[nome]) return alert("Utente già registrato");
    utenti[nome] = reparto;
    coloriUtente[nome] = coloriDisponibili[Object.keys(coloriUtente).length % coloriDisponibili.length];
    alert("Registrazione completata.");
    document.getElementById("loginModal").style.display = "none";
  });

  document.getElementById("loginForm").addEventListener("submit", e => {
    e.preventDefault();
    const nome = document.getElementById("loginName").value.trim();
    if (!utenti[nome]) return alert("Utente non registrato");
    isLoggedIn = true;
    currentUser = nome;
    currentReparto = utenti[nome];
    document.getElementById("main").style.display = "flex";
    document.getElementById("access-denied").style.display = "none";
    document.getElementById("registerBtn").textContent = "Logout";
    initCalendar();
  });

  document.getElementById("filtroReparto").addEventListener("change", () => {
    aggiornaCalendario();
    aggiornaSidebar();
  });
});
