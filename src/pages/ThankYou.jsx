import React from 'react';
import { Link } from 'react-router-dom';

export default function ThankYou() {
  return (
    <div className="thank-you-page">
      <div className="thank-you-card">
        <h1 className="thank-you-title">Thank You!</h1>
        <p className="thank-you-text">
          Thank you for trying out <strong>RailSim ML</strong>. We hope you enjoyed building stations, managing trains, and experiencing the power of ML-driven allocation in action.
        </p>
        <Link to="/" className="btn-return-home">
          Return to Home
        </Link>
      </div>
    </div>
  );
}
