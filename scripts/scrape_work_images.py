#!/usr/bin/env python3
"""One-off scraper: Drummond Projects work listing + detail page images."""

from __future__ import annotations

import hashlib
import json
import re
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from html import unescape
from pathlib import Path

BASE = "https://www.drummondprojects.com"
WORK_URL = f"{BASE}/work"
OUTPUT_ROOT = Path(r"d:\DEV\Drummond_v2\assets\work")
MANIFEST_PATH = OUTPUT_ROOT / "manifest.json"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
FETCH_DELAY = 0.4

CMS_PROJECT = "68a587bfe71d19a78229d4b5"
CMS_CHROME = "689c3980e4d032b44bb69ebf"
PLACEHOLDER_FRAG = "plugins/Basic/assets/placeholder"

TYPE_PRIORITY = [
    ("education", "education_cultural"),
    ("cultural", "education_cultural"),
    ("hospitality", "hospitality"),
    ("multifamily", "multifamily"),
    ("residential", "residential"),
    ("commercial", "commercial"),
    ("installation", "installation"),
]

IMAGE_EXT = re.compile(r"\.(jpe?g|png|gif|webp)(?:\?|$)", re.I)
DERIVATIVE = re.compile(r"-p-\d+(?=\.[a-z]+$)", re.I)
CDN_ASSET_ID = re.compile(
    rf"cdn\.prod\.website-files\.com/{CMS_PROJECT}/([a-f0-9]+)_", re.I
)


def fetch(url: str, retries: int = 1) -> bytes:
    last_err: Exception | None = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=120) as resp:
                return resp.read()
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            last_err = e
            if attempt < retries:
                time.sleep(1.0)
    raise last_err  # type: ignore[misc]


def fetch_text(url: str) -> str:
    time.sleep(FETCH_DELAY)
    data = fetch(url)
    return data.decode("utf-8", "replace")


def to_original_url(url: str) -> str:
    url = unescape(url.strip())
    if url.startswith("//"):
        url = "https:" + url
    elif url.startswith("/"):
        url = BASE + url
    parsed = urllib.parse.urlparse(url)
    path = DERIVATIVE.sub("", parsed.path)
    return urllib.parse.urlunparse(parsed._replace(path=path))


def normalize_type(raw: str) -> str:
    low = raw.lower()
    for needle, cat in TYPE_PRIORITY:
        if needle in low:
            return cat
    cleaned = re.sub(r"[^a-z0-9]+", "_", low).strip("_")
    return cleaned or "unknown"


def normalize_project_slug(title: str) -> str:
    t = unicodedata.normalize("NFKD", title)
    t = t.encode("ascii", "ignore").decode("ascii")
    t = t.lower()
    t = re.sub(r"[^a-z0-9]+", "_", t)
    t = re.sub(r"_+", "_", t).strip("_")
    return t


def folder_name(type_raw: str, title: str) -> str:
    return f"{normalize_type(type_raw)}_{normalize_project_slug(title)}"


def sanitize_filename(name: str, max_len: int = 180) -> str:
    name = urllib.parse.unquote(name)
    name = unicodedata.normalize("NFKC", name)
    for ch in '<>:"/\\|?*':
        name = name.replace(ch, "_")
    name = name.strip(". ")
    if len(name) > max_len:
        stem, dot, ext = name.rpartition(".")
        if dot:
            name = stem[: max_len - len(ext) - 1] + "." + ext
        else:
            name = name[:max_len]
    return name or "image.jpg"


def should_skip_url(url: str) -> bool:
    if not url or PLACEHOLDER_FRAG in url:
        return True
    low = url.lower()
    if low.endswith(".svg") or ".svg?" in low:
        return True
    if CMS_CHROME in url and "project-img" not in url:
        if any(x in low for x in ("logo", "arrow", "download", "map-pin", "social")):
            return True
        if low.endswith(".svg"):
            return True
    if DERIVATIVE.search(urllib.parse.urlparse(url).path):
        return True
    if not IMAGE_EXT.search(urllib.parse.urlparse(url).path):
        return False
    return False


def is_project_cms_image(url: str) -> bool:
    return CMS_PROJECT in url and not should_skip_url(url)


def extract_type_from_card(block: str) -> str:
    """Type is p.work-card-details.left after a p containing 'Type:'."""
    details = re.findall(
        r'<p[^>]*class="([^"]*work-card-details[^"]*)"[^>]*>([^<]*)</p>',
        block,
        re.I,
    )
    for idx, (_cls, text) in enumerate(details):
        if re.search(r"Type\s*:", text, re.I) and idx + 1 < len(details):
            type_cls, type_text = details[idx + 1]
            if "left" in type_cls.lower():
                return unescape(type_text).strip(" ,")
            return unescape(type_text).strip(" ,")
    for cls, text in details:
        if "left" in cls.lower() and text.strip() and not re.search(r"Type\s*:", text):
            return unescape(text).strip(" ,")
    return ""


