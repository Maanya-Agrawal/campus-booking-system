# Campus Resource & Infrastructure Booking System

A full-stack web application for managing and booking campus facilities at VIT Vellore. Built as part of the Database Systems (BCSE302L) course project.

**Team Members**
- Maanya Agrawal — 24BCE5052
- G Mrudularam — 24BCE5279

---

## About the Project

Managing campus infrastructure like laboratories, seminar halls, and classrooms currently relies on manual logs and fragmented communication. This leads to scheduling conflicts, no real-time visibility into availability, and delayed approvals.

This system addresses these problems by providing a centralized relational database with a web interface that allows students and faculty to book resources, administrators to approve or reject requests, and the institution to track usage history.

---

## Features

- **Resource Browsing** — View all campus facilities with type, capacity, location, and availability status. Filter by type or search by name.
- **Booking System** — Submit booking requests for available resources with date and time.
- **Overlap Detection** — The system prevents double-booking by checking for time conflicts before inserting a new booking.
- **Admin Approval Panel** — Administrators can approve or reject pending booking requests in real time.
- **My Bookings** — Users can view all their bookings and filter by status (Approved, Pending, Rejected).
- **Usage History** — Records actual utilization data with feedback once a booking is completed.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Database | Oracle Database 19c XE (Docker) |
| Backend | Node.js + Express.js |
| DB Connector | oracledb npm + Oracle Instant Client 19.16 |
| Frontend | HTML5, CSS3, JavaScript |
| Platform | macOS, Docker Desktop |

---

## Database Schema

The system uses 7 relational tables:

- **USERS** — Students, Faculty, and Admins
- **USER_PHONE** — Multivalued phone numbers (separate table)
- **RESOURCES** — Campus facilities with capacity and location
- **BOOKINGS** — Reservations linking users to resources
- **ADMINS** — Administrators who manage approvals
- **APPROVALS** — One-to-one approval record per booking
- **USAGE_HISTORIES** — Actual usage records with feedback

All tables are normalized to 3NF. Referential integrity is enforced via foreign keys.

---

## Project Structure

```
campus-booking-backend/
├── index.html        # Frontend — all four views in a single file
├── server.js         # Node.js/Express backend with API routes
├── package.json      # Node dependencies
├── .gitignore
└── sql/
    └── README.txt    # SQL schema documented in project report
```

---

## API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/` | Serves the frontend |
| GET | `/resources` | Fetch all resources |
| GET | `/bookings` | Fetch all bookings with user and resource details |
| GET | `/pending` | Fetch all pending bookings for admin panel |
| GET | `/approvals` | Fetch all approval records |
| GET | `/usage` | Fetch usage history |
| POST | `/bookings` | Submit a new booking (includes overlap check) |
| POST | `/approve` | Approve or reject a booking |

---

## How to Run Locally

### Prerequisites
- Docker Desktop
- Node.js
- Oracle Instant Client 19.x

### Steps

**1. Start Oracle database:**
```bash
docker start oracle-xe
```

**2. Install dependencies:**
```bash
npm install
```

**3. Update the Instant Client path in `server.js`:**
```javascript
oracledb.initOracleClient({ libDir: '/path/to/your/instantclient' });
```

**4. Update DB credentials in `server.js`:**
```javascript
const dbConfig = {
  user: 'your_username',
  password: 'your_password',
  connectString: 'localhost:1521/XEPDB1'
};
```

**5. Start the server:**
```bash
node server.js
```

**6. Open in browser:**
```
http://localhost:3000
```

---

## Key SQL Queries

**Find all bookings with user and resource:**
```sql
SELECT U.NAME, R.RESOURCE_NAME, B.BOOKING_DATE, B.BOOKING_STATUS
FROM BOOKINGS B
JOIN USERS U ON B.USER_ID = U.USER_ID
JOIN RESOURCES R ON B.RESOURCE_ID = R.RESOURCE_ID;
```

**Overlap detection:**
```sql
SELECT COUNT(*) FROM BOOKINGS
WHERE RESOURCE_ID = :resource_id
AND BOOKING_STATUS != 'Rejected'
AND (
  TO_TIMESTAMP(:start_time, 'YYYY-MM-DD HH24:MI') < END_TIME
  AND TO_TIMESTAMP(:end_time, 'YYYY-MM-DD HH24:MI') > START_TIME
);
```

**Resources booked more than once:**
```sql
SELECT RESOURCE_ID, COUNT(*) AS TOTAL_BOOKINGS
FROM BOOKINGS
GROUP BY RESOURCE_ID
HAVING COUNT(*) > 1;
```

---

## Course Details

- **Course:** Database Systems (BCSE302L)
- **Institution:** Vellore Institute of Technology, Vellore
- **Academic Year:** 2025–2026
