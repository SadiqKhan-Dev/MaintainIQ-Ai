import uuid
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine, Base
from app.models.asset import Asset, AssetStatus
from app.models.issue import Issue, IssueStatus, IssuePriority
from app.models.maintenance_record import MaintenanceRecord
from app.models.asset_history import AssetHistory
from datetime import datetime, date, timedelta

Base.metadata.create_all(bind=engine)
db = SessionLocal()

try:
    existing = db.query(Asset).count()
    if existing > 0:
        print(f"Database already has {existing} assets. Skipping seed.")
        sys.exit(0)

    assets_data = [
        {"asset_code": "HVAC-001", "name": "Central HVAC Unit", "category": "HVAC", "location": "Building A - Roof", "condition": "good", "status": AssetStatus.operational},
        {"asset_code": "ELEV-002", "name": "Main Elevator", "category": "Elevator", "location": "Building A - Lobby", "condition": "fair", "status": AssetStatus.operational},
        {"asset_code": "GEN-003", "name": "Backup Generator", "category": "Power", "location": "Building B - Basement", "condition": "good", "status": AssetStatus.operational},
        {"asset_code": "PLB-004", "name": "Main Water Pump", "category": "Plumbing", "location": "Building A - Basement", "condition": "poor", "status": AssetStatus.issue_reported},
        {"asset_code": "FIR-005", "name": "Fire Suppression System", "category": "Safety", "location": "Building A - All Floors", "condition": "good", "status": AssetStatus.operational},
        {"asset_code": "SEC-006", "name": "Security Camera System", "category": "Security", "location": "Building A - Exterior", "condition": "good", "status": AssetStatus.operational},
        {"asset_code": "LGT-007", "name": "Emergency Lighting", "category": "Electrical", "location": "Building A - All Floors", "condition": "fair", "status": AssetStatus.operational},
        {"asset_code": "AC-008", "name": "Conference Room AC", "category": "HVAC", "location": "Building A - 3rd Floor", "condition": "good", "status": AssetStatus.under_maintenance},
    ]

    assets = []
    for data in assets_data:
        a = Asset(
            last_service_date=date.today() - timedelta(days=30),
            next_service_date=date.today() + timedelta(days=60),
            **data,
        )
        db.add(a)
        assets.append(a)
    db.flush()

    for a in assets[:3]:
        h = AssetHistory(
            asset_id=a.id, action="asset_created", actor_id="system",
            actor_role="system", description=f"Asset {a.asset_code} created and registered",
        )
        db.add(h)

    issues_data = [
        {"asset": assets[3], "title": "Water pump making unusual noise", "description": "The main water pump has started making a loud grinding noise. It started about 2 days ago and has gotten progressively louder.", "priority": IssuePriority.high, "status": IssueStatus.assigned, "category": "Mechanical"},
        {"asset": assets[4], "title": "Fire alarm panel showing fault", "description": "The fire suppression panel on floor 2 is showing a red fault light. System appears to still be functional but panel needs inspection.", "priority": IssuePriority.critical, "status": IssueStatus.reported, "category": "Safety"},
        {"asset": assets[7], "title": "AC not cooling properly", "description": "The conference room AC unit is running but not cooling effectively. Room temperature stays around 28C.", "priority": IssuePriority.medium, "status": IssueStatus.maintenance_in_progress, "category": "HVAC"},
    ]

    issues = []
    for i, data in enumerate(issues_data):
        asset_ref = data.pop("asset")
        issue = Issue(
            issue_number=f"ISS-{i+1:05d}",
            asset_id=asset_ref.id,
            reporter_name="Demo Reporter",
            ai_suggested=True,
            assigned_technician_id="tech_demo_001" if data["status"] != IssueStatus.reported else None,
            **data,
        )
        db.add(issue)
        issues.append(issue)
    db.flush()

    record = MaintenanceRecord(
        issue_id=issues[2].id,
        technician_id="tech_demo_001",
        inspection_notes="Inspected AC unit. Filter was clogged.",
        work_performed="Replaced air filter and cleaned coils",
        parts_replaced=["Air filter - MERV 13"],
        cost=85.50,
        final_condition="good",
    )
    db.add(record)

    db.commit()
    print("Seed data created successfully!")
    print(f"  - {len(assets)} assets")
    print(f"  - {len(issues)} issues")
    print(f"  - 1 maintenance record")
except Exception as e:
    db.rollback()
    print(f"Error seeding data: {e}")
    raise
finally:
    db.close()
