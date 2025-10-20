// ====== CONFIG ======
const API_BASE = (window.API_BASE ?? "").replace(/\/+$/, "");

// ====== POPUP SYSTEM ======
function showPopup(id, message = null) {
  const popup = document.getElementById(id);
  if (!popup) return;
  if (message) {
    const msgElem = popup.querySelector(".popup-message");
    if (msgElem) msgElem.textContent = message;
  }
  popup.style.display = "flex";
  const okBtn = popup.querySelector(".popup-ok");
  if (okBtn) okBtn.onclick = () => (popup.style.display = "none");
}

function showConfirmPopup(onConfirm) {
  const popup = document.getElementById("popup-confirm-delete");
  popup.style.display = "flex";

  const confirmBtn = document.getElementById("btn-confirm-delete");
  const cancelBtn = document.getElementById("btn-cancel-delete");

  confirmBtn.onclick = () => {
    popup.style.display = "none";
    onConfirm();
  };
  cancelBtn.onclick = () => (popup.style.display = "none");
}

// ====== CHECK ROLE ======
const role = localStorage.getItem("role");
if (role !== "superadmin") {
  showPopup("popup-noauth");
  setTimeout(() => (window.location.href = "../../index.html"), 1500);
}

// ====== LOAD ADMIN DATA ======
const userId = new URLSearchParams(window.location.search).get("id");

async function loadAdmin() {
  try {
    const res = await fetch(`${API_BASE}/get-user/${userId}`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      showPopup("popup-loadfail", "โหลดข้อมูลไม่สำเร็จ");
      return;
    }

    const d = json.data || {};
    document.getElementById("name").value = d.name || "";
    document.getElementById("username").value = d.username || "";
    document.getElementById("gender").value = d.gender || "";
    document.getElementById("gmail").value = d.gmail || "";
    document.getElementById("phone").value = d.phone || "";
    document.getElementById("hireday").value = d.hireday_text || "-";

    const addr = d.address || {};
    document.getElementById("province").value = addr.province || "";
    document.getElementById("district").value = addr.district || "";
    document.getElementById("sub_district").value = addr.sub_district || "";
    document.getElementById("postal_code").value = addr.postal_code || "";
  } catch (err) {
    console.error(err);
    showPopup("popup-error", "เกิดข้อผิดพลาดในการโหลดข้อมูล");
  }
}

// ====== UPDATE ADMIN ======
async function updateAdmin() {
  const name = document.getElementById("name").value.trim();
  const username = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value.trim();
  const gender = document.getElementById("gender").value;
  const gmail = document.getElementById("gmail").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const province = document.getElementById("province").value.trim();
  const district = document.getElementById("district").value.trim();
  const sub_district = document.getElementById("sub_district").value.trim();
  const postal_code = document.getElementById("postal_code").value.trim();

  const payload = {
    name, username, gender, gmail, phone,
    address: { province, district, sub_district, postal_code }
  };
  if (pass) payload.password = pass;

  try {
    const res = await fetch(`${API_BASE}/update-user/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      showPopup("popup-error", json.message || "บันทึกไม่สำเร็จ");
      return;
    }
    showPopup("popup-save", "อัปเดตข้อมูลสำเร็จ");
    setTimeout(() => {
      window.location.href = "../../manager/list_admin/M_admin_list.html";
    }, 1500);
  } catch (err) {
    console.error(err);
    showPopup("popup-error", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
  }
}

// ====== DELETE ADMIN ======
async function deleteAdmin() {
  showConfirmPopup(async () => {
    try {
      const res = await fetch(`${API_BASE}/delete-user/${userId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showPopup("popup-error", json.message || "ลบไม่สำเร็จ");
        return;
      }
      showPopup("popup-delete", "ลบผู้ใช้แล้ว");
      setTimeout(() => {
        window.location.href = "../../manager/list_admin/M_admin_list.html";
      }, 1500);
    } catch (err) {
      console.error(err);
      showPopup("popup-error", "ไม่สามารถลบผู้ใช้ได้");
    }
  });
}

// ====== CANCEL ======
function cancelEdit() {
  const role = localStorage.getItem("role");
  if (role === "superadmin") {
    window.location.href = "../../manager/list_admin/M_admin_list.html";
  } else if (role === "admin") {
    window.location.href = "../../device/list_device/device_list.html";
  } else {
    window.location.href = "../../index.html";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btn-cancel");
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      cancelEdit();
    });
  }
});

window.cancelEdit = cancelEdit;
window.updateAdmin = updateAdmin;
window.deleteAdmin = deleteAdmin;
loadAdmin();
