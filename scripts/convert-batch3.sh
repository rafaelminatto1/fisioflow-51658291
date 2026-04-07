#!/bin/bash
CDN_BASE="https://media.moocafisio.com.br"
BUCKET="fisioflow-media"
TEMP_DIR="/tmp/avif_fast"
mkdir -p "$TEMP_DIR"

UUIDS=(
  "96cc9b30-d14a-4938-b490-4d2775343539" "9723383b-ccdc-4815-a219-8e42d0c87944"
  "9cbff473-4215-4a0e-9fbd-2ddfbed8ddf4" "9cc3f8a7-4e9b-4ad0-82c7-6e4c8e451002"
  "9da8f08b-1db1-49fd-980f-8f8c2a923989" "9e20767b-ba39-4407-9c90-3a348ba150c5"
  "9eec7ecd-e16c-491a-9843-45c9fb9b3eeb" "9f6cddd0-664a-465e-adc7-e587571df522"
  "a333405d-3745-47fd-89e6-f80e1553526d" "a35d481b-5764-43ae-ac66-3f3500fb061c"
  "a621e7bf-7b02-4b2c-83b8-b3f81e4fae95" "a644a383-289e-4fb9-9a1b-3f1513b29872"
  "a69f1946-6f77-4840-a737-6eb4089e3c60" "a7a80b05-0723-4c52-97c2-4e6689371143"
  "a846b647-74f5-41e5-a583-8147cbd61919" "acf2a152-86f3-4b04-95ec-4ff661ab8fdb"
  "b2a513c5-5da4-4d17-b0f8-ec63381a49a6" "b2baee7b-8594-4298-8056-20946cdf57ba"
  "b2c15717-dfe9-4078-a678-0ece6f3a1ec1" "bbfab6d3-4108-44b1-867a-4bf8d3e17514"
  "bd0eb7cb-7c6e-4978-8586-1a2872cf40aa" "be22afd1-de31-400b-a3d0-2a59a14fcdab"
  "bf106c3d-7d51-413c-a7e7-c8d77c018949" "bf4208a8-e581-42a2-8ada-8c58cf610e70"
  "c15042de-aa4f-4cde-9cf9-28cdb6c8169e" "c35453b6-4ff1-4294-98e0-f53fd09d921d"
  "c5da19e8-e549-4bdd-8e82-5a87b7759c4f" "c5e626d6-48c5-46be-bd29-0e0a800bbbd9"
  "c773d10f-e2ed-4ca6-864a-f355a83ceeda" "c8392015-d666-4626-a562-7e9de6474c95"
  "ca4e687d-07b7-4a5f-a92d-27a7c366da65" "ca9a5c32-3e82-4e8a-9a21-371e484d80eb"
  "cc02bbba-113d-433f-a70c-9590b3bdbd74" "cc193885-c225-4308-961d-6344ba96bcd9"
  "ccb7432a-6bb0-403d-8db5-fa1cb03f00ff" "cd0ea681-c92c-4006-bdd7-5afc3c868bab"
  "d029f7ce-9617-4f04-9834-3faa425a9d3e" "d0f4adf7-5f02-4578-a120-e150fe0fc653"
  "d45ebafe-e55e-442f-a745-28fa9f149b5b" "d513c74d-5adf-4ae2-872b-5a80d26f5a00"
  "d5ca93dc-44da-45eb-8de1-c139b2bee50d" "d68483d3-04e4-4f34-8e41-1a37635a141a"
  "d6e3b771-45fe-4dfe-ac60-3f851e05dbf4" "d6ffdfe8-8442-4951-9904-51239f5765e9"
  "d7feba14-d7dd-416f-862e-69b604d371d5" "d910a6fa-c42a-451b-af7a-b6c76fda3cb6"
  "dc9d2b2a-6836-4d4d-9b62-ac80b22d7c54" "dcba2295-5810-48ad-b100-e7166eda0d5f"
  "ddb808f5-5ab5-49ca-bfe4-31f7e641582e" "de6daecf-7e3a-497e-a9a9-41b6a97d3ed8"
  "deafbb28-b240-4e10-8d9a-26e76609f627" "df77fa5b-306e-4053-91d2-a60cc0017411"
  "e05cb78b-bcaa-41d0-a9e6-6fe6db307b51" "e33feda9-054e-4da4-9dda-1e464b59292c"
  "e3b2b395-8c80-4ad0-a9d1-62170cd41446" "e57a3517-b93f-4dfc-9a36-7155521d1d0e"
  "e589794c-6474-4982-bdb5-29724af5bbf2" "e5b40a4b-ee8b-483f-b45f-40a23a769a4b"
  "e61cabcd-f72e-47fe-adb7-a394d8bac445" "e74298ae-21c3-4e6e-83a8-354c722c9d7e"
  "e7b7fe16-e2d7-42f5-8650-eb4ea6d4b5da" "e7f16c0f-7597-42b1-acfd-cce87575fd23"
  "e7f22737-a2f6-4f85-946f-b5d16339bc46" "e93d18c5-6f31-4f4b-b76f-da556d762cb4"
  "e9a54ab2-a99b-4b10-b548-f2b643fdea45" "ec506e09-826f-4f30-886c-b90d54ea4aa2"
  "ed0d2a9e-281f-41fd-b314-29dd5d6b18b2" "eee9e338-9f83-45b1-b27a-2280f370a73b"
  "eff0c28a-e0ac-4611-abc7-cd4e6d1174db" "f319c5f4-888f-4858-ab9e-1efd4e9e7b42"
  "f32367e8-ce7e-45a4-ae5e-a8a3eb0056bf" "f3d3f0f4-0366-42a4-9d6d-ce72d13f0fdb"
  "f4934299-cf2b-4453-880a-6f3cfb9e398a" "f4a309c4-ce4c-4be9-bc48-b2cb34aacb04"
  "f54c7e59-5005-4f97-8aa3-079e28df7389" "f5a45273-0528-443c-8b47-add6b7f4d054"
  "f6dc95d4-dc8d-4169-b717-f9bfd1ba62cc" "f81327c9-a0a0-4bb1-8a75-31659c051516"
  "f87d9c7a-9b35-4235-b7a0-59ef2d3f0f20" "f9b5eb0c-34f0-47ae-a5a4-c0f723a86cea"
  "f9e420fc-7da5-479c-a850-beedeca1c86b" "fa1baabf-13fc-4e11-bca4-e017a4a77c81"
  "fa8a49b7-cfcd-4a77-84ec-ec345ecd08c5" "fc65fe36-79d2-4af3-8185-751e335b920d"
  "fc7afc33-b2ed-4db9-a166-591247232c97"
)

