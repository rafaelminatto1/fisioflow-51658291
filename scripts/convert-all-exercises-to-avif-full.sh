#!/bin/bash

# Convert ALL remaining exercises PNG to AVIF
# Runs in batches with progress tracking

CDN_BASE="https://media.moocafisio.com.br"
BUCKET="fisioflow-media"
TEMP_DIR="/home/rafael/Documents/fisioflow/fisioflow-51658291/temp-avif-conversion"
LOG_FILE="${TEMP_DIR}/conversion_log.txt"

mkdir -p "$TEMP_DIR"

log() {
  echo "[$(date +%H:%M:%S)] $1" | tee -a "$LOG_FILE"
}

# All 209 exercise UUIDs from R2 listing
UUIDS=(
  "00b03826-fd00-4741-b4ba-3fe06c71cc34" "0223355b-41cb-4082-9a5f-3d99b6c34b29"
  "0513186d-aaca-4001-8047-2e9cbed2f213" "05cc9ea0-8087-492a-8750-ecabf4d1373f"
  "06bec5ab-ee79-4b3c-969f-d57a85883701" "0c2f993e-0331-400f-8c6b-3ca1c765c5fe"
  "0c3e5d4e-3afb-4ffc-8206-d8b642f8902f" "0c4077f8-179f-43b1-b4ff-05d8a14803f0"
  "0c71c989-d905-4617-a92f-cc32de6cce87" "0d47fc21-637f-484d-bea6-9e8fe7ba4a5e"
  "10680f49-f713-41bb-98b9-9ec93825116e" "13194255-4faa-480f-a13c-6081fdd2a831"
  "1475a829-62a0-4c98-8b23-2f62672f7e50" "15068005-3448-4b29-aa5e-7a596d7929df"
  "158c531f-3285-4a29-913e-a486e1b48350" "1aad542e-26ee-4758-8a97-450e4db0d3fa"
  "1b74c160-5442-4c67-a1db-16eed6846dc6" "205ef2f5-83b5-41c0-932b-d6e8b8a53f29"
  "2085e49d-db48-47a9-90cc-45db7c33709d" "20a987b4-9d25-468a-9e25-15cd4369a2e0"
  "22f56dfc-0802-4828-b5ce-bcb1ec61c87a" "230fe21d-6124-492c-a6be-2bff1e8ed40a"
  "23fb8e81-b882-46f7-b923-db6cab7ae954" "24d82dd7-2f73-46db-aece-ded80cf13a46"
  "25814c99-f438-48f3-84ed-8cb49d2fbbc9" "26b81426-b061-4050-a7d2-a77eb62208c4"
  "2741a4de-a779-4741-9596-bcb139945d13" "27851959-7ca7-4df8-8374-ac40eabc100b"
  "296c9330-4818-4cc4-9c77-ccd1030952ce" "2cd154da-2ec7-4da9-893a-1a301e4221cd"
  "30d75609-e612-4cb8-a9f8-018e6156a2db" "323149ca-b32d-4e3d-a144-4fe8a5cf3c18"
  "328f722b-9b0a-4cec-a75d-5d9deb1738de" "32ab5f26-a92f-476d-98a2-8d461d45bb39"
  "3772c13d-9a3f-4938-96e4-b33d725e4346" "3974836c-03ed-49a0-9aef-10e02c51621f"
  "3b2a0999-9ba6-4f4f-a037-bfb94551622f" "3f1aba01-9a6b-4569-b152-19ec1164cdfd"
  "3f5976ad-ae6b-45e9-b7de-6c0f80f00504" "3f5ce2d6-5a7e-4bc2-b048-cd2144afee7b"
  "41a6c525-a53e-457e-a90c-d27ca5cf09e7" "44026881-f395-43b1-8437-87a747671833"
  "44f17d93-fc49-4090-8d75-eaeb6e0b6b6d" "46065bd9-070c-48c0-89c2-74dcab4de78e"
  "48ba9b50-ff7b-4c49-988d-4906150a4251" "4b616021-729d-4de6-b20f-b2ec4b37b2a3"
  "4ba7ec7b-8948-413e-8559-490dff6ae989" "4d63978d-437d-4034-9996-d3a7499b9e35"
  "50729cb6-5ec7-4d82-830d-13f567589a8a" "50919edd-6639-44e1-851a-115a56758a96"
  "50beed4a-b853-4ba5-a16a-ca1e6da28c3d" "51cdeee6-ca28-4e1a-800e-c7262504fb03"
  "524dca2d-cf76-4bbe-b68e-745859dc402d" "52b768f7-3d62-4379-b756-18626a24f4d1"
  "53273709-b9bd-49b5-8495-8f6cdce44f12" "533a69d8-7fb5-44a5-a51d-721fba253192"
  "5465a626-f7a3-4541-94f7-5e281b9036ce" "54792e1d-0a12-4d3a-b70d-7edc674df6ea"
  "54a5abf8-892a-4ee7-a1ba-860b956e7eb7" "5559e99d-bc89-47eb-b4c2-0960e21e0346"
  "560ae5f4-0d5a-4c18-9631-fa74e58277c7" "5637ceb1-b46e-4d29-9bc9-d8a3afbe4ff6"
  "5638e403-b106-4451-8b98-f14c049447d2" "56b512a2-f095-4c5f-94db-c7a31ecb9e18"
  "577b7d6e-b3c3-431a-9d85-9addd133f3c9" "59933cf5-7599-43de-8f69-606575f91b4f"
  "5b42e888-789f-43e5-8145-5d41b325acc6" "5bc20d55-ceed-4fd1-8274-2eede587cb33"
  "5ce76038-76ef-43d6-8455-60290a618ff0" "5d1ccf64-73d9-46e1-a95b-c535dc634b1d"
  "5eca0c6e-41ba-4ed5-93c1-fb5ae4660db0" "61ab52c6-cdf5-406b-b940-d7dbbfcecc05"
  "61dcaaf9-92ed-4224-b242-d2406a00e8ea" "68efc336-a02f-4fb8-9f05-00afb97207c3"
  "69f345ad-dfbe-42e7-b476-fae3c48b12e6" "6b3ea758-f4cd-4c6a-bb1b-7f9732d3510d"
  "6b574243-5a72-44bd-b143-bdf5c8976940" "6bc8caa0-645b-469e-b7e8-4aa18d336761"
  "6e6fa606-3248-4a8f-a015-ae0026fae84a" "705de1c3-7aa2-4b32-bf9f-2bb903e79450"
  "70751514-d6d8-4ffc-9037-226b7433c590" "725e7c07-fe79-46fb-99f4-b6fd1738ce82"
  "73573738-bb4b-43ad-b67a-f78548ad210c" "74ad1c8a-c300-419d-b6a0-4f331a98b611"
  "75ea596d-7506-43fc-b4f7-b86a97ac0583" "794029e9-4902-47db-b7e9-7f547467a026"
  "79739c5b-4d8d-4e20-b064-ee1c1aa4bc5e" "79d3afbb-49a6-4957-ae4a-38477cbdf58f"
  "7a349c3c-6a9b-43fb-bf86-525e5264210a" "7c602d5c-bbbb-4ddb-97d0-6ebcc3ddfa20"
  "7d5a4d7d-9386-450e-91f7-5bfe6e70e12e" "7de5e406-fd14-4b51-958d-0c26e9be6eca"
  "7e21f14a-72e3-4535-9ef9-10392d908432" "7fc51511-d748-40e8-8a1d-620bf1781e0a"
  "81b9bb61-e0b5-4736-88a6-2a635d9a908b" "81cadc1c-8ff5-4093-abd1-713f133fb4ca"
  "81f95733-aa81-4bde-8c4a-25adc832dcbb" "831a4893-7d40-417b-8469-633910020002"
  "8371d239-46d5-45e4-98d4-5c350d76ba9b" "851e26fa-08a7-4dfe-848e-408184efb167"
  "8597c8ee-caca-45cb-8c2d-a3c7bb1f88dc" "88c5043c-6ddb-42a6-99b5-96cd3a3ec56b"
  "89fe1888-aa91-4dbb-9372-64b702e67aa0" "8a7ffd62-5075-453c-89e6-057843dcb8e1"
  "8e3d37be-eb88-4a4a-8891-6fb0ee9f0ac3" "92c07ed7-e61c-43c4-8651-08a34ca3e1fe"
  "952feafb-55e0-4fc6-90b6-1d380bf26bcf" "96cc9b30-d14a-4938-b490-4d2775343539"
  "9723383b-ccdc-4815-a219-8e42d0c87944" "9cbff473-4215-4a0e-9fbd-2ddfbed8ddf4"
  "9cc3f8a7-4e9b-4ad0-82c7-6e4c8e451002" "9da8f08b-1db1-49fd-980f-8f8c2a923989"
  "9e20767b-ba39-4407-9c90-3a348ba150c5" "9eec7ecd-e16c-491a-9843-45c9fb9b3eeb"
  "9f6cddd0-664a-465e-adc7-e587571df522" "a333405d-3745-47fd-89e6-f80e1553526d"
  "a35d481b-5764-43ae-ac66-3f3500fb061c" "a621e7bf-7b02-4b2c-83b8-b3f81e4fae95"
  "a644a383-289e-4fb9-9a1b-3f1513b29872" "a69f1946-6f77-4840-a737-6eb4089e3c60"
  "a7a80b05-0723-4c52-97c2-4e6689371143" "a846b647-74f5-41e5-a583-8147cbd61919"
  "acf2a152-86f3-4b04-95ec-4ff661ab8fdb" "b2a513c5-5da4-4d17-b0f8-ec63381a49a6"
  "b2baee7b-8594-4298-8056-20946cdf57ba" "b2c15717-dfe9-4078-a678-0ece6f3a1ec1"
  "bbfab6d3-4108-44b1-867a-4bf8d3e17514" "bd0eb7cb-7c6e-4978-8586-1a2872cf40aa"
  "be22afd1-de31-400b-a3d0-2a59a14fcdab" "bf106c3d-7d51-413c-a7e7-c8d77c018949"
  "bf4208a8-e581-42a2-8ada-8c58cf610e70" "c15042de-aa4f-4cde-9cf9-28cdb6c8169e"
  "c35453b6-4ff1-4294-98e0-f53fd09d921d" "c5da19e8-e549-4bdd-8e82-5a87b7759c4f"
  "c5e626d6-48c5-46be-bd29-0e0a800bbbd9" "c773d10f-e2ed-4ca6-864a-f355a83ceeda"
  "c8392015-d666-4626-a562-7e9de6474c95" "ca4e687d-07b7-4a5f-a92d-27a7c366da65"
  "ca9a5c32-3e82-4e8a-9a21-371e484d80eb" "cc02bbba-113d-433f-a70c-9590b3bdbd74"
  "cc193885-c225-4308-961d-6344ba96bcd9" "ccb7432a-6bb0-403d-8db5-fa1cb03f00ff"
  "cd0ea681-c92c-4006-bdd7-5afc3c868bab" "d029f7ce-9617-4f04-9834-3faa425a9d3e"
  "d0f4adf7-5f02-4578-a120-e150fe0fc653" "d45ebafe-e55e-442f-a745-28fa9f149b5b"
  "d513c74d-5adf-4ae2-872b-5a80d26f5a00" "d5ca93dc-44da-45eb-8de1-c139b2bee50d"
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
)

