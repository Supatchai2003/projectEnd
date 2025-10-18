// ===== M_admin_list.js =====
const API_BASE = (window.API_BASE ?? "").replace(/\/+$/, "");

async function loadAdmins() {
  const container = document.getElementById("admin-list");
  container.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE}/admin?role=admin`);
    const { success, data } = await res.json();

    if (!success || !data.length) {
      container.innerHTML = `<div style="color:#333;">ไม่มีข้อมูลแอดมิน</div>`;
      return;
    }

    let index = 1;
    for (const item of data) {
      const div = document.createElement("div");
      div.className = "admin-item";
      div.innerHTML = `
        <span>${index++}. ชื่อผู้ใช้งาน : <b>${item.username}</b></span>
        <button class="edit-btn" onclick="editAdmin('${item.id}')">✏️</button>
      `;
      container.appendChild(div);
    }
  } catch (err) {
    console.error("loadAdmins error:", err);
    alert("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
  }
}

function goToAdd() {
  window.location.href = "../../manager/add_admin/M_admin_add.html";
}

function editAdmin(id) {
  window.location.href = `../../manager/edit_admin/M_editadmin.html?id=${id}`;
}

function goBack() {
  window.location.href = "../../manager/homepage/M_homepage.html";
}

loadAdmins();
