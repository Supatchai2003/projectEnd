// -------- server.js --------
const express = require("express");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const bcrypt = require("bcrypt");
const serviceAccount = require("./serviceAccountKey.json");

// ===================== Firebase =====================
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ===================== App =====================
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Health check
app.get("/health", (_req, res) => res.json({ ok: true }));

// ===================== Helpers =====================
function requiredFields(obj, fields) {
  const missed = [];
  for (const f of fields) {
    const v = f.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
    if (v === undefined || v === null || String(v).trim() === "") missed.push(f);
  }
  return missed;
}
function buildAddress(body) {
  const a = body.address || {};
  return {
    province: (a.province || "").trim(),
    district: (a.district || "").trim(),
    sub_district: (a.sub_district || "").trim(),
    postal_code: (a.postal_code || "").trim(),
  };
}

// ===================== Admin APIs =====================
// Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  try {
    const snap = await db.collection("admin").where("username", "==", username).limit(1).get();
    if (snap.empty) return res.status(401).json({ success: false, message: "ชื่อผู้ใช้ไม่ถูกต้อง" });

    const doc = snap.docs[0];
    const data = doc.data();
    const ok = await bcrypt.compare(String(password || ""), data.password);
    if (!ok) return res.status(401).json({ success: false, message: "รหัสผ่านไม่ถูกต้อง" });
    
    res.json({ success: true, role: data.role, id: doc.id });
  } catch (e) {
    console.error("Login error:", e);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
});

// Create admin
app.post("/add-user", async (req, res) => {
  try {
    const body = req.body || {};
    const must = [
      "username",
      "password",
      "name",
      "gender",
      "gmail",
      "phone",
      "address.province",
      "address.district",
      "address.sub_district",
      "address.postal_code",
    ];
    const missed = requiredFields(body, must);
    if (missed.length) {
      return res.status(400).json({ success: false, message: "กรอกข้อมูลไม่ครบ", missed });
    }

    if (body.role && body.role !== "admin") {
      console.warn("Client tried to set role:", body.role);
    }

    const dupe = await db.collection("admin").where("username", "==", String(body.username).trim()).limit(1).get();
    if (!dupe.empty) return res.status(409).json({ success: false, message: "มีชื่อผู้ใช้นี้อยู่แล้ว" });

    if (String(body.password).length < 8)
      return res.status(400).json({ success: false, message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });

    const passwordHash = await bcrypt.hash(String(body.password), 10);
    const addr = buildAddress(body);

    const docData = {
      username: String(body.username).trim(),
      password: passwordHash,
      name: String(body.name).trim(),
      gender: String(body.gender).trim(),
      gmail: String(body.gmail).trim(),
      phone: String(body.phone).trim(),
      address: addr,
      role: "admin",
      hireday: admin.firestore.Timestamp.now(),
    };

    const ref = await db.collection("admin").add(docData);
    const { password, ...safe } = docData;
    res.json({ success: true, id: ref.id, data: safe, message: "เพิ่มผู้ใช้เรียบร้อยแล้ว" });
  } catch (e) {
    console.error("Add user error:", e);
    res.status(500).json({ success: false, message: "ไม่สามารถเพิ่มผู้ใช้ได้" });
  }
});

// ตัวอย่าง update-user
app.put("/update-user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, gender, gmail, phone, password,
      address = {}    // { province, district, sub_district, postal_code }
    } = req.body || {};

    const updates = {};
    if (name !== undefined)   updates.name = String(name).trim();
    if (gender !== undefined) updates.gender = String(gender).trim();
    if (gmail !== undefined)  updates.gmail = String(gmail).trim();
    if (phone !== undefined)  updates.phone = String(phone).trim();

    // address (อัปเดตเป็นอ็อบเจ็กต์ย่อย)
    const addr = {};
    if (address.province     !== undefined) addr.province     = String(address.province).trim();
    if (address.district     !== undefined) addr.district     = String(address.district).trim();
    if (address.sub_district !== undefined) addr.sub_district = String(address.sub_district).trim();
    if (address.postal_code  !== undefined) addr.postal_code  = String(address.postal_code).trim();
    if (Object.keys(addr).length) updates.address = addr;

    // ถ้ามีรหัสผ่านใหม่ → hash
    if (password) {
      if (String(password).length < 8) {
        return res.status(400).json({ success:false, message:"รหัสผ่านต้อง ≥ 8 ตัวอักษร" });
      }
      const bcrypt = require("bcryptjs");
      const hash = await bcrypt.hash(String(password), 10);
      updates.password = hash;
    }

    if (!Object.keys(updates).length) {
      return res.json({ success:true, message:"ไม่มีข้อมูลที่ต้องอัปเดต" });
    }

    await db.collection("admin").doc(id).update(updates);
    res.json({ success:true, message:"updated" });
  } catch (e) {
    console.error("update-user error:", e);
    res.status(500).json({ success:false, message:"server error" });
  }
});

