// ===== CONFIG =====
const API_BASE = "http://localhost:3000"; // เปลี่ยนตามพอร์ต/โดเมน backend

// ===== POPUP helper =====
function openPopup(id, { message, type, onClose, autoCloseMs = 2000 } = {}) {
  const el = document.getElementById(id); if (!el) return;
  const msg = el.querySelector(".popup-message"); const ct = el.querySelector(".popup-content"); const ok = el.querySelector(".popup-ok");
  if (ct) { ct.classList.remove("popup-success", "popup-error"); if (type === "success") ct.classList.add("popup-success"); if (type === "error") ct.classList.add("popup-error"); }
  if (message && msg) msg.textContent = message;
  el.style.display = "flex";
  if (ok) { const n = ok.cloneNode(true); ok.replaceWith(n); n.addEventListener("click", () => closePopup(id, onClose)); }
  if (autoCloseMs) { setTimeout(() => closePopup(id, onClose), autoCloseMs); }
}
function closePopup(id, onClose) { const el = document.getElementById(id); if (!el) return; el.style.display = "none"; if (typeof onClose === "function") onClose(); }

// ===== ROLE guard =====
const role = localStorage.getItem("role");
if (role !== "superadmin") {
  openPopup("popup-noauth", {
    type: "error",
    autoCloseMs: 2000,
    onClose: () => window.location.href = "../../index.html"
  });
}

// ===== PARAMS =====
const userId = new URLSearchParams(window.location.search).get("id");

// ===== Actions =====
function cancel() { window.location.href = "../../manager/list_admin/M_admin_list.html"; }

// ===== Load user =====
async function loadAdmin() {
  try {
    const res = await fetch(`${API_BASE}/get-user/${userId}`);
    const json = await res.json();
    if (!res.ok || !json.success) { openPopup("popup-loadfail", { type: "error", autoCloseMs: null }); return; }
    const d = json.data || {};

    // เติมค่า
    document.getElementById("name").value = d.name || "";
    document.getElementById("username").value = d.username || "";
    document.getElementById("gender").value = d.gender || "";
    document.getElementById("gmail").value = d.gmail || "";
    document.getElementById("phone").value = d.phone || "";

    const addr = d.address || {};
    document.getElementById("province").value = addr.province || "";
    document.getElementById("district").value = addr.district || "";
    document.getElementById("sub_district").value = addr.sub_district || "";
    document.getElementById("postal_code").value = addr.postal_code || "";
  } catch (err) {
    console.error(err);
    openPopup("popup-error", { message: "โหลดข้อมูลไม่สำเร็จ", type: "error", autoCloseMs: null });
  }
}

// ===== Update user =====
async function updateAdmin() {
  const name = document.getElementById("name").value.trim();
  const pass = document.getElementById("password").value.trim();
  const gender = document.getElementById("gender").value;
  const gmail = document.getElementById("gmail").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const province = document.getElementById("province").value.trim();
  const district = document.getElementById("district").value.trim();
  const sub_district = document.getElementById("sub_district").value.trim();
  const postal_code = document.getElementById("postal_code").value.trim();

  if (!name) { return openPopup("popup-error", { message: "กรุณาระบุชื่อ", type: "error" }); }
  if (pass && pass.length < 8) { return openPopup("popup-error", { message: "รหัสผ่านต้อง ≥ 8 ตัวอักษร", type: "error" }); }
  if (gmail && !/^\S+@\S+\.\S+$/.test(gmail)) { return openPopup("popup-error", { message: "อีเมลไม่ถูกต้อง", type: "error" }); }

  const payload = {
    name, gender, gmail, phone,
    address: { province, district, sub_district, postal_code }
  };
  if (pass) payload.password = pass; // ให้ server ทำ bcrypt

  try {
    const res = await fetch(`${API_BASE}/update-user/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return openPopup("popup-error", { message: json?.message || "บันทึกไม่สำเร็จ", type: "error", autoCloseMs: null });
    }
    openPopup("popup-save", { type: "success", autoCloseMs: 1500, onClose: () => cancel() });
  } catch (err) {
    console.error(err);
    openPopup("popup-error", { message: "บันทึกไม่สำเร็จ", type: "error", autoCloseMs: null });
  }
}

// ===== Delete user =====
// แสดง popup ยืนยันก่อนลบ
function deleteAdmin() {
  const popup = document.getElementById("popup-confirm-delete");
  popup.style.display = "flex";

  const confirmBtn = document.getElementById("btn-confirm-delete");
  const cancelBtn = document.getElementById("btn-cancel-delete");

  // ล้าง event เดิม (ป้องกันซ้ำ)
  confirmBtn.onclick = null;
  cancelBtn.onclick = null;

  confirmBtn.onclick = async () => {
    popup.style.display = "none";
    try {
      const res = await fetch(`${API_BASE}/delete-user/${userId}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        return openPopup("popup-error", {
          message: json?.message || "ลบไม่สำเร็จ",
          type: "error",
          autoCloseMs: null
        });
      }

      openPopup("popup-delete", {
        type: "success",
        autoCloseMs: 1200,
        onClose: () => cancel()
      });
    } catch (err) {
      console.error(err);
      openPopup("popup-error", { message: "ลบไม่สำเร็จ", type: "error", autoCloseMs: null });
    }
  };

  cancelBtn.onclick = () => {
    popup.style.display = "none";
  };
}


// start
loadAdmin();
window.cancel = cancel;
window.updateAdmin = updateAdmin;
window.deleteAdmin = deleteAdmin;
