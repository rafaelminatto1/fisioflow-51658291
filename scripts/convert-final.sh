#!/bin/bash
CDN_BASE="https://media.moocafisio.com.br"
BUCKET="fisioflow-media"
TEMP_DIR="/tmp/avif_last"
mkdir -p "$TEMP_DIR"

UUIDS=(
  "d68483d3-04e4-4f34-8e41-1a37635a141a" "d6e3b771-45fe-4dfe-ac60-3f851e05dbf4"
  "d6ffdfe8-8442-4951-9904-51239f5765e9" "d7feba14-d7dd-416f-862e-69b604d371d5"
  "d910a6fa-c42a-451b-af7a-b6c76fda3cb6" "dc9d2b2a-6836-4d4d-9b62-ac80b22d7c54"
  "dcba2295-5810-48ad-b100-e7166eda0d5f" "ddb808f5-5ab5-49ca-bfe4-31f7e641582e"
  "de6daecf-7e3a-497e-a9a9-41b6a97d3ed8" "deafbb28-b240-4e10-8d9a-26e76609f627"
  "df77fa5b-306e-4053-91d2-a60cc0017411" "e05cb78b-bcaa-41d0-a9e6-6fe6db307b51"
  "e33feda9-054e-4da4-9dda-1e464b59292c" "e3b2b395-8c80-4ad0-a9d1-62170cd41446"
  "e57a3517-b93f-4dfc-9a36-7155521d1d0e" "e589794c-6474-4982-bdb5-29724af5bbf2"
  "e5b40a4b-ee8b-483f-b45f-40a23a769a4b" "e61cabcd-f72e-47fe-adb7-a394d8bac445"
  "e74298ae-21c3-4e6e-83a8-354c722c9d7e" "e7b7fe16-e2d7-42f5-8650-eb4ea6d4b5da"
  "e7f16c0f-7597-42b1-acfd-cce87575fd23" "e7f22737-a2f6-4f85-946f-b5d16339bc46"
  "e93d18c5-6f31-4f4b-b76f-da556d762cb4" "e9a54ab2-a99b-4b10-b548-f2b643fdea45"
  "ec506e09-826f-4f30-886c-b90d54ea4aa2" "ed0d2a9e-281f-41fd-b314-29dd5d6b18b2"
  "eee9e338-9f83-45b1-b27a-2280f370a73b" "eff0c28a-e0ac-4611-abc7-cd4e6d1174db"
  "f319c5f4-888f-4858-ab9e-1efd4e9e7b42" "f32367e8-ce7e-45a4-ae5e-a8a3eb0056bf"
  "f3d3f0f4-0366-42a4-9d6d-ce72d13f0fdb" "f4934299-cf2b-4453-880a-6f3cfb9e398a"
  "f4a309c4-ce4c-4be9-bc48-b2cb34aacb04" "f54c7e59-5005-4f97-8aa3-079e28df7389"
  "f5a45273-0528-443c-8b47-add6b7f4d054" "f6dc95d4-dc8d-4169-b717-f9bfd1ba62cc"
  "f81327c9-a0a0-4bb1-8a75-31659c051516" "f87d9c7a-9b35-4235-b7a0-59ef2d3f0f20"
  "f9b5eb0c-34f0-47ae-a5a4-c0f723a86cea" "f9e420fc-7da5-479c-a850-beedeca1c86b"
  "fa1baabf-13fc-4e11-bca4-e017a4a77c81" "fa8a49b7-cfcd-4a77-84ec-ec345ecd08c5"
  "fc65fe36-79d2-4af3-8185-751e335b920d" "fc7afc33-b2ed-4db9-a166-591247232c97"
)

SUCCESS=0
for UUID in "${UUIDS[@]}"; do
  for type in image thumbnail; do
    curl -s -o "${TEMP_DIR}/${UUID}_${type}" "${CDN_BASE}/exercises/${UUID}/${type}.png" 2>/dev/null
    [ ! -s "${TEMP_DIR}/${UUID}_${type}" ] && continue
    file "${TEMP_DIR}/${UUID}_${type}" | grep -q HTML && continue
    node -e "require('sharp')('${TEMP_DIR}/${UUID}_${type}').avif({quality:75}).toFile('${TEMP_DIR}/${UUID}_${type}.avif').then(()=>process.exit(0)).catch(()=>process.exit(1))" 2>/dev/null
    [ -f "${TEMP_DIR}/${UUID}_${type}.avif" ] && {
      npx wrangler r2 object put "${BUCKET}/exercises/${UUID}/${type}.avif" --file "${TEMP_DIR}/${UUID}_${type}.avif" --content-type "image/avif" --remote 2>&1 | grep -q "Upload complete" && {
        npx wrangler r2 object delete "${BUCKET}/exercises/${UUID}/${type}.png" --remote 2>&1 | grep -q "Delete complete"
        SUCCESS=$((SUCCESS + 1))
      }
    }
    rm -f "${TEMP_DIR}/${UUID}_${type}"*
  done
  echo "Done $UUID - Total: $SUCCESS"
done
echo "=== COMPLETE: $SUCCESS converted ==="
