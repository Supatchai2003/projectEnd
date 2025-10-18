// ===== index.js (หน้า Login พร้อมรองรับ Render) =====

// ล้างข้อมูลเก่าก่อนเข้าสู่ระบบใหม่
localStorage.clear();

// สร้างตัวแปร API_BASE ให้ยืดหยุ่น
// ถ้าเสิร์ฟหน้าเว็บจากโดเมนเดียวกับ server.js ให้ window.API_BASE เป็น ""
const API_BASE = (window.API_BASE ?? "").replace(/\/+$/, "");

// เพิ่ม event listener ให้กับฟอร์ม Login
document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault(); // ป้องกันการรีเฟรชหน้า

  // ดึงค่าจาก input
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("pwd").value.trim();

  // ฟังก์ชันแสดง popup แจ้งเตือน
  function showPopup(message, type, callback) {
    const popup = document.getElementById("popup");
    const content = document.getElementById("popup-content");
    const msg = document.getElementById("popup-message");
    const okBtn = document.getElementById("popup-ok");

    // reset class เดิม
    content.classList.remove("popup-success", "popup-error");
    content.classList.add(type === "success" ? "popup-success" : "popup-error");

    msg.textContent = message;
    popup.style.display = "flex";

    // ป้องกัน event ซ้อน
    okBtn.replaceWith(okBtn.cloneNode(true));
    const newOkBtn = document.getElementById("popup-ok");

    newOkBtn.addEventListener("click", () => {
      popup.style.display = "none";
      if (callback) callback();
    });

    // ปิดอัตโนมัติหลัง 2.5 วินาที
    setTimeout(() => {
      popup.style.display = "none";
    }, 2500);
  }

  try {
    // ส่งข้อมูลไปที่ backend
    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();

    if (result.success) {
      showPopup("เข้าสู่ระบบสำเร็จ", "success", () => {
        localStorage.setItem("role", result.role);

        // superadmin -> ไปหน้า Manager
        if (result.role === "superadmin") {
          window.location.href = "manager/homepage/M_homepage.html";
        }
        // admin -> ไปหน้าอุปกรณ์
        else {
          window.location.href = "device/list_device/device_list.html";
        }
      });
    } else {
      showPopup("เข้าสู่ระบบไม่สำเร็จ: " + (result.message || "กรุณาลองอีกครั้ง"), "error");
    }
  } catch (error) {
    console.error("Error:", error);
    showPopup("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์", "error");
  }
});
