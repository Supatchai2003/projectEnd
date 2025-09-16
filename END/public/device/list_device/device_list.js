const firebaseConfig = {
  apiKey: "AIzaSyDL8P7ovbVGD6gsxyzc8wyUvYk4rIJHEZ8",
  authDomain: "project-e8970.firebaseapp.com",
  projectId: "project-e8970",
  storageBucket: "project-e8970.appspot.com",
  messagingSenderId: "429996520936",
  appId: "1:429996520936:web:cbfe3e363119fc3f01605d"
};

let selectedDeviceId = null;

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function toggleMenu() {
  const menu = document.getElementById("menu");
  menu.style.display = menu.style.display === "flex" ? "none" : "flex";
}

// ==========================
// ✅ เพิ่มอุปกรณ์
// ==========================
function showPopup() {
  document.getElementById("popup").style.display = "flex";
}
function hidePopup() {
  document.getElementById("popup").style.display = "none";
}

async function addDevice() {
  const piid = document.getElementById("piid").value.trim();

  if (!piid) {
    alert("กรุณากรอก Serial ID");
    return;
  }

  try {
    const snapshot = await db.collection("Raspberry_pi").get();
    const foundDoc = snapshot.docs.find(doc => (doc.data().id || "").trim() === piid);

    if (!foundDoc) {
      alert("ไม่พบอุปกรณ์นี้ในฐานข้อมูล");
      return;
    }

    await foundDoc.ref.update({
      serial: foundDoc.id,
      status: "To be Added",
    });

    alert("เพิ่มอุปกรณ์สำเร็จ");
    hidePopup();
    loadDevices();
  } catch (err) {
    console.error("Error:", err);
    alert("เกิดข้อผิดพลาดในการเพิ่มอุปกรณ์");
  }
}

// ==========================
// ✅ แก้ไขอุปกรณ์
// ==========================
function showEditPopup(data) {
  selectedDeviceId = data.docId || data.id || data.serial;

  document.getElementById("v-ip").innerText = data.ip || "-";
  document.getElementById("v-serial").value = data.serial || data.id || "";
  document.getElementById("v-status").innerText = data.status || "ออฟไลน์";
  document.getElementById("v-date").innerText = data.createdAt || "ไม่ระบุ";

  document.getElementById("edit-popup").style.display = "flex";
}

function hideEditPopup() {
  document.getElementById("edit-popup").style.display = "none";
}

async function confirmEdit() {
  if (!selectedDeviceId) {
    alert("ไม่พบอุปกรณ์ที่จะอัปเดต");
    return;
  }
  const newSerial = document.getElementById("v-serial").value.trim();

  try {
    await db.collection("Raspberry_pi").doc(selectedDeviceId).update({
      serial: newSerial || null
    });
    alert("บันทึกการแก้ไขเรียบร้อย");
    hideEditPopup();
    loadDevices();
  } catch (err) {
    console.error("อัปเดตล้มเหลว:", err);
    alert("ไม่สามารถบันทึกการแก้ไขได้");
  }
}

// ==========================
// ✅ ลบอุปกรณ์
// ==========================
function deleteDevice() {
  if (!selectedDeviceId) {
    alert("ไม่พบอุปกรณ์ที่ต้องการลบ");
    return;
  }
  if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบอุปกรณ์นี้?")) return;

  db.collection("Raspberry_pi").doc(selectedDeviceId).delete()
    .then(() => {
      alert("ลบอุปกรณ์เรียบร้อยแล้ว");
      hideEditPopup();
      loadDevices();
    })
    .catch((err) => {
      console.error("ลบล้มเหลว:", err);
      alert("ไม่สามารถลบอุปกรณ์ได้");
    });
}

// ==========================
// ✅ หน้าอื่น ๆ
// ==========================
function goHome() {
  const role = localStorage.getItem("role");
  if (role === "manager") {
    window.location.href = "../../manager/homepage/M_homepage.html";
  } else {
    window.location.href = "../../device/list_device/device_list.html";
  }
}
function logout() {
  localStorage.clear();
  alert("ออกจากระบบเรียบร้อยแล้ว");
  window.location.href = "../../index.html";
}

// ==========================
// ✅ โหลดอุปกรณ์
// ==========================
function loadDevices() {
  const container = document.getElementById("device-list");
  container.innerHTML = "";

  db.collection("Raspberry_pi").get().then((snapshot) => {
    let index = 1;
    snapshot.forEach((doc) => {
      const data = doc.data();
      const used = Number(data.used) || 0;
      const total = Number(data.total) || 1;
      const usedPercent = Math.min(100, Math.round((used / total) * 100));

      const displaySerial = data.serial || data.id || doc.id;

      const div = document.createElement("div");
      div.className = "device-box";
      div.innerHTML = `
        <h3>${index++}. Raspberry pi Serial : ${displaySerial}
          <button class="edit-btn"
            onclick='showEditPopup(${JSON.stringify({ ...data, docId: doc.id })})'>✏️</button>
        </h3>
        <div class="bar-container">
          <div class="bar-used" style="width: ${usedPercent}%"></div>
        </div>
        <div class="bar-labels">
          <span>พื้นที่ทั้งหมด</span><span style="color:red;">🔴 ใช้ไปแล้ว</span>
        </div>
        <div class="status">สถานะ : ${data.status || 'ออฟไลน์'}</div>
      `;
      container.appendChild(div);
    });
  });
}

// ==========================
// ✅ Popup ประวัติ
// ==========================
function showHistoryPopup() {
  document.getElementById("history-popup").style.display = "flex";
}
function hideHistoryPopup() {
  document.getElementById("history-popup").style.display = "none";
}
function goToHistory(type) {
  if (type === 'summary') {
    window.location.href = "../../device/history/history_summary.html";
  } else if (type === 'daily') {
    window.location.href = "../../device/history/history_time.html";
  }
}

// โหลดครั้งแรก
loadDevices();
