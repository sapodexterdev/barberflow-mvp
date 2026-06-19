const DAY = 86400000;
const WEEK_DAYS = [
  { key: "sun", label: "Domingo" },
  { key: "mon", label: "Segunda" },
  { key: "tue", label: "Terça" },
  { key: "wed", label: "Quarta" },
  { key: "thu", label: "Quinta" },
  { key: "fri", label: "Sexta" },
  { key: "sat", label: "Sábado" }
];
const seedWeeklySchedule = {
  sun: { active: false, start: "09:00", end: "18:00" },
  mon: { active: true, start: "09:00", end: "18:00" },
  tue: { active: true, start: "09:00", end: "18:00" },
  wed: { active: true, start: "09:00", end: "18:00" },
  thu: { active: true, start: "09:00", end: "18:00" },
  fri: { active: true, start: "09:00", end: "18:00" },
  sat: { active: true, start: "09:00", end: "17:00" }
};
const today = new Date();
today.setHours(0, 0, 0, 0);

const seedServices = [
  { id: 1, name: "Corte tradicional", duration: 40, price: 35, icon: "✂", description: "Corte completo com acabamento" },
  { id: 2, name: "Barba", duration: 30, price: 25, icon: "♢", description: "Modelagem, toalha quente e acabamento" },
  { id: 3, name: "Corte + barba", duration: 60, price: 55, icon: "★", description: "O combo completo da casa" }
];

const seedClients = [
  { name: "Lucas Mendes", phone: "31988881111", visits: 8, last: "Há 12 dias" },
  { name: "André Souza", phone: "31977772222", visits: 5, last: "Hoje" },
  { name: "Bruno Martins", phone: "31966663333", visits: 3, last: "Há 21 dias" },
  { name: "Carlos Henrique", phone: "31955554444", visits: 11, last: "Há 5 dias" },
  { name: "Mateus Lima", phone: "31944445555", visits: 2, last: "Há 32 dias" }
];

const seedProfessionals = [
  { id: 1, name: "Rafael", phone: "31999999999", specialty: "Cortes e barba", defaultDuration: 40, active: true, color: "#2f8f63" },
  { id: 2, name: "Marcos", phone: "31988888888", specialty: "Barba e acabamento", defaultDuration: 40, active: true, color: "#436bb2" }
];

const dateKey = date => date.toISOString().slice(0, 10);
const seedAppointments = [
  { id: 1, name: "André Souza", phone: "31977772222", service: "Corte tradicional", barber: "Rafael", date: dateKey(today), time: "09:00", price: 35, status: "confirmado" },
  { id: 2, name: "Carlos Henrique", phone: "31955554444", service: "Corte + barba", barber: "Rafael", date: dateKey(today), time: "11:00", price: 55, status: "confirmado" },
  { id: 3, name: "Bruno Martins", phone: "31966663333", service: "Barba", barber: "Marcos", date: dateKey(today), time: "16:00", price: 25, status: "aguardando" }
];

const state = {
  services: JSON.parse(localStorage.getItem("bf_services")) || seedServices,
  clients: JSON.parse(localStorage.getItem("bf_clients")) || seedClients,
  professionals: JSON.parse(localStorage.getItem("bf_professionals")) || seedProfessionals,
  weeklySchedule: JSON.parse(localStorage.getItem("bf_weekly_schedule")) || seedWeeklySchedule,
  specialWindows: JSON.parse(localStorage.getItem("bf_special_windows")) || [],
  appointments: JSON.parse(localStorage.getItem("bf_appointments")) || seedAppointments,
  selectedDate: new Date(today),
  phone: localStorage.getItem("bf_phone") || "5531999999999"
};
let applyingCloudState = false;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const money = value => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
const brDate = (date, options = {}) => new Intl.DateTimeFormat("pt-BR", options).format(date);
const sanitizePhone = value => value.replace(/\D/g, "");

function persist() {
  localStorage.setItem("bf_services", JSON.stringify(state.services));
  localStorage.setItem("bf_clients", JSON.stringify(state.clients));
  localStorage.setItem("bf_professionals", JSON.stringify(state.professionals));
  localStorage.setItem("bf_weekly_schedule", JSON.stringify(state.weeklySchedule));
  localStorage.setItem("bf_special_windows", JSON.stringify(state.specialWindows));
  localStorage.setItem("bf_appointments", JSON.stringify(state.appointments));
  if (!applyingCloudState) window.BarberCloud?.queueSave(exportState());
}

