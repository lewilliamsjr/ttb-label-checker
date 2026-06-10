import React, { useState } from "react";
import SingleAnalysis from "./components/SingleAnalysis";
import BatchAnalysis from "./components/BatchAnalysis";
import "./App.css";

export default function App() {
  const [activeTab, setActiveTab] = useState("single");

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="header-brand">
            <div className="header-logo">TTB</div>
            <div>
              <h1 className="header-title">Label Compliance Checker</h1>
              <p className="header-subtitle">AI-powered TTB label verification</p>
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === "single" ? "active" : ""}`}
            onClick={() => setActiveTab("single")}
          >
            Single Label
          </button>
          <button
            className={`tab-btn ${activeTab === "batch" ? "active" : ""}`}
            onClick={() => setActiveTab("batch")}
          >
            Batch Upload
            <span className="tab-badge">New</span>
          </button>
        </div>

        <div className="tab-content">
          {activeTab === "single" ? <SingleAnalysis /> : <BatchAnalysis />}
        </div>
      </main>
    </div>
  );
}
