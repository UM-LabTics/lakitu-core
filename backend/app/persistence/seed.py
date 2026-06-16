"""
seed.py
-------
Clears the database and fills it with 31 days (30 days ago → today) of realistic
parking-lot event data for two lots.

Occupancy patterns per weekday
  ~8 am  → morning rush    (lots fill up)
  ~1 pm  → lunch departure (lots partially empty)
  ~4 pm  → afternoon surge (lots fill again)
  ~9 pm  → evening exodus  (lots nearly empty overnight)

Weekends follow a much lighter curve.

Image URLs start at events/67/photo.jpg and increment globally across both lots.
"""

import asyncio
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, insert
from sqlalchemy.ext.asyncio import create_async_engine

from app.persistence.tables import metadata, parking_lot, device, spot, event, event_spot
from app.settings import settings


# ─────────────────────────────────────────────────────────────────────────────
# Static configuration
# ─────────────────────────────────────────────────────────────────────────────

RANDOM_SEED          = 42
IMAGE_COUNTER_START  = 67

PARKING_LOTS = [
    {
        "id":           "mock-01",
        "name":         "mock parking",
        "device_id":    "mockDevice",
        "total_spots":  12,
    },
    {
        "id":           "p01",
        "name":         "Edificio Parque de Innovación LATU",
        "device_id":    "raspberry_pi",
        "total_spots":  26,
    },
]

# ── Occupancy keyframes (hour, fraction) ──────────────────────────────────────
#   Linearly interpolated to produce a smooth intra-day curve.

WEEKDAY_KEYFRAMES = [
    (0.0,  0.04),   # midnight   – nearly empty
    (6.0,  0.04),   # 6 am       – still quiet
    (7.5,  0.12),   # 7:30 am    – first trickle of arrivals
    (9.0,  0.85),   # 9 am       – morning rush complete
    (12.0, 0.82),   # noon       – still busy
    (13.5, 0.55),   # 1:30 pm    – lunch departures done
    (15.0, 0.68),   # 3 pm       – gradual return
    (16.5, 0.88),   # 4:30 pm    – afternoon surge complete
    (18.0, 0.85),   # 6 pm       – evening peak
    (21.0, 0.10),   # 9 pm       – evening exodus done
    (22.5, 0.04),   # 10:30 pm   – quiet
    (24.0, 0.04),   # midnight   – nearly empty
]

WEEKEND_KEYFRAMES = [
    (0.0,  0.03),
    (7.0,  0.03),
    (9.0,  0.10),
    (12.0, 0.22),
    (14.0, 0.20),
    (18.0, 0.07),
    (22.0, 0.03),
    (24.0, 0.03),
]

# ── Peak windows (minutes since midnight) ─────────────────────────────────────
#   Within these windows changes are more frequent (1–4 spots per event).
#   Outside them we only act when the drift exceeds a threshold.

PEAK_WINDOWS = [
    (450,  540),    # 7:30 →  9:00  morning rush
    (720,  810),    # 12:00 → 13:30 lunch departures
    (900,  990),    # 15:00 → 16:30 afternoon arrivals
    (1080, 1260),   # 18:00 → 21:00 evening departures
]


# ─────────────────────────────────────────────────────────────────────────────
# Pure-function helpers
# ─────────────────────────────────────────────────────────────────────────────

def _lerp(keyframes: list, hour: float) -> float:
    """Linearly interpolate over (hour, fraction) keyframes."""
    for i in range(len(keyframes) - 1):
        h0, v0 = keyframes[i]
        h1, v1 = keyframes[i + 1]
        if h0 <= hour <= h1:
            t = (hour - h0) / (h1 - h0) if h1 != h0 else 0.0
            return v0 + t * (v1 - v0)
    return keyframes[-1][1]


def target_fraction(minutes: int, is_weekend: bool) -> float:
    """Return the target occupancy fraction (0–1) for a given minute-of-day."""
    kf = WEEKEND_KEYFRAMES if is_weekend else WEEKDAY_KEYFRAMES
    return _lerp(kf, minutes / 60.0)


def is_peak(minutes: int) -> bool:
    """True if this minute falls inside a peak transition window."""
    return any(lo <= minutes <= hi for lo, hi in PEAK_WINDOWS)


# ─────────────────────────────────────────────────────────────────────────────
# Day simulation
# ─────────────────────────────────────────────────────────────────────────────

