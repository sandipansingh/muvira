#!/usr/bin/env bash

set -euo pipefail

readonly EXPECTED_PROJECT_REF='mmpsquheiibatsjficwm'

requested_ref=''
runtime_url="${SUPABASE_URL:-}"

while (($# > 0)); do
  case "$1" in
    --project-ref)
      requested_ref="${2:-}"
      shift 2
      ;;
    --runtime-url)
      runtime_url="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "$requested_ref" || -z "$runtime_url" ]]; then
  echo 'Usage: pnpm run db:migrate -- --project-ref mmpsquheiibatsjficwm --runtime-url https://mmpsquheiibatsjficwm.supabase.co' >&2
  exit 2
fi

if [[ "$requested_ref" != "$EXPECTED_PROJECT_REF" ]]; then
  echo "Refusing migration: requested project ref is not $EXPECTED_PROJECT_REF" >&2
  exit 1
fi

runtime_host="${runtime_url#*://}"
runtime_host="${runtime_host%%/*}"
runtime_host="${runtime_host%%:*}"
if [[ "$runtime_host" != "$EXPECTED_PROJECT_REF.supabase.co" ]]; then
  echo "Refusing migration: runtime Supabase URL does not match $EXPECTED_PROJECT_REF" >&2
  exit 1
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
link_file="$repo_root/supabase/.temp/project-ref"
if [[ ! -f "$link_file" ]]; then
  echo 'Refusing migration: Supabase CLI is not linked in this checkout' >&2
  exit 1
fi

linked_ref="$(tr -d '[:space:]' < "$link_file")"
if [[ "$linked_ref" != "$EXPECTED_PROJECT_REF" ]]; then
  echo "Refusing migration: Supabase CLI link does not match $EXPECTED_PROJECT_REF" >&2
  exit 1
fi

cd "$repo_root/server"
exec pnpm exec supabase db push --workdir .. --linked