// ถ้ายังไม่มี get-user
app.get("/get-user/:id", async (req,res)=>{
  try{
    const doc = await db.collection("admin").doc(req.params.id).get();
    if(!doc.exists) return res.status(404).json({success:false,message:"not found"});
    const d = doc.data();
    res.json({ success:true, data:{
      id: doc.id,
      username: d.username || "",
      name: d.name || "",
      role: d.role || "",
      gender: d.gender || "",
      gmail: d.gmail || "",
      phone: d.phone || "",
      address: d.address || {}
    }});
  }catch(e){
    console.error("get-user error:",e);
    res.status(500).json({success:false,message:"server error"});
  }
});


// Delete admin
app.delete("/delete-user/:id", async (req, res) => {
  try {
    await db.collection("admin").doc(req.params.id).delete();
    res.json({ success: true, message: "ลบผู้ใช้เรียบร้อยแล้ว" });
  } catch (e) {
    console.error("Delete user error:", e);
    res.status(500).json({ success: false, message: "ไม่สามารถลบผู้ใช้ได้" });
  }
});

// ===================== Device APIs (collection: Raspberry_pi) =====================

// Normalize -> map Firestore doc to response object (use 'id' field; no 'serial')
function mapDeviceDoc(d) {
  const data = d.data();
  const allowed = ["To be Added", "offline", "online"];
  const status = allowed.includes(data.status) ? data.status : "offline";

  let createdAtStr = null;
  if (data.createdAt?.toDate) {
    createdAtStr = data.createdAt.toDate().toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      dateStyle: "short",
      timeStyle: "medium",
    });
  }

  return {
    // ✅ แยกให้ชัด: docId = document id, id = ฟิลด์ภายในเอกสาร
    docId: d.id,
    id: (data.id !== undefined && data.id !== null && String(data.id).trim() !== "")
        ? String(data.id).trim()
        : d.id,
    ip: data.ip || null,
    status,
    used: data.used ?? null,
    total: data.total ?? null,
    createdAt: createdAtStr,
  };
}


/**
 * GET /devices
 * ดึงรายการอุปกรณ์ "ที่ถูกเพิ่มแล้ว" (added == true)
 */
app.get("/devices", async (_req, res) => {
  try {
    const snap = await db.collection("Raspberry_pi").where("added", "==", true).get();
    const items = snap.docs.map(mapDeviceDoc);
    res.json({ success: true, data: items });
  } catch (e) {
    console.error("List devices error:", e);
    res.status(500).json({ success: false, message: "ไม่สามารถโหลดรายการอุปกรณ์ได้" });
  }
});


/**
 * GET /devices/:id
 * ดึงอุปกรณ์ "ตัวเดียว" ตามพารามิเตอร์ id
 * ✅ แก้ให้ค้นจาก field 'id' ก่อน (เช่น id: "1")
 * แล้วค่อย fallback ไปดู document id ถ้าไม่เจอ
 */
app.get("/devices/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let doc = null;

    // 🔹 (1) ค้นจาก field 'id' ก่อน
    const q = await db.collection("Raspberry_pi").where("id", "==", id).limit(1).get();
    if (!q.empty) {
      doc = q.docs[0];
    } else {
      // 🔹 (2) ถ้าไม่เจอ field 'id' ตรง ลองใช้ document id แทน
      const tryDoc = await db.collection("Raspberry_pi").doc(id).get();
      if (tryDoc.exists) doc = tryDoc;
    }

    if (!doc) {
      return res.status(404).json({ success: false, message: "ไม่พบอุปกรณ์ที่ระบุ" });
    }

    const item = mapDeviceDoc(doc);
    res.json({ success: true, data: item });
  } catch (e) {
    console.error("Get device by id error:", e);
    res.status(500).json({ success: false, message: "ไม่สามารถโหลดข้อมูลอุปกรณ์ได้" });
  }
});


/**
 * POST /devices/add
 * เพิ่มสถานะ "ถูกเพิ่ม" ให้เอกสารที่มี field 'id' หรือ document id ตรงกับ piid
 * - ไม่สร้าง doc ใหม่
 * - ไม่บังคับใช้ field 'serial'
 */
