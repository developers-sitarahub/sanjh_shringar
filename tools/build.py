"""Assemble site/*.html from src/partials + src/pages.

Usage:  python tools/build.py
Each page in src/pages starts with a header block:
    TITLE: ...
    DESC: ...
    BODY: body-class
    ---
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / "src", ROOT / "site"


def part(name: str) -> str:
    return (SRC / "partials" / name).read_text(encoding="utf-8")


def build() -> None:
    head, sprite, header, footer = part("head.html"), part("sprite.html"), part("header.html"), part("footer.html")
    for page in sorted((SRC / "pages").glob("*.html")):
        raw = page.read_text(encoding="utf-8")
        meta_block, body = raw.split("\n---\n", 1)
        meta = dict(line.split(": ", 1) for line in meta_block.strip().splitlines())
        html = (
            head.replace("{{TITLE}}", meta["TITLE"]).replace("{{DESC}}", meta["DESC"]).replace("{{BODYCLASS}}", meta.get("BODY", ""))
            + "\n" + sprite + header + '\n<main id="main">\n' + body + footer
        )
        (OUT / page.name).write_text(html, encoding="utf-8")
        print("built", page.name)


if __name__ == "__main__":
    build()
