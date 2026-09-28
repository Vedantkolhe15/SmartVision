import { useEffect, useRef, useState } from "react";

const BACKEND_URL = "https://smartvision-backend-1.onrender.com";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [history, setHistory] = useState([]);
  const [darkMode, setDarkMode] = useState(() => {
  return localStorage.getItem("smartvision_dark_mode") === "true";
});
useEffect(() => {
  document.body.classList.toggle("dark-mode", darkMode);
}, [darkMode]);

  const fileInputRef = useRef(null);
  const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onload = () => resolve(reader.result);

    reader.onerror = (error) => reject(error);
  });
};
const createThumbnail = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");

        const maxWidth = 500;
        const maxHeight = 500;

        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round(
              (height * maxWidth) / width
            );
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round(
              (width * maxHeight) / height
            );
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");

        ctx.drawImage(
          img,
          0,
          0,
          width,
          height
        );

        resolve(
          canvas.toDataURL("image/jpeg", 0.7)
        );
      };

      img.onerror = reject;
      img.src = event.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

  // ================= LOAD HISTORY =================

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem("smartvision_history");

      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);

        if (Array.isArray(parsedHistory)) {
          setHistory(parsedHistory);
        }
      }
    } catch (err) {
      console.error("Unable to load history:", err);
      localStorage.removeItem("smartvision_history");
    }
  }, []);
  // ================= SAVE DARK MODE =================

