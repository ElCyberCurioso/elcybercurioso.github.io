document.addEventListener('DOMContentLoaded', function() {
    // Configuración inicial
    const WIKI_CONFIG = {
        autoHighlight: true, // Valor por defecto
        manualSelector: '.wiki-term', // Selector para elementos manuales
        glossaryUrl: '/assets/data/glossary.json'
    };

    // Intentar leer configuración desde variable global o meta tag
    if (typeof window.wikiAutoHighlight !== 'undefined') {
        WIKI_CONFIG.autoHighlight = window.wikiAutoHighlight;
    } else {
        const metaConfig = document.querySelector('meta[name="wiki-auto-highlight"]');
        if (metaConfig) {
            WIKI_CONFIG.autoHighlight = metaConfig.content === 'true';
        }
    }

    // Crear el elemento tooltip y añadirlo al body
    const tooltip = document.createElement('div');
    tooltip.className = 'wiki-tooltip';
    document.body.appendChild(tooltip);

    let termsData = [];

    // Función para escapar caracteres especiales en Regex
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Función para posicionar el tooltip
    function showTooltip(event, termData) {
        const rect = event.target.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        tooltip.innerHTML = `<h4>${termData.term}</h4><p>${termData.description}</p>`;
        tooltip.classList.add('visible');

        // Posicionamiento básico (encima del elemento)
        let top = rect.top + scrollTop - tooltip.offsetHeight - 10;
        let left = rect.left + scrollLeft;

        // Ajustes de borde de pantalla
        if (top < scrollTop) {
            top = rect.bottom + scrollTop + 10; // Mostrar abajo si no cabe arriba
        }
        if (left + tooltip.offsetWidth > window.innerWidth) {
            left = window.innerWidth - tooltip.offsetWidth - 20;
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    }

    function hideTooltip() {
        tooltip.classList.remove('visible');
    }

    // Inicializar un elemento wiki-term (manual o automático)
    function attachEvents(element, termData) {
        element.addEventListener('mouseenter', (e) => showTooltip(e, termData));
        element.addEventListener('mouseleave', hideTooltip);
        element.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar otros clicks
            if (termData.url) {
                window.location.href = termData.url;
            }
        });
    }

    // Procesar elementos manuales
    function processManualTerms() {
        const manualElements = document.querySelectorAll(WIKI_CONFIG.manualSelector);
        manualElements.forEach(el => {
            // Intentar obtener el término desde el atributo data o el texto
            const termKey = el.getAttribute('data-term') || el.textContent.trim();
            const termData = termsData.find(t => t.term.toLowerCase() === termKey.toLowerCase());
            
            if (termData) {
                attachEvents(el, termData);
                // Asegurarse de que tenga la clase para estilos
                if (!el.classList.contains('wiki-term')) {
                    el.classList.add('wiki-term');
                }
            } else {
                console.warn(`Wiki Tooltip: No se encontró definición para "${termKey}"`);
            }
        });
    }

    // Procesar el texto automáticamente
    function processTextNodes(rootNode) {
        const walker = document.createTreeWalker(
            rootNode,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Ignorar scripts, estilos, y ya procesados
                    if (['SCRIPT', 'STYLE', 'A', 'TEXTAREA', 'INPUT'].includes(node.parentNode.nodeName)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    if (node.parentNode.classList.contains('wiki-term')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false
        );

        const nodesToReplace = [];
        let node;

        while (node = walker.nextNode()) {
            let text = node.nodeValue;
            
            // Ordenamos por longitud inversa para matchear frases largas primero
            termsData.sort((a, b) => b.term.length - a.term.length);

            // Construimos un regex combinado: (\bTerm1\b|\bTerm2\b|...)
            const pattern = termsData.map(t => escapeRegExp(t.term)).join('|');
            const regex = new RegExp(`\\b(${pattern})\\b`, 'gi');

            if (regex.test(text)) {
                nodesToReplace.push({ node: node, regex: regex });
            }
        }

        // Reemplazar nodos
        nodesToReplace.forEach(({ node, regex }) => {
            const fragment = document.createDocumentFragment();
            const text = node.nodeValue;
            let lastIndex = 0;
            
            regex.lastIndex = 0;
            let match;

            while ((match = regex.exec(text)) !== null) {
                const before = text.slice(lastIndex, match.index);
                if (before) fragment.appendChild(document.createTextNode(before));

                const foundTermText = match[0];
                const termLower = foundTermText.toLowerCase();
                const termData = termsData.find(t => t.term.toLowerCase() === termLower);

                if (termData) {
                    const span = document.createElement('span');
                    span.className = 'wiki-term'; // Usar la misma clase para estilos
                    span.textContent = foundTermText;
                    
                    attachEvents(span, termData);
                    fragment.appendChild(span);
                } else {
                    fragment.appendChild(document.createTextNode(foundTermText));
                }

                lastIndex = regex.lastIndex;
            }

            const after = text.slice(lastIndex);
            if (after) fragment.appendChild(document.createTextNode(after));

            node.parentNode.replaceChild(fragment, node);
        });
    }

    // Cargar datos y ejecutar
    fetch(WIKI_CONFIG.glossaryUrl)
        .then(response => response.json())
        .then(data => {
            termsData = data;
            
            // 1. Procesar manuales siempre
            processManualTerms();

            // 2. Procesar automático solo si está activado
            if (WIKI_CONFIG.autoHighlight) {
                const contentArea = document.querySelector('main'); 
                if (contentArea) {
                    processTextNodes(contentArea);
                }
            }
        })
        .catch(error => console.error('Error cargando el glosario:', error));
});
