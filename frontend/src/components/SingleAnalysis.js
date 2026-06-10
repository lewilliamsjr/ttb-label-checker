import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import ResultPanel from "./ResultPanel";
import "./SingleAnalysis.css";

export default function SingleAnalysis() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showAppData, setShowAppData] = useState(false);
  const [appData, setAppData] = useState({
    brand_name: "",
    class_type: "",
    alcohol_content: "",
    net_contents: "",
  });

  const onDrop = useCallback((accepted) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
  });

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("label", file);

      const hasAppData = Object.values(appData).some((v) => v.trim() !== "");
      if (showAppData && hasAppData) {
        formData.append("application_data", JSON.stringify(appData));
      }

      const res = await axios.post("/api/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(res.data.analysis);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Check the console.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="single-layout">
      <div className="single-left">
        <div className="card">
          <h2 className="card-title">Upload Label Image</h2>

          {!preview ? (
            <div
              {...getRootProps()}
              className={`dropzone ${isDragActive ? "drag-active" : ""}`}
            >
              <input {...getInputProps()} />
              <div className="dropzone-icon">🏷️</div>
              <p className="dropzone-text">
                {isDragActive ? "Drop it here" : "Drag & drop a label image here"}
              </p>
              <p className="dropzone-sub">or click to browse — JPG, PNG, WebP up to 20MB</p>
            </div>
          ) : (
            <div className="preview-wrapper">
              <img src={preview} alt="Label preview" className="label-preview" />
              <button className="btn-ghost btn-sm clear-btn" onClick={handleClear}>
                ✕ Remove
              </button>
            </div>
          )}
        </div>

        <div className="card">
          <div className="app-data-header">
            <div>
              <h2 className="card-title">Application Data</h2>
              <p className="card-subtitle">Optional — if you have the application on file, paste the fields here and we'll check them against the label</p>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={showAppData}
                onChange={(e) => setShowAppData(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {showAppData && (
            <div className="app-data-fields">
              {[
                { key: "brand_name", label: "Brand Name" },
                { key: "class_type", label: "Class / Type" },
                { key: "alcohol_content", label: "Alcohol Content" },
                { key: "net_contents", label: "Net Contents" },
              ].map(({ key, label }) => (
                <div className="field-row" key={key}>
                  <label className="field-label">{label}</label>
                  <input
                    className="field-input"
                    type="text"
                    value={appData[key]}
                    onChange={(e) =>
                      setAppData((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder={`e.g. ${key === "brand_name" ? "OLD TOM DISTILLERY" : key === "class_type" ? "Kentucky Straight Bourbon Whiskey" : key === "alcohol_content" ? "45% Alc./Vol." : "750 mL"}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          className="btn-primary analyze-btn"
          onClick={handleAnalyze}
          disabled={!file || loading}
        >
          {loading ? (
            <>
              <span className="spinner" /> Analyzing...
            </>
          ) : (
            "Run Compliance Check"
          )}
        </button>

        {error && (
          <div className="error-banner">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      <div className="single-right">
        {result ? (
          <ResultPanel result={result} filename={file?.name} />
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No results yet</h3>
            <p>Upload a label and hit "Run Compliance Check" to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
