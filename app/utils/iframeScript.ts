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

      const metaTitle = document.getElementById('meta-book-title');
      let tituloDoLivro = metaTitle && metaTitle.getAttribute('content') ? metaTitle.getAttribute('content').toUpperCase().trim() : "";

      let modeloFooter = '<span class="page-number"></span>';
      const footerExistente = container.querySelector('.page-footer');
      if (footerExistente) modeloFooter = footerExistente.innerHTML;

      // ========================================================
      // 1. O GRANDE DESMONTE (Guarda tudo que é sagrado no cofre)
      // ========================================================
      const coverPage = container.querySelector('.page-cover-img, .page-cover-pura, .page-cover-text');
      const legalPage = container.querySelector('[data-legal]');
      const authorPage = container.querySelector('.author-page');
      const extraPages = Array.from(container.querySelectorAll('.page-extra'));
      
      // Retira do DOM temporariamente para não serem esmagados
      if (coverPage) coverPage.remove();
      if (legalPage) legalPage.remove();
      if (authorPage) authorPage.remove();
      extraPages.forEach(p => p.remove());

      // ========================================================
      // 2. EXTRAÇÃO CIRÚRGICA (Enfileira todo o conteúdo real)
      // ========================================================
      const rawElements = [];
      
      function extractNodes(parent) {
          Array.from(parent.childNodes).forEach(child => {
              if (child.nodeType === 3) {
                  if (child.textContent.trim() !== '') {
                      const p = document.createElement('p');
                      p.textContent = child.textContent;
                      rawElements.push(p);
                  }
                  return;
              }
              if (child.nodeType !== 1) return;

              if (child.tagName === 'STYLE' || child.tagName === 'SCRIPT') return;
              if (child.classList.contains('toc-container') || child.classList.contains('toc-page-wrapper')) return;
              if (child.classList.contains('page-header') || child.classList.contains('page-footer')) return;
              
              if (child.classList.contains('cap-img-overlay')) {
                  rawElements.push(child);
                  return;
              }
              
              if (child.classList.contains('page-container')) {
                  const area = child.querySelector('.content-area') || child;
                  extractNodes(area);
                  return;
              }
              
              rawElements.push(child);
          });
      }
      
      extractNodes(container);
      
      // Limpa a tela completamente
      const stylesAndScripts = Array.from(container.children).filter(el => el.tagName === 'STYLE' || el.tagName === 'SCRIPT');
      container.innerHTML = '';
      stylesAndScripts.forEach(el => container.appendChild(el));
      
      // ========================================================
      // 3. REMONTAGEM ABSOLUTA (Recria as páginas do zero na ordem exata)
      // ========================================================
      if (coverPage) container.appendChild(coverPage);
      if (legalPage) container.appendChild(legalPage);
      extraPages.forEach(p => container.appendChild(p));

      const LIMITE_ALTURA_TEXTO = 900; 

      function criarNovaPaginaTexto() {
          const novaPagina = document.createElement('div');
          novaPagina.className = 'page-container chapter-text-page';
          novaPagina.innerHTML = \`
              <div class="page-header"><span></span><span>\${tituloDoLivro}</span></div>
              <div class="content-area" style="display: flex; flex-direction: column; width: 100%;"></div>
              <div class="page-footer">\${modeloFooter}</div>
          \`;
          container.appendChild(novaPagina);
          return { pagina: novaPagina, areaTexto: novaPagina.querySelector('.content-area') };
      }

      function criarPaginaCapaIsolada(overlayEl) {
          const novaPagina = document.createElement('div');
          novaPagina.className = 'page-container capa-isolada'; 
          novaPagina.style.cssText = "padding: 0 !important; border: none !important;";
          novaPagina.id = 'page-' + Math.random().toString(36).substr(2, 9);
          
          // BLINDAGEM NUCLEAR NA CAPA DE CAPÍTULO
          const s = document.createElement('style');
          s.className = 'cover-blind';
          s.innerHTML = \`#\${novaPagina.id}::after { display: none !important; border: none !important; }\`;
          novaPagina.appendChild(s);
          
          // Auto-Cura da estrutura do Capítulo
          let next = overlayEl.nextElementSibling;
          while (next && (next.classList?.contains('cap-overlay-box') || next.tagName === 'H1')) {
              overlayEl.appendChild(next);
              next = overlayEl.nextElementSibling;
          }
          let box = overlayEl.querySelector('.cap-overlay-box');
          if (!box) {
              box = document.createElement('div');
              box.className = 'cap-overlay-box';
              while (overlayEl.firstChild && overlayEl.firstChild !== box) {
                  box.appendChild(overlayEl.firstChild);
              }
              overlayEl.appendChild(box);
          }
          let bg = overlayEl.style.backgroundImage || '';
          if (overlayEl.dataset.unsplash && (bg === '' || bg === 'none' || bg.includes('initial'))) {
             const keyword = encodeURIComponent(overlayEl.dataset.unsplash.trim());
             const cacheBuster = Math.random().toString(36).substring(7);
             overlayEl.style.setProperty('background-image', \`url('https://images.unsplash.com/featured/1200x800/?\${keyword},abstract,texture,sig\${cacheBuster}')\`, 'important');
          }

          novaPagina.appendChild(overlayEl); 
          container.appendChild(novaPagina);
      }

      let atual = null;

      for (let i = 0; i < rawElements.length; i++) {
          let el = rawElements[i];

          if (el.tagName === 'HR') continue;
          if (el.tagName === 'P') {
              el.innerHTML = el.innerHTML.replace(/^(&nbsp;|\\s)+/g, '');
              if (!el.textContent.trim() && !el.querySelector('img')) continue;
          }

          if (el.classList && el.classList.contains('cap-img-overlay')) {
              criarPaginaCapaIsolada(el);
              atual = null; 
              continue;
          }

          if (!atual) atual = criarNovaPaginaTexto();

          // INTELIGÊNCIA DO SUBTÍTULO: Quebra página SOMENTE SE necessário
          let deveQuebrar = false;
          if (atual.areaTexto.children.length > 0) {
              if (el.tagName === 'H1' || el.tagName === 'H2') {
                  deveQuebrar = true; 
              } else if (el.tagName === 'H3') {
                  const ultimoElemento = atual.areaTexto.lastElementChild;
                  if (ultimoElemento && ultimoElemento.tagName !== 'H1' && ultimoElemento.tagName !== 'H2') {
                      deveQuebrar = true;
                  }
              }
          }

          if (deveQuebrar) atual = criarNovaPaginaTexto();

          atual.areaTexto.appendChild(el);

          if (atual.areaTexto.scrollHeight > LIMITE_ALTURA_TEXTO) {
              atual.areaTexto.removeChild(el); 
              atual = criarNovaPaginaTexto();
              atual.areaTexto.appendChild(el);
          }
      }

      container.querySelectorAll('.chapter-text-page').forEach(page => {
          const area = page.querySelector('.content-area');
          if (!area || (area.textContent.trim() === '' && !area.querySelector('img'))) page.remove();
      });

      // BLINDAGEM NUCLEAR DA CAPA PRINCIPAL (Impedindo o erro 12)
      if (coverPage) {
          coverPage.querySelectorAll('.page-header, .page-footer').forEach(el => el.remove());
          coverPage.style.setProperty('border', 'none', 'important');
          if (!coverPage.id) coverPage.id = 'page-' + Math.random().toString(36).substr(2, 9);
          if (!coverPage.querySelector('style.cover-blind')) {
              const s = document.createElement('style');
              s.className = 'cover-blind';
              s.innerHTML = \`#\${coverPage.id}::after { display: none !important; border: none !important; }\`;
              coverPage.appendChild(s);
          }
      }

      if (authorPage) container.appendChild(authorPage);

      // ========================================================
      // 4. RECRIAR O ÍNDICE SINCRONIZADO DO ZERO
      // ========================================================
      function sincronizarIndice() {
          const titulos = container.querySelectorAll('h1, h2, h3');
          const titulosVistos = new Set();
          const itens = [];

          titulos.forEach((titleEl) => {
              if (titleEl.closest('.page-cover-img, .page-cover-pura, .page-cover-text, [data-legal], .page-extra')) return;
              
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

          let insertPoint = container.firstChild;
          const coversAndLegals = Array.from(container.children).filter(el => 
              el.classList.contains('page-cover-img') || 
              el.classList.contains('page-cover-pura') ||
              el.classList.contains('page-cover-text') ||
              el.hasAttribute('data-legal') ||
              el.classList.contains('page-extra')
          );
          if (coversAndLegals.length > 0) {
              insertPoint = coversAndLegals[coversAndLegals.length - 1].nextSibling;
          }

          let currentToc = null;
          let itensPorPagina = 0;
          const MAX_ITENS = 22; 

          itens.forEach(item => {
              if (!currentToc || itensPorPagina >= MAX_ITENS) {
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
                  
                  if (insertPoint) container.insertBefore(p, insertPoint);
                  else container.appendChild(p);
                  
                  insertPoint = p.nextSibling;
                  currentToc = p.querySelector('.toc-container');
                  itensPorPagina = 0;
              }
              currentToc.appendChild(item);
              itensPorPagina++;
          });

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
    // EVENTOS REACT 
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
         container.querySelectorAll('.page-container').forEach(page => {
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
        if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
