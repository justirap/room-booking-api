const bcrypt = require("bcryptjs");

exports.seed = async function seed(knex) {
  await knex.raw("TRUNCATE audit_log, reservations, rooms, buildings, users RESTART IDENTITY CASCADE");
  const adminHash = await bcrypt.hash("admin-password-123", 12);
  const userHash = await bcrypt.hash("user-password-123", 12);
  await knex("users").insert([
    { email: "admin@example.com", password_hash: adminHash, role: "ADMIN" },
    { email: "anna.nowak@example.com", password_hash: userHash, role: "USER" },
    { email: "jan.kowalski@example.com", password_hash: userHash, role: "USER" },
    { email: "ewa.wisniewska@example.com", password_hash: userHash, role: "USER" },
    { email: "piotr.zielinski@example.com", password_hash: userHash, role: "USER" }
  ]);
};