function exportState() {
  return {
    services: state.services,
    clients: state.clients,
    professionals: state.professionals,
    weeklySchedule: state.weeklySchedule,
    specialWindows: state.specialWindows,
    appointments: state.appointments,
    phone: state.phone
  };
}

function applyCloudState(data) {
  applyingCloudState = true;
  state.services = Array.isArray(data.services) ? data.services : state.services;
  state.clients = Array.isArray(data.clients) ? data.clients : state.clients;
  state.professionals = Array.isArray(data.professionals) ? data.professionals : state.professionals;
  state.weeklySchedule = data.weeklySchedule || state.weeklySchedule;
  state.specialWindows = Array.isArray(data.specialWindows) ? data.specialWindows : state.specialWindows;
  state.appointments = Array.isArray(data.appointments) ? data.appointments : state.appointments;
  state.phone = data.phone || state.phone;
  localStorage.setItem("bf_phone", state.phone);
  persist();
  applyingCloudState = false;
  $("#businessPhone").value = state.phone;
  renderDashboard();
  renderAgenda();
  renderClients();
  renderServices();
  renderProfessionals();
  renderScheduleSettings();
  renderBookingClients();
}

function showToast(title, text) {
  const toast = $("#toast");
  toast.querySelector("strong").textContent = title;
  toast.querySelector("small").textContent = text;
  toast.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function navigate(viewId) {
  $$(".view").forEach(view => view.classList.toggle("active", view.id === viewId));
  $$(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === viewId));
  const titles = { inicio: "Bom dia, Rafael! 👋", agenda: "Agenda", clientes: "Clientes", servicos: "Serviços", profissionais: "Profissionais", horarios: "Horários", configuracoes: "Configurações" };
  $("#pageTitle").textContent = titles[viewId];
  $(".sidebar").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (viewId === "agenda") renderAgenda();
  if (viewId === "clientes") renderClients();
  if (viewId === "servicos") renderServices();
  if (viewId === "profissionais") renderProfessionals();
  if (viewId === "horarios") renderScheduleSettings();
}

function todaysAppointments() {
  return state.appointments.filter(item => item.date === dateKey(today)).sort((a, b) => a.time.localeCompare(b.time));
}

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function getOperatingWindow(dateValue) {
  const special = state.specialWindows.find(item => item.date === dateValue);
  if (special) return special.closed ? null : { start: special.start, end: special.end };
  const day = WEEK_DAYS[parseLocalDate(dateValue).getDay()].key;
  const regular = state.weeklySchedule[day];
  return regular?.active ? { start: regular.start, end: regular.end } : null;
}

function getBookableTimes(dateValue) {
  const window = getOperatingWindow(dateValue);
  if (!window) return [];
  const start = timeToMinutes(window.start);
  const end = timeToMinutes(window.end);
  const times = [];
  for (let minute = start; minute < end; minute += 30) times.push(minutesToTime(minute));
  return times;
}

function renderDashboard() {
  const items = todaysAppointments();
  const revenue = items.reduce((sum, item) => sum + item.price, 0);
  $("#metricAppointments").textContent = items.length;
  $("#metricRevenue").textContent = money(revenue);
  $("#metricClients").textContent = state.clients.length + 19;
  $("#agendaBadge").textContent = items.length;
  $("#dayCountText").textContent = `${items.length} ${items.length === 1 ? "atendimento" : "atendimentos"}`;
  $("#todaySchedule").innerHTML = items.length ? items.slice(0, 4).map(item => `
    <div class="appointment">
      <div class="time"><strong>${item.time}</strong><small>${item.time < "12:00" ? "MANHÃ" : "TARDE"}</small></div>
      <div class="appointment-info ${item.status === "aguardando" ? "pending" : ""}">
        <strong>${item.name}</strong><small>${item.service} · com ${item.barber}</small>
      </div>
      <span class="status ${item.status === "aguardando" ? "pending" : ""}">${item.status}</span>
    </div>`).join("") : `<div class="appointment"><div></div><div class="appointment-info"><strong>Dia livre</strong><small>Que tal compartilhar seu link de agenda?</small></div></div>`;
}

