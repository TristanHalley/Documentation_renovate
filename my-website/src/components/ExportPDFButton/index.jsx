import React from 'react';

export default function ExportPDFButton() {
    return (
        <button
            onClick={() => handlePrint()}
            className="pdf-export-button"
            title="Exporter cette page en PDF"
        >
            📄 Exporter en PDF
        </button>
    );
}

const handlePrint = () => {
    const diagrams = document.querySelectorAll('.docusaurus-mermaid-container svg');
    const allRendered = Array.from(diagrams).every(svg => svg.getBBox().width > 0);

    if (!allRendered) {
        // petite temporisation pour laisser Mermaid finir son rendu
        setTimeout(() => window.print(), 500);
    } else {
        window.print();
    }
};