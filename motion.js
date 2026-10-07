(function () {
  var reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mobileQuery = window.matchMedia('(max-width: 768px)');

  var PROJECTS = [
    {
      name: 'Sanaa Center',
      images: [
        'assets/sanaa/sanaa1.jpg',
        'assets/sanaa/sanaa2.jpg',
      ],
      meta: 'Baltimore · In progress · Commercial / Cultural · 18,000 sq ft',
      body:
        'The Sanaa Center is for the cultural life of Pennsylvania Avenue in West Baltimore. 18,000 square feet for a 350-seat theatre, artist studios, production space, and a cafe and bar. A 4,000-square-foot addition to the Harris Marcus Center extends the work of Intersection of Change.',
      records: ['18,000 sq ft', 'In progress', 'Baltimore'],
      type: 'Commercial / Cultural',
    },
    {
      name: 'Grounded',
      images: ['assets/grounded/grounded1.jpg'],
      meta: 'Washington, DC · 2024 · Hospitality · 3,070 sq ft',
      body: 'A hospitality project in Washington, DC. 3,070 square feet, completed in 2024.',
      records: ['3,070 sq ft', '2024', 'Washington, DC'],
      type: 'Hospitality',
    },
    {
      name: 'Co-Lab',
      images: [
        'assets/colab/colab1.jpg',
        'assets/colab/colab2.jpg',
        'assets/colab/colab3.jpg',
        'assets/colab/colab4.jpg',
        'assets/colab/colab5.jpg',
        'assets/colab/colab6.jpg',
        'assets/colab/colab7.jpg',
        'assets/colab/colab8.jpg',
      ],
      meta: 'Washington, DC · In progress · Commercial · 12,000 sq ft',
      body: 'A commercial project in Washington, DC. 12,000 square feet, in progress.',
      records: ['12,000 sq ft', 'In progress', 'Washington, DC'],
      type: 'Commercial',
    },
    {
      name: 'Elmina',
      images: [
        'assets/elmina/elmina1.jpg',
        'assets/elmina/elmina2.jpg',
        'assets/elmina/elmina3.jpg',
        'assets/elmina/elmina4.jpg',
      ],
      meta: 'Washington, DC · 2024 · Hospitality · 3,720 sq ft',
      body: 'A hospitality project in Washington, DC. 3,720 square feet, completed in 2024.',
      records: ['3,720 sq ft', '2024', 'Washington, DC'],
      type: 'Hospitality',
    },
    {
      name: 'Point of Action',
      images: ['assets/pointofaction/pointofaction1.jpg'],
      meta: 'New York · 2024 · Installation · with Cooke John Studio',
      body:
        'An installation in a public plaza in New York, 2024, with Cooke John Studio.',
      records: ['Public plaza', '2024', 'New York'],
      type: 'Installation · Cooke John Studio',
    },
  ];

  var leadIndex = 0;
  var featureIndex = 0;
  var featureImageIndex = 0;
  var workRow = null;
  var featureEl = null;
  var prevBtn = null;
  var nextBtn = null;

  function initialImageIndex(images) {
    if (!images || images.length < 2) {
      return 0;
    }
    for (var i = 0; i < images.length; i++) {
      if (!/1\.(jpg|jpeg|png|webp)$/i.test(images[i])) {
        return i;
      }
    }
    return 1;
  }

  function showFeatureImage(project) {
    var heroImg = featureEl.querySelector('.sanaa-hero img');
    if (!heroImg) {
      return;
    }
    var src = project.images[featureImageIndex] || project.images[0];
    heroImg.src = src;
    heroImg.alt = project.images.length > 1
      ? project.name + ' photograph ' + (featureImageIndex + 1) + ' of ' + project.images.length
      : project.name + ' photograph';
  }

  function renderFeatureFilm(project) {
    var gallery = featureEl.querySelector('.feature-gallery');
    var film = featureEl.querySelector('.feature-film');
    var count = featureEl.querySelector('.feature-film__count');
    var thumbs = featureEl.querySelector('.feature-thumbs');
    var multi = project.images.length > 1;

    if (gallery) gallery.hidden = !multi;
    if (film) film.hidden = !multi;
    if (!multi || !thumbs) {
      if (thumbs) thumbs.innerHTML = '';
      if (count) count.textContent = '';
      return;
    }

    if (count) {
      count.textContent = (featureImageIndex + 1) + ' / ' + project.images.length;
    }

    thumbs.innerHTML = '';
    for (var i = 0; i < project.images.length; i++) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'feature-thumb';
      if (i === featureImageIndex) {
        button.classList.add('is-selected');
      }
      button.setAttribute('aria-label', project.name + ', image ' + (i + 1));
      button.setAttribute('aria-pressed', i === featureImageIndex ? 'true' : 'false');

      var img = document.createElement('img');
      img.src = project.images[i];
      img.alt = '';
      img.width = 160;
      img.height = 120;
      button.appendChild(img);
      thumbs.appendChild(button);

      button.dataset.imageIndex = String(i);
      button.addEventListener('click', function () {
        featureImageIndex = Number(this.dataset.imageIndex);
        updateFeature(featureIndex);
      });
    }

    var selected = thumbs.querySelector('.is-selected');
    if (selected) {
      var strip = thumbs.getBoundingClientRect();
      var item = selected.getBoundingClientRect();
      if (item.left < strip.left || item.right > strip.right) {
        thumbs.scrollLeft += item.left - strip.left - 8;
      }
    }
  }

  function updateFeature(projectIndex, resetImage) {
    if (!featureEl) {
      return;
    }
    var project = PROJECTS[projectIndex];
    if (!project) {
      return;
    }

    if (resetImage || featureImageIndex >= project.images.length) {
      featureImageIndex = initialImageIndex(project.images);
    }

    showFeatureImage(project);
    renderFeatureFilm(project);

    var bodyEl = featureEl.querySelector('.body-text');
    if (bodyEl) {
      bodyEl.textContent = project.body;
    }

    var statEls = featureEl.querySelectorAll('.record-stats li');
    for (var s = 0; s < statEls.length && s < project.records.length; s++) {
      statEls[s].textContent = project.records[s];
    }

    var typeEl = featureEl.querySelector('.record-type');
    if (typeEl) {
      typeEl.textContent = project.type;
    }
  }

  function stepFeatureImage(delta) {
    var project = PROJECTS[featureIndex];
    if (!project || project.images.length < 2) {
      return;
    }
    featureImageIndex = (featureImageIndex + delta + project.images.length) % project.images.length;
    updateFeature(featureIndex);
  }

  function visibleSlotCount() {
    return mobileQuery.matches ? 1 : 3;
  }

  function projectIndexAtSlot(slot) {
    return (leadIndex + slot) % PROJECTS.length;
  }

  function renderWorkRow(resetImage) {
    if (!workRow) {
      return;
    }

    var slots = visibleSlotCount();
    workRow.innerHTML = '';

    for (var i = 0; i < slots; i++) {
      var projectIdx = projectIndexAtSlot(i);
      var project = PROJECTS[projectIdx];
      var card = document.createElement('article');
      card.className = 'work-card';
      if (projectIdx === featureIndex) {
        card.classList.add('is-selected');
      }
      card.dataset.projectIndex = String(projectIdx);

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'work-card__button';
      button.setAttribute('aria-label', 'View ' + project.name);

      var figure = document.createElement('figure');
      figure.className = 'work-card__figure';

      var img = document.createElement('img');
      img.src = project.images[0];
      img.alt = project.name + ' photograph';
      img.width = 800;
      img.height = 1000;

      figure.appendChild(img);

      var name = document.createElement('span');
      name.className = 'work-card__name';
      name.textContent = project.name;

      var meta = document.createElement('span');
      meta.className = 'work-card__meta';
      meta.textContent = project.meta;

      button.appendChild(figure);
      button.appendChild(name);
      button.appendChild(meta);
      card.appendChild(button);
      workRow.appendChild(card);

      button.addEventListener('click', function () {
        var idx = Number(this.closest('.work-card').dataset.projectIndex);
        var changed = idx !== featureIndex;
        featureIndex = idx;
        renderWorkRow(changed);
        var target = document.getElementById('feature');
        if (target) {
          target.scrollIntoView({ behavior: reducedQuery.matches ? 'auto' : 'smooth', block: 'start' });
        }
      });
    }

    updateFeature(featureIndex, resetImage);
  }

  function stepWork(delta) {
    leadIndex = (leadIndex + delta + PROJECTS.length) % PROJECTS.length;
    featureIndex = leadIndex;
    renderWorkRow(true);
  }

  function initFeaturedWork() {
    workRow = document.querySelector('.work-row');
    featureEl = document.getElementById('feature');
    prevBtn = document.querySelector('.work-step--prev');
    nextBtn = document.querySelector('.work-step--next');

    if (!workRow || !featureEl) {
      return;
    }

    leadIndex = Math.floor(Math.random() * PROJECTS.length);
    featureIndex = leadIndex;
    renderWorkRow(true);

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        stepWork(-1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        stepWork(1);
      });
    }

    var imagePrev = featureEl.querySelector('.feature-gallery__step--prev');
    var imageNext = featureEl.querySelector('.feature-gallery__step--next');
    if (imagePrev) {
      imagePrev.addEventListener('click', function () {
        stepFeatureImage(-1);
      });
    }
    if (imageNext) {
      imageNext.addEventListener('click', function () {
        stepFeatureImage(1);
      });
    }

    function onViewportChange() {
      renderWorkRow(false);
    }

    if (typeof mobileQuery.addEventListener === 'function') {
      mobileQuery.addEventListener('change', onViewportChange);
    } else if (typeof mobileQuery.addListener === 'function') {
      mobileQuery.addListener(onViewportChange);
    }
  }

  function initNavCurrent() {
    var nav = document.querySelector('.site-nav--bar');
    if (!nav) return;

    var wordmark = nav.querySelector('.site-nav__wordmark');
    var hero = document.querySelector('.hero-track');
    var links = nav.querySelectorAll('a[href^="#"]');
    var items = [];

    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href');
      if (!href || href === '#') continue;
      var section = document.getElementById(href.slice(1));
      if (!section) continue;
      items.push({ link: links[i], section: section });
    }

    function setCurrent(link, on) {
      if (!link) return;
      link.classList.toggle('is-current', on);
      if (on) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }

    function update() {
      var marker = window.scrollY + Math.min(window.innerHeight * 0.32, 240);
      var current = null;

      for (var i = 0; i < items.length; i++) {
        var top = items[i].section.getBoundingClientRect().top + window.scrollY;
        if (top <= marker) current = items[i];
      }

      var onHero = false;
      if (!current && hero) {
        var heroBottom = hero.getBoundingClientRect().bottom + window.scrollY;
        onHero = heroBottom > marker;
      }

      setCurrent(wordmark, onHero);
      for (var j = 0; j < items.length; j++) {
        setCurrent(items[j].link, items[j] === current);
      }
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('hashchange', update);
  }

  function shuffleList(list) {
    var copy = list.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var swap = copy[i];
      copy[i] = copy[j];
      copy[j] = swap;
    }
    return copy;
  }

  function initHeroReel() {
    var media = document.querySelector('[data-hero-slides]');
    var progress = document.querySelector('.hero-progress');
    if (!media || !progress) return;

    var slides = shuffleList(PROJECTS).slice(0, 4).map(function (project) {
      var images = project.images;
      var src = images[Math.floor(Math.random() * images.length)];
      return {
        name: project.name,
        src: src,
        alt: project.name + ' photograph'
      };
    });

    media.innerHTML = '';
    progress.innerHTML = '';

    var imgs = [];
    var bars = [];
    var slideIndex = 0;
    var slideTimer = 0;
    var SLIDE_MS = 7000;

    for (var i = 0; i < slides.length; i++) {
      var img = document.createElement('img');
      img.src = slides[i].src;
      img.alt = slides[i].alt;
      img.width = 1600;
      img.height = 900;
      media.appendChild(img);
      imgs.push(img);

      var bar = document.createElement('button');
      bar.type = 'button';
      bar.className = 'hero-progress__bar';
      bar.dataset.index = String(i);
      bar.setAttribute('role', 'tab');
      bar.setAttribute('aria-label', slides[i].name);
      var track = document.createElement('span');
      track.className = 'hero-progress__track';
      track.setAttribute('aria-hidden', 'true');
      var fill = document.createElement('span');
      fill.className = 'hero-progress__fill';
      track.appendChild(fill);
      bar.appendChild(track);
      progress.appendChild(bar);
      bars.push(bar);

      bar.addEventListener('click', function () {
        goTo(Number(this.dataset.index));
      });
    }

    function armTimer() {
      clearTimeout(slideTimer);
      if (reducedQuery.matches || document.hidden) return;
      slideTimer = setTimeout(function () {
        goTo((slideIndex + 1) % slides.length);
      }, SLIDE_MS);
    }

    function goTo(index) {
      slideIndex = index;

      for (var n = 0; n < imgs.length; n++) {
        var on = n === index;
        imgs[n].classList.toggle('is-active', on);
        bars[n].classList.toggle('is-active', on);
        bars[n].setAttribute('aria-selected', on ? 'true' : 'false');
        var fill = bars[n].querySelector('.hero-progress__fill');
        fill.style.animation = 'none';
        if (on && !reducedQuery.matches) {
          fill.offsetWidth;
          fill.style.animation = '';
        }
      }

      armTimer();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        clearTimeout(slideTimer);
      } else {
        goTo(slideIndex);
      }
    });

    goTo(0);
  }

  function initNewsletter() {
    var dialog = document.getElementById('newsletter');
    var work = document.getElementById('work');
    var press = document.getElementById('press-link');
    if (!dialog || !work || typeof dialog.showModal !== 'function') return;

    var form = dialog.querySelector('.newsletter__form');
    var thanks = dialog.querySelector('.newsletter__thanks');
    var email = dialog.querySelector('#newsletter-email');
    var shownFromScroll = false;
    var lastFocus = null;
    var pageOverflow = '';

    function resetForm() {
      if (form) {
        form.hidden = false;
        form.reset();
      }
      if (thanks) thanks.hidden = true;
    }

    function openDialog() {
      if (dialog.open) return;
      lastFocus = document.activeElement;
      pageOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      resetForm();
      dialog.showModal();
      if (email) email.focus();
    }

    function maybeOpenFromWork() {
      if (shownFromScroll || dialog.open) return;
      var top = work.getBoundingClientRect().top;
      if (top <= Math.min(window.innerHeight * 0.4, 320)) {
        shownFromScroll = true;
        window.removeEventListener('scroll', maybeOpenFromWork);
        openDialog();
      }
    }

    window.addEventListener('scroll', maybeOpenFromWork, { passive: true });
    maybeOpenFromWork();

    if (press) {
      press.addEventListener('click', function (event) {
        event.preventDefault();
        openDialog();
      });
    }

    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) dialog.close();
    });

    var closers = dialog.querySelectorAll('[data-newsletter-close]');
    for (var i = 0; i < closers.length; i++) {
      closers[i].addEventListener('click', function () {
        dialog.close();
      });
    }

    dialog.addEventListener('close', function () {
      document.documentElement.style.overflow = pageOverflow;
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    });

    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        form.hidden = true;
        if (thanks) {
          thanks.hidden = false;
          var thanksClose = thanks.querySelector('[data-newsletter-close]');
          if (thanksClose) thanksClose.focus();
        }
      });
    }
  }

  function init() {
    initFeaturedWork();
    initNavCurrent();
    initHeroReel();
    initNewsletter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
