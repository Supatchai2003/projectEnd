// ----- Firebase config -----
const firebaseConfig = {
  apiKey: "AIzaSyDL8P7ovbVGD6gsxyzc8wyUvYk4rIJHEZ8",
  authDomain: "project-e8970.firebaseapp.com",
  projectId: "project-e8970",
  storageBucket: "project-e8970.firebasestorage.app",
  messagingSenderId: "429996520936",
  appId: "1:429996520936:web:cbfe3e363119fc3f01605d"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ----- DOM -----
const monthSelect = document.getElementById('monthSelect');
const yearSelect = document.getElementById('yearSelect');
const tableBody = document.getElementById('summaryTableBody');
const modeSelect = document.getElementById('modeSelect');

// ----- สัตว์ที่ต้องแสดงผลเสมอ -----
const requiredAnimals = ["งู", "ตะขาบ", "หนู", "ตัวเงินตัวทอง"];

// แมปชื่อสัตว์: รองรับทั้งไทย/อังกฤษ/คำพ้อง
const typeMap = {
  "snake": "งู",

  "centipede": "ตะขาบ",

  "mouse": "หนู",

  "lizard": "ตัวเงินตัวทอง",
};

// เติมเดือนและปี แล้วโหลดข้อมูล
initMonthOptions();
initYearOptions();
monthSelect.addEventListener("change", loadSummary);
yearSelect.addEventListener("change", loadSummary);
modeSelect?.addEventListener("change", () => {
  if (modeSelect.value === "time") {
    window.location.href = "history_time.html";
  }
});
window.onload = loadSummary;

// ----- ฟังก์ชันเติมเดือน -----
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

  const thisMonth = new Date().getMonth(); // 0-11
  months.forEach((m, i) => {
    const option = document.createElement("option");
    option.value = m.value;      // ใช้ชื่อเดือนอังกฤษเพื่อคำนวณ index
    option.textContent = m.text; // แสดงผลภาษาไทย
    if (i === thisMonth) option.selected = true;
    monthSelect.appendChild(option);
  });
}

// ----- ฟังก์ชันเติมปี (แสดงผลเป็น พ.ศ. แต่ value เป็น ค.ศ.) -----
function initYearOptions() {
  const currentYearCE = new Date().getFullYear(); // ค.ศ.
  for (let y = currentYearCE; y >= currentYearCE - 5; y--) {
    const option = document.createElement("option");
    option.value = String(y);      // ค.ศ. สำหรับ query
    option.textContent = y + 543;  // แสดงผลเป็น พ.ศ.
    yearSelect.appendChild(option);
  }
  yearSelect.value = String(currentYearCE);
}

// ----- โหลดสรุปข้อมูล -----
async function loadSummary() {
  // ✅ ใช้ค่า ค.ศ. ตรงๆ จาก value (อย่าลบ 543)
  const yearCE = parseInt(yearSelect.value, 10);
  const monthName = monthSelect.value;
  const monthIndex = new Date(`${monthName} 1, ${yearCE}`).getMonth(); // 0-11

  const start = new Date(yearCE, monthIndex, 1);
  const end = new Date(yearCE, monthIndex + 1, 1);

  const startTimestamp = firebase.firestore.Timestamp.fromDate(start);
  const endTimestamp = firebase.firestore.Timestamp.fromDate(end);

  // เคลียร์ตารางก่อน
  tableBody.innerHTML = "";

  // เตรียมนับจำนวนแต่ละชนิด
  const counts = {
    "งู": 0,
    "ตะขาบ": 0,
    "หนู": 0,
    "ตัวเงินตัวทอง": 0
  };

  try {
    const devicesSnap = await db.collection("Raspberry_pi").get();

    const tasks = [];
    devicesSnap.forEach(doc => {
      const deviceId = doc.id;
      const q = db.collection("Raspberry_pi").doc(deviceId)
        .collection("detections")
        .where("timestamp", ">=", startTimestamp)
        .where("timestamp", "<", endTimestamp)
        .get()
        .then(res => {
          res.forEach(d => {
            const rawType = (d.data().type ?? "").toString().trim().toLowerCase();
            const mapped = typeMap[rawType];
            if (mapped && counts.hasOwnProperty(mapped)) {
              counts[mapped] += 1;
            }
          });
        });
      tasks.push(q);
    });

    await Promise.all(tasks);
  } catch (err) {
    console.error("โหลดข้อมูลผิดพลาด:", err);
  } finally {
    // เรนเดอร์ผลลัพธ์เสมอ (แม้ไม่มีข้อมูล)
    requiredAnimals.forEach(animal => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${animal}</td><td>${counts[animal] ?? 0} ครั้ง</td>`;
      tableBody.appendChild(row);
    });
  }
}

// ----- ปุ่มย้อนกลับ -----
function goBack() {
  window.location.href = "../list_device/device_list.html";
}