useEffect(() => {
  localStorage.setItem(
    "smartvision_dark_mode",
    darkMode.toString()
  );
}, [darkMode]);

  // ================= FILE SELECTION =================

  const handleSelectedFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    const imagePreview = URL.createObjectURL(file);

    setSelectedFile(file);
    setPreview(imagePreview);
    setResult(null);
    setError("");
  };

  const handleFileChange = (event) => {
    handleSelectedFile(event.target.files[0]);
  };

  // ================= DRAG & DROP =================

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files[0];

    handleSelectedFile(file);
  };

  // ================= ANALYZE IMAGE =================

  const analyzeImage = async () => {
  if (!selectedFile) {
    setError("Please select an image first.");
    return;
  }

  setLoading(true);
  setError("");
  setResult(null);

  try {
    const previewBase64 = await fileToBase64(selectedFile);
    const thumbnailBase64 = await createThumbnail(selectedFile);

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

  throw new Error(
    `Backend returned ${response.status}: ${errorText}`
  );
}

    if (!response.ok) {
      const errorText = await response.text();

      console.error(errorText);

      throw new Error(
        `Backend returned status ${response.status}`
      );
    }

    const data = await response.json();

    // Show result
    setResult(data);

    // Create history item
    const historyItem = {
      id: Date.now(),
      filename: selectedFile.name,
      date: new Date().toLocaleString(),
      message:
        data.message ||
        "Analysis completed successfully.",
      detections: data.detections || [],
      object_counts: data.object_counts || {},
      result_image: data.result_image || "",
      preview_image: thumbnailBase64,
    };

    const updatedHistory = [
      historyItem,
      ...history,
    ].slice(0, 10);

    setHistory(updatedHistory);

    // Save history
    try {
      localStorage.setItem(
        "smartvision_history",
        JSON.stringify(updatedHistory)
      );
    } catch (storageError) {
      console.warn(
        "History storage quota exceeded:",
        storageError
      );

      // If storage is full, remove preview images
      const lightweightHistory =
        updatedHistory.map((item) => ({
          ...item,
          preview_image: "",
        }));
                      
      try {
        localStorage.setItem(
          "smartvision_history",
          JSON.stringify(lightweightHistory)
        );

        setHistory(lightweightHistory);
      } catch (finalError) {
        console.error(
          "Unable to save history:",
          finalError
        );
      }
    }
  } catch (err) {
    console.error(err);

    setError(
  `Unable to analyze image. ${err?.message || String(err)}`
);
  } finally {
    setLoading(false);
  }
};

  // ================= RESET =================

  const resetAnalysis = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ================= RESULT STATISTICS =================

  const totalObjects = result?.object_counts
    ? Object.values(result.object_counts).reduce(
        (sum, count) => sum + count,
        0
      )
    : 0;

  // ================= DASHBOARD STATISTICS =================

  const totalAnalyses = history.length;

  const totalHistoryObjects = history.reduce(
    (total, item) => {
      return (
        total +
        Object.values(
          item.object_counts || {}
        ).reduce(
          (sum, count) => sum + count,
          0
        )
      );
    },
    0
  );

  const objectStatistics = history.reduce(
    (stats, item) => {
      Object.entries(
        item.object_counts || {}
      ).forEach(
        ([objectName, count]) => {
          stats[objectName] =
            (stats[objectName] || 0) + count;
        }
      );

      return stats;
    },
    {}
  );

  const mostDetectedObject =
    Object.entries(objectStatistics).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] || "None";

  // ================= OPEN HISTORY RESULT =================

  const openHistoryItem = (item) => {
    setResult({
      message:
        item.message ||
        "Previous analysis result",
      detections: item.detections || [],
      object_counts: item.object_counts || {},
      result_image: item.result_image || "",
    });

    setError("");

    setTimeout(() => {
      
    }, 100);
  };

  // ================= CLEAR HISTORY =================

  const clearHistory = () => {
    setHistory([]);

    localStorage.removeItem(
      "smartvision_history"
    );
  };

  return (
    <div className={`app ${darkMode ? "dark-mode" : ""}`}>

      {/* ================= HEADER ================= */}

      <header className="navbar">

        <div className="brand">

          <div className="brand-icon">
            SV
          </div>

          <div>
           <h1>
  SmartVision AI
</h1>

            <span>
              Intelligent Image Recognition
            </span>
          </div>

        </div>

         <div className="navbar-actions">

  <button
    className="theme-button"
    onClick={() => setDarkMode(!darkMode)}
    title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
  >
    {darkMode ? "☀️" : "🌙"}
  </button>

  <div className="status">

    <span className="status-dot"></span>

    AI System Ready

  </div>

</div>

      </header>


      {/* ================= MAIN ================= */}

      <main className="container">

        {/* ================= HERO ================= */}

        <section className="hero">

          <div className="hero-badge">
            ✨ AI Powered Computer Vision
          </div>

          <h2 style={{ color: "#172033" }}>
  See the world through
  <span style={{ color: "#2563eb" }}> AI</span>
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
            dragActive
              ? "drag-active"
              : ""
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() =>
            setDragActive(false)
          }
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
                  fileInputRef.current?.click()
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
                Supported formats:
                JPG, JPEG, PNG, WEBP
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

            <strong>
              ⚠️ Analysis Error
            </strong>

            <p>
              {error}
            </p>

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


        {/* ================= DASHBOARD ================= */}

        {history.length > 0 && (

          <section className="dashboard-section">

            <div className="dashboard-header">

              <div>

                <div className="dashboard-badge">
                  📊 AI Analytics
                </div>

                <h2 style={{ color: "#172033" }}>
  SmartVision Dashboard
</h2>

                <p>
                  Overview of your AI-powered image
                  analysis activity
                </p>

              </div>

            </div>


            {/* DASHBOARD STATS */}

            <div className="dashboard-stats">

              <div className="dashboard-stat-card">

                <div className="dashboard-stat-icon">
                  🖼️
                </div>

                <div>

                  <span>
                    Total Analyses
                  </span>

                  <strong>
                    {totalAnalyses}
                  </strong>

                </div>

              </div>


              <div className="dashboard-stat-card">

                <div className="dashboard-stat-icon">
                  🎯
                </div>

                <div>

                  <span>
                    Total Objects
                  </span>

                  <strong>
                    {totalHistoryObjects}
                  </strong>

                </div>

              </div>


              <div className="dashboard-stat-card">

                <div className="dashboard-stat-icon">
                  🏆
                </div>

                <div>

                  <span>
                    Most Detected
                  </span>

                  <strong className="capitalize">
                    {mostDetectedObject}
                  </strong>

                </div>

              </div>

            </div>


            {/* OBJECT STATISTICS */}

            <div className="statistics-card">

              <div className="section-title">

                <div>

                  <h3>
                    Object Detection Statistics
                  </h3>

                  <p>
                    Most frequently detected objects
                  </p>

                </div>

                <span>
                  AI Insights
                </span>

              </div>


              <div className="statistics-list">

                {Object.entries(objectStatistics)
                  .sort(
                    (a, b) =>
                      b[1] - a[1]
                  )
                  .map(
                    ([objectName, count]) => {

                      const maxCount =
                        Math.max(
                          ...Object.values(
                            objectStatistics
                          )
                        );

                      const percentage =
                        maxCount > 0
                          ? (count / maxCount) * 100
                          : 0;

                      return (

                        <div
                          className="statistics-item"
                          key={objectName}
                        >

                          <div className="statistics-info">

                            <strong>
                              {objectName}
                            </strong>

                            <span>
                              {count} detected
                            </span>

                          </div>

                          <div className="statistics-bar">

                            <div
                              style={{
                                width:
                                  `${percentage}%`,
                              }}
                            ></div>

                          </div>

                        </div>

                      );
                    }
                  )}

              </div>

            </div>

          </section>

        )}


       {/* ================= ANALYSIS HISTORY ================= */}

