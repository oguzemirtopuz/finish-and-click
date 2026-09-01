"""╔═══════════════════════════════════════════════════════════════════════════╗
║ Finish & Click — One-Click Update Tool                                    ║
║ (No Git Required)                                                         ║
╠═══════════════════════════════════════════════════════════════════════════╣
║ Downloads the latest code from GitHub and updates your installation.      ║
║                                                                           ║
║ PROTECTED ITEMS:                                                          ║
║ • .env & .env.local (Supabase & App Secrets)                              ║
║ • node_modules/ & .next/ & dist/                                          ║
║                                                                           ║
║ Usage: python update.py                                                   ║
╚═══════════════════════════════════════════════════════════════════════════╝"""

import os
import sys
import shutil
import zipfile
import urllib.request
import urllib.error
import time
import datetime
import hashlib

GITHUB_USER = "oguzemirtopuz"
GITHUB_REPO = "finish-and-click"
GITHUB_BRANCH = "main"
DOWNLOAD_URL = f"https://github.com/{GITHUB_USER}/{GITHUB_REPO}/archive/refs/heads/{GITHUB_BRANCH}.zip"
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

PROTECTED_ITEMS = [
    ".env",
    ".env.local",
    "node_modules",
    ".next",
    "dist",
    "build",
    ".git",
    ".gitignore",
    "update.py",
]

PROTECTED_EXTENSIONS = [".db", ".sqlite3", ".log"]
BACKUP_DIR_NAME = "_finishandclick_backup"


