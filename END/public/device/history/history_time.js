// ===== history_time.js — ดึงข้อมูลจาก server.js =====
const API_BASE = (window.API_BASE ?? "").replace(/\/+$/, "");

const monthSelect = document.getElementById("monthSelect");
const yearSelect  = document.getElementById("yearSelect");
const tableBody   = document.getElementById("timeTableBody");
const modeSelect  = document.getElementById("modeSelect");
const backBtn     = document.getElementById("backBtn");

// ===== Init months/years =====
const now = new Date();
for (let i = 0; i < 12; i++) {
  const option = document.createElement("option");
  option.value = i + 1; // 1-12
  option.textContent = new Date(2000, i, 1).toLocaleString("th-TH", { month: "long" });
  if (i === now.getMonth()) option.selected = true;
  monthSelect.appendChild(option);
}
const thisYear = now.getFullYear();
for (let y = thisYear - 2; y <= thisYear; y++) {
  const option = document.createElement("option");
  option.value = y; // ค.ศ.
  option.textContent = y + 543; // แสดง พ.ศ.
  if (y === thisYear) option.selected = true;
  yearSelect.appendChild(option);
}

// ===== Events =====
monthSelect.addEventListener("change", loadTimeData);
yearSelect.addEventListener("change", loadTimeData);

modeSelect.addEventListener("change", () => {
  if (modeSelect.value === "summary") {
    window.location.href = "history_summary.html";
  }
});

backBtn.addEventListener("click", () => {
  window.location.href = "../../device/list_device/device_list.html";
});

// ===== Helpers =====
function translateType(type) {
  const dict = { snake: "งู", mouse: "หนู", centipede: "ตะขาบ", lizard: "ตัวเงินตัวทอง" };
  return dict[type] || type || "-";
}

function fmtDateTime(tsMs) {
  const ts = new Date(tsMs);
  const date = ts.toLocaleDateString("th-TH");
  const time = ts.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  return { date, time };
}

// ===== Load Time Data from server.js =====
async function loadTimeData() {
  const month = parseInt(monthSelect.value, 10); // 1-12
  const year  = parseInt(yearSelect.value, 10);  // ค.ศ.
  tableBody.innerHTML = "";

  try {
    const url = `${API_BASE}/history/time?month=${month}&year=${year}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "server return error");

    const rows = json.data || [];
    if (rows.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="3">ไม่พบข้อมูลในเดือนที่เลือก</td></tr>`;
      return;
    }

    const frag = document.createDocumentFragment();
    for (const r of rows) {
      const { date, time } = fmtDateTime(r.ts);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${date}</td>
        <td>${time}</td>
        <td>${translateType(r.type)}</td>
      `;
      frag.appendChild(tr);
    }
    tableBody.appendChild(frag);
  } catch (err) {
    console.error("โหลดข้อมูลล้มเหลว:", err);
    tableBody.innerHTML = `<tr><td colspan="3">เกิดข้อผิดพลาดในการดึงข้อมูล</td></tr>`;
  }
}

// เรียกครั้งแรก
loadTimeData();