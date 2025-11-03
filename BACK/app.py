from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess, sys, os

app = Flask(__name__)
CORS(app)  # 👈 Esto habilita CORS

@app.route('/api/liveness', methods=['POST'])
def run_liveness():
    try:
        script_path = os.path.join(os.path.dirname(__file__), 'liveness_random_demo.py')
        subprocess.run([sys.executable, script_path], check=True)
        return jsonify({"status": "ok", "message": "Prueba de liveness completada"}), 200
    except subprocess.CalledProcessError:
        return jsonify({"status": "error", "message": "Error ejecutando liveness"}), 500

if __name__ == "__main__":
    app.run(debug=True)
