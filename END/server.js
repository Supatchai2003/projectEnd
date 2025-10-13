// นำเข้า Express สำหรับสร้าง web server ด้วย Node.js
const express = require("express");
// นำเข้า path สำหรับจัดการเส้นทางไฟล์
const path = require("path");
// นำเข้า cors เพื่อจัดการปัญหา CORS 
const cors = require("cors");
// นำเข้า body-parser เพื่อแปลง request body เป็น JSON
const bodyParser = require("body-parser");
// นำเข้า Firebase Admin SDK สำหรับเชื่อมต่อกับ Firestore
const admin = require("firebase-admin");
// นำเข้า bcrypt สำหรับการแฮชและตรวจสอบรหัสผ่าน
const bcrypt = require("bcrypt");
// นำเข้าไฟล์ serviceAccountKey.json ที่ได้จาก Firebase Console
const serviceAccount = require("./serviceAccountKey.json");

// เริ่มต้น Firebase Admin SDK โดยใช้ข้อมูลจาก serviceAccountKey.json
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// เชื่อมต่อกับ Firestore
const db = admin.firestore();
// สร้างแอป Express
const app = express();

// ตั้งค่า middleware
app.use(cors());
// ใช้ body-parser เพื่อแปลง request body เป็น JSON
app.use(bodyParser.json());

// ✅ เข้าสู่ระบบ (ตรวจสอบชื่อผู้ใช้และรหัสผ่าน)
//รับ request POST /login พร้อมข้อมูล username และ password
app.post("/login", async (req, res) => {
  // ค้นหา user ใน Firestore ที่ username ตรงกัน
  const { username, password } = req.body;
  try {
    // ค้นหาผู้ใช้ใน Firestore ตามชื่อผู้ใช้
    const snapshot = await db.collection("admin")
      .where("username", "==", username)
      .get();
    // ถ้าไม่พบผู้ใช้
    if (snapshot.empty) {
      return res.status(401).json({ success: false, message: "ชื่อผู้ใช้ไม่ถูกต้อง" });
    }
    // ดึงข้อมูลผู้ใช้จากเอกสารแรกที่พบ
    const userDoc = snapshot.docs[0];
    // ดึงข้อมูลผู้ใช้
    const userData = userDoc.data();
    // ตรวจสอบรหัสผ่านโดยใช้ bcrypt
    const match = await bcrypt.compare(password, userData.password);
    // ถ้ารหัสผ่านไม่ตรงกัน
    if (!match) {
      return res.status(401).json({ success: false, message: "รหัสผ่านไม่ถูกต้อง" });
    }
    // ถ้าชื่อผู้ใช้และรหัสผ่านถูกต้อง ส่งข้อมูลกลับไปยังไคลเอนต์
    res.json({ success: true, role: userData.role, id: userDoc.id });
  }
  // ถ้ามีข้อผิดพลาดอื่นๆ 
  catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
});

// ✅ เพิ่มผู้ใช้ใหม่
app.post("/add-user", async (req, res) => {
  // รับข้อมูลจาก request body
  const { username, password, role, name } = req.body;
  // ตรวจสอบว่าข้อมูลครบถ้วนหรือไม่
  if (!username || !password || !role) {
    return res.status(400).json({ success: false, message: "กรุณาระบุข้อมูลให้ครบถ้วน" });
  }
  // ตรวจสอบความยาวรหัสผ่าน
  try {
    // เข้ารหัสรหัสผ่านด้วย bcrypt (salt รอบ 10)
    const hash = await bcrypt.hash(password, 10);
    await db.collection("admin").add({ username, password: hash, role, name: name || "" });
    res.json({ success: true, message: "เพิ่มผู้ใช้เรียบร้อยแล้ว" });
    // ถ้ามีข้อผิดพลาดอื่นๆ
  } catch (error) {
    console.error("Add user error:", error);
    res.status(500).json({ success: false, message: "ไม่สามารถเพิ่มผู้ใช้ได้" });
  }
});

// ✅ อ่านข้อมูลผู้ใช้รายคน
app.get("/get-user/:id", async (req, res) => {
  // ดึงข้อมูลผู้ใช้จาก Firestore ตาม ID ที่ส่งมาในพารามิเตอร์
  try {
    const doc = await db.collection("admin").doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "ไม่พบผู้ใช้" });
    }
    // ส่งข้อมูลผู้ใช้กลับไปยังไคลเอนต์ (ไม่ส่งรหัสผ่าน)
    const data = doc.data();
    res.json({ success: true, data: { username: data.username, name: data.name, role: data.role } });
  } 
  // ถ้ามีข้อผิดพลาดอื่นๆ
  catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ success: false, message: "ไม่สามารถโหลดข้อมูลผู้ใช้ได้" });
  }
});

// ✅ แก้ไขข้อมูลผู้ใช้ (อัปเดตรหัสผ่านด้วย hash ถ้ามี)
app.put("/update-user/:id", async (req, res) => {
  const { name, password } = req.body;
  try {
    const updates = { name };
    // ถ้ามีการส่งรหัสผ่านมาและความยาวไม่น้อยกว่า 8 ตัวอักษร ให้แฮชและอัปเดต
    if (password && password.length >= 8) {
      updates.password = await bcrypt.hash(password, 10);
    }
    // อัปเดตข้อมูลผู้ใช้ใน Firestore
    await db.collection("admin").doc(req.params.id).update(updates);
    res.json({ success: true, message: "อัปเดตข้อมูลเรียบร้อยแล้ว" });
  } 
  // ถ้ามีข้อผิดพลาดอื่นๆ
  catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ success: false, message: "ไม่สามารถอัปเดตผู้ใช้ได้" });
  }
});

// ✅ ลบผู้ใช้
app.delete("/delete-user/:id", async (req, res) => {
  try {
    await db.collection("admin").doc(req.params.id).delete();
    res.json({ success: true, message: "ลบผู้ใช้เรียบร้อยแล้ว" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ success: false, message: "ไม่สามารถลบผู้ใช้ได้" });
  }
});

// บอกให้ Express เสิร์ฟไฟล์ static จากโฟลเดอร์ /public
app.use(express.static(path.join(__dirname, "public")));

// ✅ start server
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});



