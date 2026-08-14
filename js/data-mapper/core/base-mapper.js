(function (global) {
  'use strict';

  function BaseDataMapper() {
    this.data = null;
    this.isDataLoaded = false;
  }

  BaseDataMapper.prototype.initialize = function () {
    var self = this;
    var url = 'standard-template-data.json?t=' + Date.now();
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load standard-template-data.json');
        return res.json();
      })
      .then(function (json) {
        self.data = json;
        self.isDataLoaded = true;
        self.mapPage();
        if (window.__tplReveal) window.__tplReveal(); // 매핑 완료 → 화면 노출(페이드인)
      })
      .catch(function (err) {
        console.error('[BaseDataMapper] initialize error:', err);
        if (window.__tplReveal) window.__tplReveal(); // 실패해도 화면은 노출
      });
  };

  BaseDataMapper.prototype.mapPage = function () {};

  BaseDataMapper.prototype.updateData = function (newData) {
    this.data = newData;
    this.isDataLoaded = true;
    this.mapPage();
    if (window.__tplReveal) window.__tplReveal(); // 매핑 완료 → 화면 노출(페이드인)
  };

  // ── 데이터 접근 헬퍼 ──────────────────────────────────────
  BaseDataMapper.prototype.getProperty = function () {
    return (this.data && this.data.property) || {};
  };

  BaseDataMapper.prototype.getHomepage = function () {
    return (this.data && this.data.homepage) || {};
  };

  BaseDataMapper.prototype.getCustomFields = function () {
    return this.getHomepage().customFields || {};
  };

  BaseDataMapper.prototype.getPages = function () {
    var pagesFromHomepage = this.getCustomFields().pages;
    if (pagesFromHomepage && Object.keys(pagesFromHomepage).length > 0) {
      return pagesFromHomepage;
    }

    if (this.data && this.data.customFields && this.data.customFields.pages) {
      return this.data.customFields.pages;
    }

    return {};
  };

  BaseDataMapper.prototype.getPropertyName = function () {
    var cf = this.getCustomFields();
    if (cf.property && cf.property.name) return cf.property.name;
    return this.getProperty().name || '';
  };

  BaseDataMapper.prototype.getPropertyNameEn = function () {
    var cf = this.getCustomFields();
    if (cf.property && cf.property.nameEn) return cf.property.nameEn;
    return this.getProperty().nameEn || '';
  };

  BaseDataMapper.prototype.getLogo = function () {
    var hp = this.getHomepage();
    var images = hp.images;
    if (!images || !images[0] || !images[0].logo) return '';
    var logos = images[0].logo;
    var selected = logos.find(function (l) { return l.isSelected; });
    return selected ? selected.url : (logos[0] ? logos[0].url : '');
  };

  BaseDataMapper.prototype.getBookingUrl = function () {
    return this.getProperty().realtimeBookingId || '#!';
  };

  // ── 이미지 헬퍼 ──────────────────────────────────────────
  BaseDataMapper.prototype.getSelectedImages = function (images) {
    if (!images || !images.length) return [];
    return images
      .filter(function (img) { return img.isSelected && img.url; })
      .sort(function (a, b) { return a.sortOrder - b.sortOrder; });
  };

  BaseDataMapper.prototype.getFirstSelectedImage = function (images) {
    var list = this.getSelectedImages(images);
    return list.length ? list[0].url : '';
  };

  // ── 객실타입(roomtypes) 공통 헬퍼 (room-mapper 와 동일 규칙) ───────
  // 객실명/이미지 = customFields.roomtypes, 그 외(상태·구성 등) = rooms[] (id 매칭)
  // 이름 미입력 roomtype 은 rooms[](id 매칭).name 으로 자동 보완 (입력했으면 입력값 우선)
  BaseDataMapper.prototype.getRoomtypes = function () {
    var cf = this.getCustomFields();
    var list = (cf.roomtypes && cf.roomtypes.length) ? cf.roomtypes
      : ((this.data && this.data.customFields && this.data.customFields.roomtypes) || cf.roomtypes || []);

    var self = this;
    return list.map(function (rt) {
      if (rt && rt.name && String(rt.name).trim()) return rt;
      var room = self.getMatchedRoom(rt);
      if (!room || !room.name) return rt;
      var merged = {};
      for (var k in rt) { if (Object.prototype.hasOwnProperty.call(rt, k)) merged[k] = rt[k]; }
      merged.name = room.name;
      return merged;
    });
  };

  // roomtypes[i].id === rooms[j].id 매칭
  BaseDataMapper.prototype.getMatchedRoom = function (roomtype) {
    if (!roomtype) return null;
    var rooms = (this.data && this.data.rooms) || [];
    return rooms.filter(function (r) { return r.id === roomtype.id; })[0] || null;
  };

  // roomtype 대표 썸네일 URL: roomtype_thumbnail → roomtype_interior → 그 외 (isSelected, sortOrder순 첫 이미지)
  BaseDataMapper.prototype.getRoomtypeThumbnailUrl = function (rt) {
    var imgs = (rt && rt.images) || [];
    var self = this;
    var pick = function (cat) {
      return self.getSelectedImages(imgs.filter(function (im) { return im.category === cat; }))[0];
    };
    var img = pick('roomtype_thumbnail') || pick('roomtype_interior') || this.getSelectedImages(imgs)[0];
    return img && img.url ? img.url : null;
  };

  // ── SEO 메타태그 업데이트 ──────────────────────────────────────
  BaseDataMapper.prototype.updateMetaTags = function (pageSEO) {
    var hp = this.getHomepage();
    var globalSEO = (hp && hp.seo) || {};
    var finalSEO = Object.assign({}, globalSEO, pageSEO || {});

    if (Object.keys(finalSEO).length > 0) {
      this.updateSEOInfo(finalSEO);
    }
  };

  BaseDataMapper.prototype.updateSEOInfo = function (seo) {
    if (!seo) return;

    // name 기반 meta 태그를 upsert (값 없으면 태그 생성 안 함 → 빈 태그 방지)
    function upsertMetaByName(name, content) {
      if (!content) return;
      var meta = document.head.querySelector('meta[name="' + name + '"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    }

    if (seo.title) {
      var titleEl = document.querySelector('title[data-page-title]') || document.querySelector('title');
      if (titleEl) titleEl.textContent = seo.title;
    }

    upsertMetaByName('description', seo.description);
    upsertMetaByName('keywords', seo.keywords);
    upsertMetaByName('naver-site-verification', seo.naverSiteVerification);
    upsertMetaByName('google-site-verification', seo.googleSiteVerification);
  };

  global.BaseDataMapper = BaseDataMapper;
})(window);
