#!/usr/bin/env python3
"""Generate, preview, and validate a matrix of card-cover configurations."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

from gen_cover import SKILL_DIR, load_config


def parse_seeds(value: str) -> list[int]:
    seeds: list[int] = []
    for part in value.split(","):
        part = part.strip()
        match = re.fullmatch(r"(\d+)-(\d+)", part)
        if match:
            start, end = map(int, match.groups())
            if end < start:
                raise ValueError(f"descending seed range {part!r}")
            seeds.extend(range(start, end + 1))
        elif re.fullmatch(r"-?\d+", part):
            seeds.append(int(part))
        else:
            raise ValueError(f"invalid seed list item {part!r}; use integers and ranges like 1-20,24")
    if not seeds:
        raise ValueError("at least one seed is required")
    return list(dict.fromkeys(seeds))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--config", type=Path)
    source.add_argument("--configs-dir", type=Path)
    parser.add_argument("--seeds", help="integer, comma-separated seeds, and/or ranges (for example 1-20,24)")
    parser.add_argument("--themes", help="comma-separated theme names or 'all'; defaults to each config theme")
    parser.add_argument("--output-dir", type=Path, default=Path("out"))
    parser.add_argument("--columns", type=int, default=4, help="contact sheet columns")
    args = parser.parse_args()
    try:
        if args.config:
            configs = [args.config.resolve()]
        else:
            configs = sorted(args.configs_dir.glob("*.json"))
            if not configs:
                raise ValueError(f"no JSON configs found in {args.configs_dir}")
        if args.themes == "all":
            themes = sorted(path.stem for path in (SKILL_DIR / "themes").glob("*.json"))
        elif args.themes:
            themes = [item.strip() for item in args.themes.split(",") if item.strip()]
            if not themes:
                raise ValueError("theme list is empty")
        else:
            themes = None

        plans = []
        seen_outputs: set[Path] = set()
        for config_path in configs:
            config = load_config(config_path)
            seeds = parse_seeds(args.seeds) if args.seeds else [int(config.get("seed", 23))]
            config_themes = themes if themes is not None else [config.get("theme", "grafite")]
            for theme in config_themes:
                theme_label = theme if isinstance(theme, str) else str(config.get("theme_name", "custom"))
                theme_label = re.sub(r"[^A-Za-z0-9_.-]+", "-", theme_label).strip("-.") or "custom"
                for seed in seeds:
                    base_prefix = str(config.get("id_prefix", "cover"))
                    stem = f"{base_prefix}-{theme_label}-s{seed}"
                    svg_path = args.output_dir / f"{stem}.svg"
                    if svg_path in seen_outputs:
                        raise ValueError(f"multiple configs produce the same output name: {svg_path}")
                    seen_outputs.add(svg_path)
                    plans.append((config_path, theme, seed, stem, svg_path))
        if not plans:
            raise ValueError("nothing to generate")

        args.output_dir.mkdir(parents=True, exist_ok=True)
        pngs = []
        for config_path, theme, seed, stem, svg_path in plans:
            generate = [
                sys.executable, str(SKILL_DIR / "scripts" / "gen_cover.py"),
                "--config", str(config_path), "--seed", str(seed),
                "--id-prefix", stem, "--output", str(svg_path),
            ]
            if isinstance(theme, str):
                generate.extend(["--theme", theme])
            subprocess.run(generate, check=True)
            png_path = svg_path.with_suffix(".png")
            subprocess.run([
                sys.executable, str(SKILL_DIR / "scripts" / "preview.py"),
                str(svg_path), "--output", str(png_path),
            ], check=True)
            validate = [
                sys.executable, str(SKILL_DIR / "scripts" / "validate.py"),
                str(svg_path), "--config", str(config_path),
                "--id-prefix", stem,
            ]
            if isinstance(theme, str):
                validate.extend(["--theme", theme])
            subprocess.run(validate, check=True)
            pngs.append(png_path)
        contact_path = args.output_dir / "contact-sheet.png"
        subprocess.run([
            sys.executable, str(SKILL_DIR / "scripts" / "preview.py"),
            "--contact-sheet", "--images", *map(str, pngs), "--output", str(contact_path),
            "--columns", str(args.columns),
        ], check=True)
        print(f"Generated {len(plans)} covers in {args.output_dir}; contact sheet: {contact_path}")
    except (OSError, ValueError, json.JSONDecodeError, subprocess.CalledProcessError) as exc:
        print(f"batch: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
