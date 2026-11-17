function toAuditEntry(row) {
  return {
    id: Number(row.id),
    eventType: row.event_type,
    payload: row.payload,
    createdAt: row.created_at
  };
}

function createAuditRepository(db) {
  return {
    async list({ eventType, page = 1, limit = 20 } = {}) {
      const filtered = () => {
        const query = db("audit_log");
        if (eventType) query.where("event_type", eventType);
        return query;
      };

      const [rows, countRow] = await Promise.all([
        filtered()
          .select("id", "event_type", "payload", "created_at")
          .orderBy("created_at", "desc")
          .orderBy("id", "desc")
          .limit(limit)
          .offset((page - 1) * limit),
        filtered().count({ count: "*" }).first()
      ]);

      return {
        items: rows.map(toAuditEntry),
        total: Number(countRow.count)
      };
    }
  };
}

module.exports = { createAuditRepository };
