import { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  // ==============================
  // STATES
  // ==============================

  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);

  const [results, setResults] = useState([]);
  const [objectCounts, setObjectCounts] = useState({});

  const [totalObjects, setTotalObjects] = useState(0);
  const [averageConfidence, setAverageConfidence] = useState(0);

  const [history, setHistory] = useState([]);
  const [darkMode, setDarkMode] = useState(() => {
  const savedTheme =
    localStorage.getItem("smartvision_dark_mode");

  return savedTheme === "true";
});
// ==============================
// SAVE DARK MODE PREFERENCE
// ==============================

useEffect(() => {
  localStorage.setItem(
    "smartvision_dark_mode",
    darkMode
  );
}, [darkMode]);
  const [totalImagesAnalyzed, setTotalImagesAnalyzed] = useState(0);
const [mostDetectedObject, setMostDetectedObject] = useState("None");
const [objectStatistics, setObjectStatistics] = useState({});

  const [resultImage, setResultImage] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  // ==============================
  // LOAD HISTORY FROM LOCAL STORAGE
  // ==============================

  useEffect(() => {
    const savedHistory = localStorage.getItem(
      "smartvision_history"
    );

    if (savedHistory) {
      try {
        setHistory(
          JSON.parse(savedHistory)
        );
      } catch (error) {
        console.error(
          "Unable to load history:",
          error
        );

        setHistory([]);
      }
    }
  }, []);


  // ==============================
  // SAVE HISTORY TO LOCAL STORAGE
  // ==============================

  useEffect(() => {
    localStorage.setItem(
      "smartvision_history",
      JSON.stringify(history)
    );
  }, [history]);
// ==============================
// CALCULATE DASHBOARD STATISTICS
// ==============================

