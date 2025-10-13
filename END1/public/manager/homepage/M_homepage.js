function toggleMenu() {
  const menu = document.getElementById("menu");
  menu.style.display = menu.style.display === "flex" ? "none" : "flex";
}

function goToAdmins() {
  window.location.href = "../list_admin/M_admin_list.html";
}

function goToDevices() {
  window.location.href = "../../device/list_device/device_list.html";
}

function goHome() {
  const role = localStorage.getItem("role");
  if (role === "superadmin" ) {
    window.location.href = "M_homepage.html";
  } else if (role === "admin") {
    window.location.href = "../../device/list_device/device_list.html";
  }
}

function logout() {
  localStorage.clear();

  // ใช้ popup เดิม (#popup) แล้วบังคับปุ่ม OK ให้พาไป index.html
  const popup = document.getElementById("popup");
  const msg = document.getElementById("popup-message");
  const okBtn = popup.querySelector("button"); // ปุ่ม "ตกลง" ตัวเดียวใน popup นี้

  msg.textContent = "ออกจากระบบเรียบร้อยแล้ว";
  popup.style.display = "flex";

  // reset handler เดิม (ถ้ามี)
  okBtn.onclick = null;

  okBtn.onclick = function () {
    popup.style.display = "none";
    window.location.href = "../../index.html";
  };
}


