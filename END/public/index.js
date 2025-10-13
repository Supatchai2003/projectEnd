localStorage.clear(); // เคลียร์ role ที่ค้างไว้ก่อนเข้าสู่ระบบใหม่
    document.getElementById("loginForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("pwd").value.trim();

      try {
        const response = await fetch("http://localhost:3000/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });


        const result = await response.json();

        if (result.success) {
          alert("เข้าสู่ระบบสำเร็จ");
          localStorage.setItem("role", result.role);
          if (result.role === "manager") {
            window.location.href = "manager/homepage/M_homepage.html";
          } else {
            window.location.href = "../device/list_device/device_list.html";
          }

        } else {
          alert("เข้าสู่ระบบไม่สำเร็จ: " + result.message);
        }
      } catch (error) {
        console.error("Error:", error);
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
      }
    });