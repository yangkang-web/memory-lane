#!/bin/zsh
set -eu

project_root="$(cd "$(dirname "$0")/.." && pwd)"
tool_root="$project_root/.local/bloodbound-tools"
blender_path="$tool_root/blender-mount/Blender.app/Contents/MacOS/Blender"

if [[ ! -x "$blender_path" ]]; then
  mkdir -p "$tool_root/blender-mount"
  hdiutil attach -readonly -nobrowse -mountpoint "$tool_root/blender-mount" "$tool_root/blender.dmg"
fi

env BLENDER_USER_RESOURCES="$tool_root/blender-user" \
  BLENDER_USER_CONFIG="$tool_root/blender-user/config" \
  BLENDER_USER_DATAFILES="$tool_root/blender-user/datafiles" \
  OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 \
  nice -n 15 "$blender_path" --background --factory-startup --threads 1 --python-exit-code 1 \
  --python "$project_root/scripts/bloodbound-character.py"
