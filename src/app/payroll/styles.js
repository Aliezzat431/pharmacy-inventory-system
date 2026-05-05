"use strict";

const payrollPageStyles = `
.payroll-container {
    max-width: 1200px;
    margin: 2rem auto;
    padding: 2rem;
    font-family: 'Inter', 'Outfit', 'Roboto', sans-serif;
}

.glass-card {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 20px;
    padding: 2rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.pin-screen {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(20px);
    z-index: 10000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
}

.pin-input {
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 1rem;
    font-size: 2rem;
    text-align: center;
    letter-spacing: 0.5rem;
    color: white;
    width: 200px;
    margin-bottom: 2rem;
}

.payroll-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-top: 2rem;
}

.stat-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.stat-label {
    font-size: 0.9rem;
    color: #666;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1a1a1a;
}

.action-btn {
    padding: 0.8rem 1.5rem;
    border-radius: 10px;
    border: none;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-primary {
    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
    color: white;
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
}
`;

export default payrollPageStyles;
