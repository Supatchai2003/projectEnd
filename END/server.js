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
app.use(bodyParser.urlencoded({ extended: false }));


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

    // ดึงข้อมูลที่ส่งมาจาก frontend
    const {
      name,
      username,
      password,
      gender,
      gmail,
      phone,
      address = {},
    } = req.body || {};

    // ✅ ใช้ collection "admin" แทน "users"
    const col = db.collection("admin");
    const docRef = col.doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return res.status(404).json({ success: false, message: "ไม่พบบัญชีแอดมิน" });
    }

    const updates = {};

    // --- ฟิลด์พื้นฐาน ---
    if (typeof name === "string") updates.name = name.trim();
    if (typeof gender === "string") updates.gender = gender.trim();
    if (typeof gmail === "string") updates.gmail = gmail.trim();
    if (typeof phone === "string") updates.phone = phone.trim();

    // --- ที่อยู่ ---
    const addr = {};
    if (typeof address.province === "string") addr.province = address.province.trim();
    if (typeof address.district === "string") addr.district = address.district.trim();
    if (typeof address.sub_district === "string") addr.sub_district = address.sub_district.trim();
    if (typeof address.postal_code === "string") addr.postal_code = address.postal_code.trim();
    if (Object.keys(addr).length > 0) updates.address = addr;

    // --- ✅ อัปเดตชื่อเข้าใช้งาน (username) ---
    if (typeof username === "string" && username.trim()) {
      const newU = username.trim();

      // ตรวจว่ามีคนใช้ username ซ้ำไหม (ยกเว้นตัวเอง)
      const dupQ = await col.where("username", "==", newU).limit(1).get();
      if (!dupQ.empty && dupQ.docs[0].id !== id) {
        return res.status(409).json({ success: false, message: "ชื่อผู้ใช้นี้ถูกใช้แล้ว" });
      }

      updates.username = newU;
    }

    // --- ✅ ถ้ามี password ใหม่ให้แฮชก่อนเก็บ ---
    if (typeof password === "string" && password.trim()) {
      if (password.length < 8) {
        return res.status(400).json({ success: false, message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
      }
      const hashed = await bcrypt.hash(password, 10);
      updates.password = hashed;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "ไม่มีข้อมูลที่ต้องการอัปเดต" });
    }

    // --- บันทึกการเปลี่ยนแปลง ---
    await docRef.update(updates);
    return res.json({ success: true, message: "อัปเดตข้อมูลแอดมินสำเร็จ", data: updates });

  } catch (err) {
    console.error("Update admin error:", err);
    return res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});