app.post("/devices/add", async (req, res) => {
  try {
    const { piid } = req.body || {};
    if (!piid || String(piid).trim() === "") {
      return res.status(400).json({ success: false, message: "กรุณาระบุ ID ของอุปกรณ์ (piid)" });
    }

    // หาเอกสารจาก field 'id' ก่อน
    let hitDoc = null;
    const snap = await db.collection("Raspberry_pi").where("id", "==", String(piid).trim()).limit(1).get();
    if (!snap.empty) {
      hitDoc = snap.docs[0];
    } else {
      // ถ้าไม่เจอ ลองใช้ document id
      const tryDoc = await db.collection("Raspberry_pi").doc(String(piid).trim()).get();
      if (tryDoc.exists) hitDoc = tryDoc;
    }

    if (!hitDoc) {
      return res.status(404).json({ success: false, message: "ไม่พบอุปกรณ์นี้ในฐานข้อมูล" });
    }

    const data = hitDoc.data() || {};
    await hitDoc.ref.update({
      // เก็บ id ไว้ใน field 'id' ด้วย เพื่อให้ฝั่งแอปอ่านสะดวก
      id: data.id || hitDoc.id,
      status: "To be Added",
      added: true,
      createdAt: data.createdAt ? data.createdAt : admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, message: "เพิ่มอุปกรณ์สำเร็จ", id: hitDoc.id });
  } catch (e) {
    console.error("Add device error:", e);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการเพิ่มอุปกรณ์" });
  }
});

/**
 * PUT /devices/:id
 * อัปเดตฟิลด์ของอุปกรณ์ (ไม่เปลี่ยน document id)
 * อนุญาต: id (field), status, used, total, ip
 */
app.put("/devices/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const updates = {};

    // ✅ อนุญาตอัปเดต "ฟิลด์ id" (ไม่ใช่ document id)
    if (body.id !== undefined) updates.id = String(body.id).trim();

    if (body.status !== undefined) updates.status = String(body.status).trim();
    if (body.used   !== undefined) updates.used   = Number(body.used);
    if (body.total  !== undefined) updates.total  = Number(body.total);
    if (body.ip     !== undefined) updates.ip     = String(body.ip).trim();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "ไม่มีข้อมูลสำหรับอัปเดต" });
    }

    await db.collection("Raspberry_pi").doc(id).update(updates);
    res.json({ success: true, message: "อัปเดตอุปกรณ์เรียบร้อยแล้ว" });
  } catch (e) {
    console.error("Update device error:", e);
    res.status(500).json({ success: false, message: "ไม่สามารถอัปเดตอุปกรณ์ได้" });
  }
});


/**
 * DELETE /devices/:id
 * ลบอุปกรณ์ตาม document id
 */
app.delete("/devices/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("Raspberry_pi").doc(id).delete();
    res.json({ success: true, message: "ลบอุปกรณ์เรียบร้อยแล้ว" });
  } catch (e) {
    console.error("Delete device error:", e);
    res.status(500).json({ success: false, message: "ไม่สามารถลบอุปกรณ์ได้" });
  }
});
// ===================== Admin Management APIs =====================
// helper แปลง doc
function mapAdminDoc(doc){
  const d = doc.data();
  return { id: doc.id, username: d.username || "", role: d.role || "" };
}

// ---- รายชื่อแอดมินทั้งหมด (กรอง role=admin) ----
app.get("/admins", async (req, res) => {
  try {
    const { role } = req.query; // optional ?role=admin
    let ref = db.collection("admin");
    if (role) ref = ref.where("role", "==", role);

    const snap = await ref.get();
    const items = snap.docs.map(mapAdminDoc);
    res.json({ success: true, data: items });
  } catch (e) {
    console.error("GET /admins error:", e);
    res.status(500).json({ success: false, message: "server error" });
  }
});

// ---- อ่านแอดมินทีละคน (ใช้ตอนหน้าแก้ไข) ----
app.get("/admins/:id", async (req, res) => {
  try {
    const doc = await db.collection("admin").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success:false, message:"not found" });
    res.json({ success:true, data: mapAdminDoc(doc) });
  } catch (e) {
    console.error("GET /admins/:id error:", e);
    res.status(500).json({ success:false, message:"server error" });
  }
});

// ===================== Static (ถ้าต้องการเสิร์ฟไฟล์หน้าเว็บ) =====================
app.use(express.static(path.join(__dirname, "public")));

// ===================== Start =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