def print_banner():
    print()
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║ 🔄 Finish & Click Update Tool v1.0                           ║")
    print("║ Switch to the latest version with one click!                 ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print()


def print_step(step_num, total, message):
    bar = "█" * step_num + "░" * (total - step_num)
    print(f"[{bar}] Step {step_num}/{total}: {message}")


def print_success(message):
    print(f"  ✅ {message}")


def print_warning(message):
    print(f"  ⚠️  {message}")


def print_error(message):
    print(f"  ❌ {message}")


def print_info(message):
    print(f"  ℹ️  {message}")


def is_protected(relative_path: str) -> bool:
    top_level = relative_path.split(os.sep)[0]
    if top_level in PROTECTED_ITEMS:
        return True
    if relative_path in PROTECTED_ITEMS:
        return True
    _, ext = os.path.splitext(relative_path)
    if ext.lower() in PROTECTED_EXTENSIONS:
        return True
    return False


def file_hash(filepath: str) -> str:
    try:
        h = hashlib.md5()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()
    except Exception:
        return ""


def download_with_progress(url: str, dest_path: str) -> bool:
    try:
        print_info(f"Download starts: {url}")
        print()
        req = urllib.request.Request(url, headers={"User-Agent": "FinishAndClick-Updater/1.0"})
        response = urllib.request.urlopen(req, timeout=60)
        total_size = response.headers.get("Content-Length")
        total_size = int(total_size) if total_size else None
        downloaded = 0
        block_size = 8192
        start_time = time.time()

        with open(dest_path, "wb") as f:
            while True:
                chunk = response.read(block_size)
                if not chunk:
                    break
                f.write(chunk)
                downloaded += len(chunk)
                if total_size:
                    pct = downloaded / total_size * 100
                    elapsed = time.time() - start_time
                    speed = downloaded / (elapsed + 0.001) / 1024
                    bar_len = 30
                    filled = int(bar_len * downloaded / total_size)
                    bar = "█" * filled + "░" * (bar_len - filled)
                    size_mb = downloaded / (1024 * 1024)
                    total_mb = total_size / (1024 * 1024)
                    sys.stdout.write(f"\r  ⬇️  [{bar}] {pct:5.1f}% — {size_mb:.1f}/{total_mb:.1f} MB ({speed:.0f} KB/s)")
                    sys.stdout.flush()

        print()
        return True
    except Exception as e:
        print_error(f"Download error: {e}")
        return False


def run_update():
    print_banner()
    total_steps = 5
    stats = {"updated": 0, "added": 0, "skipped": 0, "protected": 0}

    print_step(1, total_steps, "Checking GitHub connection...")
    try:
        test_req = urllib.request.Request(
            f"https://github.com/{GITHUB_USER}/{GITHUB_REPO}",
            headers={"User-Agent": "FinishAndClick-Updater/1.0"}
        )
        test_resp = urllib.request.urlopen(test_req, timeout=10)
        if test_resp.status == 200:
            print_success("GitHub connection successful.")
        else:
            print_error(f"GitHub response code: {test_resp.status}")
            return False
    except Exception as e:
        print_error(f"Unable to connect to GitHub: {e}")
        return False

    print()
    print_step(2, total_steps, "Downloading latest version...")
    zip_path = os.path.join(PROJECT_ROOT, "_update_temp.zip")
    if not download_with_progress(DOWNLOAD_URL, zip_path):
        return False
    print_success("Download completed.")
    print()

    print_step(3, total_steps, "Backing up existing files...")
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = os.path.join(PROJECT_ROOT, BACKUP_DIR_NAME, f"backup_{timestamp}")
    try:
        os.makedirs(backup_dir, exist_ok=True)
        backed_up = 0
        for root, dirs, files in os.walk(PROJECT_ROOT):
            rel_root = os.path.relpath(root, PROJECT_ROOT)
            if rel_root.startswith(BACKUP_DIR_NAME) or rel_root.startswith("_update_") or "node_modules" in rel_root:
                continue
            for f in files:
                rel_path = os.path.relpath(os.path.join(root, f), PROJECT_ROOT)
                if not is_protected(rel_path):
                    src = os.path.join(root, f)
                    dst = os.path.join(backup_dir, rel_path)
                    os.makedirs(os.path.dirname(dst), exist_ok=True)
                    shutil.copy2(src, dst)
                    backed_up += 1
        print_success(f"Backup completed ({backed_up} files → {BACKUP_DIR_NAME}/backup_{timestamp}/)")
    except Exception as e:
        print_warning(f"Error during backup: {e}")
    print()

    print_step(4, total_steps, "Updating files...")
    extract_dir = os.path.join(PROJECT_ROOT, "_update_extract")
    try:
        with zipfile.ZipFile(zip_path, 'r') as zf:
            zf.extractall(extract_dir)
        inner_dirs = os.listdir(extract_dir)
        source_root = os.path.join(extract_dir, inner_dirs[0]) if len(inner_dirs) == 1 and os.path.isdir(os.path.join(extract_dir, inner_dirs[0])) else extract_dir

        for root, dirs, files in os.walk(source_root):
            rel_root = os.path.relpath(root, source_root)
            for f in files:
                rel_path = f if rel_root == "." else os.path.join(rel_root, f)
                if is_protected(rel_path):
                    stats["protected"] += 1
                    continue
                src_file = os.path.join(root, f)
                dst_file = os.path.join(PROJECT_ROOT, rel_path)
                if os.path.exists(dst_file):
                    if file_hash(src_file) == file_hash(dst_file):
                        stats["skipped"] += 1
                        continue
                    else:
                        os.makedirs(os.path.dirname(dst_file), exist_ok=True)
                        shutil.copy2(src_file, dst_file)
                        stats["updated"] += 1
                        print(f"  📝 Updated: {rel_path}")
                else:
                    os.makedirs(os.path.dirname(dst_file), exist_ok=True)
                    shutil.copy2(src_file, dst_file)
                    stats["added"] += 1
                    print(f"  🆕 Added:   {rel_path}")
        print()
        print_success("File update completed.")
    except Exception as e:
        print_error(f"Error during update: {e}")
        return False
    finally:
        if os.path.exists(zip_path):
            os.remove(zip_path)
        if os.path.exists(extract_dir):
            shutil.rmtree(extract_dir, ignore_errors=True)

    print()
    print_step(5, total_steps, "Finalizing report...")
    print()
    print("  ╔════════════════════════════════════════════════════════╗")
    print("  ║ 📊 UPDATE REPORT                                       ║")
    print("  ╠════════════════════════════════════════════════════════╣")
    print(f"  ║ 📝 Updated files: {stats['updated']:>4}                               ║")
    print(f"  ║ 🆕 Added files:   {stats['added']:>4}                               ║")
    print(f"  ║ ⏩ Up to date:     {stats['skipped']:>4}                               ║")
    print(f"  ║ 🛡️ Protected:      {stats['protected']:>4}                               ║")
    print("  ╚════════════════════════════════════════════════════════╝")
    print()
    return True


if __name__ == "__main__":
    try:
        if run_update():
            print("🚀 You can now restart Finish & Click to use the latest version.")
        else:
            print("⚠️ Update could not be completed.")
        print()
        input("Press Enter to exit...")
    except KeyboardInterrupt:
        print("\n\n⛔ Update canceled by user.")
    except Exception as e:
        print(f"\n❌ Critical error: {e}")
        input("\nPress Enter to exit...")