{history.length > 0 && (

  <section className="history-section">

    <div className="history-header">

      <div>

        <div className="history-badge">
          🕘 Recent Activity
        </div>

        <h2 style={{ color: "#172033" }}>
  Analysis History
</h2>

        <p>
          Your recent AI image analysis results
        </p>

      </div>

      <button
        className="clear-history-button"
        onClick={clearHistory}
      >
        🗑️ Clear History
      </button>

    </div>


    {/* ================= TIMELINE ================= */}

    <div className="history-timeline">

      {history.map((item) => (

        <div
          className="history-timeline-item"
          key={item.id}
        >

          {/* TIMELINE DOT */}

          <div className="history-timeline-dot">
            <span></span>
          </div>


          {/* HISTORY CARD */}

          <div
            className="history-card"
            onClick={() =>
              openHistoryItem(item)
            }
          >

            {/* IMAGE */}

            {item.preview_image ? (

              <img
                src={item.preview_image}
                alt={item.filename}
                className="history-thumbnail"
              />

            ) : (

              <div className="history-file-icon">
                🖼️
              </div>

            )}


            {/* FILE INFORMATION */}

            <div className="history-card-top">

              <div className="history-file-info">

                <strong>
                  {item.filename}
                </strong>

                <span>
                  {item.date}
                </span>

              </div>

            </div>


            {/* SUMMARY */}

            <div className="history-summary">

              <div>

                <span>
                  Objects
                </span>

                <strong>
                  {Object.values(
                    item.object_counts || {}
                  ).reduce(
                    (sum, count) =>
                      sum + count,
                    0
                  )}
                </strong>

              </div>


              <div>

                <span>
                  Types
                </span>

                <strong>
                  {Object.keys(
                    item.object_counts || {}
                  ).length}
                </strong>

              </div>


              <div>

                <span>
                  AI
                </span>

                <strong>
                  YOLO
                </strong>

              </div>

            </div>


            {/* OBJECT TAGS */}

            <div className="history-objects">

              {Object.entries(
                item.object_counts || {}
              ).map(
                ([objectName, count]) => (

                  <span
                    key={objectName}
                    className="history-object-tag"
                  >
                    {objectName} × {count}
                  </span>

                )
              )}

            </div>


            {/* CLICK HINT */}

            <div className="history-click-hint">
              Click to view result →
            </div>

          </div>

        </div>

      ))}

    </div>

  </section>

)}

        {/* ================= RESULT ================= */}

        {result && (

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


            {/* STAT CARDS */}

            <div className="stats-grid">

              <div className="stat-card">

                <div className="stat-icon">
                  🎯
                </div>

                <div>

                  <span>
                    Objects Detected
                  </span>

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

                  <span>
                    Detection Events
                  </span>

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

                  <span>
                    AI Engine
                  </span>

                  <strong>
                    YOLO
                  </strong>

                </div>

              </div>

            </div>


            {/* DETECTED OBJECTS */}

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


            {/* DETECTION DETAILS */}

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
                                width:
                                  `${item.confidence}%`,
                              }}
                            ></div>

                          </div>

                        </div>

                      )
                    )}

                  </div>

                </div>

              )}


            {/* RESULT IMAGE */}

            {result?.result_image && (

              <div className="result-image-card">

                <div className="section-title">

                  <div>

                    <h3>
                      AI Detection Visualization
                    </h3>

                    <p>
                      Objects identified by
                      SmartVision AI
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
          Powered by Artificial Intelligence &
          Computer Vision
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

        /* ================= NAVBAR ================= */

        .navbar {
  position: sticky;
  top: 0;
  z-index: 1000;
  height: 78px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(231, 235, 242, 0.85);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6%;
  box-shadow: 0 4px 20px rgba(23, 32, 51, 0.04);
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


        /* ================= MAIN ================= */

        .container {
        width: 100%;
        max-width: 1100px;
        margin: 0 auto;
        padding: 60px 20px;
        box-sizing: border-box;
       }


        /* ================= HERO ================= */

        .hero {
  text-align: center;
  max-width: 760px;
  margin: 0 auto;
  padding: 10px 10px 0;
  animation: heroFadeIn 0.7s ease-out;
}

@keyframes heroFadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

        .hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 17px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  border: 1px solid rgba(37, 99, 235, 0.14);
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.2px;
  box-shadow: 0 6px 18px rgba(37, 99, 235, 0.08);
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


        /* ================= UPLOAD ================= */

        .upload-card {
  position: relative;
  margin-top: 45px;
  background: rgba(255, 255, 255, 0.92);
  border: 2px dashed #d4dceb;
  border-radius: 24px;
  min-height: 330px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  transition:
    transform 0.3s ease,
    border-color 0.3s ease,
    box-shadow 0.3s ease,
    background 0.3s ease;
  box-shadow:
    0 18px 45px rgba(23, 32, 51, 0.07);
  overflow: hidden;
}

.upload-card::before {
  content: "";
  position: absolute;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.06);
  top: -110px;
  right: -80px;
  pointer-events: none;
}

.upload-card:hover,
.drag-active {
  border-color: #2563eb;
  background: #f8faff;
  transform: translateY(-3px);
  box-shadow:
    0 22px 50px rgba(37, 99, 235, 0.12);
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
  width: 76px;
  height: 76px;
  margin: 0 auto 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38px;
  border-radius: 22px;
  background: linear-gradient(
    135deg,
    #eaf0ff,
    #f1ecff
  );
  border: 1px solid rgba(37, 99, 235, 0.12);
  box-shadow:
    0 12px 28px rgba(37, 99, 235, 0.12);
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.upload-card:hover .upload-icon {
  transform: translateY(-4px) scale(1.04);
  box-shadow:
    0 16px 32px rgba(37, 99, 235, 0.18);
}

        .upload-content h3 {
  margin: 6px 0 8px;
  font-size: 25px;
  line-height: 1.25;
  font-weight: 750;
  letter-spacing: -0.4px;
  color: #172033;
}

        .upload-content p {
  max-width: 520px;
  margin: 0 auto;
  color: #6b7280;
  line-height: 1.7;
  font-size: 15px;
  letter-spacing: 0.1px;
}

        .select-button,
.analyze-button,
.new-analysis {
  border: none;
  border-radius: 14px;
  padding: 14px 28px;
  color: white;
  background:
    linear-gradient(
      135deg,
      #2563eb,
      #4f46e5
    );
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.2px;
  cursor: pointer;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    filter 0.25s ease;
  box-shadow:
    0 10px 25px
    rgba(37, 99, 235, 0.20);
}

.select-button:hover,
.analyze-button:hover,
.new-analysis:hover {
  transform: translateY(-3px);
  filter: brightness(1.04);
  box-shadow:
    0 15px 30px
    rgba(37, 99, 235, 0.28);
}

.select-button:active,
.analyze-button:active,
.new-analysis:active {
  transform: translateY(-1px);
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


        /* ================= PREVIEW ================= */

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
  border: 1px solid #fee2e2;
  background: #fff5f5;
  color: #dc2626;
  padding: 10px 15px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.remove-button:hover {
  background: #feecec;
  border-color: #fecaca;
  transform: translateY(-2px);
  box-shadow:
    0 8px 18px rgba(220, 38, 38, 0.12);
}

.remove-button:active {
  transform: translateY(0);
}

        .preview-image {
  display: block;
  width: 100%;
  max-height: 450px;
  object-fit: contain;
  border-radius: 18px;
  background: #f5f7fa;
  border: 1px solid #e5e9f1;
  box-shadow:
    0 14px 35px rgba(23, 32, 51, 0.08);
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.preview-image:hover {
  transform: scale(1.01);
  box-shadow:
    0 18px 40px rgba(23, 32, 51, 0.12);
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
          animation:
            spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }


        /* ================= ERROR ================= */

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


        /* ================= LOADING ================= */

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
          animation:
            pulse 1.2s infinite;
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


        /* ================= DASHBOARD ================= */

        .dashboard-section {
          margin-top: 55px;
        }

        .dashboard-header {
          margin-bottom: 25px;
        }

        .dashboard-badge {
          display: inline-block;
          background: #eef3ff;
          color: #2563eb;
          padding: 7px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
        }

        .dashboard-header h2 {
          margin: 12px 0 5px;
          font-size: 30px;
        }

        .dashboard-header p {
          color: #7b8494;
          margin: 0;
        }

        .dashboard-stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 18px;
        width: 100%;
        box-sizing: border-box;
       }

       .dashboard-stat-card {
  background: white;
  padding: 22px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  gap: 15px;
  border: 1px solid #e8edf5;
  box-shadow:
    0 10px 30px
    rgba(15, 23, 42, 0.05);
  transition: 0.25s;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
}
        .dashboard-stat-card:hover {
          transform: translateY(-4px);
          box-shadow:
            0 15px 35px
            rgba(37, 99, 235, 0.12);
        }

        .dashboard-stat-icon {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eef3ff;
          font-size: 23px;
        }

         .dashboard-stat-card span {
         display: block;
         color: #8a93a3;
         font-size: 12px;
         min-width: 0;
         max-width: 100%;
         overflow: hidden;
         text-overflow: ellipsis;
         white-space: nowrap;
        }

        .dashboard-stat-card strong {
          display: block;
          margin-top: 6px;
          font-size: 22px;
        }

        .capitalize {
          text-transform: capitalize;
        }

        .statistics-card {
          background: white;
          margin-top: 22px;
          padding: 25px;
          border-radius: 20px;
          border: 1px solid #e8edf5;
          box-shadow:
            0 10px 30px
            rgba(15, 23, 42, 0.05);
        }

        .statistics-list {
          margin-top: 25px;
        }

        .statistics-item {
          margin-bottom: 20px;
        }

        .statistics-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .statistics-info strong {
          text-transform: capitalize;
        }

        .statistics-info span {
          color: #8a93a3;
          font-size: 12px;
        }

        .statistics-bar {
          height: 9px;
          background: #e9edf4;
          border-radius: 10px;
          overflow: hidden;
        }

        .statistics-bar div {
          height: 100%;
          background:
            linear-gradient(
              90deg,
              #2563eb,
              #7c3aed
            );
          border-radius: 10px;
          transition:
            width 0.5s ease;
        }


        /* ================= HISTORY ================= */

.history-section {
  margin-top: 55px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 35px;
}

.history-badge {
  display: inline-block;
  background: #eef3ff;
  color: #2563eb;
  padding: 7px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
}

.history-header h2 {
  margin: 12px 0 5px;
  font-size: 30px;
}

.history-header p {
  color: #7b8494;
  margin: 0;
}

.clear-history-button {
  border: none;
  background: #fff1f2;
  color: #dc2626;
  padding: 11px 16px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s;
}

.clear-history-button:hover {
  background: #ffe4e6;
  transform: translateY(-2px);
}


/* ================= TIMELINE ================= */

.history-timeline {
  position: relative;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: 10px 0 10px 55px;
  box-sizing: border-box;
}


/* VERTICAL LINE */

.history-timeline::before {
  content: "";
  position: absolute;
  left: 22px;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(
    to bottom,
    #2563eb,
    #7c3aed,
    #c7d2fe
  );
  border-radius: 10px;
}


/* TIMELINE ITEM */

.history-timeline-item {
  position: relative;
  margin-bottom: 25px;
}

.history-timeline-item:last-child {
  margin-bottom: 0;
}


/* ================= TIMELINE DOT ================= */

.history-timeline-dot {
  position: absolute;
  left: -44px;
  top: 28px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: white;
  border: 3px solid #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  box-shadow:
    0 0 0 6px rgba(37, 99, 235, 0.10);
}

.history-timeline-dot span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #2563eb;
}


/* ================= HISTORY CARD ================= */

.history-card {
  position: relative;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  background: white;
  padding: 20px;
  border-radius: 18px;
  border: 1px solid #e8edf5;
  box-shadow:
    0 10px 30px rgba(15, 23, 42, 0.05);
  transition: 0.25s;
  cursor: pointer;
  box-sizing: border-box;
  overflow: hidden;
}

.history-card:hover {
  transform: translateX(5px);
  box-shadow:
    0 15px 35px rgba(37, 99, 235, 0.12);
  border-color: #cbd8ff;
}


/* ================= IMAGE ================= */

.history-thumbnail {
  width: 100%;
  max-height: 280px;
  object-fit: cover;
  display: block;
  border-radius: 14px;
  margin-bottom: 15px;
}


/* ================= FILE ICON ================= */

.history-file-icon {
  width: 55px;
  height: 55px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eef3ff;
  font-size: 25px;
  margin-bottom: 15px;
}


/* ================= CARD TOP ================= */

.history-card-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.history-file-info {
  min-width: 0;
  width: 100%;
}

.history-file-info strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 16px;
}

.history-file-info span {
  display: block;
  margin-top: 5px;
  color: #8a93a3;
  font-size: 12px;
}


/* ================= SUMMARY ================= */

.history-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid #edf0f5;
}

.history-summary div {
  text-align: center;
}

.history-summary span {
  display: block;
  color: #8a93a3;
  font-size: 11px;
}

.history-summary strong {
  display: block;
  margin-top: 5px;
  font-size: 15px;
}


/* ================= OBJECT TAGS ================= */

.history-objects {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 18px;
}

.history-object-tag {
  background: #f1f5ff;
  color: #315edb;
  padding: 6px 9px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
}


/* ================= CLICK HINT ================= */

.history-click-hint {
  margin-top: 18px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  text-align: right;
}


/* ================= TIMELINE RESPONSIVE ================= */

@media (max-width: 700px) {

  .history-header {
    flex-direction: column;
  }

  .clear-history-button {
    width: 100%;
  }

  .history-timeline {
    padding-left: 42px;
  }

  .history-timeline::before {
    left: 15px;
    width: 2px;
  }

  .history-timeline-dot {
    left: -38px;
    width: 20px;
    height: 20px;
  }

  .history-card {
    padding: 16px;
  }

  .history-thumbnail {
    max-height: 220px;
  }

  .history-summary {
    gap: 5px;
  }

}


        /* ================= RESULT STATS ================= */

        .stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-top: 25px;
}

