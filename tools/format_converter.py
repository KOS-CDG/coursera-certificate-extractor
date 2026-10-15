#!/usr/bin/env python3
"""
Coursera Certificate Format Converter
Zero-dependency utility to convert exported Coursera CSV files into
Markdown tables, Resume bullet points, LinkedIn formats, or clean JSON.

Usage:
    python format_converter.py coursera_completed_summary.csv --format markdown
    python format_converter.py coursera_completed_summary.csv --format resume
    python format_converter.py coursera_completed_summary.csv --format linkedin
    python format_converter.py coursera_completed_summary.csv --format json -o courses.json
"""

import argparse
import csv
import json
import re
import sys
from pathlib import Path


def parse_csv(filepath):
    records = []
    with open(filepath, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Normalize column names regardless of extractor version
            title = row.get("Title") or row.get("Course Title") or ""
            url = row.get("URL") or row.get("Certificate URL") or ""
            provider = row.get("Provider") or "Coursera"
            grade = row.get("Grade") or ""
            date = row.get("Completion Date") or row.get("Date") or ""
            cred_id = row.get("Credential ID") or ""

            if not cred_id and url:
                match = re.search(r"(?:verify|accomplishments/(?:specialization|certificate)?)/([a-zA-Z0-9_-]+)", url)
                if match:
                    cred_id = match.group(1)

            if title.strip():
                records.append({
                    "title": title.strip(),
                    "url": url.strip(),
                    "provider": provider.strip() if provider.strip() else "Coursera",
                    "grade": grade.strip(),
                    "date": date.strip(),
                    "credential_id": cred_id.strip()
                })
    return records


def to_markdown_table(records):
    lines = [
        "| # | Course / Specialization | Issuer / Partner | Credential Link |",
        "|---|-------------------------|------------------|-----------------|"
    ]
    for idx, r in enumerate(records, 1):
        link_str = f"[Verify Certificate]({r['url']})" if r['url'] and r['url'] != "Completed Tab" else "N/A"
        if r['credential_id']:
            link_str += f" (`{r['credential_id']}`)"
        lines.append(f"| {idx} | **{r['title']}** | {r['provider']} | {link_str} |")
    return "\n".join(lines)


def to_resume_bullets(records):
    lines = ["### Certifications & Continuous Learning", ""]
    for r in records:
        link = f" ([Credential]({r['url']}))" if r['url'] and r['url'] != "Completed Tab" else ""
        date_str = f" - *{r['date']}*" if r['date'] and r['date'] != "N/A" else ""
        lines.append(f"- **{r['title']}** - {r['provider']}{link}{date_str}")
    return "\n".join(lines)


def to_linkedin_format(records):
    output_blocks = []
    for idx, r in enumerate(records, 1):
        block = [
            f"--- Certification #{idx} ---",
            f"Name: {r['title']}",
            f"Issuing Organization: Coursera ({r['provider']})",
            f"Credential ID: {r['credential_id'] if r['credential_id'] else 'N/A'}",
            f"Credential URL: {r['url'] if r['url'] != 'Completed Tab' else 'N/A'}"
        ]
        if r['date'] and r['date'] != "N/A":
            block.append(f"Issue Date: {r['date']}")
        output_blocks.append("\n".join(block))
    return "\n\n".join(output_blocks)


def main():
    parser = argparse.ArgumentParser(
        description="Convert Coursera CSV export to Markdown, Resume, LinkedIn, or JSON formats."
    )
    parser.add_argument("input_csv", help="Path to exported Coursera CSV file")
    parser.add_argument(
        "-f", "--format",
        choices=["markdown", "resume", "linkedin", "json"],
        default="markdown",
        help="Target output format (default: markdown)"
    )
    parser.add_argument("-o", "--output", help="Optional output file destination")

    args = parser.parse_args()

    input_path = Path(args.input_csv)
    if not input_path.exists():
        print(f"Error: File '{args.input_csv}' not found.", file=sys.stderr)
        sys.exit(1)

    records = parse_csv(input_path)
    if not records:
        print("Warning: No valid course records parsed from CSV.", file=sys.stderr)
        sys.exit(0)

    if args.format == "markdown":
        result = to_markdown_table(records)
    elif args.format == "resume":
        result = to_resume_bullets(records)
    elif args.format == "linkedin":
        result = to_linkedin_format(records)
    elif args.format == "json":
        result = json.dumps(records, indent=2, ensure_ascii=False)
    else:
        result = ""

    if args.output:
        with open(args.output, "w", encoding="utf-8") as out_f:
            out_f.write(result + "\n")
        print(f"✅ Successfully converted {len(records)} records and saved to {args.output}")
    else:
        print(result)


if __name__ == "__main__":
    main()
