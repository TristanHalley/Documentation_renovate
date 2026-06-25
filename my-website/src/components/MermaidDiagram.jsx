import React from 'react';
import Mermaid from '@theme/Mermaid';
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

// Importez vos fichiers .mermaid avec raw-loader
import fonctionnementRenovate from '!../diagrams/fonctionnement-renovate.mermaid';
// Ajoutez d'autres imports selon vos besoins

// Mapping des diagrammes
const diagrams = {
    fonctionnementRenovate
};

// Composant réutilisable
export default function MermaidDiagram({ name, coloredItems = [] }) {
    const diagram = diagrams[name];

    if (!diagram) {
        return <div>Diagramme "{name}" non trouvé</div>;
    }

    // Remplacer toutes les occurrences de ${baseUrl} par le baseUrl réel
    const { siteConfig } = useDocusaurusContext();
    const baseUrl = siteConfig.baseUrl || '';
    const changedDiagram = diagram.replace(/%%baseUrl%%/g, baseUrl)

    const strokeColor = '#ffd700'; // Jaune vif pour le contour
    const fillColor = 'transparent'; // Fond transparent

    let colorStyles = ''
    if (coloredItems.length > 0) {
        colorStyles = `
    classDef color fill:${fillColor},stroke:${strokeColor},stroke-width:2px;
    class ${coloredItems.join(',')} color;
  `;
    }

    return <Mermaid value={changedDiagram + colorStyles} />;
}

// Utilisation dans vos fichiers .md ou .mdx :
// ---
// import MermaidDiagram from '@site/src/components/MermaidDiagram';
//
// <MermaidDiagram name="diagram" />
// ---