function renderAgenda() {
  const key = dateKey(state.selectedDate);
  const items = state.appointments
    .filter(item => item.date === key)
    .sort((a, b) => a.time.localeCompare(b.time));
  $("#agendaDate").textContent = brDate(state.selectedDate, { weekday: "short", day: "2-digit", month: "short" }).replace(".", "");
  $("#summaryCount").textContent = items.length;
  $("#summaryRevenue").textContent = money(items.reduce((sum, item) => sum + item.price, 0));
  const times = [...new Set([...getBookableTimes(key), ...items.map(item => item.time)])].sort();
  if (!times.length) {
    $("#timeline").innerHTML = `<div class="empty-exceptions">Não há atendimento programado para este dia.</div>`;
    return;
  }
  $("#timeline").innerHTML = times.map(time => {
    const item = items.find(appt => appt.time === time);
    return `<div class="timeline-row"><div class="timeline-hour">${time}</div><div class="timeline-slot">${item ? `
      <div class="timeline-booking ${item.status === "aguardando" ? "pending" : ""}">
        <div><strong>${item.name}</strong><small>${item.service} · ${money(item.price)}</small></div>
        <button class="send-reminder" data-id="${item.id}" title="Enviar pelo WhatsApp">◉</button>
      </div>` : `<button class="empty-slot" data-time="${time}">＋ horário livre</button>`}</div></div>`;
  }).join("");
}

function renderClients(filter = "") {
  const normalized = filter.toLowerCase();
  const clients = state.clients.filter(client => `${client.name} ${client.phone}`.toLowerCase().includes(normalized));
  $("#clientTotal").textContent = `${state.clients.length} clientes cadastrados`;
  $("#clientList").innerHTML = clients.map(client => `
    <div class="client-row">
      <div class="avatar">${client.name.split(" ").slice(0, 2).map(part => part[0]).join("")}</div>
      <div><strong>${client.name}</strong><span>${formatPhone(client.phone)}</span></div>
      <div><strong>${client.visits} visitas</strong><small>histórico</small></div>
      <div><strong>${client.last}</strong><small>último atendimento</small></div>
      <button class="client-whatsapp" data-phone="${client.phone}" data-name="${client.name}">◉ WhatsApp</button>
    </div>`).join("") || `<div class="client-row"><div></div><strong>Nenhum cliente encontrado.</strong></div>`;
}

function renderBookingClients(query = "") {
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  const digits = sanitizePhone(query);
  const clients = state.clients
    .filter(client =>
      !normalized ||
      client.name.toLocaleLowerCase("pt-BR").includes(normalized) ||
      (digits && sanitizePhone(client.phone).includes(digits))
    )
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    .slice(0, 8);
  $("#bookingClientResults").innerHTML = clients.length ? clients.map(client => `
    <button class="client-result" type="button" data-client-phone="${sanitizePhone(client.phone)}">
      <span class="client-result-avatar">${initials(client.name)}</span>
      <span><strong>${client.name}</strong><small>${formatPhone(client.phone)}</small></span>
    </button>`).join("") : `<div class="client-search-empty">Nenhum cliente encontrado. Cadastre um novo abaixo.</div>`;
}

function selectBookingClient(phone) {
  const client = state.clients.find(item => sanitizePhone(item.phone) === sanitizePhone(phone));
  if (!client) return;
  $("#bookingClient").value = sanitizePhone(client.phone);
  $("#bookingClientSearch").value = `${client.name} · ${formatPhone(client.phone)}`;
  $("#bookingClientBox").classList.add("selected");
  $("#bookingClientResults").classList.remove("open");
}

function clearBookingClient() {
  $("#bookingClient").value = "";
  $("#bookingClientSearch").value = "";
  $("#bookingClientBox").classList.remove("selected");
}

