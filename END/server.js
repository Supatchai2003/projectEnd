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

// Get admin by id
app.get("/get-user/:id", async (req, res) => {
  try {
    const doc = await db.collection("admin").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: "ไม่พบผู้ใช้" });
    const data = doc.data();
    const { password, ...safe } = data;
    res.json({ success: true, data: safe });
  } catch (e) {
    console.error("Get user error:", e);
    res.status(500).json({ success: false, message: "ไม่สามารถโหลดข้อมูลผู้ใช้ได้" });
  }
});

// Update admin
app.put("/update-user/:id", async (req, res) => {
  try {
    const body = req.body || {};
    const updates = {};

    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.gender !== undefined) updates.gender = String(body.gender).trim();
    if (body.gmail !== undefined) updates.gmail = String(body.gmail).trim();
    if (body.phone !== undefined) updates.phone = String(body.phone).trim();

    if (body.address) {
      updates.address = {
        province: body.address.province ? String(body.address.province).trim() : "",
        district: body.address.district ? String(body.address.district).trim() : "",
        sub_district: body.address.sub_district ? String(body.address.sub_district).trim() : "",
        postal_code: body.address.postal_code ? String(body.address.postal_code).trim() : "",
      };
    }

    if (body.password && String(body.password).length >= 8) {
      updates.password = await bcrypt.hash(String(body.password), 10);
    }

    if (body.role) console.warn("Client tried to modify role via update-user:", body.role);

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ success: false, message: "ไม่มีข้อมูลสำหรับอัปเดต" });

    await db.collection("admin").doc(req.params.id).update(updates);
    res.json({ success: true, message: "อัปเดตข้อมูลเรียบร้อยแล้ว" });
  } catch (e) {
    console.error("Update user error:", e);
    res.status(500).json({ success: false, message: "ไม่สามารถอัปเดตผู้ใช้ได้" });
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

// ===================== Static (ถ้าต้องการเสิร์ฟไฟล์หน้าเว็บ) =====================
app.use(express.static(path.join(__dirname, "public")));

// ===================== Start =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