useEffect(() => {
  // Total images analyzed
  setTotalImagesAnalyzed(
    history.length
  );


  // Agar history empty hai
 if (history.length === 0) {
  setMostDetectedObject("None");
  setObjectStatistics({});
  return;
}

  // Sabhi detected objects ka count
  const allObjects = {};


  history.forEach((item) => {

    Object.entries(
      item.objectCounts || {}
    ).forEach(
      ([objectName, count]) => {

        if (allObjects[objectName]) {

          allObjects[objectName] +=
            Number(count);

        } else {

          allObjects[objectName] =
            Number(count);

        }

      }
    );

  });


  // Most detected object find karo
  let mostDetected = "None";
  let highestCount = 0;


  Object.entries(
    allObjects
  ).forEach(
    ([objectName, count]) => {

      if (
        count > highestCount
      ) {

        highestCount = count;

        mostDetected =
          objectName;

      }

    }
  );


  setMostDetectedObject(
    mostDetected
  );
  setObjectStatistics(
  allObjects
);

}, [history]);

  // ==============================
  // HANDLE IMAGE SELECTION
  // ==============================

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (file) {
      const imageUrl =
        URL.createObjectURL(file);

      setSelectedFile(file);

      setPreview(imageUrl);

      setOriginalImage(imageUrl);

      // Clear old results
      setResults([]);

      setObjectCounts({});

      setTotalObjects(0);

      setAverageConfidence(0);

      setResultImage(null);

      setError("");
    }
  };


  // ==============================
  // ANALYZE IMAGE
  // ==============================

  const analyzeImage = async () => {
    if (!selectedFile) {
      setError(
        "Please select an image first."
      );

      return;
    }

    // Start loading
    setLoading(true);

    setError("");

    // Clear previous results
    setResults([]);

    setObjectCounts({});

    setTotalObjects(0);

    setAverageConfidence(0);

    setResultImage(null);


    // Create FormData
    const formData = new FormData();

    formData.append(
      "file",
      selectedFile
    );


    try {
      // Send image to backend
      const response = await axios.post(
        "http://127.0.0.1:8000/upload-image",
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );


      // ==============================
      // GET DETECTION RESULTS
      // ==============================

      const detectedObjects =
        response.data.detections || [];

      setResults(
        detectedObjects
      );


      // ==============================
      // GET OBJECT COUNTS
      // ==============================

      const detectedCounts =
        response.data.object_counts || {};

      setObjectCounts(
        detectedCounts
      );


      // ==============================
      // TOTAL OBJECTS
      // ==============================

      const total =
        detectedObjects.length;

      setTotalObjects(
        total
      );


      // ==============================
      // AVERAGE CONFIDENCE
      // ==============================

      const average =
        total > 0
          ? detectedObjects.reduce(
              (sum, item) =>
                sum +
                Number(
                  item.confidence
                ),
              0
            ) / total
          : 0;

      setAverageConfidence(
        average
      );


      // ==============================
      // SAVE TO DETECTION HISTORY
      // ==============================

      const historyItem = {
        id: Date.now(),

        filename:
          selectedFile.name,

        totalObjects:
          total,

        averageConfidence:
          average,

        objectCounts:
          detectedCounts,

        date:
          new Date().toLocaleString(),
      };


      setHistory(
        (previousHistory) => [
          historyItem,
          ...previousHistory,
        ]
      );


      // ==============================
      // RESULT IMAGE
      // ==============================

      if (
        response.data.result_image
      ) {
        const imageName =
          response.data.result_image
            .split("\\")
            .pop();

        setResultImage(
          `http://127.0.0.1:8000/results/${imageName}`
        );
      }


    } catch (err) {
      console.error(
        "Analysis Error:",
        err
      );

      setError(
        "Unable to analyze image. Please make sure the backend server is running."
      );

    } finally {
      setLoading(false);
    }
  };


  // ==============================
  // CLEAR HISTORY
  // ==============================

  const clearHistory = () => {
    setHistory([]);

    localStorage.removeItem(
      "smartvision_history"
    );
  };


  // ==============================
  // UI
  // ==============================

  return (
   <div className={`app ${darkMode ? "dark-mode" : ""}`}>


      {/* ==============================
          HEADER
      ============================== */}

      <header className="header">

        <div className="logo">
          🧠 SmartVision AI
        </div>

        <div className="header-badge">
          AI Powered
        </div>
        <button
  className="theme-toggle-button"
  onClick={() => setDarkMode(!darkMode)}
>
  {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
</button>

      </header>


      {/* ==============================
          MAIN
      ============================== */}

      <main className="main">


        {/* ==============================
            HERO
        ============================== */}

        <section className="hero">

          <h1>
            Intelligent Image

            <span>
              Recognition System
            </span>
          </h1>

          <p>
            Upload an image and let
            SmartVision AI detect objects
            using advanced computer vision.
          </p>

        </section>


        {/* ==============================
            UPLOAD SECTION
        ============================== */}

        <section className="upload-section">


          {/* UPLOAD CARD */}

          <div className="upload-card">

            <div className="upload-icon">
              📸
            </div>

            <h2>
              Upload Your Image
            </h2>

            <p>
              Select a JPG, JPEG or PNG image
            </p>

            <label className="upload-button">

              Choose Image

              <input
                type="file"
                accept="image/*"
                onChange={
                  handleFileChange
                }
                hidden
              />

            </label>

          </div>


          {/* ==============================
              PREVIEW CARD
          ============================== */}

          {preview && (

            <div className="preview-card">

              <h2>
                Image Preview
              </h2>

              <img
                src={preview}
                alt="Preview"
                className="preview-image"
              />

              <p>
                Selected File:
                {" "}
                {selectedFile?.name}
              </p>

              <button
                className="analyze-button"
                onClick={
                  analyzeImage
                }
                disabled={loading}
              >
                {loading && (
  <div className="ai-processing-status">
    🤖 AI is analyzing your image...
  </div>
)}

                {loading
  ? "🤖 AI Analyzing..."
  : "🔍 Analyze Image"}

              </button>

            </div>

          )}


          {/* ==============================
              ERROR MESSAGE
          ============================== */}

          {error && (

            <div className="error-message">
              ❌ {error}
            </div>

          )}

        </section>

{/* ==============================
    SMARTVISION ANALYTICS DASHBOARD
============================== */}

<section className="analytics-section">

  <div className="analytics-header">

    <h2>
      📊 SmartVision Analytics
    </h2>

    <p>
      Overview of your AI image detection activity
    </p>

  </div>


  <div className="analytics-grid">


    {/* TOTAL IMAGES */}

    <div className="analytics-card">

      <div className="analytics-icon">
        🖼️
      </div>

      <div className="analytics-info">

        <span>
          Total Images Analyzed
        </span>

        <strong>
          {totalImagesAnalyzed}
        </strong>

      </div>

    </div>


    {/* TOTAL OBJECTS */}

    <div className="analytics-card">

      <div className="analytics-icon">
        🎯
      </div>

      <div className="analytics-info">

        <span>
          Total Objects Detected
        </span>

        <strong>
          {history.reduce(
            (total, item) =>
              total +
              Number(
                item.totalObjects || 0
              ),
            0
          )}
        </strong>

      </div>

    </div>


    {/* MOST DETECTED OBJECT */}

    <div className="analytics-card">

      <div className="analytics-icon">
        🏆
      </div>

      <div className="analytics-info">

        <span>
          Most Detected Object
        </span>

        <strong className="object-highlight">
          {mostDetectedObject}
        </strong>

      </div>

    </div>


    {/* AVERAGE CONFIDENCE */}

    <div className="analytics-card">

      <div className="analytics-icon">
        📈
      </div>

      <div className="analytics-info">

        <span>
          Average Confidence
        </span>

        <strong>

          {
            history.length > 0

              ? (
                  history.reduce(
                    (total, item) =>
                      total +
                      Number(
                        item.averageConfidence ||
                        0
                      ),
                    0
                  ) /
                  history.length
                ).toFixed(2)

              : "0.00"

          }%

        </strong>

      </div>

    </div>

  </div>

</section>
{/* ==============================
    RECENT DETECTION ACTIVITY
============================== */}

{history.length > 0 && (

  <section className="recent-activity-section">

    <div className="recent-activity-header">

      <h2>
        🕒 Recent Detection Activity
      </h2>

      <p>
        Your latest AI image analysis results
      </p>

    </div>


    <div className="recent-activity-list">

      {history
        .slice(0, 5)
        .map((item) => (

          <div
            className="recent-activity-card"
            key={item.id}
          >

            <div className="recent-activity-file">

              <span className="recent-file-icon">
                🖼️
              </span>

              <div>

                <strong>
                  {item.filename}
                </strong>

                <span>
                  {item.date}
                </span>

              </div>

            </div>


            <div className="recent-activity-stats">

              <div>

                <span>
                  🎯 Objects
                </span>

                <strong>
                  {item.totalObjects}
                </strong>

              </div>


              <div>

                <span>
                  📊 Confidence
                </span>

                <strong>
                  {Number(
                    item.averageConfidence
                  ).toFixed(2)}%
                </strong>

              </div>

            </div>

          </div>

        ))}

    </div>

  </section>

)}
{/* ==============================
    OBJECT DETECTION STATISTICS
============================== */}

{Object.keys(objectStatistics).length > 0 && (

  <section className="object-statistics-section">

    <div className="object-statistics-header">

      <h2>
        📈 Object Detection Statistics
      </h2>

      <p>
        Total number of objects detected across all analyzed images
      </p>

    </div>


    <div className="object-statistics-list">

      {Object.entries(
        objectStatistics
      ).map(
        (
          [
            objectName,
            count,
          ]
        ) => (

          <div
            className="object-statistics-row"
            key={objectName}
          >

            <div className="object-statistics-label">

              <span>
                🎯 {objectName}
              </span>

              <strong>
                {count}
              </strong>

            </div>


            <div className="object-statistics-bar-container">

              <div
                className="object-statistics-bar"
                style={{
                  width: `${Math.min(
                    (count /
                      Math.max(
                        ...Object.values(
                          objectStatistics
                        )
                      )) *
                      100,
                    100
                  )}%`,
                }}
              />

            </div>

          </div>

        )
      )}

    </div>

  </section>

)}
        {/* ==============================
            AI RESULTS
        ============================== */}

        {results.length > 0 && (

          <section className="results-section">


            <h2>
              🎯 AI Detection Results
            </h2>


            {/* ==============================
                STATISTICS
            ============================== */}

            <div className="statistics-section">

              <h3>
                📊 AI Analysis Overview
              </h3>

              <div className="statistics-grid">


                {/* TOTAL OBJECTS */}

                <div className="stat-card">

                  <span className="stat-icon">
                    🎯
                  </span>

                  <span className="stat-label">
                    Total Objects
                  </span>

                  <strong className="stat-value">
                    {totalObjects}
                  </strong>

                </div>


                {/* UNIQUE OBJECTS */}

                <div className="stat-card">

                  <span className="stat-icon">
                    📦
                  </span>

                  <span className="stat-label">
                    Unique Objects
                  </span>

                  <strong className="stat-value">
                    {
                      Object.keys(
                        objectCounts
                      ).length
                    }
                  </strong>

                </div>


                {/* AVERAGE CONFIDENCE */}

                <div className="stat-card">

                  <span className="stat-icon">
                    📊
                  </span>

                  <span className="stat-label">
                    Average Confidence
                  </span>

                  <strong className="stat-value">
                    {
                      averageConfidence.toFixed(
                        2
                      )
                    }%
                  </strong>

                </div>


                {/* AI MODEL */}

                <div className="stat-card">

                  <span className="stat-icon">
                    🤖
                  </span>

                  <span className="stat-label">
                    AI Model
                  </span>

                  <strong className="stat-value">
                    YOLO
                  </strong>

                </div>

              </div>

            </div>


            {/* ==============================
                OBJECT COUNT SUMMARY
            ============================== */}

            <div className="object-count-section">

              <h3>
                📦 Detected Objects Summary
              </h3>

              <div className="object-count-list">

                {Object.entries(
                  objectCounts
                ).map(
                  (
                    [
                      objectName,
                      count,
                    ]
                  ) => (

                    <div
                      className="object-count-item"
                      key={objectName}
                    >

                      <span className="object-name">
                        🎯 {objectName}
                      </span>

                      <strong className="object-count">
                        × {count}
                      </strong>

                    </div>

                  )
                )}

              </div>

            </div>


            {/* ==============================
                INDIVIDUAL RESULTS
            ============================== */}

            <div className="results-list">

              {results.map(
                (
                  item,
                  index
                ) => (

                  <div
                    className="result-item"
                    key={index}
                  >

                    <span>
                      🎯 {item.object}
                    </span>

                    <strong>
                      {item.confidence}%
                    </strong>

                  </div>

                )
              )}

            </div>


            {/* ==============================
                ORIGINAL VS AI DETECTION
            ============================== */}

            {resultImage && (

              <div className="image-comparison-section">

                <h2>
                  🖼️ Original vs AI Detection
                </h2>

                <div className="image-comparison-grid">


                  {/* ORIGINAL IMAGE */}

                  <div className="comparison-card">

                    <h3>
                      📸 Original Image
                    </h3>

                    <img
                      src={originalImage}
                      alt="Original"
                      className="comparison-image"
                    />

                  </div>


                  {/* AI DETECTION IMAGE */}

                  <div className="comparison-card">

                    <h3>
                      🤖 AI Detection
                    </h3>

                    <img
                      src={resultImage}
                      alt="AI Detection Result"
                      className="comparison-image"
                    />

                  </div>

                </div>

              </div>

            )}

          </section>

        )}


        {/* ==============================
            DETECTION HISTORY
        ============================== */}

        {history.length > 0 && (

          <section className="history-section">

            <div className="history-title-row">

              <h2>
                📜 Detection History
              </h2>

              <button
                className="clear-history-button"
                onClick={
                  clearHistory
                }
              >
                🗑️ Clear History
              </button>

            </div>


            <div className="history-list">

              {history.map(
                (item) => (

                  <div
                    className="history-card"
                    key={item.id}
                  >


                    {/* HISTORY HEADER */}

                    <div className="history-header">

                      <h3>
                        🖼️ {item.filename}
                      </h3>

                      <span className="history-date">
                        {item.date}
                      </span>

                    </div>


                    {/* HISTORY DETAILS */}

                    <div className="history-details">


                      <div className="history-stat">

                        <span>
                          🎯 Total Objects
                        </span>

                        <strong>
                          {item.totalObjects}
                        </strong>

                      </div>


                      <div className="history-stat">

                        <span>
                          📊 Average Confidence
                        </span>

                        <strong>
                          {
                            Number(
                              item.averageConfidence
                            ).toFixed(2)
                          }%
                        </strong>

                      </div>

                    </div>


                    {/* HISTORY OBJECTS */}

                    <div className="history-objects">

                      <span>
                        📦 Detected:
                      </span>

                      {Object.entries(
                        item.objectCounts || {}
                      ).map(
                        (
                          [
                            objectName,
                            count,
                          ]
                        ) => (

                          <span
                            className="history-object-badge"
                            key={objectName}
                          >
                            {objectName} × {count}
                          </span>

                        )
                      )}

                    </div>

                  </div>

                )
              )}

            </div>

          </section>

        )}

      </main>


      {/* ==============================
          FOOTER
      ============================== */}

      <footer className="footer">

        <p>
          SmartVision AI • Intelligent Image Recognition System
        </p>

      </footer>

    </div>
  );
}


export default App;