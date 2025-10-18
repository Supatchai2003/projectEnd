// hash.js
const bcrypt = require("bcrypt");

const password = "Superadmin*01"; // ใส่รหัสจริงที่คุณต้องการ
const saltRounds = 10;

bcrypt.hash(password, saltRounds).then(hash => {
  console.log("HASH ที่ต้องใช้:", hash);
});
