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
  if (role === "manager") {
    window.location.href = "M_homepage.html";
  } else {
    window.location.href = "../../device/list_device/device_list.html";
  }
}

function logout() {
  localStorage.clear();
  alert("ออกจากระบบเรียบร้อยแล้ว");
  window.location.href = "../../index.html";
}
/*
// ตรวจสอบสิทธิ์เข้า
const role = localStorage.getItem("role");
if (role !== "manager") {
  alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
  window.location.href = "../../device/list_device/device_list.html";
}*/