.stat-card {
  background: #ffffff;
  padding: 20px;
  border: 1px solid #e7ebf2;
  border-radius: 17px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 8px 24px rgba(23, 32, 51, 0.05);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-3px);
  border-color: #dbe3ef;
  box-shadow: 0 12px 28px rgba(23, 32, 51, 0.08);
}

.stat-icon {
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f4ff;
  border: 1px solid #e1e8ff;
  font-size: 21px;
}

.stat-card span {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #7b8494;
  letter-spacing: 0.1px;
}

.stat-card strong {
  display: block;
  margin-top: 5px;
  font-size: 22px;
  line-height: 1.2;
  font-weight: 750;
  color: #172033;
}

        /* ================= RESULT CARDS ================= */

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


        /* ================= OBJECTS ================= */

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
  background: #ffffff;
  border: 1px solid #e7ebf2;
  border-radius: 13px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.object-item:hover {
  border-color: #d9e1ed;
  box-shadow:
    0 6px 18px rgba(23, 32, 51, 0.06);
  transform: translateY(-2px);
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


        /* ================= CONFIDENCE ================= */

        .detection-list {
  margin-top: 24px;
}

.detection-item {
  margin-bottom: 18px;
  padding: 14px 16px;
  background: #fafbfc;
  border: 1px solid #e8ecf2;
  border-radius: 14px;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
}

.detection-item:hover {
  background: #ffffff;
  border-color: #dce3ee;
}

.detection-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 9px;
}

