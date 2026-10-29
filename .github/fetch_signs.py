"""Downloads the official Norwegian road sign drawings from Wikimedia Commons (files «Norwegian-road-sign-*.svg»)
into ref-signs/, with their descriptions and licences in ref-signs/index.json. Polite: one request at a time,
a short pause between requests, an identifying User-Agent as the Wikimedia policy asks."""
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

# Commons names the Norwegian signs in several ways; the main set is «Norway road sign 100.1.svg»
PREFIXES = ["Norwegian-road-sign-", "Norway road sign ", "Norway-road-sign-", "Norwegian road sign ", "Norway Road Sign "]
files = {}
for prefix in PREFIXES:
  cont = {}
  while True:
    q = {"action": "query", "format": "json", "generator": "allimages", "gaiprefix": prefix,
         "gailimit": "50", "prop": "imageinfo", "iiprop": "url|extmetadata",
         "iiextmetadatafilter": "ImageDescription|ObjectName|LicenseShortName", **cont}
    d = get(API + "?" + urllib.parse.urlencode(q))
    for p in d.get("query", {}).get("pages", {}).values():
        ii = (p.get("imageinfo") or [{}])[0]
        meta = ii.get("extmetadata", {})
        files[p["title"].removeprefix("File:")] = {
            "url": ii.get("url"),
            "description": (meta.get("ImageDescription") or {}).get("value", ""),
            "name": (meta.get("ObjectName") or {}).get("value", ""),
            "license": (meta.get("LicenseShortName") or {}).get("value", ""),
        }
    if "continue" not in d:
        break
    cont = dict(d["continue"])
    time.sleep(1)
  print(prefix, len(files), "files so far", flush=True)

print(len(files), "files", flush=True)
for name, f in sorted(files.items()):
    if not name.lower().endswith(".svg") or not f["url"]:
        continue
    path = os.path.join(OUT, name)
    if not os.path.exists(path):
        open(path, "wb").write(get(f["url"], binary=True))
        time.sleep(0.5)
json.dump(files, open(os.path.join(OUT, "index.json"), "w"), ensure_ascii=False, indent=1)
print("done", flush=True)
