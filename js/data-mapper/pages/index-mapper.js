(function (global) {
  'use strict';

  function IndexMapper() {
    BaseDataMapper.call(this);
  }
  IndexMapper.prototype = Object.create(BaseDataMapper.prototype);
  IndexMapper.prototype.constructor = IndexMapper;

  function nl2br(s) {
    return String(s == null ? '' : s).replace(/\n/g, '<br>');
  }
  // 빈 값도 항상 반영 (백오피스에서 값 삭제 시 이전 값/기본 텍스트 잔존 방지)
  function setText(sel, val) {
    document.querySelectorAll(sel).forEach(function (el) { el.textContent = (val == null ? '' : val); });
  }
  function setHtml(sel, val) {
    document.querySelectorAll(sel).forEach(function (el) { el.innerHTML = nl2br(val); });
  }
  function setBg(el, url) {
    if (!el) return;
    if (url) el.style.backgroundImage = 'url(' + url + ')';
    else ImageHelpers.applyBackgroundPlaceholder(el);
  }

  IndexMapper.prototype.getIndexSection = function () {
    var pages = this.getPages();
    return (pages.index && pages.index.sections && pages.index.sections[0]) || {};
  };

  IndexMapper.prototype.mapPage = function () {
    this.mapHero();
    this.mapAbout();
    this.mapRooms();
    this.mapMemory();
    this.mapStay();
  };

  // main_visual ← customFields.pages.index.sections[0].hero.images[isSelected]
  IndexMapper.prototype.mapHero = function () {
    var hero = this.getIndexSection().hero || {};
    var wrapper = document.querySelector('[data-index-hero-slides]');
    if (!wrapper) return;

    var images = this.getSelectedImages(hero.images || []);
    var sig = images.map(function (s) { return s.url; }).join('|') || 'placeholder';
    if (wrapper.dataset.heroSig === sig) return; // 동일 데이터 재실행 시 재초기화 생략(autoplay 리셋 방지)
    wrapper.dataset.heroSig = sig;

    if (!images.length) {
      wrapper.innerHTML = '<div class="swiper-slide"></div>';
      var ph = wrapper.firstChild;
      ImageHelpers.applyBackgroundPlaceholder(ph);
      ph.style.backgroundSize = 'cover';
      ph.style.backgroundPosition = 'center';
    } else {
      wrapper.innerHTML = images.map(function (img) {
        return '<div class="swiper-slide" style="background:url(' + img.url + ') center;background-size:cover;"></div>';
      }).join('');
    }
    if (typeof window.initVisualSwiper === 'function') window.initVisualSwiper();
  };

  // main_about (Greeting) ← essence (title / description / 첫 이미지) + hero.title(앞 장식 문구)
  IndexMapper.prototype.mapAbout = function () {
    var section = this.getIndexSection();
    var essence = section.essence || {};
    setText('[data-index-about-eyebrow]', section.hero && section.hero.title);
    setText('[data-index-about-title]', essence.title);
    setHtml('[data-index-about-description]', essence.description);
    setBg(document.querySelector('[data-index-about-image]'), this.getFirstSelectedImage(essence.images || []));
  };

  // main_room ← customFields.roomtypes[] (이미지=썸네일, btxt=name, stxt=nameEn, 링크 room.html?room_id={id})
  IndexMapper.prototype.mapRooms = function () {
    var wrapper = document.querySelector('[data-index-room-slides]');
    if (!wrapper) return;
    var self = this;
    var roomtypes = this.getRoomtypes().filter(function (rt) { return rt.name && rt.name.trim(); });

    var sig = roomtypes.map(function (rt) { return rt.id; }).join('|') || 'empty';
    if (wrapper.dataset.roomSig === sig) return;
    wrapper.dataset.roomSig = sig;

    if (!roomtypes.length) {
      wrapper.innerHTML = '<div class="swiper-slide item c01"><div class="img" data-noimg></div></div>';
    } else {
      wrapper.innerHTML = roomtypes.map(function (rt) {
        var thumb = self.getRoomtypeThumbnailUrl(rt) || '';
        var imgDiv = thumb
          ? '<div class="img" style="background:url(' + thumb + ') no-repeat center center;background-size:cover;"></div>'
          : '<div class="img" data-noimg></div>';
        return '' +
          '<div class="swiper-slide item c01">' +
            '<a href="room.html?room_id=' + rt.id + '" class="link">' +
              imgDiv +
              '<div class="txt">' +
                '<p class="btxt">' + (rt.name || '') + '</p>' +
                '<p class="stxt">' + (rt.nameEn || '') + '</p>' +
              '</div>' +
            '</a>' +
          '</div>';
      }).join('');
    }
    // 썸네일 없는 슬라이드 No-Image placeholder
    wrapper.querySelectorAll('.img[data-noimg]').forEach(function (el) {
      ImageHelpers.applyBackgroundPlaceholder(el);
    });
    if (typeof window.initRoomSwiper === 'function') window.initRoomSwiper();
  };

  // main_memory ← closing (description / 첫 이미지)
  IndexMapper.prototype.mapMemory = function () {
    var closing = this.getIndexSection().closing || {};
    setHtml('[data-index-memory-description]', closing.description);
    setBg(document.querySelector('[data-index-memory-image]'), this.getFirstSelectedImage(closing.images || []));
  };

  // main_stay ← gallery (title=태그라인 / description) + property.name + gallery.images(3칸)
  IndexMapper.prototype.mapStay = function () {
    var gallery = this.getIndexSection().gallery || {};
    setText('[data-index-stay-tagline]', gallery.title);
    setHtml('[data-index-stay-description]', gallery.description);
    setText('[data-index-stay-name]', this.getPropertyName());
    setText('[data-index-stay-name-en]', this.getPropertyNameEn());

    // 3칸 레이아웃(stay-img01/02/03) 유지하며 배경만 교체
    var container = document.querySelector('[data-index-stay-images]');
    if (container) {
      var imgs = this.getSelectedImages(gallery.images || []);
      var ps = container.querySelectorAll('li .img p');
      ps.forEach(function (p, i) { setBg(p, imgs[i] && imgs[i].url); });
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    // previewHandler가 데이터를 받았으면 스킵 (preview-handler가 처리)
    if (window.previewHandler && window.previewHandler.currentData) return;
    var mapper = new IndexMapper();
    mapper.initialize();
    global.indexMapperInstance = mapper;
  });

  global.IndexMapper = IndexMapper;
})(window);
