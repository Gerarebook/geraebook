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

      container.querySelectorAll('.cap-img-overlay').forEach(overlay => {
         let bg = overlay.style.backgroundImage || '';
         if (overlay.dataset.unsplash && (bg === '' || bg === 'none' || bg.includes('initial') || bg === '')) {
            const keyword = encodeURIComponent(overlay.dataset.unsplash.trim());
            const cacheBuster = Math.random().toString(36).substring(7);
            overlay.style.setProperty('background-image', \`url('https://images.unsplash.com/featured/1200x800/?\${keyword},abstract,texture,sig\${cacheBuster}')\`, 'important');
         }
      });

      const metaTitle = document.getElementById('meta-book-title');
      let tituloDoLivro = metaTitle && metaTitle.getAttribute('content') ? metaTitle.getAttribute('content').toUpperCase().trim() : "";

      container.querySelectorAll('.page-header').forEach(h => {
         const spans = h.querySelectorAll('span');
         if (spans.length >= 1) spans[0].textContent = ''; 
         if (spans.length >= 2) spans[1].textContent = tituloDoLivro;
      });

      let modeloFooter = '<span class="page-number"></span>';
      const footerExistente = container.querySelector('.page-footer');
      if (footerExistente) {
        modeloFooter = footerExistente.innerHTML;
      }

      const todasPaginas = container.querySelectorAll('.page-container');
      todasPaginas.forEach(p => {
        if (p.classList.contains('page-cover-img') || 
            p.classList.contains('page-cover-pura') || 
            p.classList.contains('page-cover-text') || 
            p.hasAttribute('data-legal') ||
            p.classList.contains('page-extra') ||
            p.querySelector('.cap-img-overlay') || 
            p.querySelector('.toc-container') || 
            p.classList.contains('author-page')) {
            return; 
        }
        
        const area = p.querySelector('.content-area') || p;
        p.querySelectorAll('.page-header, .page-footer').forEach(l => l.remove());

        while (area.firstChild) {
            container.insertBefore(area.firstChild, p);
        }
        p.remove();
      });

      container.querySelectorAll('hr').forEach(hr => hr.remove());
      container.querySelectorAll('p').forEach(p => {
          if (p.innerHTML) {
            p.innerHTML = p.innerHTML.replace(/^(&nbsp;|\\s)+/g, '');
          }
          if (!p.textContent.trim() && !p.querySelector('img')) p.remove();
      });

      Array.from(container.childNodes).forEach(node => {
          if (node.nodeType === 3 && node.textContent.trim() !== '') {
              const p = document.createElement('p');
              p.textContent = node.textContent;
              container.insertBefore(p, node);
              node.remove();
          }
      });

      const elementosIA = Array.from(container.children).filter(el =>
        !el.classList.contains('page-container') &&
        !el.classList.contains('page-cover-img') &&
        !el.classList.contains('page-cover-pura') &&
        !el.classList.contains('page-cover-text') &&
        !el.hasAttribute('data-legal') &&
        !el.classList.contains('author-page') &&
        !el.classList.contains('page-extra') &&
        el.tagName !== 'STYLE' &&
        el.tagName !== 'SCRIPT'
      );

      const indexConclusao = elementosIA.findIndex(el => el.id === 'conclusao' || (el.tagName === 'H1' && (el.textContent || '').toLowerCase().includes('conclusão')));
      
      if (indexConclusao !== -1) {
          const indexNovoCapitulo = elementosIA.findIndex((el, i) => i > indexConclusao && (el.tagName === 'H2' || el.classList.contains('cap-img-overlay')));
          if (indexNovoCapitulo !== -1) {
              const partesConclusao = elementosIA.splice(indexConclusao, indexNovoCapitulo - indexConclusao);
              elementosIA.push(...partesConclusao);
          }
      }

      const LIMITE_ALTURA_TEXTO = 940; 

      function criarNovaPagina() {
        const novaPagina = document.createElement('div');
        novaPagina.className = 'page-container chapter-text-page';
        novaPagina.style.overflow = 'hidden';
        novaPagina.style.breakAfter = 'page';

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

        const endPage = container.querySelector('.author-page');
        if (endPage) {
            container.insertBefore(novaPagina, endPage);
        } else {
            container.appendChild(novaPagina);
        }
        return { pagina: novaPagina, areaTexto: contentArea };
      }

      if (elementosIA.length > 0) {
        let atual = criarNovaPagina();

        for (let i = 0; i < elementosIA.length; i++) {
          let el = elementosIA[i];
          let deveQuebrar = false;

          if (atual.areaTexto.children.length > 0) {
            if (el.tagName === 'H1' || el.tagName === 'H2' || el.classList.contains('cap-img-overlay')) {
              deveQuebrar = true; 
            } 
            else if (atual.areaTexto.querySelector('.cap-img-overlay') || atual.areaTexto.classList.contains('cap-img-overlay')) {
              deveQuebrar = true;
            }
            else if (el.tagName === 'H3' && atual.areaTexto.querySelectorAll('p, blockquote, ul, .highlight-box, .concept-box, img').length > 0) {
              deveQuebrar = true; 
            }
          }

          if (deveQuebrar) atual = criarNovaPagina();

          atual.areaTexto.appendChild(el);

          if (atual.areaTexto.scrollHeight > LIMITE_ALTURA_TEXTO) {
            if (!el.classList.contains('cap-img-overlay')) {
              if (atual.areaTexto.children.length > 1) {
                  atual.areaTexto.removeChild(el); 
                  let orfao = atual.areaTexto.lastElementChild;
                  let moveOrfao = false;
                  if (orfao && (orfao.tagName === 'H2' || orfao.tagName === 'H3' || orfao.tagName === 'BLOCKQUOTE')) {
                      moveOrfao = true;
                      atual.areaTexto.removeChild(orfao);
                  }
                  atual = criarNovaPagina();
                  if (moveOrfao) atual.areaTexto.appendChild(orfao);
                  atual.areaTexto.appendChild(el);
              }
            }
          }
        }
      }

      container.querySelectorAll('.chapter-text-page').forEach(page => {
        const area = page.querySelector('.content-area');
        if (!area || area.children.length === 0) page.remove();
      });

      function sincronizarIndice() {
        let tocs = container.querySelectorAll('.toc-container');
        if (tocs.length === 0) return;
        
        const mainToc = tocs[0];
        const mainPage = mainToc.closest('.page-container');
        if (!mainPage) return;

        const allTocPages = container.querySelectorAll('.page-container .toc-container');
        allTocPages.forEach((toc, index) => {
          if (index > 0) {
            const page = toc.closest('.page-container');
            if (page) page.remove();
          }
        });

        mainToc.innerHTML = '';

        const titulos = container.querySelectorAll('h1, h2, h3');
        const titulosVistos = new Set();
        const itens = [];

        titulos.forEach((titleEl) => {
          if (titleEl.closest('.page-cover-img, .page-cover-text, .page-cover-pura, [data-legal], .page-extra')) return;
          
          let texto = titleEl.textContent?.trim() || '';
          if (!texto || /índice|sumário/i.test(texto)) return;

          let chave = texto.toLowerCase().replace(/capítulo\\s*\\d+:/, '').trim();
          if (titulosVistos.has(chave)) return;
          titulosVistos.add(chave);

          if (!titleEl.id) {
            titleEl.id = 'sec-' + Math.random().toString(36).substr(2, 9);
          }

          const a = document.createElement('a');
          a.className = 'toc-item';
          
          const isMain = titleEl.tagName === 'H1' || titleEl.tagName === 'H2';
          if (isMain) {
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
          
          const spanTitle = document.createElement('span');
          spanTitle.innerText = texto;
          
          const spanDots = document.createElement('span');
          spanDots.className = 'toc-dots';
          
          const spanPage = document.createElement('span');
          spanPage.className = 'toc-page-num';

          a.appendChild(spanTitle);
          a.appendChild(spanDots);
          a.appendChild(spanPage);
          
          itens.push(a);
        });

        if (itens.length === 0) {
          mainPage.remove();
          return;
        }

        function criarPaginaIndice(afterPage) {
          const novaPagina = document.createElement('div');
          novaPagina.className = 'page-container chapter-text-page';
          novaPagina.style.overflow = 'hidden';
          novaPagina.style.breakAfter = 'page';

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

          const newToc = document.createElement('div');
          newToc.className = 'toc-container';
          contentArea.appendChild(newToc);

          if (afterPage && afterPage.parentNode) {
            afterPage.parentNode.insertBefore(novaPagina, afterPage.nextSibling);
          } else {
            const authorPage = container.querySelector('.author-page');
            if (authorPage) {
              container.insertBefore(novaPagina, authorPage);
            } else {
              container.appendChild(novaPagina);
            }
          }
          return { pagina: novaPagina, toc: newToc };
        }

        let currentPage = mainPage;
        let currentToc = mainToc;
        
        const LIMITE_ALTURA_INDICE = 720; 
        let itemCount = 0;

        for (let i = 0; i < itens.length; i++) {
          const item = itens[i];
          currentToc.appendChild(item);
          itemCount++;

          const contentArea = currentPage.querySelector('.content-area');
          
          if ((contentArea && contentArea.scrollHeight > LIMITE_ALTURA_INDICE) || itemCount >= 22) {
            currentToc.removeChild(item); 
            
            const nova = criarPaginaIndice(currentPage); 
            currentPage = nova.pagina;
            currentToc = nova.toc;
            
            currentToc.appendChild(item); 
            itemCount = 1; 
          }
        }

        container.querySelectorAll('.page-container').forEach(page => {
          const toc = page.querySelector('.toc-container');
          if (toc && !page.querySelector('.toc-item')) {
            const contentArea = page.querySelector('.content-area');
            if (contentArea) {
              const children = Array.from(contentArea.children);
              const onlyToc = children.length === 1 && children[0].classList.contains('toc-container');
              if (onlyToc) {
                page.remove();
              }
            }
          }
        });

        // ==========================================
        // MATEMÁTICA DE NUMERAÇÃO PERFEITA
        // ==========================================
        const allPages = Array.from(container.children).filter(el => {
          return (el.classList.contains('page-container') ||
                  el.classList.contains('page-cover-img') ||
                  el.classList.contains('page-cover-pura') ||
                  el.classList.contains('page-cover-text') ||
                  el.hasAttribute('data-legal') ||
                  el.classList.contains('author-page') ||
                  el.classList.contains('page-extra')) && 
                  el.style.display !== 'none';
        });
        
        const allTocItems = container.querySelectorAll('.toc-item');
        allTocItems.forEach(item => {
          const href = item.getAttribute('href');
          if (!href || !href.startsWith('#')) return;
          const target = document.getElementById(href.substring(1));
          if (target) {
            const page = target.closest('.page-container, .page-cover-img, .page-cover-pura, .page-cover-text, [data-legal], .author-page, .page-extra');
            if (page) {
              const idx = allPages.indexOf(page) + 1;
              const numSpan = item.querySelector('.toc-page-num');
              if (numSpan) numSpan.innerText = String(idx);
            }
          }
        });
      }

      sincronizarIndice();

      if (isEditMode && selectedEl) {
         selectedEl.style.outline = '3px solid #4f46e5';
      }

      window.scrollTo(0, currentScrollY);

      setTimeout(() => {
        if (observer) observer.observe(document.getElementById('ebook-container'), { childList: true, subtree: true });
      }, 300);
    }

    window.addEventListener('message', (e) => {
      if (e.data.type === 'TOGGLE_EDIT_MODE') {
         isEditMode = e.data.value;
         if (!isEditMode && selectedEl) {
            selectedEl.style.outline = '';
            selectedEl = null;
         }
      }
      
      // EXCLUSÃO EM JS PURO E REFLUXO AUTÔNOMO
      if (e.data.type === 'DELETE_ELEMENT') {
         const target = document.getElementById(e.data.id);
         if (target) {
            target.remove();
            // FORÇA A REORGANIZAÇÃO DO LAYOUT ANTES DE SALVAR (Textos sobem para tapar o buraco)
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
            // REORGANIZA O LAYOUT EM JS PURO APÓS EDIÇÃO IA
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

    if (document.readyState === 'complete') {
      executarRefluxoCompleto();
    } else {
      window.addEventListener('load', () => {
        executarRefluxoCompleto();
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