TOTAL=${#UUIDS[@]}
log "Starting conversion of $TOTAL exercises..."

SUCCESS=0
FAILED=0

for UUID in "${UUIDS[@]}"; do
  for type in "image" "thumbnail"; do
    src_url="${CDN_BASE}/exercises/${UUID}/${type}.png"
    local_png="${TEMP_DIR}/${UUID}_${type}.png"
    local_avif="${TEMP_DIR}/${UUID}_${type}.avif"
    
    # Download PNG
    curl -s -o "${local_png}" "${src_url}" 2>/dev/null
    if [ ! -f "${local_png}" ] || [ ! -s "${local_png}" ]; then
      rm -f "${local_png}" "${local_avif}"
      continue
    fi
    
    # Convert to AVIF
    node -e "
      const sharp = require('sharp');
      sharp('${local_png}')
        .avif({ quality: 75, effort: 4 })
        .toFile('${local_avif}')
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    " 2>/dev/null
    
    if [ $? -eq 0 ] && [ -f "${local_avif}" ]; then
      # Upload AVIF
      npx wrangler r2 object put "${BUCKET}/exercises/${UUID}/${type}.avif" \
        --file "${local_avif}" \
        --content-type "image/avif" \
        --remote 2>&1 | grep -q "Upload complete"
      
      if [ $? -eq 0 ]; then
        # Delete original PNG
        npx wrangler r2 object delete "${BUCKET}/exercises/${UUID}/${type}.png" --remote 2>&1 | grep -q "Delete complete"
        SUCCESS=$((SUCCESS + 1))
      else
        FAILED=$((FAILED + 1))
      fi
    else
      FAILED=$((FAILED + 1))
    fi
    
    # Cleanup
    rm -f "${local_png}" "${local_avif}"
  done
  
  # Progress indicator every 10 exercises
  if [ $((SUCCESS + FAILED)) -gt 0 ] && [ $((SUCCESS + FAILED)) -eq 10 ] || [ $((SUCCESS + FAILED)) -eq 50 ] || [ $((SUCCESS + FAILED)) -eq 100 ] || [ $((SUCCESS + FAILED)) -eq 150 ] || [ $((SUCCESS + FAILED)) -eq 200 ]; then
    log "Progress: $((SUCCESS + FAILED)) / $((TOTAL * 2)) - Success: $SUCCESS, Failed: $FAILED"
  fi
done

log ""
log "=== FINAL SUMMARY ==="
log "Total exercises: $TOTAL"
log "Total images: $((TOTAL * 2))"
log "Success: $SUCCESS"
log "Failed: $FAILED"
log "Log saved to: $LOG_FILE"
