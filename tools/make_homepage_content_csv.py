"""Export the homepage's built-in text and links as a CSV for the Wix CMS.

Usage:  python tools/make_homepage_content_csv.py   (after tools/build.py)
Output: wix-kit/homepage-content.csv  — import into the CMS collection "HomepageContent"
        Columns: Title (key), Text, Link, Image (left empty: add photos in the CMS)
        *word* = italic, | = line break, "<name>.show" rows hide (no) / show (yes) sections.
"""
import csv
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "site" / "index.html"
OUT = ROOT / "wix-kit" / "homepage-content.csv"

VOID = {"br", "img", "input", "meta", "link", "use", "source", "hr"}


class Grab(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows, self.order, self.stack = {}, [], []

    def row(self, key):
        if key not in self.rows:
            self.rows[key] = {"Text": "", "Link": "", "Image": ""}
            self.order.append(key)
        return self.rows[key]

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "data-cms-href" in a:
            self.row(a["data-cms-href"])["Link"] = a.get("href", "")
        if "data-cms-img" in a:
            self.row(a["data-cms-img"])
        if "data-cms-section" in a:
            self.row(a["data-cms-section"] + ".show")["Text"] = "no" if "data-default-hidden" in a else "yes"
        for frame in self.stack:
            if tag == "em":
                frame["buf"].append("*")
            elif tag == "br":
                frame["buf"].append(" | ")
        if tag in VOID:
            return
        for frame in self.stack:
            frame["depth"] += 1
        if "data-cms" in a:
            self.row(a["data-cms"])
            self.stack.append({"key": a["data-cms"], "depth": 1, "buf": []})

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        for frame in self.stack:
            if tag == "em":
                frame["buf"].append("*")
            frame["depth"] -= 1
        while self.stack and self.stack[-1]["depth"] == 0:
            f = self.stack.pop()
            text = re.sub(r"\s+", " ", "".join(f["buf"])).strip()
            text = re.sub(r"\*\s+\*", " ", text)
            self.rows[f["key"]]["Text"] = text

    def handle_data(self, data):
        for frame in self.stack:
            frame["buf"].append(data)


g = Grab()
g.feed(PAGE.read_text(encoding="utf-8"))
with OUT.open("w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f)
    w.writerow(["Title", "Text", "Link", "Image"])
    for k in g.order:
        r = g.rows[k]
        w.writerow([k, r["Text"], r["Link"], r["Image"]])
print(f"Wrote {OUT} ({len(g.order)} rows)")
