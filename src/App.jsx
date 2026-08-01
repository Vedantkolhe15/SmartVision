import { useRef, useState } from "react";

const BACKEND_URL = "https://smartvision-backend-1.onrender.com";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef(null);

  const handleSelectedFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError("");
  };

  const handleFileChange = (event) => {
    handleSelectedFile(event.target.files[0]);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files[0];
    handleSelectedFile(file);
  };

  const analyzeImage = async () => {
    if (!selectedFile) {
      setError("Please select an image first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(
        `${BACKEND_URL}/upload-image`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(errorText);

        throw new Error(
          `Backend returned status ${response.status}`
        );
      }

      const data = await response.json();

      setResult(data);
    } catch (err) {
      console.error(err);

      setError(
        `Unable to analyze image. ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const resetAnalysis = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const totalObjects = result?.object_counts
    ? Object.values(result.object_counts).reduce(
        (sum, count) => sum + count,
        0
      )
    : 0;

  return (
    <div className="app">

      {/* ================= HEADER ================= */}

      <header className="navbar">
        <div className="brand">
          <div className="brand-icon">SV</div>

          <div>
            <h1>SmartVision AI</h1>
            <span>Intelligent Image Recognition</span>
          </div>
        </div>

        <div className="status">
          <span className="status-dot"></span>
          AI System Ready
        </div>
      </header>


      {/* ================= HERO ================= */}

      <main className="container">

        <section className="hero">

          <div className="hero-badge">
            ✨ AI Powered Computer Vision
          </div>

          <h2>
            See the world through
            <span> AI</span>
          </h2>

          <p>
            Upload an image and let SmartVision AI
            automatically detect and recognize objects
            using advanced computer vision technology.
          </p>

        </section>


        {/* ================= UPLOAD CARD ================= */}

        <section
          className={`upload-card ${
            dragActive ? "drag-active" : ""
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >

          {!preview && (

            <div className="upload-content">

              <div className="upload-icon">
                📤
              </div>

              <h3>
                Upload an Image
              </h3>

              <p>
                Drag & drop your image here
                <br />
                or select an image from your device
              </p>

              <button
                className="select-button"
                onClick={() =>
                  fileInputRef.current.click()
                }
              >
                Choose Image
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                hidden
              />

              <small>
                Supported formats: JPG, JPEG, PNG, WEBP
              </small>

            </div>

          )}


          {/* ================= PREVIEW ================= */}

          {preview && (

            <div className="preview-section">

              <div className="preview-header">

                <div>
                  <h3>
                    Selected Image
                  </h3>

                  <p>
                    {selectedFile?.name}
                  </p>
                </div>

                <button
                  className="remove-button"
                  onClick={resetAnalysis}
                >
                  ✕ Remove
                </button>

              </div>

              <img
                src={preview}
                alt="Selected Preview"
                className="preview-image"
              />

              <button
                className="analyze-button"
                onClick={analyzeImage}
                disabled={loading}
              >

                {loading ? (
                  <>
                    <span className="spinner"></span>
                    AI Analyzing...
                  </>
                ) : (
                  <>
                    🤖 Analyze Image
                  </>
                )}

              </button>

            </div>

          )}

        </section>


        {/* ================= ERROR ================= */}

        {error && (

          <div className="error-box">
            <strong>⚠️ Analysis Error</strong>
            <p>{error}</p>
          </div>

        )}


        {/* ================= LOADING ================= */}

        {loading && (

          <div className="loading-card">

            <div className="loading-animation">
              🧠
            </div>

            <h3>
              SmartVision AI is analyzing your image
            </h3>

            <p>
              Detecting objects using artificial intelligence...
            </p>

            <div className="loading-bar">
              <div></div>
            </div>

          </div>

        )}


        {/* ================= RESULT ================= */}

        {result && !loading && (

          <section className="results">

            <div className="result-header">

              <div>
                <div className="success-badge">
                  ✓ Analysis Complete
                </div>

                <h2>
                  AI Detection Results
                </h2>

                <p>
                  {result.message}
                </p>
              </div>

              <button
                className="new-analysis"
                onClick={resetAnalysis}
              >
                + New Analysis
              </button>

            </div>


            {/* ================= STAT CARDS ================= */}

            <div className="stats-grid">

              <div className="stat-card">

                <div className="stat-icon">
                  🎯
                </div>

                <div>
                  <span>Objects Detected</span>
                  <strong>
                    {totalObjects}
                  </strong>
                </div>

              </div>


              <div className="stat-card">

                <div className="stat-icon">
                  🔍
                </div>

                <div>
                  <span>Detection Events</span>
                  <strong>
                    {result.detections?.length || 0}
                  </strong>
                </div>

              </div>


              <div className="stat-card">

                <div className="stat-icon">
                  🧠
                </div>

                <div>
                  <span>AI Engine</span>
                  <strong>
                    YOLO
                  </strong>
                </div>

              </div>

            </div>


            {/* ================= DETECTED OBJECTS ================= */}

            {result.object_counts && (

              <div className="objects-card">

                <div className="section-title">
                  <h3>
                    Detected Objects
                  </h3>

                  <span>
                    {Object.keys(
                      result.object_counts
                    ).length} Types
                  </span>
                </div>


                <div className="object-grid">

                  {Object.entries(
                    result.object_counts
                  ).map(
                    ([objectName, count]) => (

                      <div
                        className="object-item"
                        key={objectName}
                      >

                        <div className="object-symbol">
                          👁️
                        </div>

                        <div>
                          <strong>
                            {objectName}
                          </strong>

                          <span>
                            {count} detected
                          </span>
                        </div>

                      </div>

                    )
                  )}

                </div>

              </div>

            )}


            {/* ================= DETECTION DETAILS ================= */}

            {result.detections &&
              result.detections.length > 0 && (

                <div className="details-card">

                  <div className="section-title">

                    <h3>
                      Detection Confidence
                    </h3>

                    <span>
                      AI Analysis
                    </span>

                  </div>


                  <div className="detection-list">

                    {result.detections.map(
                      (item, index) => (

                        <div
                          className="detection-item"
                          key={index}
                        >

                          <div className="detection-info">

                            <strong>
                              {item.object}
                            </strong>

                            <span>
                              {item.confidence}%
                            </span>

                          </div>

                          <div className="confidence-bar">

                            <div
                              style={{
                                width: `${item.confidence}%`,
                              }}
                            ></div>

                          </div>

                        </div>

                      )
                    )}

                  </div>

                </div>

              )}


            {/* ================= RESULT IMAGE ================= */}

            {result.result_image && (

              <div className="result-image-card">

                <div className="section-title">

                  <div>
                    <h3>
                      AI Detection Visualization
                    </h3>

                    <p>
                      Objects identified by SmartVision AI
                    </p>
                  </div>

                </div>

                <img
                  src={
                    result.result_image.startsWith(
                      "http"
                    )
                      ? result.result_image
                      : `${BACKEND_URL}${result.result_image}`
                  }
                  alt="AI Detection Result"
                  className="result-image"
                />

              </div>

            )}

          </section>

        )}

      </main>


      {/* ================= FOOTER ================= */}

      <footer>

        <p>
          © 2026 SmartVision AI
        </p>

        <span>
          Powered by Artificial Intelligence & Computer Vision
        </span>

      </footer>


      {/* ================= CSS ================= */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f4f7fb;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          color: #172033;
        }

        button {
          font-family: inherit;
        }

        .app {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top right,
              rgba(37, 99, 235, 0.12),
              transparent 35%
            ),
            #f4f7fb;
        }

        /* NAVBAR */

        .navbar {
          height: 78px;
          background: white;
          border-bottom: 1px solid #e7ebf2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 6%;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-icon {
          width: 45px;
          height: 45px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 800;
          background:
            linear-gradient(
              135deg,
              #2563eb,
              #7c3aed
            );
          box-shadow:
            0 8px 20px
            rgba(37, 99, 235, 0.25);
        }

        .brand h1 {
          margin: 0;
          font-size: 20px;
        }

        .brand span {
          font-size: 12px;
          color: #7b8494;
        }

        .status {
          font-size: 13px;
          color: #16a34a;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background: #22c55e;
          border-radius: 50%;
          box-shadow:
            0 0 0 5px
            rgba(34, 197, 94, 0.12);
        }


        /* MAIN */

        .container {
          max-width: 1100px;
          margin: auto;
          padding: 60px 20px;
        }


        /* HERO */

        .hero {
          text-align: center;
          max-width: 700px;
          margin: auto;
        }

        .hero-badge {
          display: inline-block;
          padding: 8px 15px;
          border-radius: 30px;
          background: #eaf0ff;
          color: #2563eb;
          font-size: 13px;
          font-weight: 600;
        }

        .hero h2 {
          margin:
            20px 0 12px;
          font-size:
            clamp(36px, 6vw, 62px);
          line-height: 1.05;
          letter-spacing: -2px;
        }

        .hero h2 span {
          color: #2563eb;
        }

        .hero p {
          color: #6b7280;
          line-height: 1.7;
          font-size: 16px;
        }


        /* UPLOAD */

        .upload-card {
          margin-top: 45px;
          background: white;
          border: 2px dashed #d8deea;
          border-radius: 24px;
          min-height: 330px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 35px;
          transition: 0.3s;
        }

        .upload-card:hover,
        .drag-active {
          border-color: #2563eb;
          background: #f8faff;
        }

        .upload-content {
          text-align: center;
        }

        .upload-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .upload-content h3 {
          margin: 5px 0;
          font-size: 24px;
        }

        .upload-content p {
          color: #7b8494;
          line-height: 1.6;
        }

        .select-button,
        .analyze-button,
        .new-analysis {
          border: none;
          border-radius: 12px;
          padding: 14px 26px;
          color: white;
          background:
            linear-gradient(
              135deg,
              #2563eb,
              #4f46e5
            );
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
          box-shadow:
            0 10px 25px
            rgba(37, 99, 235, 0.2);
        }

        .select-button:hover,
        .analyze-button:hover,
        .new-analysis:hover {
          transform: translateY(-2px);
        }

        .upload-content small {
          display: block;
          margin-top: 15px;
          color: #9ca3af;
        }


        /* PREVIEW */

        .preview-section {
          width: 100%;
          max-width: 700px;
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .preview-header h3 {
          margin: 0;
        }

        .preview-header p {
          color: #8a93a3;
          margin: 5px 0 0;
          font-size: 13px;
        }

        .remove-button {
          border: none;
          background: #fff0f0;
          color: #dc2626;
          padding: 9px 13px;
          border-radius: 9px;
          cursor: pointer;
        }

        .preview-image {
          width: 100%;
          max-height: 450px;
          object-fit: contain;
          border-radius: 15px;
          background: #f5f7fa;
        }

        .analyze-button {
          display: block;
          margin: 22px auto 0;
          min-width: 210px;
        }

        .analyze-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .spinner {
          width: 15px;
          height: 15px;
          display: inline-block;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: white;
          border-radius: 50%;
          margin-right: 8px;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }


        /* ERROR */

        .error-box {
          margin-top: 25px;
          padding: 18px;
          border-radius: 14px;
          background: #fff1f2;
          border: 1px solid #fecdd3;
          color: #be123c;
        }

        .error-box p {
          margin-bottom: 0;
        }


        /* LOADING */

        .loading-card {
          margin-top: 30px;
          padding: 35px;
          text-align: center;
          background: white;
          border-radius: 20px;
          box-shadow:
            0 15px 40px
            rgba(15, 23, 42, 0.07);
        }

        .loading-animation {
          font-size: 45px;
          animation: pulse 1.2s infinite;
        }

        @keyframes pulse {
          50% {
            transform: scale(1.12);
          }
        }

        .loading-card p {
          color: #7b8494;
        }

        .loading-bar {
          height: 6px;
          background: #e8edf5;
          border-radius: 10px;
          max-width: 400px;
          margin: 20px auto 0;
          overflow: hidden;
        }

        .loading-bar div {
          height: 100%;
          width: 50%;
          background:
            linear-gradient(
              90deg,
              #2563eb,
              #7c3aed
            );
          animation:
            loading 1.4s infinite;
        }

        @keyframes loading {
          0% {
            transform: translateX(-100%);
          }

          100% {
            transform: translateX(200%);
          }
        }


        /* RESULTS */

        .results {
          margin-top: 55px;
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .success-badge {
          display: inline-block;
          background: #dcfce7;
          color: #15803d;
          padding: 7px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
        }

        .result-header h2 {
          margin:
            12px 0 5px;
          font-size: 30px;
        }

        .result-header p {
          color: #7b8494;
        }


        /* STATS */

        .stats-grid {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 18px;
          margin-top: 25px;
        }

        .stat-card {
          background: white;
          padding: 22px;
          border-radius: 17px;
          display: flex;
          align-items: center;
          gap: 15px;
          box-shadow:
            0 10px 30px
            rgba(15, 23, 42, 0.05);
        }

        .stat-icon {
          width: 45px;
          height: 45px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eef3ff;
          font-size: 21px;
        }

        .stat-card span {
          display: block;
          font-size: 12px;
          color: #8a93a3;
        }

        .stat-card strong {
          display: block;
          margin-top: 5px;
          font-size: 21px;
        }


        /* CARDS */

        .objects-card,
        .details-card,
        .result-image-card {
          background: white;
          margin-top: 22px;
          padding: 25px;
          border-radius: 20px;
          box-shadow:
            0 10px 30px
            rgba(15, 23, 42, 0.05);
        }

        .section-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .section-title h3 {
          margin: 0;
        }

        .section-title span {
          font-size: 12px;
          color: #2563eb;
          background: #eef3ff;
          padding: 7px 10px;
          border-radius: 20px;
        }

        .section-title p {
          color: #8a93a3;
        }


        /* OBJECTS */

        .object-grid {
          display: grid;
          grid-template-columns:
            repeat(auto-fit, minmax(180px, 1fr));
          gap: 15px;
          margin-top: 20px;
        }

        .object-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px;
          background: #f7f9fc;
          border-radius: 13px;
        }

        .object-symbol {
          font-size: 24px;
        }

        .object-item strong {
          display: block;
          text-transform: capitalize;
        }

        .object-item span {
          font-size: 12px;
          color: #8a93a3;
        }


        /* CONFIDENCE */

        .detection-list {
          margin-top: 25px;
        }

        .detection-item {
          margin-bottom: 20px;
        }

        .detection-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .confidence-bar {
          height: 9px;
          background: #e9edf4;
          border-radius: 10px;
          overflow: hidden;
        }

        .confidence-bar div {
          height: 100%;
          background:
            linear-gradient(
              90deg,
              #2563eb,
              #7c3aed
            );
          border-radius: 10px;
        }


        /* RESULT IMAGE */

        .result-image-card {
          text-align: center;
        }

        .result-image-card .section-title {
          text-align: left;
        }

        .result-image {
          margin-top: 20px;
          width: 100%;
          max-height: 650px;
          object-fit: contain;
          border-radius: 15px;
          background: #f5f7fa;
        }


        /* FOOTER */

        footer {
          text-align: center;
          padding: 35px 20px;
          color: #8a93a3;
          font-size: 13px;
        }

        footer p {
          margin-bottom: 5px;
          color: #555f70;
          font-weight: 600;
        }


        /* RESPONSIVE */

        @media (max-width: 700px) {

          .navbar {
            padding: 0 20px;
          }

          .status {
            display: none;
          }

          .container {
            padding:
              40px 15px;
          }

          .hero h2 {
            font-size: 42px;
          }

          .upload-card {
            padding: 20px;
          }

          .result-header {
            flex-direction: column;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .preview-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

        }

      `}</style>

    </div>
  );
}

export default App;