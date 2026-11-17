const bcrypt = require("bcryptjs");

const KNOWN_EMAILS = {
  "Anna Nowak": "anna.nowak@example.com",
  "Jan Kowalski": "jan.kowalski@example.com",
  "Ewa Wiśniewska": "ewa.wisniewska@example.com",
  "Piotr Zieliński": "piotr.zielinski@example.com"
};

function emailForName(name) {
  if (KNOWN_EMAILS[name]) return KNOWN_EMAILS[name];
  const slug = String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "user"}@example.com`;
}

exports.up = async function up(knex) {
  const passwordHash = await bcrypt.hash("user-password-123", 12);
  const adminHash = await bcrypt.hash("admin-password-123", 12);
  const existingAdmin = await knex("users").where({ email: "admin@example.com" }).first();
  if (!existingAdmin) {
    await knex("users").insert({
      email: "admin@example.com",
      password_hash: adminHash,
      role: "ADMIN"
    });
  }

  const names = await knex("reservations").distinct("reserved_by");
  for (const row of names) {
    const email = emailForName(row.reserved_by);
    const existing = await knex("users").where({ email }).first();
    if (!existing) {
      await knex("users").insert({ email, password_hash: passwordHash, role: "USER" });
    }
  }

  await knex.schema.alterTable("reservations", (table) => {
    table.integer("user_id");
  });

  const users = await knex("users").select("id", "email");
  const idByEmail = new Map(users.map((user) => [user.email, user.id]));
  const reservations = await knex("reservations").select("id", "reserved_by");
  for (const reservation of reservations) {
    const userId = idByEmail.get(emailForName(reservation.reserved_by));
    if (!userId) throw new Error(`No user for reservation ${reservation.id}`);
    await knex("reservations").where({ id: reservation.id }).update({ user_id: userId });
  }

  await knex.raw("ALTER TABLE reservations ALTER COLUMN user_id SET NOT NULL");
  await knex.schema.alterTable("reservations", (table) => {
    table.foreign("user_id").references("id").inTable("users").onDelete("RESTRICT");
    table.index(["user_id"]);
  });
  await knex.schema.alterTable("reservations", (table) => {
    table.dropColumn("reserved_by");
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("reservations", (table) => {
    table.string("reserved_by", 100);
  });
  await knex.raw(`
    UPDATE reservations
    SET reserved_by = users.email
    FROM users
    WHERE users.id = reservations.user_id
  `);
  await knex.raw("ALTER TABLE reservations ALTER COLUMN reserved_by SET NOT NULL");
  await knex.schema.alterTable("reservations", (table) => {
    table.dropColumn("user_id");
  });
};
