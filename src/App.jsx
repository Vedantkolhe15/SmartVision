import { useState } from "react";

const BACKEND_URL = "http://127.0.0.1:8000";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ==============================
  // SELECT IMAGE
  // ==============================

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError("");
  };


  // ==============================
  // ANALYZE IMAGE
  // ==============================

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

      console.log("Sending image to backend...");

      const response = await fetch(
        `${BACKEND_URL}/upload-image`,
        {
          method: "POST",
          body: formData,
        }
      );

      console.log("Backend response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();

        console.error(
          "Backend error:",
          response.status,
          errorText
        );

        throw new Error(
          `Backend returned status ${response.status}`
        );
      }

      const data = await response.json();

      console.log(
        "AI Analysis Result:",
        data
      );

      setResult(data);

    } catch (err) {

      console.error(
        "Complete analysis error:",
        err
      );

      setError(
        `Unable to analyze image. ${err.message}`
      );

    } finally {

      setLoading(false);

    }
  };


  // ==============================
  // UI
  // ==============================

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "40px 20px",
        background: "#f5f7fb",
        fontFamily: "Arial, sans-serif",
      }}
    >

      <div
        style={{
          maxWidth: "900px",
          margin: "auto",
          background: "white",
          padding: "30px",
          borderRadius: "15px",
          boxShadow: "0 5px 20px rgba(0,0,0,0.1)",
        }}
      >

        {/* ============================== */}
        {/* HEADER */}
        {/* ============================== */}

        <h1
          style={{
            textAlign: "center",
            color: "#222",
          }}
        >
          SmartVision AI
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#666",
          }}
        >
          AI Powered Image Recognition System
        </p>


        {/* ============================== */}
        {/* FILE UPLOAD */}
        {/* ============================== */}

        <div
          style={{
            marginTop: "30px",
            textAlign: "center",
          }}
        >

          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />

        </div>


        {/* ============================== */}
        {/* IMAGE PREVIEW */}
        {/* ============================== */}

        {preview && (

          <div
            style={{
              marginTop: "30px",
              textAlign: "center",
            }}
          >

            <h3>
              Selected Image
            </h3>

            <img
              src={preview}
              alt="Selected Preview"
              style={{
                maxWidth: "600px",
                width: "100%",
                borderRadius: "12px",
                boxShadow:
                  "0 4px 15px rgba(0,0,0,0.15)",
              }}
            />

          </div>

        )}


        {/* ============================== */}
        {/* ANALYZE BUTTON */}
        {/* ============================== */}

        <div
          style={{
            marginTop: "25px",
            textAlign: "center",
          }}
        >

          <button
            onClick={analyzeImage}
            disabled={!selectedFile || loading}
            style={{
              padding: "14px 30px",
              fontSize: "17px",
              border: "none",
              borderRadius: "8px",
              background:
                loading
                  ? "#999"
                  : "#2563eb",
              color: "white",
              cursor:
                !selectedFile || loading
                  ? "not-allowed"
                  : "pointer",
            }}
          >

            {loading
              ? "AI Analyzing..."
              : "Analyze Image"}

          </button>

        </div>


        {/* ============================== */}
        {/* ERROR MESSAGE */}
        {/* ============================== */}

        {error && (

          <div
            style={{
              marginTop: "25px",
              padding: "15px",
              background: "#ffe5e5",
              color: "#d00000",
              borderRadius: "8px",
            }}
          >

            <strong>
              Error:
            </strong>

            <br />

            {error}

          </div>

        )}


        {/* ============================== */}
        {/* RESULT */}
        {/* ============================== */}

        {result && (

          <div
            style={{
              marginTop: "35px",
            }}
          >

            <h2>
              AI Analysis Result
            </h2>


            {/* MESSAGE */}

            <p>
              {result.message}
            </p>


            {/* OBJECT COUNTS */}

            {result.object_counts && (

              <div
                style={{
                  marginTop: "20px",
                  padding: "20px",
                  background: "#f1f5f9",
                  borderRadius: "10px",
                }}
              >

                <h3>
                  Detected Objects
                </h3>

                {Object.entries(
                  result.object_counts
                ).map(
                  ([objectName, count]) => (

                    <p
                      key={objectName}
                    >
                      <strong>
                        {objectName}
                      </strong>
                      : {count}
                    </p>

                  )
                )}

              </div>

            )}


            {/* DETECTION DETAILS */}

            {result.detections &&
              result.detections.length > 0 && (

                <div
                  style={{
                    marginTop: "20px",
                  }}
                >

                  <h3>
                    Detection Details
                  </h3>

                  {result.detections.map(
                    (item, index) => (

                      <div
                        key={index}
                        style={{
                          padding: "12px",
                          marginTop: "8px",
                          background: "#f8fafc",
                          borderRadius: "8px",
                        }}
                      >

                        <strong>
                          {item.object}
                        </strong>

                        {" — "}

                        {item.confidence}%

                        confidence

                      </div>

                    )
                  )}

                </div>

              )}


            {/* ============================== */}
            {/* DETECTED IMAGE */}
            {/* ============================== */}

            {result.result_image && (

              <div
                style={{
                  marginTop: "30px",
                  textAlign: "center",
                }}
              >

                <h3>
                  AI Detection Result
                </h3>

                <img
                  src={
                    result.result_image.startsWith(
                      "http"
                    )
                      ? result.result_image
                      : `${BACKEND_URL}${result.result_image}`
                  }
                  alt="AI Detection Result"
                  style={{
                    maxWidth: "700px",
                    width: "100%",
                    borderRadius: "12px",
                    boxShadow:
                      "0 5px 20px rgba(0,0,0,0.15)",
                  }}
                />

              </div>

            )}

          </div>

        )}

      </div>

    </div>
  );
}

export default App;