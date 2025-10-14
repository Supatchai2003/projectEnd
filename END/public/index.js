localStorage.clear(); // เคลียร์ role ที่ค้างไว้ก่อนเข้าสู่ระบบใหม่
// เพิ่ม event listener ให้กับฟอร์ม
document.getElementById("loginForm").addEventListener("submit", async function (e) {
  // ป้องกันการรีเฟรชหน้า
  e.preventDefault();
  // ดึงค่าจากฟอร์ม
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("pwd").value.trim();
 // ตรวจสอบว่ากรอกครบหรือไม่
  try {
    // ส่งคำขอไปยังเซิร์ฟเวอร์
    const response = await fetch("https://project-e8970.web.app", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    // ฟังก์ชันแสดง popup
    function showPopup(message, type, callback) {
      const popup = document.getElementById("popup");
      const content = document.getElementById("popup-content");
      const msg = document.getElementById("popup-message");
      const okBtn = document.getElementById("popup-ok");

      // reset class ก่อน
      content.classList.remove("popup-success", "popup-error");
      // เพิ่ม class ตามประเภท
      if (type === "success") {
        content.classList.add("popup-success");
      } else {
        content.classList.add("popup-error");
      }
      // ตั้งข้อความและแสดง popup
      msg.textContent = message;
      popup.style.display = "flex";

      // ล้าง event เดิมของปุ่มโอเคก่อน
      okBtn.replaceWith(okBtn.cloneNode(true));
      const newOkBtn = document.getElementById("popup-ok");

      newOkBtn.addEventListener("click", () => {
        popup.style.display = "none";
        if (callback) callback();
      });


      // (ไม่บังคับ) ปิดอัตโนมัติ 2.5 วิ
      setTimeout(() => {
        popup.style.display = "none";
      }, 2500);
    }

    const result = await response.json();

    if (result.success) {
      showPopup("เข้าสู่ระบบสำเร็จ", "success", () => {
        localStorage.setItem("role", result.role);
        if (result.role === "superadmin" ) {
          window.location.href = "manager/homepage/M_homepage.html";
        } else {
          window.location.href = "../device/list_device/device_list.html";
        }
      });
    } else {
      showPopup("เข้าสู่ระบบไม่สำเร็จ: " + result.message, "error");
    }
  }
  catch (error) {
    console.error("Error:", error);
    showPopup("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์", "error");
  }

});


