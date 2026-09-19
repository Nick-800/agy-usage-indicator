#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
glib-compile-schemas "$DIR/schemas"
gnome-extensions pack --force --extra-source=prefs.js --out-dir="$DIR" "$DIR"
echo "Bundle generated: $(ls -1 "$DIR"/*.shell-extension.zip)"
