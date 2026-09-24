/* ==========================================================================
   ETIA TATTOO - Galería con lightbox
   Sin dependencias. Soporta ratón, teclado y gestos táctiles.
   ========================================================================== */
(function () {
  'use strict';

  var grids = document.querySelectorAll('[data-gallery]');
  if (!grids.length) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------- estructura
  var box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Galería de imágenes ampliada');
  box.hidden = true;
  box.innerHTML =
    '<button type="button" class="lightbox__close" aria-label="Cerrar galería">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.3 5.71 12 12.01l-6.3-6.3-1.41 1.41 6.3 6.3-6.3 6.3 1.41 1.41 6.3-6.3 6.3 6.3 1.41-1.41-6.3-6.3 6.3-6.3z"/></svg>' +
    '</button>' +
    '<button type="button" class="lightbox__nav lightbox__nav--prev" aria-label="Imagen anterior">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>' +
    '</button>' +
    '<button type="button" class="lightbox__nav lightbox__nav--next" aria-label="Imagen siguiente">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>' +
    '</button>' +
    '<figure class="lightbox__figure">' +
      '<img class="lightbox__img" alt="">' +
      '<figcaption class="lightbox__caption"></figcaption>' +
    '</figure>' +
    '<p class="lightbox__counter" aria-live="polite"></p>';
  document.body.appendChild(box);

  var imgEl     = box.querySelector('.lightbox__img');
  var capEl     = box.querySelector('.lightbox__caption');
  var counterEl = box.querySelector('.lightbox__counter');
  var closeBtn  = box.querySelector('.lightbox__close');
  var prevBtn   = box.querySelector('.lightbox__nav--prev');
  var nextBtn   = box.querySelector('.lightbox__nav--next');

  var items = [];        // galería activa
  var index = 0;
  var lastFocused = null;
  var scrollY = 0;

  // ------------------------------------------------------------------ montaje
  Array.prototype.forEach.call(grids, function (grid) {
    var figures = grid.querySelectorAll('[data-full]');
    Array.prototype.forEach.call(figures, function (fig, i) {
      var downX = 0, downY = 0, dragged = false;

      // en el carrusel horizontal de la home, arrastrar para desplazarse
      // no debe abrir el lightbox al soltar
      fig.addEventListener('pointerdown', function (e) {
        downX = e.clientX; downY = e.clientY; dragged = false;
      });
      fig.addEventListener('pointerup', function (e) {
        dragged = Math.abs(e.clientX - downX) > 10 ||
                  Math.abs(e.clientY - downY) > 10;
      });

      fig.addEventListener('click', function () {
        if (dragged) { dragged = false; return; }
        open(figures, i);
      });
    });
  });

  function collect(nodeList) {
    return Array.prototype.map.call(nodeList, function (n) {
      var im = n.querySelector('img');
      return {
        src: n.getAttribute('data-full') || (im && im.src),
        alt: (im && im.getAttribute('alt')) || '',
        caption: n.getAttribute('data-caption') || '',
        trigger: n
      };
    });
  }

  // ------------------------------------------------------------------ acciones
  function open(nodeList, i) {
    items = collect(nodeList);
    lastFocused = document.activeElement;
    scrollY = window.scrollY || window.pageYOffset;

    box.hidden = false;
    document.body.classList.add('is-lightbox-open');
    document.body.style.top = '-' + scrollY + 'px';

    show(i);
    // el foco va al cierre: es el control mas seguro para salir
    closeBtn.focus();
    document.addEventListener('keydown', onKey);
  }

  function close() {
    box.hidden = true;
    document.body.classList.remove('is-lightbox-open');
    document.body.style.top = '';
    window.scrollTo(0, scrollY);
    document.removeEventListener('keydown', onKey);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function show(i) {
    if (!items.length) return;
    index = (i + items.length) % items.length;
    var it = items[index];

    if (!reduceMotion) {
      imgEl.classList.remove('is-loaded');
    }
    imgEl.src = it.src;
    imgEl.alt = it.alt;
    // si viene de caché el evento 'load' puede no dispararse a tiempo:
    // sin esto la imagen se quedaría en opacity 0
    if (imgEl.complete && imgEl.naturalWidth > 0) {
      imgEl.classList.add('is-loaded');
    }
    capEl.textContent = it.caption || it.alt;
    capEl.hidden = !(it.caption || it.alt);
    counterEl.textContent = (index + 1) + ' / ' + items.length;

    var solo = items.length < 2;
    prevBtn.hidden = solo;
    nextBtn.hidden = solo;

    preload(index + 1);
    preload(index - 1);
  }

  function preload(i) {
    if (items.length < 2) return;
    var it = items[(i + items.length) % items.length];
    var p = new Image();
    p.src = it.src;
  }

  imgEl.addEventListener('load', function () {
    imgEl.classList.add('is-loaded');
  });

  // si una imagen falla, mostramos el hueco con su texto alternativo
  // en vez de dejar un lightbox aparentemente vacío
  imgEl.addEventListener('error', function () {
    imgEl.classList.add('is-loaded');
  });

  function next() { show(index + 1); }
  function prev() { show(index - 1); }

  // ------------------------------------------------------------------ eventos
  closeBtn.addEventListener('click', close);
  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);

  // click en el fondo (no sobre la imagen ni los botones)
  box.addEventListener('click', function (e) {
    if (e.target === box || e.target.classList.contains('lightbox__figure')) close();
  });

  function onKey(e) {
    switch (e.key) {
      case 'Escape':     e.preventDefault(); close(); break;
      case 'ArrowRight': e.preventDefault(); next();  break;
      case 'ArrowLeft':  e.preventDefault(); prev();  break;
      case 'Home':       e.preventDefault(); show(0); break;
      case 'End':        e.preventDefault(); show(items.length - 1); break;
      case 'Tab':        trapFocus(e); break;
    }
  }

  // el foco no debe escaparse del diálogo mientras está abierto
  function trapFocus(e) {
    var focusables = Array.prototype.filter.call(
      box.querySelectorAll('button'),
      function (b) { return !b.hidden; }
    );
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  // ------------------------------------------------------------------- gestos
  var startX = 0, startY = 0, tracking = false;

  box.addEventListener('touchstart', function (e) {
    if (box.hidden || e.touches.length !== 1) { tracking = false; return; }
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });

  box.addEventListener('touchend', function (e) {
    if (!tracking || box.hidden) return;
    tracking = false;
    var dx = e.changedTouches[0].clientX - startX;
    var dy = e.changedTouches[0].clientY - startY;
    // solo si el gesto es claramente horizontal
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) next(); else prev();
    }
  }, { passive: true });
})();
