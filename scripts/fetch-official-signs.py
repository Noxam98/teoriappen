"""Downloads the official Norwegian road sign drawings from Wikimedia Commons into ref-signs/: every SVG in the
Norwegian road-sign categories, with descriptions and licences in ref-signs/index.json (python3 scripts/fetch-official-signs.py).
Then: node scripts/import-signs.mjs ref-signs. Polite: one request at a time, pauses, an identifying User-Agent as the
Wikimedia policy asks (from a network that Wikimedia does not rate-limit; a shared cloud address gets 429)."""
import json, os, time, urllib.parse, urllib.request

UA = "teoriappen-sign-fetch/1.0 (+https://github.com/Noxam98/teoriappen; GitHub Actions)"
API = "https://commons.wikimedia.org/w/api.php"
OUT = "ref-signs"
os.makedirs(OUT, exist_ok=True)

def get(url, binary=False, tries=5):
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
                return data if binary else json.loads(data)
        except Exception as e:
            print("retry", k, url, e, flush=True)
            time.sleep(5 * (k + 1))
    raise RuntimeError(url)

def api(**q):
    q.update(action="query", format="json")
    out, cont = [], {}
    while True:
        d = get(API + "?" + urllib.parse.urlencode({**q, **cont}))
        out.append(d)
        if "continue" not in d:
            return out
        cont = dict(d["continue"])
        time.sleep(0.5)

SEEDS = ["Category:Diagrams of road signs of Norway", "Category:SVG road signs of Norway",
         "Category:Road signs of Norway", "Category:Road signs in Norway", "Category:Traffic signs of Norway"]
NORWAY = ("norway", "norwegian", "norge", "norsk")
cats, seen, queue = {}, set(), [(c, 0) for c in SEEDS]
while queue:
    cat, depth = queue.pop(0)
    if cat in seen:
        continue
    seen.add(cat)
    files, subs = [], []
    for d in api(list="categorymembers", cmtitle=cat, cmtype="subcat|file", cmlimit="500"):
        for m in d.get("query", {}).get("categorymembers", []):
            (subs if m["ns"] == 14 else files).append(m["title"])
    cats[cat] = {"subcats": subs, "files": [f for f in files if f.lower().endswith(".svg")]}
    print(cat, len(files), "files", len(subs), "subcats", flush=True)
    if depth < 5:
        queue += [(s, depth + 1) for s in subs if any(w in s.lower() for w in NORWAY)]
json.dump(cats, open(os.path.join(OUT, "categories.json"), "w"), ensure_ascii=False, indent=1)

titles = sorted({f for c in cats.values() for f in c["files"]})[:3000]
print(len(titles), "svg files in the categories", flush=True)
index_path = os.path.join(OUT, "index.json")
files = json.load(open(index_path)) if os.path.exists(index_path) else {}
for i in range(0, len(titles), 50):
    for d in api(prop="imageinfo", iiprop="url|extmetadata", titles="|".join(titles[i:i + 50]),
                 iiextmetadatafilter="ImageDescription|ObjectName|LicenseShortName|Categories"):
        for p in d.get("query", {}).get("pages", {}).values():
            ii = (p.get("imageinfo") or [{}])[0]
            meta = ii.get("extmetadata", {})
            files[p["title"].removeprefix("File:")] = {
                "url": ii.get("url"),
                "description": (meta.get("ImageDescription") or {}).get("value", ""),
                "name": (meta.get("ObjectName") or {}).get("value", ""),
                "license": (meta.get("LicenseShortName") or {}).get("value", ""),
                "categories": (meta.get("Categories") or {}).get("value", ""),
            }
    time.sleep(0.5)
json.dump(files, open(index_path, "w"), ensure_ascii=False, indent=1)
n = 0
for name, f in sorted(files.items()):
    if not name.lower().endswith(".svg") or not f.get("url"):
        continue
    path = os.path.join(OUT, name.replace("/", "_"))
    if not os.path.exists(path):
        open(path, "wb").write(get(f["url"], binary=True))
        n += 1
        time.sleep(0.4)
print("downloaded", n, "new files", flush=True)
