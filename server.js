const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

oracledb.initOracleClient({ libDir: '/Users/maanyaagrawal/Desktop/instantclient_19_16' });

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const dbConfig = {
  user: 'maanya',
  password: 'mypass',
  connectString: 'localhost:1521/XEPDB1'
};

// GET all resources
app.get('/resources', async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    const result = await conn.execute(
      `SELECT * FROM resources`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// GET all bookings with user and resource name
app.get('/bookings', async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    const result = await conn.execute(
      `SELECT b.booking_id, b.booking_date, b.purpose, b.booking_status,
              u.name as user_name, r.resource_name, r.resource_type,
              b.start_time, b.end_time
       FROM bookings b
       JOIN users u ON b.user_id = u.user_id
       JOIN resources r ON b.resource_id = r.resource_id
       ORDER BY b.booking_date DESC`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// GET all approvals
app.get('/approvals', async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    const result = await conn.execute(
      `SELECT a.approval_id, a.approval_status, a.approval_date, a.remarks,
              b.purpose, u.name as user_name, r.resource_name
       FROM approvals a
       JOIN bookings b ON a.booking_id = b.booking_id
       JOIN users u ON b.user_id = u.user_id
       JOIN resources r ON b.resource_id = r.resource_id`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// GET usage history
app.get('/usage', async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    const result = await conn.execute(
      `SELECT u.usage_id, u.actual_start_time, u.actual_end_time,
              u.feedback, r.resource_name, u.booking_id
       FROM usage_histories u
       JOIN resources r ON u.resource_id = r.resource_id`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

app.get('/pending', async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    const result = await conn.execute(
      `SELECT b.booking_id, b.purpose, b.booking_status,
              TO_CHAR(b.booking_date, 'DD Mon YYYY') AS booking_date,
              TO_CHAR(b.start_time, 'HH24:MI') AS start_time,
              TO_CHAR(b.end_time, 'HH24:MI') AS end_time,
              u.name AS user_name, u.role, u.department,
              r.resource_name, r.resource_type, r.capacity, r.location
       FROM bookings b
       JOIN users u ON b.user_id = u.user_id
       JOIN resources r ON b.resource_id = r.resource_id
       WHERE b.booking_status = 'Pending'
       ORDER BY b.booking_date`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

app.post('/approve', async (req, res) => {
  console.log('Approve route hit', req.body);
  const { booking_id, status } = req.body;
  console.log('booking_id:', booking_id, 'status:', status);
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    console.log('DB connected');
    const result = await conn.execute(
      `UPDATE bookings SET booking_status = :status WHERE booking_id = :id`,
      { status, id: booking_id },
      { autoCommit: true }
    );
    console.log('Rows updated:', result.rowsAffected);
    res.json({ success: true });
  } catch (err) {
    console.error('Approve error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});
// POST a new booking
app.post('/bookings', async (req, res) => {
  const { purpose, booking_date, start_time, end_time, user_id, resource_id } = req.body;
  console.log('Received booking request:', req.body);  // add this
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    console.log('DB connected');  // add this

    const overlap = await conn.execute(
  `SELECT COUNT(*) AS cnt FROM bookings
   WHERE resource_id = :resource_id
   AND booking_status != 'Rejected'
   AND (
     TO_TIMESTAMP(:start_time, 'YYYY-MM-DD HH24:MI') < end_time
     AND TO_TIMESTAMP(:end_time, 'YYYY-MM-DD HH24:MI') > start_time
   )`,
  { resource_id, start_time, end_time },
  { outFormat: oracledb.OUT_FORMAT_OBJECT }
);
    console.log('Overlap check result:', overlap.rows[0]);  // add this

    if (overlap.rows[0].CNT > 0) {
      return res.status(409).json({ 
        error: 'overlap',
        message: 'This resource is already booked during that time slot.' 
      });
    }

    const result = await conn.execute(
      `SELECT NVL(MAX(booking_id), 200) + 1 AS new_id FROM bookings`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('New ID:', result.rows[0]);  // add this
    const newId = result.rows[0].NEW_ID;

    await conn.execute(
  `INSERT INTO bookings VALUES (
    :id, TO_DATE(:booking_date,'YYYY-MM-DD'),
    TO_TIMESTAMP(:start_time,'YYYY-MM-DD HH24:MI'),
    TO_TIMESTAMP(:end_time,'YYYY-MM-DD HH24:MI'),
    :purpose, 'Pending', :user_id, :resource_id
  )`,
  { id: newId, booking_date, start_time, end_time, purpose, user_id, resource_id },
  { autoCommit: true }
);
    console.log('Booking inserted successfully');  // add this
    res.json({ success: true, booking_id: newId });
  } catch (err) {
    console.error('Error:', err.message);  // add this
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));