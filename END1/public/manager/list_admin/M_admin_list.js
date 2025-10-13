const firebaseConfig = {
  apiKey: "AIzaSyDL8P7ovbVGD6gsxyzc8wyUvYk4rIJHEZ8",
  authDomain: "project-e8970.firebaseapp.com",
  projectId: "project-e8970",
  storageBucket: "project-e8970.firebasestorage.app",
  messagingSenderId: "429996520936",
  appId: "1:429996520936:web:cbfe3e363119fc3f01605d",
  measurementId: "G-0YH0023VCN"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const role = localStorage.getItem("role");
if (role !== "superadmin" ) {
  showPopup("คุณไม่มีสิทธิ์เข้าถึงหน้านี้", "../../device/list_device/device_list.html");
} else if (role === "admin") {
    window.location.href = "../../device/list_device/device_list.html";
}

function toggleMenu() {
  const menu = document.getElementById("menu");
  menu.style.display = menu.style.display === "flex" ? "none" : "flex";
}

function goHome() {
  window.location.href = "../../manager/homepage/M_homepage.html";
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


function goToAdd() {
  window.location.href = "../../manager/add_admin/M_admin_add.html";
}

function loadAdmins() {
  const container = document.getElementById("admin-list");
  container.innerHTML = "";
  let index = 1;

  db.collection("admin").where("role", "==", "admin").get().then(snapshot => {
    snapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement("div");
      div.className = "admin-item";
      div.innerHTML = `
        <span>${index++}. ชื่อผู้ใช้งาน : ${data.username}</span>
        <button class="edit-btn" onclick="editAdmin('${doc.id}')">✏️</button>
      `;
      container.appendChild(div);
    });
  }).catch(error => {
    console.error("Error loading admins:", error);
    alert("ไม่สามารถโหลดข้อมูลผู้ดูแลได้");
  });
}

function editAdmin(id) {
  window.location.href = `../../manager/edit_admin/M_editadmin.html?id=${id}`;
}
function showPopup(message, redirectUrl) {
  const popup = document.getElementById("popup");
  const msg = document.getElementById("popup-message");
  msg.textContent = message;
  popup.style.display = "flex";

  // เมื่อคลิกตกลง จะไปหน้าที่กำหนด
  popup.querySelector("button").onclick = function() {
    popup.style.display = "none";
    window.location.href = redirectUrl;
  };
}

function closePopup() {
  document.getElementById("popup").style.display = "none";
}

loadAdmins();
