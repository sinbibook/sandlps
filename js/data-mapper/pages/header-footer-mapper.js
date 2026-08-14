(function (global) {
  'use strict';

  function HeaderFooterMapper() {
    BaseDataMapper.call(this);
  }
  HeaderFooterMapper.prototype = Object.create(BaseDataMapper.prototype);
  HeaderFooterMapper.prototype.constructor = HeaderFooterMapper;

  HeaderFooterMapper.prototype.mapPage = function () {
    this.mapLogo();
    this.mapFavicon();
    this.mapBookingLinks();
    this.mapYbsButton();
    this.mapRoomMenu();
    this.mapFacilityMenu();
    this.mapTravelMenu();
    this.mapPreviewMenu();
    this.mapFooter();
    // SEO: homepage.seo → <title data-page-title> + description/keywords + 네이버/구글 사이트 인증 (standalone 보장)
    this.updateMetaTags();
    this.mapOgTags();
  };

  // MAPPER: homepage.seo → og:title / og:description (standalone 보장, admin은 applySeo)
  HeaderFooterMapper.prototype.mapOgTags = function () {
    var seo = this.getHomepage().seo || {};
    function setMeta(key, content) {
      if (!content) return;
      var meta = document.head.querySelector('meta[property="' + key + '"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', key);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    }
    setMeta('og:title', seo.title);
    setMeta('og:description', seo.description);
  };

  // MAPPER: layoutMap.enabled === false 이면 미리보기(data-menu-id="layout-map") 숨김 (헤더 + 각 snb 공통)
  HeaderFooterMapper.prototype.mapPreviewMenu = function () {
    var pages = this.getPages();
    var lm = pages.layoutMap && pages.layoutMap.sections && pages.layoutMap.sections[0];
    var hide = !!(lm && lm.enabled === false);
    document.querySelectorAll('[data-menu-id="layout-map"]').forEach(function (el) {
      el.style.display = hide ? 'none' : '';
    });
  };

  // MAPPER: nearbyAttractions.enabled === false 이면 TRAVEL/주변여행지 메뉴 숨김 (헤더 PC·모바일 + 푸터)
  HeaderFooterMapper.prototype.mapTravelMenu = function () {
    var pages = this.getPages();
    var na = pages.nearbyAttractions && pages.nearbyAttractions.sections &&
      pages.nearbyAttractions.sections[0];
    var hide = !!(na && na.enabled === false);
    document.querySelectorAll('[data-travel-menu]').forEach(function (el) {
      el.style.display = hide ? 'none' : '';
    });
  };

  // MAPPER: footer 대메뉴 → 헤더 각 대메뉴의 첫 서브메뉴로 이동
  HeaderFooterMapper.prototype.mapFooterMenu = function () {
    // ROOMS: layoutMap(미리보기)이 enabled면 layout-map.html, 아니면 첫 활성 객실
    var roomsLink = document.querySelector('[data-footer-rooms-link]');
    if (roomsLink) {
      var pages = this.getPages();
      var layoutEnabled = pages.layoutMap && pages.layoutMap.sections &&
        pages.layoutMap.sections[0] && pages.layoutMap.sections[0].enabled !== false;
      if (layoutEnabled) {
        roomsLink.href = 'layout-map.html';
      } else {
        var self = this;
        var firstActive = this.getRoomtypes().filter(function (rt) {
          return rt.name && rt.name.trim();
        }).find(function (rt) {
          var m = self.getMatchedRoom(rt);
          return m && m.status === 'active';
        });
        roomsLink.href = firstActive ? ('room.html?room_id=' + firstActive.id) : 'room.html';
      }
    }

    // SPECIAL: 첫 facility
    var specialLink = document.querySelector('[data-footer-special-link]');
    if (specialLink) {
      var facilities = this.getProperty().facilities || [];
      if (facilities.length) {
        specialLink.href = 'facility.html?id=' + facilities[0].id;
      }
    }
  };

  // MAPPER: homepage.images[0].logo[isSelected].url
  HeaderFooterMapper.prototype.mapLogo = function () {
    var logoUrl = this.getLogo();
    var els = document.querySelectorAll('[data-logo]');
    if (!els || !els.length) return;

    els.forEach(function (el) {
      // 폭은 CSS 변수로 → 미디어쿼리로 반응형 제어 (기본 140px, 모바일 100px)
      el.style.width = 'var(--logo-w, 140px)';
      el.style.height = 'auto';

      if (logoUrl) {
        el.src = logoUrl;
        el.setAttribute('data-logo-mapped', '');
      } else if (!el.hasAttribute('data-logo-mapped')) {
        // 이전 실행에서 실제 로고가 이미 들어갔다면 placeholder로 덮어쓰지 않음
        ImageHelpers.applyPlaceholder(el);
      }
    });
  };

  // MAPPER: favicon ← homepage.images[0].logo[isSelected].url (로고 데이터 재사용)
  HeaderFooterMapper.prototype.mapFavicon = function () {
    var logoUrl = this.getLogo();
    if (!logoUrl) return;
    var link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = logoUrl;
  };

  // MAPPER: property.realtimeBookingId
  HeaderFooterMapper.prototype.mapBookingLinks = function () {
    var bookingUrl = this.getBookingUrl();
    document.querySelectorAll('[data-booking-link]').forEach(function (el) {
      if (bookingUrl && bookingUrl !== '#!') {
        el.href = bookingUrl;
        el.setAttribute('target', '_blank');
      }
    });
  };

  // MAPPER: property.ybsId
  HeaderFooterMapper.prototype.mapYbsButton = function () {
    var prop = this.getProperty();
    var ybsId = prop.ybsId;
    var ybs_url = 'https://rev.yapen.co.kr/external?ypIdx=';
    var ybsButtons = document.querySelectorAll('[data-ybs-button]');

    if (!ybsId) {
      ybsButtons.forEach(function (button) {
        button.style.display = 'none';
      });
      return;
    }

    ybsButtons.forEach(function (button) {
      button.style.display = '';
      button.setAttribute('data-ybs-id', ybsId);
      // data-ybs-button이 <a> 자체(E)이거나 컨테이너 안의 <a>(C) 둘 다 지원
      var link = (button.tagName === 'A') ? button : button.querySelector('a');
      if (link) {
        link.href = 'javascript:void(0)';
        link.addEventListener('click', function () {
          window.open(ybs_url + ybsId, '_blank');
        });
      }
    });
  };

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 정적(비-mapped) 자식만 보존 + mapped 항목을 항상 새로 생성해 한 번에 innerHTML 설정.
  // 현재 DOM의 [data-mapped]는 항상 제외하므로 재실행/동시실행(이벤트 + loadFallbackData)에도 멱등.
  function fillSubmenu(container, liHtmlList) {
    if (!container) return;
    var statics = [];
    Array.prototype.forEach.call(container.children, function (ch) {
      if (!ch.hasAttribute('data-mapped')) statics.push(ch.outerHTML);
    });
    container.innerHTML = statics.join('') + liHtmlList.join('');
  }

  // MAPPER: roomtypes[].name → ROOMS 메뉴 동적 생성 (미리보기 다음에, PC + 모바일)
  HeaderFooterMapper.prototype.mapRoomMenu = function () {
    var roomtypes = this.getRoomtypes();
    var containers = document.querySelectorAll('[data-rooms-submenu], [data-rooms-submenu-mobile]');
    if (!containers.length) return;

    var lis = roomtypes
      .filter(function (rt) { return rt.name && rt.name.trim(); })
      .map(function (rt) {
        return '<li data-mapped><a href="room.html?room_id=' + escapeHtml(rt.id) + '">' +
          escapeHtml(rt.name) + '</a></li>';
      });

    containers.forEach(function (container) { fillSubmenu(container, lis); });
  };

  // MAPPER: property.facilities[].name → SPECIAL 메뉴 동적 생성 (PC + 모바일)
  HeaderFooterMapper.prototype.mapFacilityMenu = function () {
    var facilities = this.getProperty().facilities || [];
    var containers = document.querySelectorAll('[data-facility-submenu], [data-facility-submenu-mobile]');
    if (!containers.length) return;

    var lis = facilities
      .filter(function (f) { return f.name && String(f.name).trim(); })
      .map(function (f) {
        return '<li data-mapped><a href="facility.html?id=' + escapeHtml(f.id) + '">' +
          escapeHtml(f.name) + '</a></li>';
      });

    containers.forEach(function (container) { fillSubmenu(container, lis); });
  };

  // 헤더 호버 스타일 처리
  HeaderFooterMapper.prototype.mapHeaderNavHover = function () {
    var gnb = document.getElementById('shGnb');
    var navItems = document.querySelectorAll('.sh_nav .depth1');
    var lnbBg = document.querySelector('.sh_lnb_bg');

    navItems.forEach(function (item) {
      item.addEventListener('mouseenter', function () {
        if (gnb) {
          gnb.classList.add('on');
        }
        if (lnbBg) {
          lnbBg.style.display = 'block';
        }
        item.classList.add('on');
      });

      item.addEventListener('mouseleave', function () {
        if (gnb) {
          gnb.classList.remove('on');
        }
        if (lnbBg) {
          lnbBg.style.display = 'none';
        }
        item.classList.remove('on');
      });
    });
  };

  // 한글 받침 판별하여 "과/와" 선택
  HeaderFooterMapper.prototype.getKoreanParticle = function (word) {
    if (!word || word.length === 0) return '과';
    var lastChar = word.charCodeAt(word.length - 1);
    if (lastChar >= 0xAC00 && lastChar <= 0xD7A3) {
      var code = lastChar - 0xAC00;
      return (code % 28 !== 0) ? '과' : '와';
    }
    return '과';
  };

  // MAPPER: businessInfo.businessName / businessAddress / businessNumber / representativeName + property.contactPhone(전화)
  HeaderFooterMapper.prototype.mapFooter = function () {
    var prop = this.getProperty();
    var b = (prop && prop.businessInfo) || {};

    function setText(sel, val) {
      if (val == null) return;
      document.querySelectorAll(sel).forEach(function (el) { el.textContent = val; });
    }

    // 상호명
    setText('[data-footer-business-name]', b.businessName || this.getPropertyName());
    // 전화번호 + tel: 링크 ← property.contactPhone (연락처 전화번호)
    var contactPhone = (prop && prop.contactPhone) || '';
    setText('[data-footer-phone]', contactPhone);
    if (contactPhone) {
      var tel = 'tel:' + String(contactPhone).replace(/[^0-9+]/g, '');
      document.querySelectorAll('[data-footer-phone-link]').forEach(function (el) {
        el.setAttribute('href', tel);
      });
    }
    // 사업자 정보
    setText('[data-footer-address]', b.businessAddress);
    setText('[data-footer-business-number]', b.businessNumber);
    setText('[data-footer-representative]', b.representativeName);

    // 저작권 / 개인정보처리방침 : 트립일레븐 하드코딩 (footer.html 정적, 매핑 안 함)
  };

  document.addEventListener('headerFooterLoaded', function () {
    var mapper = new HeaderFooterMapper();
    mapper.initialize();
    global.headerFooterMapperInstance = mapper;
  });

  global.HeaderFooterMapper = HeaderFooterMapper;
})(window);
