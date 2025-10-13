import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, query, where, orderBy, Timestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDL8P7ovbVGD6gsxyzc8wyUvYk4rIJHEZ8",
  authDomain: "project-e8970.firebaseapp.com",
  projectId: "project-e8970",
  storageBucket: "project-e8970.appspot.com",
  messagingSenderId: "429996520936",
  appId: "1:429996520936:web:cbfe3e363119fc3f01605d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const monthSelect = document.getElementById("monthSelect");
const yearSelect = document.getElementById("yearSelect");
const tableBody = document.getElementById("timeTableBody");
const modeSelect = document.getElementById("modeSelect");
const modeLabel = document.getElementById("modeLabel");
const backBtn = document.getElementById("backBtn");

// Init months/years
const now = new Date();
for (let i = 0; i < 12; i++) {
  const option = document.createElement("option");
  option.value = i + 1;
  option.textContent = new Date(2000, i, 1).toLocaleString("th-TH", { month: "long" });
  if (i === now.getMonth()) option.selected = true;
  monthSelect.appendChild(option);
}

const thisYear = now.getFullYear();
for (let y = thisYear - 2; y <= thisYear; y++) {
  const option = document.createElement("option");
  option.value = y;
  option.textContent = y + 543;
  if (y === thisYear) option.selected = true;
  yearSelect.appendChild(option);
}

// Event Listeners
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

// Load Time Data
async function loadTimeData() {
  const month = parseInt(monthSelect.value, 10);     // 1-12
  const year  = parseInt(yearSelect.value, 10);      // ค.ศ.
  tableBody.innerHTML = "";

  // สร้างช่วงเวลา [start, end) ของเดือนที่เลือก
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end   = new Date(year, month, 1, 0, 0, 0, 0);

  try {
    // 1) ดึงรายชื่ออุปกรณ์ทั้งหมดในคอลเลกชัน Raspberry_pi
    const devicesSnap = await getDocs(collection(db, "Raspberry_pi"));
    if (devicesSnap.empty) {
      tableBody.innerHTML = `<tr><td colspan="3">ไม่พบอุปกรณ์</td></tr>`;
      return;
    }

    let found = 0;

    // 2) ไล่อ่าน subcollection detections ของแต่ละอุปกรณ์ ด้วยช่วงเวลา
    for (const deviceDoc of devicesSnap.docs) {
      const deviceId = deviceDoc.id;

      const detectionsCol = collection(db, "Raspberry_pi", deviceId, "detections");
      const qDet = query(
        detectionsCol,
        where("timestamp", ">=", Timestamp.fromDate(start)),
        where("timestamp", "<",  Timestamp.fromDate(end)),
        orderBy("timestamp", "asc")
      );

      const detSnap = await getDocs(qDet);

      detSnap.forEach(doc => {
        const data = doc.data();
        const ts = data.timestamp?.toDate?.();
        if (!ts) return;

        const date = ts.toLocaleDateString("th-TH");
        const time = ts.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${date}</td>
          <td>${time}</td>
          <td>${translateType(data.type)}</td>`;
        tableBody.appendChild(row);
        found++;
      });
    }

    if (found === 0) {
      tableBody.innerHTML = `<tr><td colspan="3">ไม่พบข้อมูลในเดือนที่เลือก</td></tr>`;
    }
  } catch (err) {
    console.error("อ่านข้อมูลล้มเหลว:", err);
    tableBody.innerHTML = `<tr><td colspan="3">เกิดข้อผิดพลาดในการดึงข้อมูล</td></tr>`;
  }
}

// แปลประเภทสัตว์จากภาษาอังกฤษเป็นไทย
function translateType(type) {
  const dict = {
    snake: "งู",
    mouse: "หนู",
    centipede: "ตะขาบ",
    lizard: "ตัวเงินตัวทอง"
  };
  
  return dict[type] || type;
}

// เรียกครั้งแรก
loadTimeData();