def parse_work_cards(html: str) -> dict[str, dict]:
    """Return unique projects keyed by href."""
    projects: dict[str, dict] = {}
    card_pattern = re.compile(
        r'<a href="(/projects?/[^"#?]+)" class="link-block-6 w-inline-block">'
        r'<img[^>]*src="([^"]+)"[^>]*class="work-card-image"',
        re.I,
    )
    matches = list(card_pattern.finditer(html))
    for i, m in enumerate(matches):
        href = m.group(1)
        cover = to_original_url(m.group(2))
        end = matches[i + 1].start() if i + 1 < len(matches) else m.start() + 5000
        block = html[m.start() : end]
        title_m = re.search(
            r'<p[^>]*class="[^"]*work-card-title[^"]*"[^>]*>([^<]+)</p>',
            block,
            re.I,
        )
        title = unescape(title_m.group(1)).strip() if title_m else ""
        type_raw = extract_type_from_card(block)
        if href not in projects:
            projects[href] = {
                "href": href,
                "title": title,
                "type_raw": type_raw,
                "cover": cover,
            }
        else:
            existing = projects[href]
            if not existing["title"] and title:
                existing["title"] = title
            if type_raw:
                if not existing["type_raw"]:
                    existing["type_raw"] = type_raw
                elif "education" in type_raw.lower() or "cultural" in type_raw.lower():
                    existing["type_raw"] = type_raw
            if cover and not existing["cover"]:
                existing["cover"] = cover
    return projects


def urls_from_css_background(html: str) -> list[str]:
    urls: list[str] = []
    for m in re.finditer(
        r'background-image\s*:\s*url\s*\(\s*&quot;([^&]+)&quot;\s*\)',
        html,
        re.I,
    ):
        urls.append(to_original_url(m.group(1)))
    for m in re.finditer(
        r'background-image\s*:\s*url\s*\(\s*["\']?([^"\')\s]+)["\']?\s*\)',
        html,
        re.I,
    ):
        urls.append(to_original_url(m.group(1)))
    return urls


def urls_from_w_json(html: str) -> list[str]:
    urls: list[str] = []
    for m in re.finditer(
        r'<script[^>]*class="w-json"[^>]*>(.*?)</script>',
        html,
        re.I | re.S,
    ):
        raw = unescape(m.group(1).strip())
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        items = data.get("items") or []
        for item in items:
            if isinstance(item, dict) and item.get("url"):
                urls.append(to_original_url(item["url"]))
    return urls


def urls_from_project_imgs(html: str) -> list[str]:
    urls: list[str] = []
    for m in re.finditer(
        r'<img[^>]*class="[^"]*project-img[^"]*"[^>]*>',
        html,
        re.I,
    ):
        tag = m.group(0)
        if "w-dyn-bind-empty" in tag and 'src="' in tag:
            src_m = re.search(r'src="([^"]+)"', tag)
            if src_m and PLACEHOLDER_FRAG in src_m.group(1):
                continue
        src_m = re.search(r'\ssrc="([^"]+)"', tag) or re.search(
            r'srcset="([^"\s]+)', tag
        )
        if src_m:
            urls.append(to_original_url(src_m.group(1)))
    return urls


def urls_from_cms_scan(html: str) -> list[str]:
    pattern = re.compile(
        rf"https://cdn\.prod\.website-files\.com/{CMS_PROJECT}/[a-zA-Z0-9%._\-]+?\.(?:jpg|jpeg|png|gif|webp)",
        re.I,
    )
    blobs = [html]
    for m in re.finditer(
        r'<script[^>]*type="text/x-wf-template"[^>]*>(.*?)</script>',
        html,
        re.I | re.S,
    ):
        blobs.append(unescape(urllib.parse.unquote(m.group(1))))
    found: set[str] = set()
    for blob in blobs:
        found.update(pattern.findall(blob))
    return [to_original_url(unescape(u)) for u in found]


def collect_project_urls(html: str) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for u in (
        urls_from_project_imgs(html)
        + urls_from_css_background(html)
        + urls_from_w_json(html)
        + urls_from_cms_scan(html)
    ):
        orig = to_original_url(u)
        if should_skip_url(orig):
            continue
        if not is_project_cms_image(orig):
            continue
        if orig not in seen:
            seen.add(orig)
            ordered.append(orig)
    return ordered


def asset_id(url: str) -> str | None:
    m = CDN_ASSET_ID.search(url)
    return m.group(1) if m else None


def filename_from_url(url: str) -> str:
    path = urllib.parse.urlparse(url).path
    base = path.rsplit("/", 1)[-1]
    base = DERIVATIVE.sub("", base)
    return sanitize_filename(base)


