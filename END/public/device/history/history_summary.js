// ======= history_summary.js (ใช้ข้อมูลจาก server.js) =======
const API_BASE = (window.API_BASE ?? "").replace(/\/+$/,"");

// ----- DOM -----
const monthSelect = document.getElementById('monthSelect');
const yearSelect  = document.getElementById('yearSelect');
const tableBody   = document.getElementById('summaryTableBody');
const modeSelect  = document.getElementById('modeSelect');

// ชนิดที่ต้องมีในตารางเสมอ (ภาษาไทย)
const requiredAnimals = ["งู", "ตะขาบ", "หนู", "ตัวเงินตัวทอง"];

// แมพชื่อจากค่าที่ backend ส่งมา -> ชื่อไทยที่จะแสดง
const typeMap = {
  "งู": "งู",
  "ตะขาบ": "ตะขาบ",
  "หนู": "หนู",
  "ตัวเงินตัวทอง": "ตัวเงินตัวทอง",
  "snake": "งู",
  "centipede": "ตะขาบ",
  "mouse": "หนู",
  "monitor lizard": "ตัวเงินตัวทอง",
  "water monitor": "ตัวเงินตัวทอง",
  "varanus": "ตัวเงินตัวทอง",
  "lizard": "ตัวเงินตัวทอง"
};

// ---------- init ----------
initMonthOptions();
initYearOptions();

monthSelect.addEventListener("change", loadSummaryFromServer);
yearSelect.addEventListener("change", loadSummaryFromServer);
modeSelect?.addEventListener("change", () => {
  if (modeSelect.value === "time") {
    window.location.href = "history_time.html";
  }
});

window.addEventListener("load", loadSummaryFromServer);

// เติมเดือน (ค่า value เป็นชื่อเดือนอังกฤษเพื่อคำนวณ index)
function initMonthOptions() {
  const months = [
    { value: "January", text: "มกราคม" },
    { value: "February", text: "กุมภาพันธ์" },
    { value: "March", text: "มีนาคม" },
    { value: "April", text: "เมษายน" },
    { value: "May", text: "พฤษภาคม" },
    { value: "June", text: "มิถุนายน" },
    { value: "July", text: "กรกฎาคม" },
    { value: "August", text: "สิงหาคม" },
    { value: "September", text: "กันยายน" },
    { value: "October", text: "ตุลาคม" },
    { value: "November", text: "พฤศจิกายน" },
    { value: "December", text: "ธันวาคม" }
  ];
  const thisMonth = new Date().getMonth(); // 0..11
  months.forEach((m, i) => {
    const opt = document.createElement("option");
    opt.value = m.value;
    opt.textContent = m.text;
    if (i === thisMonth) opt.selected = true;
    monthSelect.appendChild(opt);
  });
}

// เติมปี (value = ค.ศ. แต่โชว์เป็น พ.ศ.)
function initYearOptions() {
  const currentYearCE = new Date().getFullYear();
  for (let y = currentYearCE; y >= currentYearCE - 5; y--) {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = y + 543;
    yearSelect.appendChild(opt);
  }
  yearSelect.value = String(currentYearCE);
}

// ---------- ดึงข้อมูลจาก server.js แล้วสรุป ----------
async function loadSummaryFromServer() {
  const yearCE    = parseInt(yearSelect.value, 10);
  const monthName = monthSelect.value;
  const monthIdx  = new Date(`${monthName} 1, ${yearCE}`).getMonth(); // 0..11
  const monthForApi = monthIdx + 1; // API ต้องการ 1..12

  const counts = { "งู": 0, "ตะขาบ": 0, "หนู": 0, "ตัวเงินตัวทอง": 0 };

  tableBody.innerHTML = `<tr><td colspan="2" style="text-align:center">กำลังโหลดข้อมูล...</td></tr>`;

  try {
    const url = `${API_BASE}/history/time?month=${monthForApi}&year=${yearCE}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    const rows = Array.isArray(json?.data) ? json.data : [];
    rows.forEach(item => {
      const raw = String(item?.type || "").trim().toLowerCase();
      const mapped = typeMap[raw] ?? typeMap[raw.replaceAll("_", " ")] ?? null;
      if (mapped && counts.hasOwnProperty(mapped)) counts[mapped] += 1;
    });

  } catch (err) {
    console.error("โหลดจาก server ล้มเหลว:", err);
  } finally {
    tableBody.innerHTML = "";
    requiredAnimals.forEach(nameTH => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${nameTH}</td><td>${counts[nameTH] ?? 0} ครั้ง</td>`;
      tableBody.appendChild(tr);
    });
  }
}

// ปุ่มย้อนกลับ
function goBack() {
  window.location.href = "../list_device/device_list.html";
}
