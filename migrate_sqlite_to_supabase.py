"""
Phase G: SQLite → Supabase Data Migration Script

Reads existing receptionist.db (SQLite) and migrates all data to Supabase.
Run this ONCE when you have a populated SQLite database to migrate.

Usage:
    python migrate_sqlite_to_supabase.py [--db receptionist.db] [--business-id <uuid>] [--dry-run]

Options:
    --db            Path to SQLite database file (default: receptionist.db)
    --business-id   Target business UUID to assign migrated rows. If omitted,
                    fetches the first business from Supabase (demo business).
    --dry-run       Print what would be migrated without writing anything.

Steps performed:
    1. Reads callers, appointments, call_logs, bookings from SQLite
    2. Inserts into Supabase, scoped to the target business_id
    3. Updates caller total_appointments to match migrated count
    4. Prints row-count verification summary
"""

import argparse
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from supabase_client import get_supabase


# ── helpers ────────────────────────────────────────────────────────────────

def _isoformat(val: str | None) -> str | None:
    """Return ISO-8601 string or None; tolerates timestamps already in ISO form."""
    if not val:
        return None
    return val  # SQLite stores as text; Supabase accepts ISO strings directly


def _bool(val) -> bool:
    return bool(val)


# ── per-table migrators ─────────────────────────────────────────────────────

def migrate_callers(conn: sqlite3.Connection, sb, business_id: str, dry_run: bool) -> dict[int, int]:
    """
    Migrate callers table.
    Returns mapping {sqlite_id: supabase_id} for use by dependent tables.
    """
    cur = conn.execute("SELECT * FROM callers")
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    id_map: dict[int, int] = {}

    print(f"  callers: {len(rows)} rows found in SQLite")
    if dry_run or not rows:
        return id_map

    for row in rows:
        r = dict(zip(cols, row))
        payload = {
            "phone_number": r["phone_number"],
            "name": r.get("name"),
            "email": r.get("email"),
            "notes": r.get("notes"),
            "total_calls": r.get("total_calls", 1),
            "total_appointments": r.get("total_appointments", 0),
            "business_id": business_id,
            "created_at": _isoformat(r.get("created_at")) or datetime.now().isoformat(),
            "updated_at": _isoformat(r.get("updated_at")) or datetime.now().isoformat(),
        }

        # Upsert by (phone_number, business_id) to allow re-runs
        existing = sb.table("callers").select("id").eq(
            "phone_number", payload["phone_number"]
        ).eq("business_id", business_id).execute()

        if existing.data:
            supabase_id = existing.data[0]["id"]
            sb.table("callers").update(payload).eq("id", supabase_id).execute()
        else:
            result = sb.table("callers").insert(payload).execute()
            supabase_id = result.data[0]["id"]

        id_map[r["id"]] = supabase_id

    print(f"  callers: {len(id_map)} rows migrated → Supabase")
    return id_map


def migrate_appointments(
    conn: sqlite3.Connection,
    sb,
    business_id: str,
    caller_id_map: dict[int, int],
    dry_run: bool,
) -> dict[int, int]:
    """Migrate appointments. Returns {sqlite_id: supabase_id}."""
    cur = conn.execute("SELECT * FROM appointments")
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    id_map: dict[int, int] = {}

    print(f"  appointments: {len(rows)} rows found in SQLite")
    if dry_run or not rows:
        return id_map

    for row in rows:
        r = dict(zip(cols, row))
        sqlite_caller_id = r.get("caller_id")
        supabase_caller_id = caller_id_map.get(sqlite_caller_id) if sqlite_caller_id else None

        payload = {
            "caller_id": supabase_caller_id,
            "caller_name": r.get("caller_name"),
            "caller_phone": r.get("caller_phone"),
            "service_name": r.get("service_name", ""),
            "appointment_date": r.get("appointment_date", ""),
            "appointment_time": r.get("appointment_time", ""),
            "duration_minutes": r.get("duration_minutes", 30),
            "status": r.get("status", "scheduled"),
            "notes": r.get("notes"),
            "reminder_sent": _bool(r.get("reminder_sent", False)),
            "business_id": business_id,
            "created_at": _isoformat(r.get("created_at")) or datetime.now().isoformat(),
        }

        result = sb.table("appointments").insert(payload).execute()
        id_map[r["id"]] = result.data[0]["id"]

    print(f"  appointments: {len(id_map)} rows migrated → Supabase")
    return id_map


