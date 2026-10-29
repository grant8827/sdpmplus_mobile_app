#!/bin/sh

# React Native 0.84 ships React, ReactNativeDependencies, and Hermes as
# prebuilt frameworks. Their dSYMs are not always copied into an Xcode
# archive, so generate UUID-matching bundles from the frameworks that are
# actually embedded in the app.

set -eu

if [ "${CONFIGURATION:-}" != "Release" ] || [ "${PLATFORM_NAME:-}" != "iphoneos" ]; then
  exit 0
fi

frameworks_dir="${TARGET_BUILD_DIR}/${FRAMEWORKS_FOLDER_PATH}"
dsyms_dir="${DWARF_DSYM_FOLDER_PATH}"

mkdir -p "${dsyms_dir}"

for framework_name in React ReactNativeDependencies hermesvm; do
  binary="${frameworks_dir}/${framework_name}.framework/${framework_name}"
  output="${dsyms_dir}/${framework_name}.framework.dSYM"

  if [ ! -f "${binary}" ]; then
    echo "warning: Cannot generate ${framework_name} dSYM; embedded binary not found at ${binary}"
    continue
  fi

  rm -rf "${output}"
  # Prebuilt binaries refer to object paths on React Native's build server,
  # which makes dsymutil noisy. It still creates a valid UUID-matching dSYM.
  if ! xcrun dsymutil "${binary}" -o "${output}" >/dev/null 2>&1; then
    echo "error: Failed to generate ${framework_name}.framework.dSYM"
    exit 1
  fi

  binary_uuid="$(xcrun dwarfdump --uuid "${binary}" | awk '{print $2}' | sort | tr '\n' ' ')"
  dsym_uuid="$(xcrun dwarfdump --uuid "${output}" | awk '{print $2}' | sort | tr '\n' ' ')"

  if [ -z "${binary_uuid}" ] || [ "${binary_uuid}" != "${dsym_uuid}" ]; then
    echo "error: Generated dSYM UUID does not match ${framework_name}.framework"
    exit 1
  fi

  echo "Generated ${framework_name}.framework.dSYM (${binary_uuid})"
done