SUCCESS=0
FAILED=0
TOTAL=${#UUIDS[@]}

echo "Converting $TOTAL exercises..."

for UUID in "${UUIDS[@]}"; do
  for type in image thumbnail; do
    curl -s -o "${TEMP_DIR}/${UUID}_${type}" "${CDN_BASE}/exercises/${UUID}/${type}.png" 2>/dev/null
    [ ! -s "${TEMP_DIR}/${UUID}_${type}" ] && { rm -f "${TEMP_DIR}/${UUID}_${type}"; continue; }
    file "${TEMP_DIR}/${UUID}_${type}" | grep -q HTML && { rm -f "${TEMP_DIR}/${UUID}_${type}"; continue; }
    node -e "require('sharp')('${TEMP_DIR}/${UUID}_${type}').avif({quality:75,effort:4}).toFile('${TEMP_DIR}/${UUID}_${type}.avif').then(()=>process.exit(0)).catch(()=>process.exit(1))" 2>/dev/null
    [ -f "${TEMP_DIR}/${UUID}_${type}.avif" ] && {
      npx wrangler r2 object put "${BUCKET}/exercises/${UUID}/${type}.avif" --file "${TEMP_DIR}/${UUID}_${type}.avif" --content-type "image/avif" --remote 2>&1 | grep -q "Upload complete" && {
        npx wrangler r2 object delete "${BUCKET}/exercises/${UUID}/${type}.png" --remote 2>&1 | grep -q "Delete complete"
        SUCCESS=$((SUCCESS + 1))
      }
    }
    rm -f "${TEMP_DIR}/${UUID}_${type}"*
  done
  [ $(( (SUCCESS + FAILED) % 20 )) -eq 0 ] && echo "Progress: $((SUCCESS + FAILED))/$((TOTAL*2)) OK:$SUCCESS FAIL:$FAILED"
done

echo "=== DONE: $SUCCESS success, $FAILED failed ==="
