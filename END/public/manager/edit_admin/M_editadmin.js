// ===== M_editadmin.js =====
const API_BASE = (window.API_BASE ?? "").replace(/\/+$/, "");

// ===== ROLE guard =====
const role = localStorage.getItem("role");
if (role !== "superadmin") {
  alert("สิทธิ์ไม่เพียงพอ");
  window.location.href = "../../index.html";
}

// ===== PARAMS =====
const userId = new URLSearchParams(window.location.search).get("id");

async function loadAdmin() {
  try {
    const res = await fetch(`${API_BASE}/get-user/${userId}`);
    const json = await res.json();
    if (!res.ok || !json.success) { alert("โหลดข้อมูลไม่สำเร็จ"); return; }
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
    alert("เกิดข้อผิดพลาดในการโหลดข้อมูล");
  }
}

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
      alert(json.message || "บันทึกไม่สำเร็จ");
      return;
    }
    alert("อัปเดตข้อมูลสำเร็จ");
    window.location.href = "../../manager/list_admin/M_admin_list.html";
  } catch (err) {
    console.error(err);
    alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
  }
}

async function deleteAdmin() {
  if (!confirm("ต้องการลบบัญชีนี้จริงหรือไม่?")) return;
  try {
    const res = await fetch(`${API_BASE}/delete-user/${userId}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      alert(json.message || "ลบไม่สำเร็จ");
      return;
    }
    alert("ลบผู้ใช้เรียบร้อยแล้ว");
    window.location.href = "../../manager/list_admin/M_admin_list.html";
  } catch (err) {
    console.error(err);
    alert("ไม่สามารถลบผู้ใช้ได้");
  }
}
function cancelEdit() {
  // ถ้ามี role ให้แยกปลายทาง; ไม่มี role ให้กลับหน้าแรก
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
      e.preventDefault();   // กัน form กลืน event
      cancelEdit();
    });
  }
});

// เผื่อเรียกจาก inline ได้
window.cancelEdit = cancelEdit;


window.updateAdmin = updateAdmin;
window.deleteAdmin = deleteAdmin;
loadAdmin();
