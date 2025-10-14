// ===== Base URL ของ backend =====
const API_BASE = "https://project-e8970.web.app";

// ===== Popup Helper (เหมือนเดิม) =====
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

// ===== Popup เพิ่มอุปกรณ์ =====
function showPopup() { document.getElementById("popup").style.display = "flex"; }
function hidePopup() { document.getElementById("popup").style.display = "none"; }

async function addDevice() {
  const piid = document.getElementById("piid").value.trim();
  if (!piid) {
    openPopup("popup-error", { message: "กรุณากรอก ID ของอุปกรณ์", type: "error" });
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/devices/add`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ piid })
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      openPopup("popup-error", { message: json.message || "เพิ่มอุปกรณ์ไม่สำเร็จ", type: "error" });
      return;
    }
    openPopup("popup-success", {
      message: "เพิ่มอุปกรณ์สำเร็จ", type: "success",
      onClose: () => { hidePopup(); loadDevices(); }
    });
  } catch (e) {
    console.error(e);
    openPopup("popup-error", { message: "เกิดข้อผิดพลาดในการเพิ่มอุปกรณ์", type: "error" });
  }
}

// ===== Popup แก้ไข =====
function showEditPopup(data) {
  selectedDeviceId = data.docId;  // ใช้ document id ในการ PUT/DELETE
  document.getElementById("v-ip").innerText = data.ip || "-";
  document.getElementById("v-serial").value = data.id || "";
  document.getElementById("v-status").innerText = data.status || "ออฟไลน์";
  document.getElementById("v-date").innerText = data.createdAt || "ไม่ระบุ";
  document.getElementById("edit-popup").style.display = "flex";
}
function hideEditPopup() { document.getElementById("edit-popup").style.display = "none"; }

async function confirmEdit() {
  if (!selectedDeviceId) {
    openPopup("popup-error", { message: "ไม่พบอุปกรณ์ที่จะอัปเดต", type: "error" });
    return;
  }
  const newIdValue = document.getElementById("v-serial").value.trim();
  try {
    const res = await fetch(`${API_BASE}/devices/${encodeURIComponent(selectedDeviceId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: newIdValue || null })
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
  openPopup("popup-confirm", {
    message: "คุณแน่ใจหรือไม่ว่าต้องการลบอุปกรณ์นี้?",
    type: "error", autoCloseMs: null,
    onClose: async () => {
      try {
        const res = await fetch(`${API_BASE}/devices/${encodeURIComponent(selectedDeviceId)}`, { method: "DELETE" });
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

// ===== helper: อ่านค่า query string =====
function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

// ===== โหลดอุปกรณ์ (เรนเดอร์ให้เหมือนภาพ) =====
async function loadDevices() {
  const container = document.getElementById("device-list");
  container.innerHTML = "";

  const wantId = getQueryParam("id"); // รองรับการเปิดด้วย id เดียว

  try {
    let json;
    if (wantId) {
      const res = await fetch(`${API_BASE}/devices/${encodeURIComponent(wantId)}`);
      json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        openPopup("popup-error", { message: json.message || "ไม่พบอุปกรณ์ตาม id", type: "error" });
        return;
      }
      json = { success: true, data: [json.data] };
    } else {
      const res = await fetch(`${API_BASE}/devices`);
      json = await res.json();
      if (!res.ok || !json.success) {
        openPopup("popup-error", { message: json.message || "โหลดรายการอุปกรณ์ไม่สำเร็จ", type: "error" });
        return;
      }
    }

    let index = 1;
    (json.data || []).forEach((item) => {
      const used = Number(item.used) || 0;
      const total = Number(item.total) || 1;
      const usedPercent = Math.max(0, Math.min(100, Math.round((used / total) * 100)));
      const displayId = item.id ?? item.docId;
      const online = String(item.status || "").toLowerCase() === "online";

      const wrap = document.createElement("div");
      wrap.className = "device-item";
      wrap.innerHTML = `
        <div class="device-header">
          <div class="device-name">${index++}. Raspberry pi Serial : ${displayId}</div>
          <button class="edit-btn" title="แก้ไข" onclick='showEditPopup(${JSON.stringify({ ...item })})'>✏️</button>
        </div>

        <div class="progress-wrap">
          <div class="progress-bar">
            <div class="progress-used" style="width:${usedPercent}%"></div>
          </div>
        </div>

        <div class="progress-legends">
          <div class="legend-left">
            <span><span class="dot dot-gray"></span>พื้นที่จัดเก็บ</span>
            <span><span class="dot dot-red"></span>ใช้ไปแล้ว</span>
          </div>
          <div>พื้นที่ทั้งหมด</div>
        </div>

        <div class="device-footer">
          <span class="${online ? "state-online" : "state-offline"}">สถานะ : ${item.status || "ออฟไลน์"}</span>
        </div>
      `;
      container.appendChild(wrap);
    });
  } catch (e) {
    console.error(e);
    openPopup("popup-error", { message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", type: "error" });
  }
}

// ===== หน้าอื่น ๆ =====
function goHome() {
  const role = localStorage.getItem("role");
  document.getElementById("role-label").innerText = role ? role : "User";
  if (role === "superadmin") {
    window.location.href = "../../manager/homepage/M_homepage.html";
  } else {
    window.location.href = "../../device/list_device/device_list.html";
  }
}

// ===== Popup ประวัติ =====
function showHistoryPopup() { document.getElementById("history-popup").style.display = "flex"; }
function hideHistoryPopup() { document.getElementById("history-popup").style.display = "none"; }
function goToHistory(type) {
  if (type === "summary") window.location.href = "../../device/history/history_summary.html";
  if (type === "daily") window.location.href = "../../device/history/history_time.html";
}
function logout() {
  localStorage.clear();

  const popup = document.getElementById("popup-logout");
  const msg = document.getElementById("popup-message");
  const okBtn = document.getElementById("popup-ok");

  msg.textContent = "ออกจากระบบเรียบร้อยแล้ว";
  popup.style.display = "flex";

  okBtn.onclick = function () {
    popup.style.display = "none";
    window.location.href = "../../index.html";
  };
}

// ===== เริ่มทำงาน =====
document.addEventListener("DOMContentLoaded", () => {
  // ใส่ role บนมุมซ้ายให้ด้วย
  const role = localStorage.getItem("role");
  document.getElementById("role-label").innerText = role ? role : "User";
  loadDevices();
});
