// ====== Config ======
const API_BASE = "http://localhost:3000"; // ชี้ไปที่ server.js

// ====== Popup Helper (รองรับหลาย popup ต่อหน้า) ======
function openPopup(id, { message, type, onClose, autoCloseMs = 2000 } = {}) {
  const popup = document.getElementById(id);
  if (!popup) return;

  const content = popup.querySelector(".popup-content");
  const msgNode = popup.querySelector(".popup-message");
  const okBtn = popup.querySelector(".popup-ok");

  // สี/สถานะ
  if (content) {
    content.classList.remove("popup-success", "popup-error");
    if (type === "success") content.classList.add("popup-success");
    else if (type === "error") content.classList.add("popup-error");
  }

  // ข้อความ
  if (message && msgNode) msgNode.textContent = message;

  // แสดง
  popup.style.display = "flex";

  // กัน event ซ้อน
  if (okBtn) {
    const newOk = okBtn.cloneNode(true);
    okBtn.replaceWith(newOk);
    newOk.addEventListener("click", () => closePopup(id, onClose));
  }

  // ปิดอัตโนมัติ (ถ้ากำหนด)
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

// ====== Gate สิทธิ์ ======
const role = localStorage.getItem("role");
if (role !== "superadmin") {
  openPopup("popup-noauth", {
    type: "error",
    autoCloseMs: 2000,
    onClose: () => {
      if (!role) window.location.href = "../../index.html";
      else window.location.href = "../../device/list_device/device_list.html";
    }
  });
}

// ====== Params ======
const userId = new URLSearchParams(window.location.search).get("id");

// ====== Actions bound from HTML ======
function cancel() {
  window.location.href = "../../manager/list_admin/M_admin_list.html";
}

function togglePassword() {
  const pw = document.getElementById("password");
  if (!pw) return;
  pw.type = pw.type === "password" ? "text" : "password";
}

// ====== โหลดข้อมูลผู้ใช้ (ผ่าน backend) ======
async function loadAdmin() {
  try {
    const res = await fetch(`${API_BASE}/get-user/${userId}`);
    const json = await res.json();

    if (!res.ok || !json.success) {
      openPopup("popup-loadfail", { type: "error", autoCloseMs: null });
      return;
    }

    const data = json.data || {};
    document.getElementById("name").value = data.name || "";
    document.getElementById("username").value = data.username || "";
  } catch (err) {
    console.error("โหลดข้อมูลล้มเหลว:", err);
    openPopup("popup-error", { message: "โหลดข้อมูลไม่สำเร็จ", type: "error", autoCloseMs: null });
  }
}

// ====== อัปเดตผู้ใช้ (ผ่าน backend เพื่อให้ bcrypt ทำงานฝั่ง server) ======
async function updateAdmin() {
  const name = document.getElementById("name").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!name) {
    openPopup("popup-error", { message: "กรุณาระบุชื่อ", type: "error" });
    return;
  }

  // เตรียม payload ให้ server ตัดสินใจ hash
  const body = { name };
  if (password.length > 0) {
    if (password.length < 8) {
      openPopup("popup-error", { message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร", type: "error" });
      return;
    }
    body.password = password; // ส่งไปให้ server.js hash ด้วย bcrypt
  }

  try {
    const res = await fetch(`${API_BASE}/update-user/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      openPopup("popup-error", {
        message: json?.message || "บันทึกไม่สำเร็จ",
        type: "error",
        autoCloseMs: null
      });
      return;
    }

    openPopup("popup-save", {
      type: "success",
      autoCloseMs: 1500,
      onClose: () => window.location.href = "../../manager/list_admin/M_admin_list.html"
    });
  } catch (err) {
    console.error("อัปเดตล้มเหลว:", err);
    openPopup("popup-error", { message: "บันทึกไม่สำเร็จ", type: "error", autoCloseMs: null });
  }
}

// ====== ลบบัญชีผู้ใช้ (ผ่าน backend) ======
async function deleteAdmin() {
  // ถ้ามี popup-confirm แยก ก็ใช้; ถ้าไม่มี ใช้ fallback ด้านล่าง
  const confirmEl = document.getElementById("popup-confirm");
  if (confirmEl) {
    const okBtn = confirmEl.querySelector(".popup-ok");
    const cancelBtn = confirmEl.querySelector(".popup-cancel");

    if (okBtn) okBtn.replaceWith(okBtn.cloneNode(true));
    if (cancelBtn) cancelBtn.replaceWith(cancelBtn.cloneNode(true));

    const newOk = confirmEl.querySelector(".popup-ok");
    const newCancel = confirmEl.querySelector(".popup-cancel");

    confirmEl.style.display = "flex";

    newOk.addEventListener("click", async () => {
      confirmEl.style.display = "none";
      await doDelete();
    });
    newCancel.addEventListener("click", () => {
      confirmEl.style.display = "none";
    });
  } else {
    // fallback: ใช้ popup แจ้งก่อน แล้วค่อยลบเมื่อปิด
    openPopup("popup-error", {
      message: "คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้?",
      type: "error",
      autoCloseMs: null,
      onClose: async () => { await doDelete(); }
    });
  }

  async function doDelete() {
    try {
      const res = await fetch(`${API_BASE}/delete-user/${userId}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        openPopup("popup-error", {
          message: json?.message || "ลบไม่สำเร็จ",
          type: "error",
          autoCloseMs: null
        });
        return;
      }

      openPopup("popup-delete", {
        type: "success",
        autoCloseMs: 1500,
        onClose: () => window.location.href = "../../manager/list_admin/M_admin_list.html"
      });
    } catch (err) {
      console.error("ลบล้มเหลว:", err);
      openPopup("popup-error", { message: "ลบไม่สำเร็จ", type: "error", autoCloseMs: null });
    }
  }
}

// ====== Startup ======
loadAdmin();

// ====== Expose for HTML ======
window.cancel = cancel;
window.togglePassword = togglePassword;
window.updateAdmin = updateAdmin;
window.deleteAdmin = deleteAdmin;
