export function getScriptPreview(indexShowSubtopics: boolean) {
  return `
<script>
  (function() {
    let observer;
    let isEditMode = false;
    let selectedEl = null;

    function rgbToHex(rgb) {
      if (!rgb || rgb === 'rgba(0, 0, 0, 0)' || rgb === 'transparent') return '#ffffff';
      let m = rgb.match(/^rgb(?:a)?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
      if (!m) return '#000000';
      return "#" + (1 << 24 | m[1] << 16 | m[2] << 8 | m[3]).toString(16).slice(1);
    }

    function executarRefluxoCompleto() {
      if (observer) observer.disconnect();
      
      const currentScrollY = window.scrollY;
      const container = document.getElementById('ebook-container');
      if (!container) return;

      // ========================================================
      // 1. AUTO-CURA DAS CAPAS (Restaura e garante o fundo)
      // ========================================================
      container.querySelectorAll('.cap-img-overlay').forEach(overlay => {
          let next = overlay.nextElementSibling;
          while (next && (next.classList?.contains('cap-overlay-box') || next.tagName === 'H1')) {
              overlay.appendChild(next);
              next = overlay.nextElementSibling;
          }
          let box = overlay.querySelector('.cap-overlay-box');
          if (!box) {
              box = document.createElement('div');
              box.className = 'cap-overlay-box';
              while (overlay.firstChild && overlay.firstChild !== box) {
                  box.appendChild(overlay.firstChild);
              }
              overlay.appendChild(box);
          }
          
          let bg = overlay.style.backgroundImage || '';
          if (overlay.dataset.unsplash && (bg === '' || bg === 'none' || bg.includes('initial'))) {
             const keyword = encodeURIComponent(overlay.dataset.unsplash.trim());
             const cacheBuster = Math.random().toString(36).substring(7);
             overlay.style.setProperty('background-image', \`url('https://images.unsplash.com/featured/1200x800/?\${keyword},abstract,texture,sig\${cacheBuster}')\`, 'important');
          }
      });

      const metaTitle = document.getElementById('meta-book-title');
      let tituloDoLivro = metaTitle && metaTitle.getAttribute('content') ? metaTitle.getAttribute('content').toUpperCase().trim() : "";

      let modeloFooter = '<span class="page-number"></span>';
      const footerExistente = container.querySelector('.page-footer');
      if (footerExistente) modeloFooter = footerExistente.innerHTML;

      // ========================================================
      // 2. DESEMPACOTAMENTO CIRÚRGICO (Sem perder a ordem)
      // ========================================================
      // Selecionamos APENAS as páginas de texto e capas de capítulos. A Capa principal fica intocada.
      const paginasParaDesempacotar = container.querySelectorAll('.chapter-text-page, .capa-isolada');
      
      paginasParaDesempacotar.forEach(p => {
        // Destrói o índice antigo para recriar limpo
        if (p.querySelector('.toc-container')) {
            p.remove();
            return;
        }
        
        const area = p.querySelector('.content-area') || p;
        p.querySelectorAll('.page-header, .page-footer, style.cover-blind').forEach(l => l.remove());

        // Joga as tags soltas de volta pro container na ordem EXATA que estavam
        while (area.firstChild) {
            container.insertBefore(area.firstChild, p);
        }
        p.remove(); 
      });

      // Limpeza de lixo HTML gerado por edições
      container.querySelectorAll('hr').forEach(hr => hr.remove());
      container.querySelectorAll('p').forEach(p => {
          if (p.innerHTML) p.innerHTML = p.innerHTML.replace(/^(&nbsp;|\\s)+/g, '');
          if (!p.textContent.trim() && !p.querySelector('img')) p.remove();
      });

      // Filtra os elementos soltos na ordem linear absoluta
      const elementosSoltos = Array.from(container.children).filter(el =>
        !el.classList.contains('page-container') &&
        !el.classList.contains('page-cover-img') &&
        !el.hasAttribute('data-legal') &&
        !el.classList.contains('author-page') &&
        !el.classList.contains('page-extra') &&
        el.tagName !== 'STYLE' && el.tagName !== 'SCRIPT'
      );

      // ========================================================
      // 3. REMONTAGEM LINEAR E BLINDADA
      // ========================================================
      const LIMITE_ALTURA_TEXTO = 900; 

      function getPontoInsercao() {
         return container.querySelector('.author-page');
      }

      function criarNovaPaginaTexto() {
        const novaPagina = document.createElement('div');
        novaPagina.className = 'page-container chapter-text-page';
        
        const header = document.createElement('div');
        header.className = 'page-header';
        header.innerHTML = '<span></span><span>' + tituloDoLivro + '</span>';
        novaPagina.appendChild(header);

        const contentArea = document.createElement('div');
        contentArea.className = 'content-area';
        contentArea.style.display = 'flex';
        contentArea.style.flexDirection = 'column';
        contentArea.style.width = '100%'; 
        novaPagina.appendChild(contentArea);

        const footer = document.createElement('div');
        footer.className = 'page-footer';
        footer.innerHTML = modeloFooter; 
        novaPagina.appendChild(footer);

        const endPage = getPontoInsercao();
        if (endPage) container.insertBefore(novaPagina, endPage);
        else container.appendChild(novaPagina);
        
        return { pagina: novaPagina, areaTexto: contentArea };
      }

      function criarPaginaCapaIsolada(overlayEl) {
        const novaPagina = document.createElement('div');
        novaPagina.className = 'page-container capa-isolada'; 
        novaPagina.style.padding = '0';
        novaPagina.style.border = 'none';
        
        novaPagina.appendChild(overlayEl); 

        const endPage = getPontoInsercao();
        if (endPage) container.insertBefore(novaPagina, endPage);
        else container.appendChild(novaPagina);
      }

      let atual = null;

      for (let i = 0; i < elementosSoltos.length; i++) {
          let el = elementosSoltos[i];

          // A. SE FOR CAPA DE CAPÍTULO -> Cria página isolada blindada!
          if (el.classList && el.classList.contains('cap-img-overlay')) {
              criarPaginaCapaIsolada(el);
              atual = null; 
              continue;
          }

          if (!atual) atual = criarNovaPaginaTexto();

          // B. QUEBRA DE PÁGINA OBRIGATÓRIA PARA TÍTULOS E SUBTÍTULOS
          // O H3 (Subtítulo) agora força o início de uma nova página obrigatoriamente!
          if (atual.areaTexto.children.length > 0 && (el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3')) {
              atual = criarNovaPaginaTexto();
          }

          atual.areaTexto.appendChild(el);

          // C. QUEBRA DE PÁGINA POR EXCESSO DE TEXTO
          if (atual.areaTexto.scrollHeight > LIMITE_ALTURA_TEXTO) {
              atual.areaTexto.removeChild(el); 
              atual = criarNovaPaginaTexto();
              atual.areaTexto.appendChild(el);
          }
      }

      // Faxina final de páginas vazias criadas no processo
      container.querySelectorAll('.chapter-text-page').forEach(page => {
        const area = page.querySelector('.content-area');
        if (!area || (area.textContent.trim() === '' && !area.querySelector('img'))) page.remove();
      });

      // ========================================================
      // 4. BLINDAGEM NUCLEAR CONTRA LINHAS NAS CAPAS
      // ========================================================
      container.querySelectorAll('.page-cover-img, .page-cover-pura, .page-cover-text, .capa-isolada').forEach(p => {
          p.querySelectorAll('.page-header, .page-footer').forEach(el => el.remove());
          p.style.setProperty('border', 'none', 'important');
          
          if (!p.id) p.id = 'page-' + Math.random().toString(36).substr(2, 9);
          if (!p.querySelector('style.cover-blind')) {
              const s = document.createElement('style');
              s.className = 'cover-blind';
              s.innerHTML = \`#\${p.id}::after { display: none !important; border: none !important; }\`;
              p.appendChild(s);
          }
      });

      // ========================================================
      // 5. RECRIAR O ÍNDICE SINCRONIZADO
      // ========================================================
      function sincronizarIndice() {
        const titulos = container.querySelectorAll('h1, h2, h3');
        const titulosVistos = new Set();
        const itens = [];

        titulos.forEach((titleEl) => {
          // Ignora a capa principal, mas lê a '.capa-isolada' dos capítulos!
          if (titleEl.closest('.page-cover-img, .page-cover-pura, [data-legal], .page-extra')) return;
          
          let texto = titleEl.textContent?.trim() || '';
          if (!texto || /índice|sumário/i.test(texto)) return;

          let chave = texto.toLowerCase().replace(/capítulo\\s*\\d+:/, '').trim();
          if (titulosVistos.has(chave)) return;
          titulosVistos.add(chave);

          if (!titleEl.id) titleEl.id = 'sec-' + Math.random().toString(36).substr(2, 9);

          const a = document.createElement('a');
          a.className = 'toc-item';
          
          if (titleEl.tagName === 'H1' || titleEl.tagName === 'H2') {
            a.classList.add('toc-main-chapter');
            a.style.fontWeight = ${indexShowSubtopics} ? '700' : '400';
            a.style.color = 'var(--color-primary)';
          } else if (titleEl.tagName === 'H3') {
            if (!${indexShowSubtopics}) return;
            a.classList.add('toc-subtopic');
            a.style.paddingLeft = '20px';
            a.style.fontSize = '0.75em';
            a.style.lineHeight = '1';
            a.style.opacity = '0.85';
          }

          a.href = '#' + titleEl.id;
          a.innerHTML = \`<span>\${texto}</span><span class="toc-dots"></span><span class="toc-page-num"></span>\`;
          itens.push(a);
        });

        if (itens.length === 0) return;

        function criarPaginaIndice(afterPage) {
          const p = document.createElement('div');
          p.className = 'page-container chapter-text-page toc-page-wrapper';
          p.innerHTML = \`
            <div class="page-header"><span></span><span>\${tituloDoLivro}</span></div>
            <div class="content-area">
                <h2 class="chapter-title-inline">Índice</h2>
                <div class="toc-container"></div>
            </div>
            <div class="page-footer">\${modeloFooter}</div>
          \`;
          
          if (afterPage && afterPage.parentNode) {
            afterPage.parentNode.insertBefore(p, afterPage.nextSibling);
          } else {
            const pontoInsercao = container.querySelector('.chapter-text-page, .capa-isolada');
            if (pontoInsercao) container.insertBefore(p, pontoInsercao);
            else container.appendChild(p);
          }
          return { page: p, toc: p.querySelector('.toc-container') };
        }

        let currentToc = null;
        let currentPage = null;
        let itensPorPagina = 0;
        const MAX_ITENS = 22; 

        itens.forEach(item => {
           if (!currentToc || itensPorPagina >= MAX_ITENS) {
               const nova = criarPaginaIndice(currentPage);
               currentPage = nova.page;
               currentToc = nova.toc;
               itensPorPagina = 0;
           }
           currentToc.appendChild(item);
           itensPorPagina++;
        });

        // NUMERAÇÃO DE PÁGINAS CORRETA
        const allPages = Array.from(container.children).filter(el => el.classList.contains('page-container'));
        
        container.querySelectorAll('.toc-item').forEach(item => {
          const href = item.getAttribute('href');
          if (href) {
            const target = document.getElementById(href.substring(1));
            if (target) {
              const p = target.closest('.page-container');
              if (p) {
                const idx = allPages.indexOf(p) + 1;
                const span = item.querySelector('.toc-page-num');
                if (span) span.innerText = String(idx);
              }
            }
          }
        });
      }

      sincronizarIndice();

      if (isEditMode && selectedEl) selectedEl.style.outline = '3px solid #4f46e5';
      window.scrollTo(0, currentScrollY);

      setTimeout(() => {
        if (observer) observer.observe(document.getElementById('ebook-container'), { childList: true, subtree: true });
      }, 300);
    }

    // ========================================================
    // RECEPTORES DE EVENTOS DO REACT
    // ========================================================
    window.addEventListener('message', (e) => {
      if (e.data.type === 'TOGGLE_EDIT_MODE') {
         isEditMode = e.data.value;
         if (!isEditMode && selectedEl) {
            selectedEl.style.outline = '';
            selectedEl = null;
         }
      }
      
      if (e.data.type === 'UNDO_HTML' || e.data.type === 'REDO_HTML') {
         const scrollY = window.scrollY;
         document.getElementById('ebook-container').innerHTML = e.data.html;
         setTimeout(() => {
            executarRefluxoCompleto();
            requestAnimationFrame(() => window.scrollTo(0, scrollY));
         }, 50);
      }
      
      if (e.data.type === 'DELETE_ELEMENT') {
         const target = document.getElementById(e.data.id);
         if (target) {
            target.remove();
            executarRefluxoCompleto();
            setTimeout(() => {
                window.parent.postMessage({ type: 'HTML_SYNC', html: document.getElementById('ebook-container').innerHTML }, '*');
            }, 100);
         }
      }

      if (e.data.type === 'REPLACE_ELEMENT_HTML') {
         const target = document.getElementById(e.data.id);
         if (target) {
            target.outerHTML = e.data.newHtml;
            executarRefluxoCompleto();
            setTimeout(() => {
                window.parent.postMessage({ type: 'HTML_SYNC', html: document.getElementById('ebook-container').innerHTML }, '*');
            }, 100);
         }
      }

      if (e.data.type === 'UPDATE_ELEMENT') {
         const target = document.getElementById(e.data.id);
         if (target) {
            if (e.data.iconClass !== undefined && target.tagName === 'I') {
               target.className = e.data.iconClass;
            } else {
               if (e.data.text !== undefined && e.data.forceTextUpdate) target.innerHTML = e.data.text;
               if (e.data.src !== undefined && target.tagName === 'IMG') target.src = e.data.src;
               if (e.data.bgImage !== undefined) target.style.setProperty('background-image', \`url(\${e.data.bgImage})\`, 'important');
               if (e.data.rawBgImage !== undefined) target.style.setProperty('background-image', e.data.rawBgImage, 'important');
               if (e.data.textColor !== undefined) target.style.setProperty('color', e.data.textColor, 'important');
               
               if (e.data.bgColor !== undefined) {
                   target.dataset.rawHex = e.data.bgColor;
                   let op = target.dataset.bgOp || (target.classList.contains('cap-overlay-box') ? '0.92' : '1');
                   let hex = e.data.bgColor.replace('#','');
                   if(hex.length === 3) hex = hex.split('').map(x => x+x).join('');
                   let r = parseInt(hex.substring(0,2), 16) || 255;
                   let g = parseInt(hex.substring(2,4), 16) || 255;
                   let b = parseInt(hex.substring(4,6), 16) || 255;
                   target.style.setProperty('background-color', \`rgba(\${r},\${g},\${b},\${op})\`, 'important');
               }
               if (e.data.bgOpacity !== undefined) {
                   target.dataset.bgOp = e.data.bgOpacity;
                   let hex = target.dataset.rawHex || rgbToHex(window.getComputedStyle(target).backgroundColor) || '#f5f5f5';
                   hex = hex.replace('#','');
                   if(hex.length === 3) hex = hex.split('').map(x => x+x).join('');
                   let r = parseInt(hex.substring(0,2), 16) || 245;
                   let g = parseInt(hex.substring(2,4), 16) || 245;
                   let b = parseInt(hex.substring(4,6), 16) || 245;
                   target.style.setProperty('background-color', \`rgba(\${r},\${g},\${b},\${e.data.bgOpacity})\`, 'important');
               }
               
               if (e.data.fontSize !== undefined) target.style.setProperty('font-size', e.data.fontSize + 'px', 'important');
               if (e.data.fontWeight !== undefined) target.style.setProperty('font-weight', e.data.fontWeight, 'important');
               if (e.data.textAlign !== undefined) target.className = target.className.replace(/text-(left|center|right|justify)/, '') + ' ' + e.data.textAlign;
            }
            executarRefluxoCompleto();
            setTimeout(() => {
                window.parent.postMessage({ type: 'HTML_SYNC', html: document.getElementById('ebook-container').innerHTML }, '*');
            }, 100);
         }
      }

      if (e.data.type === 'APPLY_GLOBAL_BG') {
         const color = e.data.color;
         const pages = document.querySelectorAll('.page-container');
         pages.forEach(page => {
            page.style.setProperty('background-color', color, 'important');
         });
         window.parent.postMessage({ type: 'HTML_SYNC', html: document.getElementById('ebook-container').innerHTML }, '*');
      }
    });  

    document.addEventListener('mouseover', (e) => {
      if (!isEditMode) return;
      const el = e.target.closest('p, h1, h2, h3, h4, blockquote, img, li, .page-container, .highlight-box, .concept-box, .cap-img-overlay, .cap-overlay-box, i');
      if (el && el !== selectedEl) el.style.outline = '2px dashed rgba(99,102,241,0.5)';
    });
    
    document.addEventListener('mouseout', (e) => {
      if (!isEditMode) return;
      const el = e.target.closest('p, h1, h2, h3, h4, blockquote, img, li, .page-container, .highlight-box, .concept-box, .cap-img-overlay, .cap-overlay-box, i');
      if (el && el !== selectedEl) el.style.outline = '';
    });
    
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link && link.getAttribute('href') && link.getAttribute('href').startsWith('#')) {
        e.preventDefault(); 
        e.stopPropagation();
        const targetId = link.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return; 
      }

      if (!isEditMode) return;
      
      e.preventDefault(); 
      e.stopPropagation();
      const el = e.target.closest('p, h1, h2, h3, h4, blockquote, img, li, .page-container, .highlight-box, .concept-box, .cap-img-overlay, .cap-overlay-box, i');
      
      if (el) {
         if (selectedEl) selectedEl.style.outline = '';
         selectedEl = el;
         el.style.outline = '3px solid #4f46e5';
         if (!el.id) el.id = 'el-' + Math.random().toString(36).substr(2, 9);
         const computed = window.getComputedStyle(el);
         
         window.parent.postMessage({
            type: 'ELEMENT_SELECTED',
            id: el.id,
            tagName: el.tagName.toLowerCase(),
            text: el.innerHTML,
            outerHTML: el.outerHTML, 
            src: el.src,
            bgImage: computed.backgroundImage !== 'none' ? computed.backgroundImage : undefined,
            isBgTarget: el.classList.contains('page-container') || el.classList.contains('cap-img-overlay'),
            textColor: rgbToHex(computed.color),
            bgColor: rgbToHex(computed.backgroundColor),
            fontSize: parseInt(computed.fontSize),
            fontWeight: computed.fontWeight,
            textAlign: computed.textAlign
         }, '*');
      }
    }, true);

    if (document.readyState === 'complete') executarRefluxoCompleto();
    else {
      window.addEventListener('load', () => {
        executarRefluxoCompleto();
        setTimeout(executarRefluxoCompleto, 500);
      });
    }

    observer = new MutationObserver(() => {
      clearTimeout(window._reflowTimeout);
      window._reflowTimeout = setTimeout(executarRefluxoCompleto, 300);
    });
    
    const containerParaObservar = document.getElementById('ebook-container');
    if (containerParaObservar) observer.observe(containerParaObservar, { childList: true, subtree: true });

  })();
</script>
  `;
}
