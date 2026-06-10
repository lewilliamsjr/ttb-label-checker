import React from "react";
import "./ResultPanel.css";

const STATUS_CONFIG = {
  APPROVED: { label: "Approved", color: "approved", icon: "✓" },
  NEEDS_REVIEW: { label: "Needs Review", color: "warning", icon: "⚠" },
  REJECTED: { label: "Rejected", color: "rejected", icon: "✕" },
};

const FIELD_LABELS = {
  brand_name: "Brand Name",
  class_type: "Class / Type",
  alcohol_content: "Alcohol Content",
  net_contents: "Net Contents",
  bottler_info: "Bottler / Producer",
  country_of_origin: "Country of Origin",
  government_warning: "Government Warning",
};

export default function ResultPanel({ result, filename }) {
  if (!result) return null;

  const status = STATUS_CONFIG[result.overall_status] || STATUS_CONFIG.NEEDS_REVIEW;
  const fields = result.extracted_fields || {};
  const violations = result.violations || [];
  const errors = violations.filter((v) => v.severity === "ERROR");
  const warnings = violations.filter((v) => v.severity === "WARNING");

  return (
    <div className="result-panel">
      {/* Status Banner */}
      <div className={`status-banner status-${status.color}`}>
        <div className="status-badge">
          <span className="status-icon">{status.icon}</span>
          <span className="status-label">{status.label}</span>
        </div>
        <div className="status-meta">
          <span className="confidence">Confidence: {result.confidence}%</span>
          {filename && <span className="filename">{filename}</span>}
        </div>
      </div>

      {/* Violations */}
      {violations.length > 0 && (
        <div className="section">
          <h3 className="section-title">Issues Found</h3>
          <div className="violations-list">
            {errors.map((v, i) => (
              <div className="violation error" key={`e-${i}`}>
                <span className="violation-badge error-badge">ERROR</span>
                <div>
                  <div className="violation-field">{v.field}</div>
                  <div className="violation-desc">{v.description}</div>
                </div>
              </div>
            ))}
            {warnings.map((v, i) => (
              <div className="violation warning" key={`w-${i}`}>
                <span className="violation-badge warning-badge">WARNING</span>
                <div>
                  <div className="violation-field">{v.field}</div>
                  <div className="violation-desc">{v.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extracted Fields */}
      <div className="section">
        <h3 className="section-title">Extracted Fields</h3>
        <div className="fields-grid">
          {Object.entries(fields).map(([key, val]) => {
            if (!val) return null;
            const label = FIELD_LABELS[key] || key;

            if (key === "government_warning") {
              const ok = val.found && val.exact_match;
              const partial = val.found && !val.exact_match;
              return (
                <div className="field-item" key={key}>
                  <div className="field-key">{label}</div>
                  <div className={`field-val field-tag ${ok ? "tag-ok" : partial ? "tag-warn" : "tag-missing"}`}>
                    {ok ? "✓ Present & Exact" : partial ? "⚠ Found, Issues" : "✕ Missing"}
                    {val.issues && val.issues.length > 0 && (
                      <ul className="warning-issues">
                        {val.issues.map((iss, i) => <li key={i}>{iss}</li>)}
                      </ul>
                    )}
                  </div>
                </div>
              );
            }

            const isRequired = val.required !== false;
            const missing = !val.found;

            return (
              <div className="field-item" key={key}>
                <div className="field-key">
                  {label}
                  {!isRequired && <span className="optional-tag">optional</span>}
                </div>
                <div className={`field-val ${missing ? "field-missing" : ""}`}>
                  {missing ? (
                    <span className="tag-missing">✕ Not found</span>
                  ) : (
                    val.value || "—"
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      {result.notes && (
        <div className="section">
          <h3 className="section-title">Agent Notes</h3>
          <p className="notes-text">{result.notes}</p>
        </div>
      )}
    </div>
  );
}
