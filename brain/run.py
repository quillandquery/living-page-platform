#!/usr/bin/env python3
"""
CLI for the brain prototype.

    python run.py --file samples/grandmother-kitchen.txt
    python run.py --text "The rain hadn't stopped for three days..."
    echo "..." | python run.py              # read stdin
    python run.py --file samples/*.txt --out out/   # batch to JSON files

Prints the VisualProfile as pretty JSON (or writes one file per input to --out).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from pipeline import analyze


def one(text: str, scene: bool = False) -> dict:
    if scene:
        from grammar import build_scene_graph
        return build_scene_graph(text).to_dict()
    return analyze(text).to_dict()


def main() -> int:
    ap = argparse.ArgumentParser(description="text -> VisualProfile")
    ap.add_argument("--text", help="analyse this literal string")
    ap.add_argument("--file", nargs="+", help="analyse one or more text files")
    ap.add_argument("--out", help="write <stem>.json per input into this dir")
    ap.add_argument("--compact", action="store_true", help="one-line JSON")
    ap.add_argument("--scene", action="store_true",
                    help="emit the full scene graph (per-beat narrative structure "
                         "+ visual grammar) instead of just the VisualProfile")
    args = ap.parse_args()

    indent = None if args.compact else 2

    inputs: list[tuple[str, str]] = []
    if args.text:
        inputs.append(("text", args.text))
    if args.file:
        for f in args.file:
            inputs.append((Path(f).stem, Path(f).read_text(encoding="utf-8")))
    if not inputs and not sys.stdin.isatty():
        data = sys.stdin.read()
        if data.strip():
            inputs.append(("stdin", data))
    if not inputs:
        ap.print_help()
        return 1

    if args.out:
        outdir = Path(args.out)
        outdir.mkdir(parents=True, exist_ok=True)
        for name, text in inputs:
            prof = one(text, scene=args.scene)
            (outdir / f"{name}.json").write_text(json.dumps(prof, indent=indent), encoding="utf-8")
            if args.scene:
                m = prof["meta"]
                print(f"  {name}.json  [scene]  {m['beat_count']} beats  "
                      f"peak={m['peak_energy']}  types={list(m['type_histogram'])[:4]}")
            else:
                be = prof["meta"]["backends"]
                tag = "offline" if prof["meta"]["fully_offline"] else "models"
                print(f"  {name}.json  [{tag}]  "
                      f"ling={be['linguistic']['backend']} "
                      f"concepts={be['concepts']['backend']} "
                      f"emo={be['emotion']['backend']}")
        return 0

    for i, (name, text) in enumerate(inputs):
        if len(inputs) > 1:
            print(f"\n===== {name} =====")
        print(json.dumps(one(text, scene=args.scene), indent=indent))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
