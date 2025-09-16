const firebaseConfig = {
  apiKey: "AIzaSyDL8P7ovbVGD6gsxyzc8wyUvYk4rIJHEZ8",
  authDomain: "project-e8970.firebaseapp.com",
  projectId: "project-e8970",
  storageBucket: "project-e8970.firebasestorage.app",
  messagingSenderId: "429996520936",
  appId: "1:429996520936:web:cbfe3e363119fc3f01605d"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const role = localStorage.getItem("role");
if (role !== "manager") {
  alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
  window.location.href = "../../device/list_device/device_list.html";
}

function cancel() {
  window.location.href = "../../manager/list_admin/M_admin_list.html";
}

async function addAdmin() {
  const name = document.getElementById("name").value.trim();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!name || !username || !password) {
    alert("กรุณากรอกข้อมูลให้ครบ");
    return;
  }

  try {
    const response = await fetch("http://localhost:3000/add-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, password, role: "admin" })
    });

    const result = await response.json();

    if (result.success) {
      alert("เพิ่มบัญชีแอดมินสำเร็จ");
      window.location.href = "../../manager/list_admin/M_admin_list.html";
    } else {
      alert("เกิดข้อผิดพลาด: " + result.message);
    }
  } catch (error) {
    console.error("Add admin error:", error);
    alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
  }
}
