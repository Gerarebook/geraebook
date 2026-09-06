export interface ThemeOptions {
  fontFamily: string;
  tamanhoFonteBase: string;
  espacamentoLinhas: string;
  recuoParagrafo: string;
  tipoBorda: string;
  corFundoPagina: string;
  corTextoDetalhes: string;
  alinhamentoCapitulo: string;
  corFundoCapitulo: string;
  corRetanguloCapitulo: string;
  estiloRodape: string;
  indexShowSubtopics: boolean;
  imagemCapaUrl: string;
  livroTitulo: string;
}

export function getPaletaObj(bg: string, text: string) {
  return { bg, text, pri: text, sec: text, borda: text };
}

export function purificarHTML(rawHtml: string) {
  let clean = rawHtml;
  const markdownMatch = clean.match(/```html([\s\S]*?)```/i);
  if (markdownMatch) clean = markdownMatch[1];
  clean = clean.replace(/```html/gi, '').replace(/```/gi, '').trim();

  clean = clean.replace(/<script id="editor-magic-script">[\s\S]*?<\/script>/gi, '');
  clean = clean.replace(/<style id="builder-core-styles">[\s\S]*?<\/style>/gi, '');
  
  clean = clean.replace(/\bbuilder-editing\b/gi, '');
  clean = clean
    .replace(/cursor:\s*pointer;?/gi, '')
    .replace(/cursor:\s*text;?/gi, '')
    .replace(/outline:\s*3px dashed rgb\(79, 70, 229\);?/gi, '')
    .replace(/outline:\s*1px solid rgb\(203, 213, 225\);?/gi, '')
    .replace(/outline-offset:\s*-3px;?/gi, '')
    .replace(/data-old-outline="[^"]*"/gi, '')
    .replace(/\s*style="\s*"/gi, '');
  
  clean = clean.replace(/ class="\s*"/gi, '');

  clean = clean.replace(/<br\s*\/?>/gi, '');
  clean = clean.replace(/<p>[\s\n\r&nbsp;]*<\/p>/gi, '');

  clean = clean.replace(/<span class="toc-page-num">[^<]*<\/span>/gi, '<span class="toc-page-num"></span>');
  clean = clean.replace(/<span class="page-number( circulo)?">[^<]*<\/span>/gi, '<span class="page-number$1"></span>');

  clean = clean.replace(/<p>\s*<a class="toc-item"/gi, '<a class="toc-item"');
  clean = clean.replace(/<\/a>\s*<\/p>/gi, '</a>');
  clean = clean.replace(/<p>\s*<div class="toc-container"/gi, '<div class="toc-container"');
  clean = clean.replace(/<\/div>\s*<\/p>/gi, '</div>');
  clean = clean.replace(/<div class="page-container[^>]*>[\s\n\r]*(<div class="page-header"[^>]*>.*?<\/div>)?[\s\n\r]*(<div class="page-footer"[^>]*>.*?<\/div>)?[\s\n\r]*<\/div>/gi, '');

  clean = clean.replace(/<p\s+[^>]*>/gi, (match) => {
    if (/style\s*=|data-|class\s*=/i.test(match)) return match;
    return '<p>';
  });

  return clean.trim();
}

export function getEstilosFormato() {
  return { width: '210mm', height: '297mm', padding: '22mm 20mm 25mm 20mm' };
}

export function moldarApresentacaoHtml(rawHtml: string, opts: ThemeOptions) {
  let clean = purificarHTML(rawHtml);
  clean = clean.replace(/<style id="ebook-dynamic-styles">[\s\S]*?<\/style>/gi, '');
  clean = clean.replace(/<p>(\s|&nbsp;)+/gi, '<p>');
  
  const conf = getEstilosFormato();
  const paleta = getPaletaObj(opts.corFundoPagina, opts.corTextoDetalhes);
  const opacidadeSegura = 0.85;

  const ebookStyles = `<style id="ebook-dynamic-styles">
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');

:root {
  --color-bg: ${paleta.bg};
  --color-text: ${paleta.text};
  --color-primary: ${paleta.pri};
  --color-secondary: ${paleta.sec};
  --color-border: ${paleta.borda};
  --font-heading: ${opts.fontFamily === 'Poppins' ? "'Poppins', sans-serif" : (opts.fontFamily === 'Arial' || opts.fontFamily === 'Verdana' ? "'" + opts.fontFamily + "', sans-serif" : "'Playfair Display', serif")};
  --font-body: ${['Arial', 'Verdana', 'Poppins', 'Lato'].includes(opts.fontFamily) ? "'" + opts.fontFamily + "', sans-serif" : "'" + opts.fontFamily + "', serif"};
  --line-spacing: ${opts.espacamentoLinhas};
  --p-spacing: 0.8em;
  --text-indent: ${opts.recuoParagrafo === '0px' ? '0' : opts.recuoParagrafo};
  --cap-box-bg: color-mix(in srgb, ${opts.corRetanguloCapitulo || '#1e3a8a'} ${Math.round(opacidadeSegura * 100)}%, transparent);
}

body {
  background-color: #e2e8f0; margin: 0; padding: 2rem 0; display: flex; flex-direction: column; align-items: center;
  font-family: var(--font-body); color: var(--color-text);
  counter-reset: ebook-page;
}

#ebook-container { display: flex; flex-direction: column; align-items: center; width: 100%; }
${opts.indexShowSubtopics ? '' : '.toc-subtopic { display: none !important; }'}

#ebook-container * {
  max-width: 100% !important; box-sizing: border-box !important; overflow-wrap: break-word !important; word-break: break-word !important;
}

img.chapter-banner-img { width: 100% !important; height: 300px !important; object-fit: cover !important; border-radius: 8px !important; margin: 15px 0 !important; display: block !important; }
h2.chapter-title-inline { margin-top: 25px !important; margin-bottom: 15px !important; font-family: var(--font-heading) !important; font-size: 1.8rem !important; }
.page-container > h3.subtopic-title:first-of-type, .page-container > .page-header + h3.subtopic-title { margin-top: 0 !important; }

.page-container, .legal-page, .author-page, .page-extra, .cap-img-overlay, .cap-box-rounded, .cap-img-pura {
  background-color: var(--color-bg) !important;
  width: ${conf.width} !important; height: ${conf.height} !important;
  min-width: ${conf.width} !important; min-height: ${conf.height} !important; max-width: ${conf.width} !important; max-height: ${conf.height} !important;
  flex-shrink: 0 !important; padding: ${conf.padding}; margin: 0 auto 20px auto; box-sizing: border-box;
  position: relative; overflow: hidden !important; page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); counter-increment: ebook-page;
}

.page-cover-img, .page-cover-pura, .page-cover-text {
  background: url('${opts.imagemCapaUrl}') center/cover no-repeat !important;
  background-color: var(--color-bg) !important;
  color: #ffffff !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  align-items: center !important;
  text-align: center !important;
  width: 210mm !important;
  height: 297mm !important;
  max-width: 210mm !important;
  max-height: 297mm !important;
  padding: 0 !important;
  margin: 0 auto 20px auto !important;
  border: none !important;
}

.page-cover-img::after, .page-cover-pura::after, .page-cover-text::after {
  display: none !important;
  content: none !important;
  border: none !important;
}

/* BLINDAGEM ABSOLUTA DA CAPA INICIAL CONTRA LINHAS */
#ebook-container > .page-container:first-child::after {
  display: none !important;
  content: none !important;
  border: none !important;
}

/* BLINDAGEM CONTRA BORDAS E CABEÇALHOS NA CAPA DO CAPÍTULO (Mesmo após edição) */
.page-container:has(.cap-img-overlay)::after { 
  display: none !important; 
}
.page-container:has(.cap-img-overlay) .page-header, 
.page-container:has(.cap-img-overlay) .page-footer { 
  display: none !important; 
  opacity: 0 !important; 
  visibility: hidden !important; 
}

/* BLINDAGEM DE LARGURA E CENTRALIZAÇÃO DO TÍTULO NA CAPA */
.page-cover-img h1, .page-cover-pura h1, .page-cover-text h1 {
  width: 100% !important;
  padding: 0 20mm !important;
  box-sizing: border-box !important;
  overflow-wrap: break-word !important;
  word-break: break-word !important;
  hyphens: auto;
  font-size: 3.5rem;
  font-weight: 800;
  margin: 0 0 0.5rem 0;
  color: #ffffff !important;
  text-align: center !important;
  text-shadow: 0 0 20px rgba(0,0,0,0.9), 0 2px 10px rgba(0,0,0,0.8);
}
.page-cover-img p, .page-cover-pura p, .page-cover-text p {
  width: 100% !important;
  padding: 0 20mm !important;
  box-sizing: border-box !important;
  overflow-wrap: break-word !important;
  word-break: break-word !important;
  hyphens: auto;
  font-size: 1.2rem;
  opacity: 0.9;
  color: #ffffff !important;
  text-align: center !important;
  text-shadow: 0 0 15px rgba(0,0,0,0.9);
}

#ebook-container > .page-container:first-child .page-header, #ebook-container > .page-container:first-child .page-footer,
.page-cover-img .page-header, .page-cover-img .page-footer, 
.page-cover-pura .page-header, .page-cover-pura .page-footer,
.page-cover-text .page-header, .page-cover-text .page-footer,
.cap-box-rounded .page-header, .cap-box-rounded .page-footer {
  display: none !important;
  opacity: 0 !important;
  visibility: hidden !important;
}

.chapter-text-page { padding-top: 25mm !important; }

.page-container::after, .cap-img-overlay::after {
  content: ''; position: absolute; top: 6mm; left: 6mm; right: 6mm; bottom: 6mm; pointer-events: none; z-index: 50;
  border: ${opts.tipoBorda === 'single' ? '1px solid var(--color-border)' : opts.tipoBorda === 'medium' ? '2px solid var(--color-border)' : opts.tipoBorda === 'double-thin' ? '3px double var(--color-border)' : 'none'};
}
.page-cover-img::after, .cap-img-overlay::after { display: none !important; }

.cap-img-overlay { 
  position: absolute !important; top: 0; left: 0; right: 0; bottom: 0;
  background-size: cover !important;
  background-position: center !important;
  background-color: ${opts.corFundoCapitulo || '#0f172a'} !important;
  display: flex !important; flex-direction: column !important; justify-content: ${opts.alinhamentoCapitulo} !important; align-items: center !important; 
  padding: 15% 10% !important; z-index: 30; page-break-inside: avoid; break-inside: avoid;
}
.cap-img-overlay::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.45)); z-index: 31; }
.cap-img-overlay .cap-overlay-box { 
  background: var(--cap-box-bg) !important; backdrop-filter: blur(10px); padding: 50px 40px !important; border-radius: 12px !important; 
  box-shadow: 0 20px 40px rgba(0,0,0,0.4); width: 100% !important; max-width: 85% !important; text-align: center !important; z-index: 32; position: relative;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
}
.cap-img-overlay h1.chapter-title-exclusive {
  margin: 0 !important;
  color: #ffffff !important;
  font-size: 2.2rem !important;
  line-height: 1.2 !important;
  font-weight: 700;
  font-family: var(--font-heading);
  text-transform: none !important;
  text-shadow: 0 0 20px rgba(0,0,0,0.7);
}
.cap-overlay-box i {
  display: block;
  font-size: 3rem !important;
  margin-bottom: 1rem !important;
  color: #ffffff;
  text-shadow: 0 0 15px rgba(0,0,0,0.5);
}

.page-header { position: absolute; top: 12mm; left: 18mm; right: 18mm; display: flex; justify-content: space-between; align-items: flex-end; font-size: 8pt; color: var(--color-primary); opacity: 0.8; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 5px; font-weight: 700; text-transform: uppercase; z-index: 20; letter-spacing: 0.5px; }
.page-footer { position: absolute; bottom: 10mm; left: 18mm; right: 18mm; font-size: 9pt; color: var(--color-primary); font-weight: 600; z-index: 20; opacity: 0.8; ${opts.estiloRodape.includes('centralizado') ? 'display: flex; justify-content: center; align-items: center;' : 'display: flex; justify-content: space-between; align-items: center;'} ${opts.estiloRodape === 'linha-superior' ? 'border-top: 1px solid var(--color-primary); padding-top: 8px;' : ''} }
.page-number { margin-left: auto !important; }
.page-number::after { content: counter(ebook-page); }

h1, h2, h3, h4 { font-family: var(--font-heading); color: var(--color-primary); }
h1 { font-weight: 800; font-size: 2.2rem; margin-top: 0; margin-bottom: 1em; text-align: center; }
h2:not(.chapter-title-inline) { font-weight: 700; font-size: 1.8rem; margin-top: 1.5rem; margin-bottom: 1.5rem; }

h3 {
  font-size: 1.4rem !important;
  font-weight: 800 !important;
  margin-top: 1.2rem;
  margin-bottom: 1.5rem !important;
  border-bottom: none !important;
}

p { font-size: ${opts.tamanhoFonteBase} !important; line-height: var(--line-spacing) !important; margin-top: 0 !important; margin-bottom: var(--p-spacing) !important; text-align: justify !important; text-indent: var(--text-indent) !important; hyphens: auto; -webkit-hyphens: auto; max-width: 100% !important; box-sizing: border-box !important; }

blockquote { font-style: italic; color: var(--color-text); border-left: 4px solid var(--color-primary); background: color-mix(in srgb, var(--color-text) 5%, transparent); padding: 12px 18px; margin: 1rem 0; font-size: ${opts.tamanhoFonteBase}; border-radius: 0 8px 8px 0; }
.highlight-box { background: color-mix(in srgb, var(--color-text) 8%, transparent); border-left: 4px solid var(--color-primary); padding: 12px 18px; border-radius: 8px; margin: 1rem 0; font-weight: 500; font-size: ${opts.tamanhoFonteBase}; display: flex; align-items: center; gap: 12px; }

.concept-box {
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  border: 2px solid var(--color-primary);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin: 1.5rem 0 1rem 0;
  text-align: center;
  font-weight: 500;
  font-size: ${opts.tamanhoFonteBase};
  color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.concept-box i {
  display: block;
  font-size: 2rem !important;
  margin-bottom: 0.5rem;
  color: var(--color-primary);
}

img { max-width: 100%; height: auto; max-height: 35vh; border-radius: 0.5rem; margin: 1rem auto; display: block; object-fit: cover; }
.toc-container { display: flex; flex-direction: column; width: 100%; margin: 1rem 0; z-index: 60; position: relative; }
.toc-item { display: flex; align-items: baseline; justify-content: space-between; width: 100%; text-decoration: none; color: var(--color-text); font-family: var(--font-body) !important; font-size: ${opts.tamanhoFonteBase} !important; padding: 6px 0; }
.toc-dots { flex-grow: 1; border-bottom: 2px dotted var(--color-primary); margin: 0 8px; opacity: 0.3; }
.toc-page-num { font-weight: bold; color: var(--color-primary); }

.toc-subtopic {
  font-size: 0.75em !important;
  line-height: 1 !important;
  padding: 2px 0 !important;
  margin-bottom: 2px !important;
}

.author-page { display: block; }
.author-section { width: 100%; margin-top: 1.5rem; display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
.author-photo { flex-shrink: 0; object-fit: cover; border: 3px solid rgba(255,255,255,0.8); }

@page { size: A4 portrait; margin: 0; }
@media print {
  html, body { background: #ffffff !important; padding: 0 !important; margin: 0 !important; display: block !important; width: ${conf.width} !important; height: auto !important; }
  .page-container, .cap-img-overlay { width: ${conf.width} !important; height: ${conf.height} !important; margin: 0 !important; padding: ${conf.padding} !important; page-break-after: always !important; box-shadow: none !important; border: none !important; }
}
</style>`;

  if (clean.toLowerCase().includes('<body')) {
    if (!clean.includes('@media print')) {
      clean = clean.replace('</head>', ebookStyles + '\n</head>');
    }
    return clean;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta id="meta-book-title" content="${opts.livroTitulo}">
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<link href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<title>${opts.livroTitulo || 'Meu E-book Profissional'}</title>
${ebookStyles}
</head>
<body class="antialiased">
<div id="ebook-container">
  ${clean}
</div>
</body>
</html>`;
}

export function ajustarParagrafos(html: string): string {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const paragrafos = tempDiv.querySelectorAll('p');
  paragrafos.forEach(p => {
    let texto = p.textContent || '';
    texto = texto.replace(/\s+/g, ' ').trim();
    if (texto.length > 600) {
      const mid = Math.min(450, texto.length);
      let breakPos = texto.lastIndexOf('. ', mid);
      if (breakPos === -1) breakPos = texto.lastIndexOf('? ', mid);
      if (breakPos === -1) breakPos = texto.lastIndexOf('! ', mid);
      if (breakPos !== -1) {
        const p1 = texto.substring(0, breakPos + 1);
        const p2 = texto.substring(breakPos + 2);
        p.textContent = p1;
        const novoP = document.createElement('p');
        novoP.textContent = p2;
        p.parentNode?.insertBefore(novoP, p.nextSibling);
      }
    }
  });
  return tempDiv.innerHTML;
}