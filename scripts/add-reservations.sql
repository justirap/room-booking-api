INSERT INTO reservations (room_id, user_id, participants, start_time, end_time, status)
SELECT
  3,
  3,
  2,
  timestamptz '2026-12-01 08:00+00' + (g || ' hours')::interval,
  timestamptz '2026-12-01 09:00+00' + (g || ' hours')::interval,
  'CONFIRMED'
FROM generate_series(1, 15) AS g;
