// --------  --------
const express = require("express");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const bcrypt = require("bcrypt");
const serviceAccount = require("./serviceAccountKey.json");
// ============================================

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ---- helpers ----
function requiredFields(obj, fields) {
  const missed = [];
  for (const f of fields) {
    const v = f.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
    if (v === undefined || v === null || String(v).trim() === "") missed.push(f);
  }
  return missed;
}
// ฟังก์ชันสร้างที่อยู่
function buildAddress(body) {
  const a = body.address || {};
  return {
    province: (a.province || "").trim(),
    district: (a.district || "").trim(),
    sub_district: (a.sub_district || "").trim(),
    postal_code: (a.postal_code || "").trim(),
  };
}

// ---- login ----
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const snap = await db.collection("admin").where("username", "==", username).get();
    if (snap.empty) return res.status(401).json({ success: false, message: "ชื่อผู้ใช้ไม่ถูกต้อง" });

    const doc = snap.docs[0];
    const data = doc.data();
    const ok = await bcrypt.compare(password, data.password);
    if (!ok) return res.status(401).json({ success: false, message: "รหัสผ่านไม่ถูกต้อง" });

    res.json({ success: true, role: data.role, id: doc.id });
  } catch (e) {
    console.error("Login error:", e);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
  }
});

// ---- create admin ----
app.post("/add-user", async (req, res) => {
  try {
    const body = req.body;

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

    // block role from client
    if (body.role && body.role !== "admin") {
      console.warn("Client tried to set role:", body.role);
    }

    // duplicate username
    const dupe = await db.collection("admin").where("username", "==", body.username).get();
    if (!dupe.empty) return res.status(409).json({ success: false, message: "มีชื่อผู้ใช้นี้อยู่แล้ว" });

    if (String(body.password).length < 8)
      return res.status(400).json({ success: false, message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });

    const passwordHash = await bcrypt.hash(body.password, 10);
    const addr = buildAddress(body);

    const docData = {
      username: String(body.username).trim(),
      password: passwordHash,
      name: String(body.name).trim(),
      gender: String(body.gender).trim(),
      gmail: String(body.gmail).trim(),
      phone: String(body.phone).trim(),
      address: addr,
      role: "admin", // server sets role
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

// ---- get admin ----
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

// ---- update admin ----
app.put("/update-user/:id", async (req, res) => {
  try {
    const body = req.body;
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

// ---- delete admin ----
app.delete("/delete-user/:id", async (req, res) => {
  try {
    await db.collection("admin").doc(req.params.id).delete();
    res.json({ success: true, message: "ลบผู้ใช้เรียบร้อยแล้ว" });
  } catch (e) {
    console.error("Delete user error:", e);
    res.status(500).json({ success: false, message: "ไม่สามารถลบผู้ใช้ได้" });
  }
});

// ========= Device APIs =========
// คอลเลกชันอุปกรณ์ใน Firestore: "Raspberry_pi"

/**
 * GET /devices
 * ดึงรายการอุปกรณ์ทั้งหมด
 */
app.get("/devices", async (req, res) => {
  try {
    const ALLOWED = ["To be Added", "offline", "online"];

    // ดึงเฉพาะที่ผ่านการ Add
    const snap = await db.collection("Raspberry_pi")
      .where("added", "==", true)
      .get();

    const items = snap.docs.map(d => {
      const data = d.data();

      // normalize status
      const status = ALLOWED.includes(data.status) ? data.status : "offline";

      // format createdAt เป็นข้อความ (โซนเวลาไทย)
      let createdAtStr = null;
      if (data.createdAt?.toDate) {
        createdAtStr = data.createdAt.toDate().toLocaleString("th-TH", {
          timeZone: "Asia/Bangkok",
          dateStyle: "short",
          timeStyle: "medium"
        });
      }

      return {
        id: d.id,
        serial: data.serial || d.id,
        ip: data.ip || null,
        status,
        used: data.used ?? null,
        total: data.total ?? null,
        createdAt: createdAtStr
      };
    });

    res.json({ success: true, data: items });
  } catch (e) {
    console.error("List devices error:", e);
    res.status(500).json({ success: false, message: "ไม่สามารถโหลดรายการอุปกรณ์ได้" });
  }
});

// POST /devices/add
app.post("/devices/add", async (req, res) => {
  try {
    const { piid } = req.body || {};
    if (!piid || String(piid).trim() === "") {
      return res.status(400).json({ success: false, message: "กรุณาระบุ Serial ID (piid)" });
    }

    const snap = await db.collection("Raspberry_pi").get();
    const docHit = snap.docs.find(doc => (doc.data().id || "").trim() === String(piid).trim());

    if (!docHit) {
      return res.status(404).json({ success: false, message: "ไม่พบอุปกรณ์นี้ในฐานข้อมูล" });
    }

    const data = docHit.data();
    await docHit.ref.update({
      serial: docHit.id,
      status: "To be Added",
      added: true,
      createdAt: data.createdAt ? data.createdAt : admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: "เพิ่มอุปกรณ์สำเร็จ", id: docHit.id });
  } catch (e) {
    console.error("Add device error:", e);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการเพิ่มอุปกรณ์" });
  }
});

app.put("/devices/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const updates = {};

    if (body.serial !== undefined) updates.serial = String(body.serial).trim() || null;
    if (body.status !== undefined) updates.status = String(body.status).trim();
    if (body.used !== undefined) updates.used = Number(body.used);
    if (body.total !== undefined) updates.total = Number(body.total);

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
 * ลบอุปกรณ์ตาม doc id
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


// static files (ถ้ามี)
app.use(express.static(path.join(__dirname, "public")));

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
