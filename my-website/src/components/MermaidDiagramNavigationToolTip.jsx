import React, { useEffect, useRef } from 'react';
import Mermaid from '@theme/Mermaid';
import { useDocsSidebar } from '@docusaurus/plugin-content-docs/client';
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import { useLocation } from '@docusaurus/router';

// Stockage global des tooltips : clé = label encodé, valeur = liste de subsubItem.label
const tooltipRegistry = {};

export default function MermaidDiagramNavigationToolTip() {
    let diagram = `mindmap`;
    const { siteConfig } = useDocusaurusContext();
    const baseUrl = siteConfig.baseUrl || '';
    const location = useLocation();
    const containerRef = useRef(null);

    const sidebar = useDocsSidebar();
    let changedDiagram = diagram;

    function buildTree(items) {
        return items.map(item => ({
            label: item.label,
            href: 'href' in item ? item.href : null,
            children: item.items && item.items.length > 0 ? buildTree(item.items) : [],
        }));
    }

    if (sidebar && sidebar.items) {
        const filteredItems = sidebar.items.filter(item => {
            if (item.type === 'html') return false;
            if (item.type === 'link' && item.href === location.pathname) return false;
            return true;
        });

        filteredItems.forEach((item, index) => {
            if (item.type === 'category') {
                changedDiagram += `    ((<a href='${item.href}'>${item.label}</a>))\n`;

                if (item.items) {
                    item.items.forEach((subItem) => {
                        if ("href" in subItem) {
                            changedDiagram += `      <a href='${subItem.href}'>${subItem.label}</a>\n`;
                        } else {
                            changedDiagram += `      ${subItem.label}\n`;
                        }

                        // Encoder les subsubItems comme tooltip
                        if (subItem.items && subItem.items.length > 0) {
                            // Créer une clé unique basée sur le label
                            const tooltipKey = `tt_${encodeURIComponent(subItem.label).replace(/%/g, '_')}`;

                            tooltipRegistry[tooltipKey] = buildTree(subItem.items);

                            // Marquer le nœud avec la classe = tooltipKey
                            changedDiagram += `:::${tooltipKey}\n`;
                        }
                    });
                }

            } else if (item.type === 'link') {
                if (index === 0) {
                    changedDiagram += `\n  root((${item.label}))\n`;
                } else {
                    if (!item.href.startsWith(baseUrl)) {
                        changedDiagram += `    <a target="_blank" href='${item.href}'>${item.label}</a>\n`;
                    } else {
                        changedDiagram += `    <a href='${item.href}'>${item.label}</a>\n`;
                    }
                }
            }
        });
    }

    // Injecter les tooltips après le rendu du SVG Mermaid
    useEffect(() => {
        if (!containerRef.current) return;

        // Mermaid peut être async, on observe le DOM
        const observer = new MutationObserver(() => {
            injectTooltips();
        });

        observer.observe(containerRef.current, { childList: true, subtree: true });

        // Tentative immédiate aussi
        injectTooltips();

        return () => observer.disconnect();
    }, [changedDiagram]);

    function renderTree(items, depth = 0) {
        return items.map(({ label, href, children }) => {
            const indent = depth * 12; // px d'indentation par niveau
            const hasChildren = children && children.length > 0;

            const prefix = depth === 0 ? '▸ ' : '└ ';

            const linkOrSpan = href
                ? `<a href="${href}"
            style="
              color: ${depth === 0 ? '#7dd3fc' : '#93c5fd'};
              text-decoration: underline;
              text-underline-offset: 3px;
              padding: 2px 4px;
              border-radius: 4px;
              display: inline;
              cursor: pointer;
            "
            onmouseover="this.style.background='rgba(125,211,252,0.15)'"
            onmouseout="this.style.background='transparent'"
          >${label}</a>`
                : `<span style="color: #94a3b8;">${label}</span>`;

            const row = `
      <div style="
        padding-left: ${indent}px;
        padding: 2px 4px 2px ${indent + 4}px;
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: ${depth === 0 ? '13px' : '12px'};
        opacity: ${depth === 0 ? '1' : '0.85'};
      ">
        <span style="color: #475569; flex-shrink: 0;">${prefix}</span>
        ${linkOrSpan}
      </div>
    `;

            return row + (hasChildren ? renderTree(children, depth + 1) : '');
        }).join('');
    }

    function injectTooltips() {
        if (!containerRef.current) return;

        Object.entries(tooltipRegistry).forEach(([tooltipKey, children]) => {
            // Mermaid applique les classes sur les <g> du SVG
            const nodes = containerRef.current.querySelectorAll(`g.${tooltipKey}`);

            nodes.forEach(node => {
                if (node.dataset.tooltipInjected) return; // éviter les doublons
                node.dataset.tooltipInjected = 'true';

                // Ajouter un badge indicateur sur le nœud
                const svgNS = 'http://www.w3.org/2000/svg';
                const nodeBBox = node.getBBox(); // bounding box du nœud dans le SVG

                const badge = document.createElementNS(svgNS, 'g');
                badge.setAttribute('class', 'tooltip-badge');
                badge.style.pointerEvents = 'none'; // le badge ne doit pas intercepter les events

                // Cercle de fond
                const circle = document.createElementNS(svgNS, 'circle');
                circle.setAttribute('cx', nodeBBox.x + nodeBBox.width - 4);
                circle.setAttribute('cy', nodeBBox.y + 4);
                circle.setAttribute('r', '7');
                circle.setAttribute('fill', '#3b82f6');
                circle.setAttribute('stroke', '#1e293b');
                circle.setAttribute('stroke-width', '1.5');

                // Alternative : contour pointillé sur le nœud principal
                const shape = node.querySelector('rect, circle, polygon, path');
                if (shape) {
                    shape.style.strokeDasharray = '4 2';
                    shape.style.stroke = '#3b82f6';
                    shape.style.strokeWidth = '2';
                }

                // Texte "…" ou "i"
                const text = document.createElementNS(svgNS, 'text');
                text.setAttribute('x', nodeBBox.x + nodeBBox.width - 4);
                text.setAttribute('y', nodeBBox.y + 8);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('fill', 'white');
                text.setAttribute('font-size', '8');
                text.setAttribute('font-weight', 'bold');
                text.setAttribute('font-family', 'sans-serif');
                text.textContent = '...';

                badge.appendChild(circle);
                badge.appendChild(text);
                node.appendChild(badge);

                // Créer le tooltip : générer des <a> cliquables avec un style hover, et passer pointerEvents: 'auto' sur le tooltip pour qu'il reste interactif
                const tooltip = document.createElement('div');
                tooltip.className = 'mermaid-custom-tooltip';
                tooltip.innerHTML = renderTree(children);

                // Style inline de secours (le CSS Docusaurus peut varier)
                Object.assign(tooltip.style, {
                    position: 'absolute',
                    background: '#1e293b',
                    color: '#f1f5f9',
                    borderRadius: '8px',
                    maxWidth: '280px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    pointerEvents: 'none',
                    opacity: '0',
                    transition: 'opacity 0.2s ease',
                    zIndex: '9999',
                    whiteSpace: 'normal',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                });

                // Ajouter au parent positionné
                const svgContainer = containerRef.current.querySelector('svg')?.parentElement;
                if (!svgContainer) return;

                if (getComputedStyle(svgContainer).position === 'static') {
                    svgContainer.style.position = 'relative';
                }
                svgContainer.appendChild(tooltip);

                // Événements hover
                node.style.cursor = 'help';

                // hide/show — avec pointerEvents: 'auto', le tooltip disparaîtrait si la souris quitte le nœud pour entrer dans le tooltip. Il faut un petit délai sur le mouseleave
                let hideTimeout;

                node.addEventListener('mouseenter', () => {
                    clearTimeout(hideTimeout);
                    tooltip.style.opacity = '1';
                    tooltip.style.pointerEvents = 'auto';

                    requestAnimationFrame(() => {
                        const rect = node.getBoundingClientRect();
                        const containerRect = svgContainer.getBoundingClientRect();

                        const tooltipW = tooltip.offsetWidth;
                        const tooltipH = tooltip.offsetHeight;

                        // Position idéale : centré au-dessus du nœud
                        let left = rect.left - containerRect.left + rect.width / 2 - tooltipW / 2;
                        let top = rect.top - containerRect.top - tooltipH - 8;

                        // Clamp horizontal : ne pas dépasser les bords du container
                        const maxLeft = svgContainer.offsetWidth - tooltipW - 8;
                        left = Math.max(8, Math.min(left, maxLeft));

                        // Si le tooltip dépasse en haut, l'afficher en dessous du nœud
                        if (top < 0) {
                            top = rect.top - containerRect.top + rect.height + 8;
                        }

                        tooltip.style.left = `${left}px`;
                        tooltip.style.top = `${top}px`;
                    });
                });

                node.addEventListener('mouseleave', () => {
                    hideTimeout = setTimeout(() => {
                        tooltip.style.opacity = '0';
                        tooltip.style.pointerEvents = 'none';
                    }, 150); // délai pour laisser la souris atteindre le tooltip
                });

                tooltip.addEventListener('mouseenter', () => {
                    clearTimeout(hideTimeout); // annuler le hide si on entre dans le tooltip
                });

                tooltip.addEventListener('mouseleave', () => {
                    hideTimeout = setTimeout(() => {
                        tooltip.style.opacity = '0';
                        tooltip.style.pointerEvents = 'none';
                    }, 100); // délai pour laisser la souris atteindre le tooltip
                });
            });
        });
    }

    return (
        <div ref={containerRef} className="mermaid-nav-wrapper">
            <Mermaid value={changedDiagram} />
        </div>
    );
}

// Utilisation dans vos fichiers .md ou .mdx :
// ---
// import MermaidDiagramNavigationToolTip from '@site/src/components/MermaidDiagramNavigationToolTip';
//
// <MermaidDiagramNavigationToolTip />
// ---