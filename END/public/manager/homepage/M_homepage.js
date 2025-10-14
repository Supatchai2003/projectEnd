window.addEventListener("DOMContentLoaded", () => {
  const role = localStorage.getItem("role") || "-";
  document.getElementById("role").textContent = role;
});

function goToAdmins() {
  window.location.href = "../list_admin/M_admin_list.html";
}

function goToDevices() {
  window.location.href = "../../device/list_device/device_list.html";
}

function logout() {
  localStorage.clear();

  const popup = document.getElementById("popup");
  const msg = document.getElementById("popup-message");
  const okBtn = document.getElementById("popup-ok");

  msg.textContent = "ออกจากระบบเรียบร้อยแล้ว";
  popup.style.display = "flex";

  okBtn.onclick = function () {
    popup.style.display = "none";
    window.location.href = "../../index.html";
  };
}