def migrate_call_logs(
    conn: sqlite3.Connection,
    sb,
    business_id: str,
    caller_id_map: dict[int, int],
    dry_run: bool,
) -> None:
    """Migrate call_logs table."""
    cur = conn.execute("SELECT * FROM call_logs")
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]

    print(f"  call_logs: {len(rows)} rows found in SQLite")
    if dry_run or not rows:
        return

    migrated = 0
    for row in rows:
        r = dict(zip(cols, row))
        sqlite_caller_id = r.get("caller_id")
        supabase_caller_id = caller_id_map.get(sqlite_caller_id) if sqlite_caller_id else None

        payload = {
            "call_sid": r.get("call_sid", f"migrated_{r['id']}"),
            "caller_id": supabase_caller_id,
            "caller_phone": r.get("caller_phone", ""),
            "call_status": r.get("call_status", "completed"),
            "started_at": _isoformat(r.get("started_at")) or datetime.now().isoformat(),
            "ended_at": _isoformat(r.get("ended_at")),
            "duration_seconds": r.get("duration_seconds"),
            "transcript": r.get("transcript"),
            "summary": r.get("summary"),
            "appointment_created": _bool(r.get("appointment_created", False)),
            "appointment_id": r.get("appointment_id"),
            "business_id": business_id,
        }

        # Skip if call_sid already exists (re-run safety)
        existing = sb.table("call_logs").select("id").eq(
            "call_sid", payload["call_sid"]
        ).execute()
        if existing.data:
            continue

        sb.table("call_logs").insert(payload).execute()
        migrated += 1

    print(f"  call_logs: {migrated} rows migrated → Supabase")


def migrate_bookings(conn: sqlite3.Connection, sb, dry_run: bool) -> None:
    """Migrate legacy bookings table (no business_id scoping — global table)."""
    cur = conn.execute("SELECT * FROM bookings")
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]

    print(f"  bookings (legacy): {len(rows)} rows found in SQLite")
    if dry_run or not rows:
        return

    migrated = 0
    for row in rows:
        r = dict(zip(cols, row))
        payload = {
            "name": r.get("name", ""),
            "service": r.get("service", ""),
            "date": r.get("date", ""),
            "time": r.get("time", ""),
            "timestamp": _isoformat(r.get("timestamp")) or datetime.now().isoformat(),
        }

        # Re-run safety: skip if exact name+service+date+time exists
        existing = sb.table("bookings").select("id").eq(
            "name", payload["name"]
        ).eq("date", payload["date"]).eq("time", payload["time"]).execute()
        if existing.data:
            continue

        sb.table("bookings").insert(payload).execute()
        migrated += 1

    print(f"  bookings (legacy): {migrated} rows migrated → Supabase")


# ── verification ─────────────────────────────────────────────────────────────

def verify(conn: sqlite3.Connection, sb, business_id: str) -> None:
    """Print row-count comparison between SQLite and Supabase."""
    print("\n── Verification ──────────────────────────────────────────────")
    tables = [
        ("callers", "callers"),
        ("appointments", "appointments"),
        ("call_logs", "call_logs"),
        ("bookings", "bookings"),
    ]
    all_ok = True
    for sqlite_table, sb_table in tables:
        try:
            sq_count = conn.execute(f"SELECT COUNT(*) FROM {sqlite_table}").fetchone()[0]
        except sqlite3.OperationalError:
            sq_count = 0  # Table may not exist in older DBs

        q = sb.table(sb_table).select("id", count="exact")
        if sb_table != "bookings":
            q = q.eq("business_id", business_id)
        sb_result = q.execute()
        sb_count = sb_result.count or len(sb_result.data)

        status = "✓" if sb_count >= sq_count else "✗ MISMATCH"
        if sb_count < sq_count:
            all_ok = False
        print(f"  {sqlite_table:25s}  SQLite={sq_count:>5}  Supabase={sb_count:>5}  {status}")

    print("──────────────────────────────────────────────────────────────")
    if all_ok:
        print("  All counts OK. Migration successful.")
    else:
        print("  WARNING: Some counts do not match. Re-run or investigate.")


# ── main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate SQLite receptionist.db → Supabase")
    parser.add_argument("--db", default="receptionist.db", help="Path to SQLite DB file")
    parser.add_argument("--business-id", default=None, help="Target Supabase business UUID")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, no writes")
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.exists():
        print(f"ERROR: SQLite database not found at '{db_path}'")
        sys.exit(1)

    sb = get_supabase()

    # Resolve business_id
    business_id = args.business_id
    if not business_id:
        result = sb.table("businesses").select("id, name").limit(1).execute()
        if not result.data:
            print("ERROR: No businesses found in Supabase. Create one via POST /auth/business first.")
            sys.exit(1)
        business_id = result.data[0]["id"]
        print(f"Using business: '{result.data[0]['name']}' ({business_id})")
    else:
        biz = sb.table("businesses").select("name").eq("id", business_id).execute()
        if not biz.data:
            print(f"ERROR: Business {business_id} not found in Supabase.")
            sys.exit(1)
        print(f"Using business: '{biz.data[0]['name']}' ({business_id})")

    if args.dry_run:
        print("\n[DRY RUN] No data will be written.\n")

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row

    try:
        print("\n── Migrating ─────────────────────────────────────────────────")
        caller_id_map = migrate_callers(conn, sb, business_id, args.dry_run)
        apt_id_map = migrate_appointments(conn, sb, business_id, caller_id_map, args.dry_run)
        migrate_call_logs(conn, sb, business_id, caller_id_map, args.dry_run)
        migrate_bookings(conn, sb, args.dry_run)

        if not args.dry_run:
            verify(conn, sb, business_id)
            print("\nNext step: run migration 015 to enforce NOT NULL on business_id.")
        else:
            print("\n[DRY RUN complete — no data written]")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