def simulate_day(
    lot: dict,
    states: dict,            # {spot_id: 0|1}  – mutated in-place
    day_start: datetime,     # UTC midnight of this calendar day
    image_ctr: list,         # [int]  – shared mutable counter across lots
    rng: random.Random,
    end_minutes: int = 24 * 60,
) -> list:
    """
    Walk through a single day in 5-minute steps, adjusting spot states so
    the lot gradually approaches the time-of-day occupancy target.

    Mutates `states` in-place (state carries over to the next day).
    Increments `image_ctr[0]` for every event produced.
    Returns a list of event-payload dicts (not yet persisted).
    """
    total    = lot["total_spots"]
    spot_ids = [f"spot_{n:02d}" for n in range(1, total + 1)]
    is_wknd  = day_start.weekday() >= 5

    # Per-day noise keeps every day feeling slightly different
    noise   = rng.uniform(-0.06, 0.06)
    events  = []

    for mins in range(0, end_minutes, 5):
        frac = target_fraction(mins, is_wknd)
        want = round(max(0.0, min(1.0, frac + noise)) * total)
        have = sum(states.values())
        diff = want - have

        # ── decide how many spots to change this tick ─────────────────────
        if diff == 0:
            # During business hours, add a rare spontaneous single-car event
            hour = mins / 60.0
            if 7 <= hour <= 22 and rng.random() < 0.04:
                diff = rng.choice([-1, 1])
                n    = 1
            else:
                continue
        elif is_peak(mins):
            # Peak windows: change 1–4 spots at once to simulate bursts
            n = min(abs(diff), rng.randint(1, 4))
        elif abs(diff) < 2:
            # Stable period: ignore tiny drift
            continue
        else:
            n = 1

        # ── select spots to flip ──────────────────────────────────────────
        target_state = 1 if diff > 0 else 0
        pool  = [s for s in spot_ids if states[s] != target_state]
        picks = rng.sample(pool, min(n, len(pool)))
        if not picks:
            continue

        for s in picks:
            states[s] = target_state

        # ── build the event payload ───────────────────────────────────────
        jitter = rng.randint(-90, 90)   # ±90 s timestamp jitter
        ts     = day_start + timedelta(minutes=mins, seconds=jitter)

        events.append({
            "timestamp":  ts,
            "free_spots": total - sum(states.values()),
            "image_url":  f"events/{image_ctr[0]}/photo.jpg",
            "parking_id": lot["id"],
            "device_id":  lot["device_id"],
            "spots":      [(s, target_state) for s in picks],
        })
        image_ctr[0] += 1

    return events


# ─────────────────────────────────────────────────────────────────────────────
# Main seeding coroutine
# ─────────────────────────────────────────────────────────────────────────────

async def seed() -> None:
    engine = create_async_engine(settings.database_url, echo=False)
    rng    = random.Random(RANDOM_SEED)

    now_utc   = datetime.now(timezone.utc)
    today_utc = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
    start_day = today_utc - timedelta(days=30)   # inclusive first day

    try:
        async with engine.begin() as conn:

            # ── 1. Wipe all data (FK-safe deletion order) ─────────────────
            print("Clearing existing data …")
            for tbl in (event_spot, event, spot, device, parking_lot):
                await conn.execute(delete(tbl))
            print("Done.\n")

            # ── 2. Insert static structure ────────────────────────────────
            print("Inserting parking lots, devices and spots …")
            for lot in PARKING_LOTS:
                await conn.execute(insert(parking_lot).values(
                    id          = lot["id"],
                    name        = lot["name"],
                    total_spots = lot["total_spots"],
                ))
                await conn.execute(insert(device).values(
                    id         = lot["device_id"],
                    parking_id = lot["id"],
                ))
                for n in range(1, lot["total_spots"] + 1):
                    await conn.execute(insert(spot).values(
                        id         = f"spot_{n:02d}",
                        parking_id = lot["id"],
                        device_id  = lot["device_id"],
                    ))
            print("Done.\n")

            # ── 3. Simulate and persist 31 days per lot ───────────────────
            image_ctr = [IMAGE_COUNTER_START]

            for lot in PARKING_LOTS:
                print(f"Simulating '{lot['name']}' ({lot['id']}) …")

                # All spots start empty on day 0
                states = {f"spot_{n:02d}": 0 for n in range(1, lot["total_spots"] + 1)}
                lot_img_start = image_ctr[0]
                all_events    = []

                for day_idx in range(31):   # 0 = 30 days ago, 30 = today
                    day_start = start_day + timedelta(days=day_idx)

                    if day_idx == 30:
                        # Today: only generate events up to ~2 min before now
                        # (±90 s jitter means the very last event stays in the past)
                        elapsed = int((now_utc - today_utc).total_seconds() // 60)
                        end_mins = max(0, elapsed - 2)
                    else:
                        end_mins = 24 * 60

                    day_events = simulate_day(
                        lot, states, day_start, image_ctr, rng,
                        end_minutes=end_mins,
                    )
                    all_events.extend(day_events)

                print(f"  → {len(all_events)} events generated. Persisting …")

                for i, ev in enumerate(all_events, 1):
                    # Insert the event row and retrieve its auto-generated id
                    res = await conn.execute(
                        insert(event).values(
                            timestamp  = ev["timestamp"],
                            free_spots = ev["free_spots"],
                            image_url  = ev["image_url"],
                        ).returning(event.c.id)
                    )
                    eid = res.scalar_one()

                    # Batch-insert all spot-change rows for this event
                    await conn.execute(
                        insert(event_spot),
                        [
                            {
                                "event_id":   eid,
                                "spot_id":    s_id,
                                "parking_id": ev["parking_id"],
                                "device_id":  ev["device_id"],
                                "new_state":  s_st,
                            }
                            for s_id, s_st in ev["spots"]
                        ],
                    )

                    if i % 200 == 0:
                        print(f"    {i}/{len(all_events)} …")

                print(
                    f"  Done. "
                    f"Image IDs {lot_img_start}–{image_ctr[0] - 1} "
                    f"({image_ctr[0] - lot_img_start} images)\n"
                )

        print(
            f"Seeding complete!\n"
            f"  Image counter: {IMAGE_COUNTER_START} → {image_ctr[0] - 1} "
            f"({image_ctr[0] - IMAGE_COUNTER_START} total images)"
        )

    except Exception as exc:
        print(f"\nSeeding FAILED: {exc}")
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())