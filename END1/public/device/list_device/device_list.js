// ===== Base URL ของ backend =====
const API_BASE = "http://localhost:3000";

// ===== Popup Helper (เหมือนหน้าอื่น ๆ) =====
function openPopup(id, { message, type, onClose, autoCloseMs = 2000 } = {}) {
  const popup = document.getElementById(id);
  if (!popup) return;

  const content = popup.querySelector(".popup-content");
  const msgNode = popup.querySelector(".popup-message");
  const okBtn = popup.querySelector(".popup-ok");

  if (content) {
    content.classList.remove("popup-success", "popup-error");
    if (type === "success") content.classList.add("popup-success");
    else if (type === "error") content.classList.add("popup-error");
  }
  if (message && msgNode) msgNode.textContent = message;

  popup.style.display = "flex";

  if (okBtn) {
    const newOk = okBtn.cloneNode(true);
    okBtn.replaceWith(newOk);
    newOk.addEventListener("click", () => closePopup(id, onClose));
  }
  if (autoCloseMs && autoCloseMs > 0) {
    setTimeout(() => closePopup(id, onClose), autoCloseMs);
  }
}
function closePopup(id, onClose) {
  const popup = document.getElementById(id);
  if (!popup) return;
  popup.style.display = "none";
  if (typeof onClose === "function") onClose();
}

// ===== UI/State =====
let selectedDeviceId = null;

function toggleMenu() {
  const menu = document.getElementById("menu");
  menu.style.display = menu.style.display === "flex" ? "none" : "flex";
}

// ===== เพิ่มอุปกรณ์ =====
function showPopup() {
  document.getElementById("popup").style.display = "flex";
}
function hidePopup() {
  document.getElementById("popup").style.display = "none";
}
async function addDevice() {
  const piid = document.getElementById("piid").value.trim();
  if (!piid) {
    openPopup("popup-error", { message: "กรุณากรอก Serial ID", type: "error" });
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/devices/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ piid })
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      openPopup("popup-error", { message: json.message || "เพิ่มอุปกรณ์ไม่สำเร็จ", type: "error" });
      return;
    }
    openPopup("popup-success", {
      message: "เพิ่มอุปกรณ์สำเร็จ",
      type: "success",
      onClose: () => { hidePopup(); loadDevices(); }
    });
  } catch (e) {
    console.error(e);
    openPopup("popup-error", { message: "เกิดข้อผิดพลาดในการเพิ่มอุปกรณ์", type: "error" });
  }
}

// ===== แก้ไขอุปกรณ์ =====
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
    openPopup("popup-error", { message: "ไม่พบอุปกรณ์ที่จะอัปเดต", type: "error" });
    return;
  }
  const newSerial = document.getElementById("v-serial").value.trim();
  try {
    const res = await fetch(`${API_BASE}/devices/${encodeURIComponent(selectedDeviceId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serial: newSerial || null })
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      openPopup("popup-error", { message: json.message || "บันทึกไม่สำเร็จ", type: "error" });
      return;
    }
    openPopup("popup-success", {
      message: "บันทึกการแก้ไขเรียบร้อย",
      type: "success",
      onClose: () => { hideEditPopup(); loadDevices(); }
    });
  } catch (e) {
    console.error(e);
    openPopup("popup-error", { message: "ไม่สามารถบันทึกการแก้ไขได้", type: "error" });
  }
}

// ===== ลบอุปกรณ์ =====
async function deleteDevice() {
  if (!selectedDeviceId) {
    openPopup("popup-error", { message: "ไม่พบอุปกรณ์ที่ต้องการลบ", type: "error" });
    return;
  }

  // ใช้ popup-confirm: กดตกลงแล้วค่อยลบ
  openPopup("popup-confirm", {
    message: "คุณแน่ใจหรือไม่ว่าต้องการลบอุปกรณ์นี้?",
    type: "error",
    autoCloseMs: null,
    onClose: async () => {
      try {
        const res = await fetch(`${API_BASE}/devices/${encodeURIComponent(selectedDeviceId)}`, {
          method: "DELETE"
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          openPopup("popup-error", { message: json.message || "ลบไม่สำเร็จ", type: "error" });
          return;
        }
        openPopup("popup-success", {
          message: "ลบอุปกรณ์เรียบร้อยแล้ว",
          type: "success",
          onClose: () => { hideEditPopup(); loadDevices(); }
        });
      } catch (e) {
        console.error(e);
        openPopup("popup-error", { message: "ไม่สามารถลบอุปกรณ์ได้", type: "error" });
      }
    }
  });
}

// ===== หน้าอื่น ๆ =====
function goHome() {
  const role = localStorage.getItem("role");
  if (role === "superadmin") {
    window.location.href = "../../manager/homepage/M_homepage.html";
  } else {
    window.location.href = "../../device/list_device/device_list.html";
  }
}
function logout() {
  localStorage.clear();
  openPopup("popup-success", {
    message: "ออกจากระบบเรียบร้อยแล้ว",
    type: "success",
    onClose: () => window.location.href = "../../index.html"
  });
}

// ===== โหลดรายการอุปกรณ์ =====
async function loadDevices() {
  const container = document.getElementById("device-list");
  container.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE}/devices`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      openPopup("popup-error", { message: json.message || "โหลดรายการอุปกรณ์ไม่สำเร็จ", type: "error" });
      return;
    }
    let index = 1;
    (json.data || []).forEach((item) => {
      const used = Number(item.used) || 0;
      const total = Number(item.total) || 1;
      const usedPercent = Math.min(100, Math.round((used / total) * 100));
      const displaySerial = item.serial || item.id || item.id; // fallback

      const div = document.createElement("div");
      div.className = "device-box";
      div.innerHTML = `
        <h3>${index++}. Raspberry pi Serial : ${displaySerial}
          <button class="edit-btn"
            onclick='showEditPopup(${JSON.stringify({ ...item, docId: item.id })})'>✏️</button>
        </h3>
        <div class="bar-container">
          <div class="bar-used" style="width: ${usedPercent}%"></div>
        </div>
        <div class="bar-labels">
          <span>พื้นที่ทั้งหมด</span><span style="color:red;">🔴 ใช้ไปแล้ว</span>
        </div>
        <div class="status">สถานะ : ${item.status || 'ออฟไลน์'}</div>
      `;
      container.appendChild(div);
    });
  } catch (e) {
    console.error(e);
    openPopup("popup-error", { message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", type: "error" });
  }
}

// --- ใช้ของเดิมได้ ---
function showHistoryPopup(){ document.getElementById("history-popup").style.display = "flex"; }
function hideHistoryPopup(){ document.getElementById("history-popup").style.display = "none"; }
function goToHistory(type){
  if (type === 'summary') window.location.href = "../../device/history/history_summary.html";
  if (type === 'daily')   window.location.href = "../../device/history/history_time.html";
}

// ✅ ผูกคลิกให้ปุ่มนาฬิกาและปุ่มใน popup หลัง DOM โหลดเสร็จ
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("history-btn");
  if (btn) btn.addEventListener("click", showHistoryPopup);

  const closeBtn = document.getElementById("history-close");
  if (closeBtn) closeBtn.addEventListener("click", hideHistoryPopup);

  const sumBtn = document.getElementById("go-history-summary");
  if (sumBtn) sumBtn.addEventListener("click", () => goToHistory("summary"));

  const dailyBtn = document.getElementById("go-history-daily");
  if (dailyBtn) dailyBtn.addEventListener("click", () => goToHistory("daily"));
});


// เริ่มทำงาน
loadDevices();