def download_file(url: str, dest: Path, failed: list[str]) -> bool:
    if dest.exists() and dest.stat().st_size > 0:
        return True
    try:
        time.sleep(FETCH_DELAY)
        data = fetch(url)
        if len(data) < 200 and b"<!DOCTYPE" in data[:500]:
            failed.append(url)
            return False
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        return True
    except Exception:
        failed.append(url)
        return False


def merge_by_folder(projects: dict[str, dict]) -> dict[str, list[dict]]:
    by_folder: dict[str, list[dict]] = {}
    for href, meta in projects.items():
        fn = folder_name(meta["type_raw"], meta["title"])
        by_folder.setdefault(fn, []).append({**meta, "href": href})
    return by_folder


def pick_best_meta(entries: list[dict]) -> dict:
    best = entries[0]
    for e in entries:
        tr = e.get("type_raw") or ""
        if "education" in tr.lower() or "cultural" in tr.lower():
            best = e
            break
    for e in entries:
        if e.get("title"):
            best = {**best, "title": e["title"]}
            break
    covers = [e["cover"] for e in entries if e.get("cover")]
    hrefs = [e["href"] for e in entries]
    return {
        **best,
        "hrefs": hrefs,
        "covers": list(dict.fromkeys(covers)),
    }


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    print(f"Fetching work listing: {WORK_URL}")
    work_html = fetch_text(WORK_URL)
    projects = parse_work_cards(work_html)
    print(f"Unique projects from listing: {len(projects)}")

    folder_groups = merge_by_folder(projects)
    manifest_projects: list[dict] = []
    failed_urls: list[str] = []
    total_images = 0
    total_bytes = 0
    per_folder_counts: dict[str, int] = {}

    for folder, entries in sorted(folder_groups.items()):
        meta = pick_best_meta(entries)
        hrefs = meta["hrefs"]
        detail_url = BASE + hrefs[0]
        folder_path = OUTPUT_ROOT / folder
        folder_path.mkdir(parents=True, exist_ok=True)

        url_list: list[str] = []
        seen_assets: set[str] = set()
        seen_urls: set[str] = set()

        def add_url(u: str) -> None:
            u = to_original_url(u)
            if should_skip_url(u) or not is_project_cms_image(u):
                return
            aid = asset_id(u) or hashlib.md5(u.encode()).hexdigest()
            if aid in seen_assets or u in seen_urls:
                return
            seen_assets.add(aid)
            seen_urls.add(u)
            url_list.append(u)

        for c in meta.get("covers", []):
            add_url(c)

        page_ok = True
        try:
            detail_html = fetch_text(detail_url)
            for u in collect_project_urls(detail_html):
                add_url(u)
        except Exception as e:
            page_ok = False
            failed_urls.append(f"{detail_url} ({e})")
            for alt in hrefs[1:]:
                try:
                    detail_html = fetch_text(BASE + alt)
                    for u in collect_project_urls(detail_html):
                        add_url(u)
                    page_ok = True
                    break
                except Exception:
                    continue

        downloaded_files: list[str] = []
        for idx, img_url in enumerate(url_list, start=1):
            fname = filename_from_url(img_url)
            prefixed = f"{idx:02d}_{fname}"
            dest = folder_path / prefixed
            if download_file(img_url, dest, failed_urls):
                if dest.exists():
                    downloaded_files.append(prefixed)
                    total_bytes += dest.stat().st_size
            else:
                print(f"  FAILED: {img_url}")

        count = len(list(folder_path.glob("*")))
        # count only image files
        img_count = sum(
            1
            for p in folder_path.iterdir()
            if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".gif", ".webp"}
        )
        per_folder_counts[folder] = img_count
        total_images += img_count

        manifest_projects.append(
            {
                "folder": folder,
                "title": meta.get("title", ""),
                "type": normalize_type(meta.get("type_raw", "")),
                "type_raw": meta.get("type_raw", ""),
                "source_urls": [BASE + h for h in hrefs],
                "detail_fetched": page_ok,
                "files": sorted(downloaded_files),
            }
        )
        print(f"  {folder}: {img_count} images")

    manifest = {
        "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "work_listing_url": WORK_URL,
        "project_count": len(manifest_projects),
        "projects": manifest_projects,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print("\n=== SUMMARY ===")
    print(f"Unique listing projects (by href): {len(projects)}")
    print(f"Folders: {len(folder_groups)}")
    print(f"Total images: {total_images}")
    print(f"Total size: {total_bytes:,} bytes ({total_bytes / (1024 * 1024):.2f} MiB)")
    print(f"Manifest: {MANIFEST_PATH}")
    print(f"Script: {Path(__file__).resolve()}")
    if failed_urls:
        print(f"Failed URLs ({len(failed_urls)}):")
        for f in failed_urls:
            print(f"  - {f}")
    print("\nPer-folder image counts:")
    for folder, n in sorted(per_folder_counts.items()):
        print(f"  {folder}: {n}")


if __name__ == "__main__":
    main()
