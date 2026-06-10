import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import "./BatchAnalysis.css";

const STATUS_ICON = {
  APPROVED: { icon: "✓", cls: "approved" },
  NEEDS_REVIEW: { icon: "⚠", cls: "warning" },
  REJECTED: { icon: "✕", cls: "rejected" },
};

export default function BatchAnalysis() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const onDrop = useCallback((accepted) => {
    setFiles(accepted);
    setResults([]);
    setError(null);
    setExpanded(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 50,
    maxSize: 20 * 1024 * 1024,
  });

  const handleAnalyze = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("labels", f));

      const res = await axios.post("/api/analyze-batch", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResults(res.data.results);
    } catch (err) {
      setError(err.response?.data?.error || "Batch analysis failed. Check the console.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFiles([]);
    setResults([]);
    setError(null);
    setExpanded(null);
  };

  const summary = results.reduce(
    (acc, r) => {
      if (!r.success) { acc.errors++; return acc; }
      const s = r.analysis?.overall_status;
      if (s === "APPROVED") acc.approved++;
      else if (s === "REJECTED") acc.rejected++;
      else acc.review++;
      return acc;
    },
    { approved: 0, rejected: 0, review: 0, errors: 0 }
  );

  return (
    <div className="batch-layout">
      <div className="card">
        <div className="batch-header">
          <div>
            <h2 className="card-title">Batch Label Upload</h2>
            <p className="card-subtitle">Drop up to 50 label images at once — we'll process them all and give you a summary</p>
          </div>
          {files.length > 0 && (
            <button className="btn-ghost-dark" onClick={handleClear}>Clear all</button>
          )}
        </div>

        <div
          {...getRootProps()}
          className={`dropzone-batch ${isDragActive ? "drag-active" : ""} ${files.length > 0 ? "has-files" : ""}`}
        >
          <input {...getInputProps()} />
          {files.length === 0 ? (
            <>
              <div className="dropzone-icon">📦</div>
              <p className="dropzone-text">
                {isDragActive ? "Drop them all here" : "Drag & drop multiple label images"}
              </p>
              <p className="dropzone-sub">Up to 50 images — JPG, PNG, WebP</p>
            </>
          ) : (
            <div className="file-chips">
              {files.map((f, i) => (
                <div className="file-chip" key={i}>
                  <span className="chip-icon">🏷️</span>
                  <span className="chip-name">{f.name}</span>
                </div>
              ))}
              <div className="file-chip chip-add">
                <span>+ Add more</span>
              </div>
            </div>
          )}
        </div>

        {files.length > 0 && (
          <div className="batch-actions">
            <span className="file-count">{files.length} file{files.length !== 1 ? "s" : ""} selected</span>
            <button
              className="btn-primary"
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? (
                <><span className="spinner" /> Processing {files.length} labels...</>
              ) : (
                `Run Batch Check (${files.length})`
              )}
            </button>
          </div>
        )}

        {error && (
          <div className="error-banner" style={{ marginTop: 12 }}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <>
          {/* Summary */}
          <div className="summary-row">
            <div className="summary-card approved-card">
              <div className="summary-num">{summary.approved}</div>
              <div className="summary-lbl">Approved</div>
            </div>
            <div className="summary-card review-card">
              <div className="summary-num">{summary.review}</div>
              <div className="summary-lbl">Needs Review</div>
            </div>
            <div className="summary-card rejected-card">
              <div className="summary-num">{summary.rejected}</div>
              <div className="summary-lbl">Rejected</div>
            </div>
            {summary.errors > 0 && (
              <div className="summary-card error-card">
                <div className="summary-num">{summary.errors}</div>
                <div className="summary-lbl">Errors</div>
              </div>
            )}
          </div>

          {/* Results Table */}
          <div className="card results-card">
            <h3 className="section-title">Results</h3>
            <div className="results-table">
              {results.map((r, i) => {
                const isExpanded = expanded === i;
                const statusKey = r.analysis?.overall_status || "NEEDS_REVIEW";
                const statusConf = STATUS_ICON[statusKey] || STATUS_ICON.NEEDS_REVIEW;
                const violations = r.analysis?.violations || [];
                const errors = violations.filter((v) => v.severity === "ERROR");

                return (
                  <div key={i} className={`result-row ${isExpanded ? "expanded" : ""}`}>
                    <div
                      className="result-row-header"
                      onClick={() => setExpanded(isExpanded ? null : i)}
                    >
                      <div className="result-row-left">
                        <span className={`status-dot dot-${statusConf.cls}`}>
                          {statusConf.icon}
                        </span>
                        <span className="result-filename">{r.filename}</span>
                        {errors.length > 0 && (
                          <span className="error-count">{errors.length} error{errors.length !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                      <div className="result-row-right">
                        {r.analysis?.confidence != null && (
                          <span className="confidence-sm">{r.analysis.confidence}%</span>
                        )}
                        <span className="expand-icon">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {isExpanded && r.success && (
                      <div className="result-row-detail">
                        {violations.length > 0 ? (
                          <div className="detail-violations">
                            {violations.map((v, vi) => (
                              <div key={vi} className={`detail-violation ${v.severity.toLowerCase()}`}>
                                <span className="detail-badge">{v.severity}</span>
                                <span className="detail-field">{v.field}:</span>
                                <span className="detail-desc">{v.description}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="detail-clean">No issues found on this label.</p>
                        )}
                        {r.analysis.notes && (
                          <p className="detail-notes">{r.analysis.notes}</p>
                        )}
                      </div>
                    )}

                    {isExpanded && !r.success && (
                      <div className="result-row-detail">
                        <p className="detail-error">Failed to analyze: {r.error}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