.confidence-bar {
  height: 7px;
  background: #e9edf4;
  border-radius: 999px;
  overflow: hidden;
}

.confidence-bar div {
  height: 100%;
  background: #2563eb;
  border-radius: 999px;
  transition: width 0.5s ease;
}


        /* ================= RESULT IMAGE ================= */

        .result-image-card {
  text-align: center;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e5e9f1;
  border-radius: 24px;
  padding: 24px;
  box-shadow:
    0 18px 45px rgba(23, 32, 51, 0.07);
  overflow: hidden;
}

        .result-image-card .section-title {
  text-align: left;
  margin-bottom: 6px;
}

.result-image-card .section-title h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 750;
  line-height: 1.3;
  letter-spacing: -0.4px;
  color: #172033;
}

        .result-image {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  max-height: 400px;
  margin: 20px auto 0;
  object-fit: contain;
  border-radius: 15px;
  background: #f5f7fa;
}
        @media (max-width: 700px) {
  .result-image-card {
    width: 100%;
    max-width: 100%;
    overflow: hidden;
    box-sizing: border-box;
  }

  .result-image {
    width: 100%;
    max-width: 100%;
    height: auto;
    max-height: 350px;
    object-fit: contain;
  }
}


        /* ================= FOOTER ================= */

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


        /* ================= RESPONSIVE ================= */

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

          .dashboard-stats {
            grid-template-columns: 1fr;
            width: 100%;
            max-width: 100%;
          }

          .preview-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .history-header {
            flex-direction: column;
          }

          .clear-history-button {
            width: 100%;
          }

          .history-summary {
            gap: 5px;
          }

          .section-title {
            align-items: flex-start;
          }

          .result-header .new-analysis {
            width: 100%;
          }
            .results {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.result-image-card {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.result-image {
  width: 100%;
  max-width: 100%;
  height: auto;
  max-height: 350px;
  object-fit: contain;
}

        }
          /* ================= DARK MODE ================= */

.dark-mode {
  background: #0f172a;
  color: #e5e7eb;
}

.dark-mode .navbar {
  background: #111827;
  border-color: #1f2937;
}

.dark-mode .brand h1 {
  color: #f8fafc;
}

.dark-mode .brand span {
  color: #94a3b8;
}

.dark-mode .status {
  color: #4ade80;
}

.dark-mode .hero h2 {
  color: #f8fafc;
}

.dark-mode .hero p {
  color: #94a3b8;
}

.dark-mode .hero-badge {
  background: #172554;
  color: #60a5fa;
}

.dark-mode .upload-card {
  background: #111827;
  border-color: #334155;
}

.dark-mode .upload-card:hover,
.dark-mode .drag-active {
  background: #172033;
  border-color: #3b82f6;
}

.dark-mode .upload-content h3 {
  color: #f8fafc;
}

.dark-mode .upload-content p,
.dark-mode .upload-content small {
  color: #94a3b8;
}

.dark-mode .preview-image {
  background: #1e293b;
}

.dark-mode .loading-card,
.dark-mode .dashboard-stat-card,
.dark-mode .statistics-card,
.dark-mode .history-card,
.dark-mode .objects-card,
.dark-mode .details-card,
.dark-mode .result-image-card,
.dark-mode .stat-card {
  background: #111827;
  border-color: #1f2937;
  color: #e5e7eb;
}

.dark-mode .dashboard-header h2,
.dark-mode .history-header h2,
.dark-mode .section-title h3 {
  color: #f8fafc;
}

.dark-mode .dashboard-header p,
.dark-mode .history-header p,
.dark-mode .section-title p {
  color: #94a3b8;
}

.dark-mode .dashboard-badge,
.dark-mode .history-badge {
  background: #172554;
  color: #60a5fa;
}

.dark-mode .dashboard-stat-icon,
.dark-mode .history-file-icon,
.dark-mode .stat-icon {
  background: #172554;
}

.dark-mode .dashboard-stat-card span,
.dark-mode .statistics-info span,
.dark-mode .history-file-info span,
.dark-mode .dashboard-header p {
  color: #94a3b8;
}

.dark-mode .statistics-bar,
.dark-mode .confidence-bar,
.dark-mode .loading-bar {
  background: #334155;
}

.dark-mode .history-summary {
  border-color: #1f2937;
}

.dark-mode .history-object-tag {
  background: #172554;
  color: #93c5fd;
}

.dark-mode .object-item {
  background: #1e293b;
}

.dark-mode .object-item span {
  color: #94a3b8;
}

.dark-mode .result-image {
  background: #1e293b;
}

.dark-mode footer p {
  color: #cbd5e1;
}

.dark-mode footer {
  color: #64748b;
}


/* ================= THEME BUTTON ================= */

.theme-button {
  border: 1px solid #dbe2ea;
  background: white;
  color: #172033;
  padding: 10px 15px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s;
}

.theme-button:hover {
  transform: translateY(-2px);
}

.dark-mode .theme-button {
  background: #1e293b;
  border-color: #334155;
  color: #f8fafc;
}
  @media (max-width: 700px) {
  .result-image-card {
    padding: 15px;
  }

  .result-image {
    width: 100%;
    height: auto;
    max-height: 350px;
    max-width: 100%;
    box-sizing: border-box;
    object-fit: contain;
  }
}
    .dashboard-stats {
    grid-template-columns: 1fr;
    width: 100%;
  }
    .dashboard-stat-card > div:last-child {
  min-width: 0;
  overflow: hidden;
}

.dashboard-stat-card strong {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

  .dashboard-stat-card {
    width: 100%;
    min-width: 0;
  }

  .dashboard-stat-card strong {
    overflow-wrap: anywhere;
  }

  .statistics-card {
    width: 100%;
    min-width: 0;
    overflow: hidden;
  }

      `}</style>

    </div>
  );
}

export default App;