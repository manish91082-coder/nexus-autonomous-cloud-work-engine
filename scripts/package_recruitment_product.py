from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
PRODUCT = ROOT / "products" / "recruitment-agency-revenue-assurance"
DIST = ROOT / "dist"
VERSION = "0.2.0"
INCLUDED = [
    "index.html",
    "README.md",
    "USER_GUIDE_HI.md",
]
PACKAGE_NOTE = """Recruitment Agency Revenue Assurance Desk v0.2.0

START
1. Extract this ZIP to a local folder.
2. Open index.html in a modern desktop browser (Chrome, Edge, Firefox or Safari).
3. No installation, account, server or internet connection is required for local use.
4. Keep regular JSON backups using the Backup tab.

IMPORTANT
- This is an offline operational tracking utility, not an ATS, accounting system, GST/TDS tool, invoicing system or legal advice.
- Receivable ageing currently uses placement date as a proxy, not invoice due date.
- Use anonymous placement/client/recruiter references only. Never enter candidate names, phone numbers, emails, CVs, Aadhaar, PAN or sensitive personal data.
- Data is stored in the browser's local storage on this device. Export and secure backups; browser/device loss can destroy local data.
- This is a private validation build. Seller must finalize license, support contact, refund terms, tax treatment and platform disclosures before publication.
"""

def main():
    DIST.mkdir(exist_ok=True)
    zip_path = DIST / f"recruitment-agency-revenue-assurance-v{VERSION}.zip"
    manifest = {
        "product": "Recruitment Agency Revenue Assurance Desk",
        "version": VERSION,
        "included_files": INCLUDED + ["PACKAGE_README.txt"],
        "distribution_status": "PRIVATE_DRAFT_NOT_FOR_PUBLICATION",
        "sha256": {},
    }
    for name in INCLUDED:
        path = PRODUCT / name
        if not path.is_file():
            raise FileNotFoundError(path)
        manifest["sha256"][name] = hashlib.sha256(path.read_bytes()).hexdigest()
    with ZipFile(zip_path, "w", ZIP_DEFLATED) as archive:
        for name in INCLUDED:
            archive.write(PRODUCT / name, arcname=name)
        archive.writestr("PACKAGE_README.txt", PACKAGE_NOTE)
        archive.writestr("PACKAGE_MANIFEST.json", json.dumps(manifest, indent=2) + "\n")
    with ZipFile(zip_path) as archive:
        names = set(archive.namelist())
        expected = set(INCLUDED + ["PACKAGE_README.txt", "PACKAGE_MANIFEST.json"])
        if names != expected:
            raise RuntimeError(f"Unexpected package files: {names ^ expected}")
        if archive.testzip() is not None:
            raise RuntimeError("ZIP CRC validation failed")
    digest = hashlib.sha256(zip_path.read_bytes()).hexdigest()
    (DIST / "SHA256SUMS.txt").write_text(f"{digest}  {zip_path.name}\n", encoding="utf-8")
    print(f"PACKAGE_OK {zip_path.name} sha256={digest}")
    print(f"FILES {len(INCLUDED) + 2}")

if __name__ == "__main__":
    main()