// ถ้ายังไม่มี get-user
// ถ้ายังไม่มี get-user
app.get("/get-user/:id", async (req,res)=>{
  try{
    const doc = await db.collection("admin").doc(req.params.id).get();
    if(!doc.exists) return res.status(404).json({success:false,message:"not found"});
    const d = doc.data();

    // แปลง hireday -> ตัวหนังสือ + timestamp (ms)
    let hireday_text = "";
    let hireday_ts = null;
    if (d.hireday && typeof d.hireday.toDate === "function") {
      const dd = d.hireday.toDate();
      hireday_ts = dd.getTime();
      hireday_text = dd.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    }

    res.json({
      success:true,
      data:{
        id: doc.id,
        username: d.username || "",
        name: d.name || "",
        role: d.role || "",
        gender: d.gender || "",
        gmail: d.gmail || "",
        phone: d.phone || "",
        address: d.address || {},
        // ✅ ส่งออกทั้งแบบข้อความและเวลา (เผื่อเอาไปใช้ต่อ)
        hireday_text,
        hireday_ts
      }
    });
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
// ตัวอย่าง endpoint: รวม image_size_kb ทั้งหมดของ detections
app.get("/devices/:docId/usage", async (req, res) => {
  try {
    const { docId } = req.params;
    const col = db.collection("Raspberry_pi").doc(docId).collection("detections");

    let sum = 0;
    // ดึงทีละหน้า (ถ้าข้อมูลเยอะ) — ตัวอย่างแบบง่าย: ดึงทั้งหมดในครั้งเดียว
    const snap = await col.get();
    snap.forEach(doc => {
      const data = doc.data() || {};
      const kb = Number(data.image_size_kb ?? data.image_sizeKB ?? data.size_kb ?? 0);
      if (!Number.isNaN(kb)) sum += kb;
    });

    res.json({ success: true, sum_kb: sum });
  } catch (e) {
    console.error("usage error:", e);
    res.status(500).json({ success: false, message: "ไม่สามารถคำนวณพื้นที่ได้" });
  }
});

// ===================== History APIs =====================
// GET /history/time?month=1-12&year=ค.ศ.
// ดึงประวัติแบบ "รายวัน-เวลา" รวมทุกอุปกรณ์ในเดือน/ปีที่เลือก
app.get("/history/time", async (req, res) => {
  try {
    const month = parseInt(String(req.query.month || ""), 10); // 1..12
    const year  = parseInt(String(req.query.year  || ""), 10); // ค.ศ.
    if (!month || !year || month < 1 || month > 12) {
      return res.status(400).json({ success:false, message:"กรุณาระบุ month (1-12) และ year (คริสต์ศักราช)" });
    }

    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end   = new Date(year, month,     1, 0, 0, 0, 0);

    // 1) ดึงรายการอุปกรณ์ทั้งหมด (จะกรองก็ได้ แต่ที่นี่รวมทุกตัว)
    const devicesSnap = await db.collection("Raspberry_pi").get();

    const items = [];
    for (const devDoc of devicesSnap.docs) {
      const devId = devDoc.id;
      const col = db.collection("Raspberry_pi").doc(devId).collection("detections");

      // ----- รอบ 1: ลอง query ด้วย field 'timestamp'
      let detSnap = null;
      try {
        detSnap = await col
          .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(start))
          .where("timestamp", "<",  admin.firestore.Timestamp.fromDate(end))
          .orderBy("timestamp", "asc")
          .get();
      } catch (_) {}

      // ----- รอบ 2: ถ้า query แรกไม่ได้/ว่าง ลองด้วย 'createdAt'
      if (!detSnap || detSnap.empty) {
        try {
          detSnap = await col
            .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(start))
            .where("createdAt", "<",  admin.firestore.Timestamp.fromDate(end))
            .orderBy("createdAt", "asc")
            .get();
        } catch (err) {
          console.error(`[history] query createdAt error (${devId}):`, err);
          detSnap = null;
        }
      }

      if (!detSnap || detSnap.empty) continue;

      detSnap.forEach(d => {
        const data = d.data() || {};

        // แปลงเวลาเป็น JS Date
        let dt =
          (data.timestamp && typeof data.timestamp.toDate === "function" && data.timestamp.toDate()) ||
          (data.createdAt && typeof data.createdAt.toDate === "function" && data.createdAt.toDate()) ||
          (typeof data.captured_at_epoch === "number" ? new Date(data.captured_at_epoch * 1000) : null);

        if (!dt) return;

        // กรณีใหม่: detected_objects[] -> แตกทุกชนิด
        if (Array.isArray(data.detected_objects) && data.detected_objects.length > 0) {
          data.detected_objects.forEach(obj => {
            items.push({
              deviceId: devId,
              type: obj?.type || "-",
              ts: dt.getTime()
            });
          });
          return;
        }

        // กรณีเดิม: field 'type' เดี่ยว
        if (data.type) {
          items.push({
            deviceId: devId,
            type: data.type,
            ts: dt.getTime()
          });
        }
      });
    }

    // เรียงตามเวลาเผื่อ safety
    items.sort((a, b) => a.ts - b.ts);

    return res.json({ success:true, data: items });
  } catch (e) {
    console.error("GET /history/time error:", e);
    return res.status(500).json({ success:false, message:"server error" });
  }
});



// ===================== Static (ถ้าต้องการเสิร์ฟไฟล์หน้าเว็บ) =====================
app.use(express.static(path.join(__dirname, "public")));

// ===================== Start =====================
app.listen(3000, () => console.log("Server running on http://localhost:3000"));
// -------- END/server.js --------
