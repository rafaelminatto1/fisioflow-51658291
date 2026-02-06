import os
import pydicom
from flask import Flask, request, jsonify
from google.cloud import storage
import tempfile

app = Flask(__name__)
storage_client = storage.Client()

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "service": "fisioflow-image-worker"}), 200

@app.route("/process-dicom", methods=["POST"])
def process_dicom():
    """
    Processa um arquivo DICOM do GCS e extrai metadados básicos.
    """
    data = request.json
    gcs_path = data.get("gcs_path") # Ex: gs://bucket-name/path/to/file.dcm
    
    if not gcs_path:
        return jsonify({"error": "gcs_path is required"}), 400

    if not gcs_path.startswith("gs://"):
        return jsonify({"error": "Invalid GCS path format. Must start with gs://"}), 400

    try:
        # Extrair bucket e blob path
        parts = gcs_path.replace("gs://", "").split("/", 1)
        bucket_name = parts[0]
        blob_name = parts[1]

        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(blob_name)

        # Criar arquivo temporário para processamento
        with tempfile.NamedTemporaryFile(suffix=".dcm") as temp_file:
            blob.download_to_filename(temp_file.name)
            
            # Ler metadados DICOM
            ds = pydicom.dcmread(temp_file.name)
            
            # Extrair campos comuns com segurança
            metadata = {
                "PatientName": str(ds.get("PatientName", "Unknown")),
                "PatientID": str(ds.get("PatientID", "Unknown")),
                "Modality": str(ds.get("Modality", "Unknown")),
                "StudyDate": str(ds.get("StudyDate", "Unknown")),
                "BodyPartExamined": str(ds.get("BodyPartExamined", "Unknown")),
                "Manufacturer": str(ds.get("Manufacturer", "Unknown")),
                "Rows": getattr(ds, "Rows", None),
                "Columns": getattr(ds, "Columns", None),
            }

        return jsonify({
            "status": "success",
            "metadata": metadata,
            "source": gcs_path
        }), 200

    except Exception as e:
        print(f"Error processing {gcs_path}: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))