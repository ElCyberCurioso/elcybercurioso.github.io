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
    // Mapa plano: palabra clave (minúsculas) -> objeto de definición
    let termsMap = {};

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
            const termKey = (el.getAttribute('data-term') || el.textContent.trim()).toLowerCase();
            const termData = termsMap[termKey];
            
            if (termData) {
                attachEvents(el, termData);
                // Asegurarse de que tenga la clase para estilos
                if (!el.classList.contains('wiki-term')) {
                    el.classList.add('wiki-term');
                }
            } else {
                // Intento fallback: buscar en termsData directamente si no está en el mapa (por si acaso)
                const fallback = termsData.find(t => t.term.toLowerCase() === termKey);
                if (fallback) {
                    attachEvents(el, fallback);
                    if (!el.classList.contains('wiki-term')) el.classList.add('wiki-term');
                } else {
                    console.warn(`Wiki Tooltip: No se encontró definición para "${termKey}"`);
                }
            }
        });
    }

    // Procesar el texto automáticamente
    function processTextNodes(rootNode) {
        // Selector CSS de elementos excluidos
        const EXCLUDED_SELECTORS = 'h1, h2, h3, h4, h5, h6, a, button, textarea, input, select, pre, code, script, style, .wiki-term';

        const walker = document.createTreeWalker(
            rootNode,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Verificar si algún ancestro coincide con los selectores excluidos
                    if (node.parentElement && node.parentElement.closest(EXCLUDED_SELECTORS)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false
        );

        const nodesToReplace = [];
        let node;

        // Preparar lista de claves de búsqueda ordenadas por longitud
        const searchKeys = Object.keys(termsMap).sort((a, b) => b.length - a.length);
        if (searchKeys.length === 0) return;

        // Construir regex gigante
        const pattern = searchKeys.map(k => escapeRegExp(k)).join('|');
        const regex = new RegExp(`\\b(${pattern})\\b`, 'gi');

        while (node = walker.nextNode()) {
            let text = node.nodeValue;
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
                const termData = termsMap[termLower];

                if (termData) {
                    const span = document.createElement('span');
                    span.className = 'wiki-term';
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
            
            // Construir el mapa de términos y alias
            termsMap = {};
            termsData.forEach(item => {
                // Mapear término principal
                termsMap[item.term.toLowerCase()] = item;
                
                // Mapear alias si existen
                if (item.aliases && Array.isArray(item.aliases)) {
                    item.aliases.forEach(alias => {
                        termsMap[alias.toLowerCase()] = item;
                    });
                }
            });

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
