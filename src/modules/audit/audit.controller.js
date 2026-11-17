function toAuditResponse(entry) {
  return {
    id: entry.id,
    eventType: entry.eventType,
    payload: entry.payload,
    createdAt: new Date(entry.createdAt).toISOString()
  };
}

function createAuditController(auditRepository) {
  return {
    async list(req, res) {
      const query = req.validated.query;
      const { items, total } = await auditRepository.list(query);
      res.json({
        data: items.map(toAuditResponse),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / query.limit)
        }
      });
    }
  };
}

module.exports = { createAuditController };
