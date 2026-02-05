import os
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "service": "fisioflow-image-worker"}), 200

@app.route("/process-dicom", methods=["POST"])
def process_dicom():
    """
    Endpoint placeholder para processamento futuro de DICOM.
    Recebe um caminho do Google Cloud Storage (GCS).
    """
    data = request.json
    gcs_path = data.get("gcs_path")
    
    if not gcs_path:
        return jsonify({"error": "gcs_path is required"}), 400

    # Lógica futura: 
    # 1. Baixar arquivo do GCS
    # 2. Processar com pydicom/OpenCV
    # 3. Upload do resultado ou metadados
    
    print(f"Processing image from: {gcs_path}")
    
    return jsonify({
        "status": "processing_started",
        "job_id": "job_123_placeholder",
        "input": gcs_path
    }), 202

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