function renderServices() {
  $("#serviceGrid").innerHTML = state.services.map(service => `
    <article class="service-card"><span>${service.icon}</span><h3>${service.name}</h3><p>${service.description} · ${service.duration} min</p>
    <footer><strong>${money(service.price)}</strong><button data-service-id="${service.id}">Editar</button></footer></article>`).join("");
  $("#bookingService").innerHTML = state.services.map(service => `<option value="${service.id}">${service.name} — ${money(service.price)}</option>`).join("");
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

function renderProfessionals() {
  $("#professionalGrid").innerHTML = state.professionals.map(professional => {
    const appointments = state.appointments.filter(item => item.barber === professional.name).length;
    return `
      <article class="professional-card" style="--professional-color:${professional.color}">
        <span class="professional-status ${professional.active ? "" : "inactive"}">${professional.active ? "Ativo" : "Inativo"}</span>
        <div class="professional-card-head">
          <div class="professional-avatar">${initials(professional.name)}</div>
          <div><h3>${professional.name}</h3><p>${professional.specialty}</p></div>
        </div>
        <div class="professional-details">
          <div><span>WhatsApp</span><strong>${formatPhone(professional.phone)}</strong></div>
          <div><span>Tempo médio</span><strong>${professional.defaultDuration} min</strong></div>
        </div>
        <footer><small>${appointments} ${appointments === 1 ? "agendamento" : "agendamentos"}</small><button data-professional-id="${professional.id}">Editar profissional</button></footer>
      </article>`;
  }).join("");

  const selected = $("#bookingBarber").value;
  const activeProfessionals = state.professionals.filter(item => item.active);
  $("#bookingBarber").innerHTML = activeProfessionals.map(item => `<option value="${item.name}">${item.name} · ${item.specialty}</option>`).join("");
  if (activeProfessionals.some(item => item.name === selected)) $("#bookingBarber").value = selected;
}

function renderScheduleSettings() {
  $("#weeklySchedule").innerHTML = WEEK_DAYS.map(day => {
    const schedule = state.weeklySchedule[day.key];
    return `
      <div class="weekly-row ${schedule.active ? "" : "closed"}" data-day="${day.key}">
        <label class="day-toggle"><input type="checkbox" ${schedule.active ? "checked" : ""}> ${day.label}</label>
        <div class="weekly-times">
          <input class="day-start" type="time" value="${schedule.start}">
          <span>até</span>
          <input class="day-end" type="time" value="${schedule.end}">
        </div>
      </div>`;
  }).join("");
  renderSpecialWindows();
}

function renderSpecialWindows() {
  const windows = [...state.specialWindows].sort((a, b) => a.date.localeCompare(b.date));
  $("#specialWindowsList").innerHTML = windows.length ? windows.map(item => {
    const date = parseLocalDate(item.date);
    return `
      <div class="exception-item">
        <div class="exception-date">${String(date.getDate()).padStart(2, "0")}<br>${brDate(date, { month: "short" }).replace(".", "").toUpperCase()}</div>
        <div><strong>${brDate(date, { weekday: "long" })}</strong><small>${item.closed ? "Fechado o dia inteiro" : `Atendimento das ${item.start} às ${item.end}`}</small></div>
        <button data-remove-window="${item.date}" aria-label="Remover janela de ${item.date}">×</button>
      </div>`;
  }).join("") : `<div class="empty-exceptions">Nenhuma alteração programada.</div>`;
}

function saveWeeklySchedule() {
  const rows = $$(".weekly-row");
  let invalid = false;
  rows.forEach(row => {
    const active = row.querySelector('input[type="checkbox"]').checked;
    const start = row.querySelector(".day-start").value;
    const end = row.querySelector(".day-end").value;
    if (active && timeToMinutes(start) >= timeToMinutes(end)) invalid = true;
    state.weeklySchedule[row.dataset.day] = { active, start, end };
  });
  if (invalid) {
    showToast("Confira os horários", "O horário final deve ser depois do horário inicial.");
    return;
  }
  persist();
  renderScheduleSettings();
  renderAgenda();
  showToast("Horários salvos", "A agenda já está usando a nova rotina semanal.");
}

function saveSpecialWindow(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const closed = data.get("closed") === "on";
  const date = data.get("date");
  const start = data.get("start");
  const end = data.get("end");
  if (!closed && timeToMinutes(start) >= timeToMinutes(end)) {
    showToast("Janela inválida", "O horário final deve ser depois do horário inicial.");
    return;
  }
  const special = { date, closed, start, end };
  const existingIndex = state.specialWindows.findIndex(item => item.date === date);
  if (existingIndex >= 0) state.specialWindows[existingIndex] = special;
  else state.specialWindows.push(special);
  persist();
  renderSpecialWindows();
  renderAgenda();
  event.currentTarget.reset();
  event.currentTarget.elements.date.value = dateKey(today);
  event.currentTarget.elements.start.value = "09:00";
  event.currentTarget.elements.end.value = "18:00";
  $(".special-time-fields").classList.remove("disabled");
  showToast("Janela programada", closed ? "O dia foi bloqueado para atendimentos." : `Atendimento definido das ${start} às ${end}.`);
}

function formatPhone(phone) {
  const p = sanitizePhone(phone).replace(/^55/, "");
  return p.length === 11 ? `(${p.slice(0,2)}) ${p.slice(2,7)}-${p.slice(7)}` : phone;
}

function whatsapp(phone, message) {
  const target = sanitizePhone(phone);
  window.open(`https://wa.me/${target.startsWith("55") ? target : "55" + target}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
}

function openBooking(prefillTime) {
  const form = $("#bookingForm");
  form.reset();
  setNewBookingClientMode(false);
  clearBookingClient();
  renderBookingClients();
  form.elements.date.value = dateKey(state.selectedDate);
  updateAvailableTimes(prefillTime);
  $("#bookingModal").classList.add("open");
  $("#bookingModal").setAttribute("aria-hidden", "false");
  setTimeout(() => form.elements.name.focus(), 100);
}

function setNewBookingClientMode(enabled) {
  const form = $("#bookingForm");
  $("#bookingNewClient").classList.toggle("open", enabled);
  $("#toggleNewBookingClient").hidden = enabled;
  $("#bookingClientSearch").disabled = enabled;
  form.elements.name.required = enabled;
  form.elements.phone.required = enabled;
  if (enabled) {
    clearBookingClient();
    $("#bookingClientResults").classList.remove("open");
    setTimeout(() => form.elements.name.focus(), 50);
  } else {
    form.elements.name.value = "";
    form.elements.phone.value = "";
  }
}

function updateAvailableTimes(preferredTime = "") {
  const form = $("#bookingForm");
  const date = form.elements.date.value;
  const barber = form.elements.barber.value;
  const occupiedTimes = new Set(
    state.appointments
      .filter(item => item.date === date && item.barber === barber)
      .map(item => item.time)
  );
  const availableTimes = getBookableTimes(date).filter(time => !occupiedTimes.has(time));
  const timeSelect = form.elements.time;

  timeSelect.innerHTML = availableTimes.length
    ? availableTimes.map(time => `<option value="${time}">${time}</option>`).join("")
    : `<option value="">Nenhum horário disponível nesta data</option>`;
  timeSelect.disabled = availableTimes.length === 0;
  form.querySelector('button[type="submit"]').disabled = availableTimes.length === 0;

  if (preferredTime && availableTimes.includes(preferredTime)) {
    timeSelect.value = preferredTime;
  }
}

function closeBooking() {
  $("#bookingModal").classList.remove("open");
  $("#bookingModal").setAttribute("aria-hidden", "true");
}

function openServiceEditor(serviceId) {
  const service = state.services.find(item => item.id === Number(serviceId));
  if (!service) return;
  const form = $("#serviceForm");
  form.elements.id.value = service.id;
  form.elements.name.value = service.name;
  form.elements.description.value = service.description;
  form.elements.duration.value = service.duration;
  form.elements.price.value = service.price;
  $("#serviceModal").classList.add("open");
  $("#serviceModal").setAttribute("aria-hidden", "false");
  setTimeout(() => form.elements.name.focus(), 100);
}

function closeServiceEditor() {
  $("#serviceModal").classList.remove("open");
  $("#serviceModal").setAttribute("aria-hidden", "true");
}

function openNewService() {
  const form = $("#newServiceForm");
  form.reset();
  $("#newServiceModal").classList.add("open");
  $("#newServiceModal").setAttribute("aria-hidden", "false");
  setTimeout(() => form.elements.name.focus(), 100);
}

function closeNewService() {
  $("#newServiceModal").classList.remove("open");
  $("#newServiceModal").setAttribute("aria-hidden", "true");
}

function updateProfessionalPreview() {
  const form = $("#professionalForm");
  const name = form.elements.name.value.trim();
  $("#professionalAvatarPreview").textContent = initials(name || "Novo Profissional");
  $("#professionalAvatarPreview").style.background = form.elements.color.value;
}

function openProfessionalEditor(professionalId = "") {
  const form = $("#professionalForm");
  const professional = state.professionals.find(item => item.id === Number(professionalId));
  form.reset();
  form.elements.id.value = professional?.id || "";
  form.elements.name.value = professional?.name || "";
  form.elements.phone.value = professional?.phone || "";
  form.elements.specialty.value = professional?.specialty || "";
  form.elements.defaultDuration.value = String(professional?.defaultDuration || 40);
  form.elements.active.value = String(professional?.active ?? true);
  const color = professional?.color || "#2f8f63";
  const colorInput = form.querySelector(`input[name="color"][value="${color}"]`);
  if (colorInput) colorInput.checked = true;
  $("#professionalModalEyebrow").textContent = professional ? "EDITAR PROFISSIONAL" : "NOVO PROFISSIONAL";
  $("#professionalModalTitle").textContent = professional ? "Dados do profissional" : "Adicionar à equipe";
  $("#saveProfessional").textContent = professional ? "Salvar alterações" : "Cadastrar profissional";
  updateProfessionalPreview();
  $("#professionalModal").classList.add("open");
  $("#professionalModal").setAttribute("aria-hidden", "false");
  setTimeout(() => form.elements.name.focus(), 100);
}

function closeProfessionalEditor() {
  $("#professionalModal").classList.remove("open");
  $("#professionalModal").setAttribute("aria-hidden", "true");
}

function saveProfessionalData(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const id = Number(data.get("id"));
  const existing = state.professionals.find(item => item.id === id);
  const name = data.get("name").trim();
  const duplicate = state.professionals.some(item => item.name.toLowerCase() === name.toLowerCase() && item.id !== id);
  if (duplicate) {
    showToast("Nome já cadastrado", "Já existe um profissional com esse nome.");
    return;
  }
  const previousName = existing?.name;
  const values = {
    id: existing?.id || Date.now(),
    name,
    phone: sanitizePhone(data.get("phone")),
    specialty: data.get("specialty").trim(),
    defaultDuration: Number(data.get("defaultDuration")),
    active: data.get("active") === "true",
    color: data.get("color")
  };
  if (existing) Object.assign(existing, values);
  else state.professionals.push(values);
  if (existing && previousName !== name) {
    state.appointments.forEach(item => { if (item.barber === previousName) item.barber = name; });
  }
  persist();
  renderProfessionals();
  renderDashboard();
  renderAgenda();
  closeProfessionalEditor();
  showToast(existing ? "Profissional atualizado" : "Profissional cadastrado", `${name} já está integrado à agenda.`);
}

function createService(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const name = data.get("name").trim();
  const duplicate = state.services.some(service => service.name.toLowerCase() === name.toLowerCase());
  if (duplicate) {
    showToast("Serviço já cadastrado", "Use outro nome ou edite o serviço existente.");
    return;
  }
  const service = {
    id: Date.now(),
    name,
    description: data.get("description").trim() || "Serviço personalizado",
    duration: Number(data.get("duration")),
    price: Number(data.get("price")),
    icon: data.get("icon")
  };
  state.services.push(service);
  persist();
  renderServices();
  closeNewService();
  showToast("Serviço cadastrado", `${service.name} já está disponível por ${money(service.price)}.`);
}

function saveService(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const service = state.services.find(item => item.id === Number(data.get("id")));
  if (!service) return;
  service.name = data.get("name").trim();
  service.description = data.get("description").trim();
  service.duration = Number(data.get("duration"));
  service.price = Number(data.get("price"));
  persist();
  renderServices();
  closeServiceEditor();
  showToast("Serviço atualizado", `${service.name} foi salvo com o valor de ${money(service.price)}.`);
}

function book(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const service = state.services.find(item => item.id === Number(data.get("service")));
  const selectedPhone = $("#bookingClientSearch").disabled ? "" : $("#bookingClient").value;
  const selectedClient = state.clients.find(client => sanitizePhone(client.phone) === selectedPhone);
  if (!selectedClient && !data.get("name")?.trim()) {
    showToast("Escolha um cliente", "Selecione alguém cadastrado ou cadastre um novo cliente.");
    return;
  }
  const occupied = state.appointments.some(item =>
    item.date === data.get("date") &&
    item.time === data.get("time") &&
    item.barber === data.get("barber")
  );
  if (occupied) {
    showToast("Horário indisponível", `${data.get("barber")} já possui um atendimento às ${data.get("time")}.`);
    return;
  }
  const appointment = {
    id: Date.now(),
    name: selectedClient?.name || data.get("name").trim(),
    phone: selectedClient ? sanitizePhone(selectedClient.phone) : sanitizePhone(data.get("phone")),
    service: service.name, barber: data.get("barber"), date: data.get("date"), time: data.get("time"),
    price: service.price, status: "confirmado"
  };
  state.appointments.push(appointment);
  const existing = state.clients.find(client => sanitizePhone(client.phone) === appointment.phone);
  if (!existing) state.clients.unshift({ name: appointment.name, phone: appointment.phone, visits: 0, last: "Novo cliente" });
  persist();
  renderBookingClients();
  closeBooking();
  renderDashboard();
  renderAgenda();
  showToast("Horário reservado!", `${appointment.name}, ${appointment.date.split("-").reverse().join("/")} às ${appointment.time}.`);
  setTimeout(() => {
    if (confirm("Agendamento salvo. Deseja abrir a confirmação pronta no WhatsApp?")) {
      whatsapp(appointment.phone, `Olá, ${appointment.name}! ✂️ Seu horário na Barbearia do Rafa está confirmado para ${appointment.date.split("-").reverse().join("/")} às ${appointment.time}. Serviço: ${appointment.service}. Até lá!`);
    }
  }, 250);
}

$("#todayLabel").textContent = brDate(today, { weekday: "long", day: "2-digit", month: "long" });
$("#businessPhone").value = state.phone;
renderDashboard();
renderAgenda();
renderClients();
renderBookingClients();
renderServices();
renderProfessionals();
renderScheduleSettings();
$("#specialWindowForm").elements.date.value = dateKey(today);

$$("[data-view]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.view)));
$$("[data-view-target]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.viewTarget)));
$$(".metric-link").forEach(card => card.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    navigate(card.dataset.viewTarget);
  }
}));
$$("[data-open-booking]").forEach(button => button.addEventListener("click", () => openBooking()));
$("[data-close-modal]").addEventListener("click", closeBooking);
$("#bookingModal").addEventListener("click", event => { if (event.target === event.currentTarget) closeBooking(); });
$("#bookingForm").addEventListener("submit", book);
$("#toggleNewBookingClient").addEventListener("click", () => setNewBookingClientMode(true));
$("#cancelNewBookingClient").addEventListener("click", () => setNewBookingClientMode(false));
$("#bookingClientSearch").addEventListener("focus", event => {
  if ($("#bookingClient").value) event.target.select();
  renderBookingClients($("#bookingClient").value ? "" : event.target.value);
  $("#bookingClientResults").classList.add("open");
});
$("#bookingClientSearch").addEventListener("input", event => {
  $("#bookingClient").value = "";
  $("#bookingClientBox").classList.remove("selected");
  renderBookingClients(event.target.value);
  $("#bookingClientResults").classList.add("open");
});
$("#bookingClientResults").addEventListener("click", event => {
  const result = event.target.closest("[data-client-phone]");
  if (result) selectBookingClient(result.dataset.clientPhone);
});
document.addEventListener("click", event => {
  if (!event.target.closest("#bookingClientBox")) $("#bookingClientResults").classList.remove("open");
});
$("#serviceForm").addEventListener("submit", saveService);
$("#newServiceForm").addEventListener("submit", createService);
$("#professionalForm").addEventListener("submit", saveProfessionalData);
$("#specialWindowForm").addEventListener("submit", saveSpecialWindow);
$("#serviceModal").addEventListener("click", event => { if (event.target === event.currentTarget) closeServiceEditor(); });
$("#newServiceModal").addEventListener("click", event => { if (event.target === event.currentTarget) closeNewService(); });
$("[data-close-service-modal]").addEventListener("click", closeServiceEditor);
$("[data-close-new-service-modal]").addEventListener("click", closeNewService);
$("[data-cancel-new-service]").addEventListener("click", closeNewService);
$("#professionalModal").addEventListener("click", event => { if (event.target === event.currentTarget) closeProfessionalEditor(); });
$("[data-close-professional-modal]").addEventListener("click", closeProfessionalEditor);
$("[data-cancel-professional]").addEventListener("click", closeProfessionalEditor);
$("#professionalForm").elements.name.addEventListener("input", updateProfessionalPreview);
$$('#professionalForm input[name="color"]').forEach(input => input.addEventListener("change", updateProfessionalPreview));
$("#saveSchedule").addEventListener("click", saveWeeklySchedule);
$("#weeklySchedule").addEventListener("change", event => {
  if (event.target.matches('input[type="checkbox"]')) {
    event.target.closest(".weekly-row").classList.toggle("closed", !event.target.checked);
  }
});
$("#specialWindowForm").elements.closed.addEventListener("change", event => {
  $(".special-time-fields").classList.toggle("disabled", event.target.checked);
});
$("#specialWindowsList").addEventListener("click", event => {
  const button = event.target.closest("[data-remove-window]");
  if (!button) return;
  state.specialWindows = state.specialWindows.filter(item => item.date !== button.dataset.removeWindow);
  persist();
  renderSpecialWindows();
  renderAgenda();
  showToast("Janela removida", "A data voltou a seguir a rotina semanal.");
});
$("#bookingForm").elements.date.addEventListener("change", () => updateAvailableTimes());
$("#bookingForm").elements.barber.addEventListener("change", () => updateAvailableTimes());
$(".mobile-menu").addEventListener("click", () => $(".sidebar").classList.toggle("open"));
$(".sidebar-overlay").addEventListener("click", () => $(".sidebar").classList.remove("open"));
$("#clientSearch").addEventListener("input", event => renderClients(event.target.value));
$("#prevDay").addEventListener("click", () => { state.selectedDate = new Date(state.selectedDate.getTime() - DAY); renderAgenda(); });
$("#nextDay").addEventListener("click", () => { state.selectedDate = new Date(state.selectedDate.getTime() + DAY); renderAgenda(); });

$("#timeline").addEventListener("click", event => {
  const empty = event.target.closest(".empty-slot");
  const reminder = event.target.closest(".send-reminder");
  if (empty) openBooking(empty.dataset.time);
  if (reminder) {
    const item = state.appointments.find(appt => appt.id === Number(reminder.dataset.id));
    whatsapp(item.phone, `Olá, ${item.name}! Passando para lembrar do seu horário hoje às ${item.time} na Barbearia do Rafa. Responda SIM para confirmar. ✂️`);
  }
});

$("#clientList").addEventListener("click", event => {
  const button = event.target.closest(".client-whatsapp");
  if (button) whatsapp(button.dataset.phone, `Fala, ${button.dataset.name.split(" ")[0]}! Tudo bem? Já está na hora de dar aquele trato no visual? Tenho alguns horários livres esta semana. ✂️`);
});

$("#shareLink").addEventListener("click", () => {
  const message = "Olá! Você pode escolher seu próximo horário na Barbearia do Rafa por aqui: https://barberflow.app/rafa-barbearia ✂️";
  whatsapp(state.phone, message);
});

$("#saveWhatsapp").addEventListener("click", () => {
  state.phone = sanitizePhone($("#businessPhone").value);
  localStorage.setItem("bf_phone", state.phone);
  showToast("WhatsApp configurado", "Número salvo. As mensagens inteligentes estão prontas.");
});

$("#newClient").addEventListener("click", () => {
  const name = prompt("Nome do cliente:");
  if (!name) return;
  const phone = prompt("WhatsApp do cliente:");
  if (!phone) return;
  state.clients.unshift({ name, phone: sanitizePhone(phone), visits: 0, last: "Novo cliente" });
  persist(); renderClients(); showToast("Cliente cadastrado", `${name} entrou para sua lista.`);
});

$("#newService").addEventListener("click", openNewService);
$("#newProfessional").addEventListener("click", () => openProfessionalEditor());

$("#serviceGrid").addEventListener("click", event => {
  const editButton = event.target.closest("[data-service-id]");
  if (editButton) openServiceEditor(editButton.dataset.serviceId);
});

$("#professionalGrid").addEventListener("click", event => {
  const editButton = event.target.closest("[data-professional-id]");
  if (editButton) openProfessionalEditor(editButton.dataset.professionalId);
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeBooking();
    closeServiceEditor();
    closeNewService();
    closeProfessionalEditor();
  }
});

$$("[data-auth-tab]").forEach(button => button.addEventListener("click", () => {
  $$("[data-auth-tab]").forEach(item => item.classList.toggle("active", item === button));
  $$(".auth-form").forEach(form => form.classList.toggle("active", form.id === `${button.dataset.authTab}Form`));
  $("#authMessage").textContent = "";
}));

$("#loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  try {
    await window.BarberCloud.signIn(data.get("email"), data.get("password"));
  } catch (error) {
    $("#authMessage").textContent = window.BarberCloud.translateError(error);
    $("#authMessage").className = "auth-message error";
  }
});

$("#signupForm").addEventListener("submit", async event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  try {
    await window.BarberCloud.signUp(data.get("email"), data.get("password"), data.get("shopName"));
  } catch (error) {
    $("#authMessage").textContent = window.BarberCloud.translateError(error);
    $("#authMessage").className = "auth-message error";
  }
});

$("#showResendConfirmation").addEventListener("click", () => {
  const form = $("#resendForm");
  form.classList.add("open");
  form.elements.email.value = localStorage.getItem("bf_pending_email") || $("#signupForm").elements.email.value || "";
  form.elements.email.focus();
});

$("#cancelResendConfirmation").addEventListener("click", () => $("#resendForm").classList.remove("open"));

$("#resendForm").addEventListener("submit", async event => {
  event.preventDefault();
  const email = event.currentTarget.elements.email.value.trim();
  const submit = event.currentTarget.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.textContent = "Enviando…";
  try {
    await window.BarberCloud.resendConfirmation(email);
    localStorage.setItem("bf_pending_email", email);
    event.currentTarget.classList.remove("open");
  } catch (error) {
    $("#authMessage").textContent = window.BarberCloud.translateError(error);
    $("#authMessage").className = "auth-message error";
  } finally {
    submit.disabled = false;
    submit.textContent = "Reenviar confirmação";
  }
});

$("#logoutButton").addEventListener("click", () => window.BarberCloud?.signOut());

window.BarberCloud?.start({
  getState: exportState,
  applyState: applyCloudState,
  notify: showToast
});
