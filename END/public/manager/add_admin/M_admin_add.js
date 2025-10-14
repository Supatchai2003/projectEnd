// ===== API base URL =====
const API_BASE = "https://project-e8970.web.app";

// ===== Popup Helper =====
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

  popup.style.display = "flex";

  // กัน event ซ้อน
  if (okBtn) {
    const newOk = okBtn.cloneNode(true);
    okBtn.replaceWith(newOk);
    newOk.addEventListener("click", () => closePopup(id, onClose));
  }

  // ปิดอัตโนมัติ
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

// ===== Gate: ตรวจสิทธิ์ Superadmin =====
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

// ===== Helper =====
function _val(id) { return document.getElementById(id).value.trim(); }

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function cancel() {
  window.location.href = "../../manager/list_admin/M_admin_list.html";
}

// ===== เพิ่มบัญชีแอดมิน =====
async function addAdmin() {
  const payload = {
    username: _val("username"),
    password: _val("password"),
    name: _val("name"),
    gender: _val("gender"),
    gmail: _val("gmail"),
    phone: _val("phone"),
    address: {
      province: _val("province"),
      district: _val("district"),
      sub_district: _val("sub_district"),
      postal_code: _val("postal_code"),
    },
  };

  // ---- ตรวจข้อมูล ----
  if (!payload.username || !payload.password || !payload.name || !payload.gender) {
    openPopup("popup-error", { message: "กรอกชื่อเข้าใช้งาน/รหัสผ่าน/ชื่อ-นามสกุล/เพศ ให้ครบ", type: "error" });
    return;
  }
  if (payload.password.length < 8) {
    openPopup("popup-error", { message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร", type: "error" });
    return;
  }
  if (!payload.gmail || !isEmail(payload.gmail)) {
    openPopup("popup-error", { message: "กรุณากรอกอีเมลให้ถูกต้อง", type: "error" });
    return;
  }
  if (!payload.phone) {
    openPopup("popup-error", { message: "กรุณากรอกเบอร์โทรศัพท์", type: "error" });
    return;
  }
  const a = payload.address;
  if (!a.province || !a.district || !a.sub_district || !a.postal_code) {
    openPopup("popup-error", { message: "กรุณากรอกที่อยู่ให้ครบ (จังหวัด/อำเภอ/ตำบล/รหัสไปรษณีย์)", type: "error" });
    return;
  }

  // ---- เรียก backend (bcrypt เข้ารหัสฝั่ง server.js) ----
  try {
    const response = await fetch(`${API_BASE}/add-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.success) {
      openPopup("popup-success", {
        message: "เพิ่มบัญชีแอดมินสำเร็จ",
        type: "success",
        onClose: () => window.location.href = "../../manager/list_admin/M_admin_list.html"
      });
    } else {
      openPopup("popup-error", { message: result.message || "เกิดข้อผิดพลาด", type: "error" });
    }
  } catch (err) {
    console.error("Add admin error:", err);
    openPopup("popup-error", { message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", type: "error" });
  }
}

// ===== Expose =====
window.cancel = cancel;
window.addAdmin = addAdmin;
