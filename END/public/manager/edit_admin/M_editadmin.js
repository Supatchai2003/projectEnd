const firebaseConfig = {
  apiKey: "AIzaSyDL8P7ovbVGD6gsxyzc8wyUvbYk4rIJHEZ8",
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

const userId = new URLSearchParams(window.location.search).get("id");

function togglePassword() {
  const pw = document.getElementById("password");
  pw.type = pw.type === "password" ? "text" : "password";
}

function cancel() {
  window.location.href = "../../manager/list_admin/M_admin_list.html";
}

async function loadAdmin() {
  try {
    const doc = await db.collection("admin").doc(userId).get();
    if (doc.exists) {
      const data = doc.data();
      document.getElementById("name").value = data.name || "";
      document.getElementById("username").value = data.username;
    } else {
      alert("ไม่พบข้อมูลผู้ใช้");
    }
  } catch (error) {
    console.error("โหลดข้อมูลล้มเหลว:", error);
    alert("โหลดข้อมูลไม่สำเร็จ");
  }
}

async function updateAdmin() {
  const name = document.getElementById("name").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!name) {
    alert("กรุณาระบุชื่อ");
    return;
  }

  try {
    const updates = { name };
    if (password.length > 0) {
      updates.password = password; // ยังไม่เข้ารหัส
    }

    await db.collection("admin").doc(userId).update(updates);
    alert("บันทึกข้อมูลเรียบร้อยแล้ว");
    window.location.href = "../../manager/list_admin/M_admin_list.html";
  } catch (err) {
    console.error("อัปเดตล้มเหลว:", err);
    alert("บันทึกไม่สำเร็จ");
  }
}

async function deleteAdmin() {
  if (!confirm("คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้?")) return;

  try {
    await db.collection("admin").doc(userId).delete();
    alert("ลบผู้ใช้เรียบร้อยแล้ว");
    window.location.href = "../../manager/list_admin/M_admin_list.html";
  } catch (err) {
    console.error("ลบล้มเหลว:", err);
    alert("ลบไม่สำเร็จ");
  }
}

loadAdmin();
