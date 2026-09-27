(function () {
  var properties = window.PROPERTY_DATA || [];
  var contacts = window.SOURCE_CONTACTS || [];
  var markets = window.MARKET_DATA || {};

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>'"]/g, function (c) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c];
    });
  }

  function priceText(value) {
    if (value == null) return "Price on request";
    var n = Number(value);
    return "₹" + n.toFixed(n % 1 ? 1 : 0) + "L";
  }

  function wa(phone) {
    return "https://wa.me/91" + String(phone || "").replace(/\D/g, "").replace(/^91/, "");
  }

  function topLead(city) {
    return properties
      .filter(function (p) { return p.city === city && p.type !== "Plot"; })
      .sort(function (a, b) { return (b.score || 0) - (a.score || 0); })[0];
  }

  function renderBestLeads() {
    var root = document.getElementById("bestLeadGrid");
    if (!root) return;
    root.innerHTML = Object.keys(markets).map(function (city) {
      var p = topLead(city);
      if (!p) return "";
      var mapLink = p.mapUrl ? '<a class="best-link alt" href="' + esc(p.mapUrl) + '" target="_blank" rel="noopener">Map ⌖</a>' : "";
      return '<article class="best-lead-card">' +
        '<div class="best-city">' + esc(city) + '</div>' +
        '<span class="deal-badge ' + (p.deal === "Strong Deal" ? "strong" : p.deal === "Potential Bargain" ? "bargain" : p.deal === "Good Value" ? "good" : "fair") + '">' + esc(p.deal) + '</span>' +
        '<h3>' + esc(p.name) + '</h3>' +
        '<p class="best-place">' + esc(p.locality) + '</p>' +
        '<div class="best-price">' + priceText(p.price) + '<small>' + esc(p.target) + '</small></div>' +
        '<div class="best-facts"><span>' + esc(p.bhk) + '</span><span>' + esc(p.size || "Verify") + ' ' + esc(p.sizeUnit || "") + '</span><span>' + esc(p.platform) + '</span></div>' +
        '<p class="best-why">' + esc((p.highlights || []).slice(0, 2).join(" · ")) + '</p>' +
        '<p class="lead-source-meta"><strong>' + esc(p.platform) + '</strong> · ' + esc(p.poster) + ' · ' + esc(p.lastSeen) + '</p>' +
        '<div class="best-action-row"><a class="best-link" href="' + esc(p.url) + '" target="_blank" rel="noopener">Exact source ↗</a>' + mapLink + '</div>' +
      '</article>';
    }).join("");
  }

  function renderContacts() {
    var root = document.getElementById("sourceContactGrid");
    if (!root) return;
    root.innerHTML = contacts.map(function (c) {
      var phone = String(c.phone || "").replace(/\D/g, "");
      return '<article class="source-city-card contact-card">' +
        '<div class="source-platform">' + esc(c.platform) + ' · ' + esc(c.city) + '</div>' +
        '<h3>' + esc(c.name) + '</h3>' +
        '<p class="contact-role">' + esc(c.role) + '</p>' +
        '<p class="contact-note">' + esc(c.note) + '</p>' +
        '<div class="source-actions">' +
          '<a href="' + esc(c.url) + '" target="_blank" rel="noopener">Source ↗</a>' +
          (phone ? '<a href="tel:+91' + esc(phone.replace(/^91/, "")) + '">Call ' + esc(c.phone) + '</a>' : '') +
          (phone ? '<a href="' + esc(wa(c.phone)) + '" target="_blank" rel="noopener">WhatsApp</a>' : '') +
        '</div>' +
      '</article>';
    }).join("");
  }

  function findLeadForCard(card) {
    var button = card.querySelector("[data-details]");
    if (!button) return null;
    var id = button.getAttribute("data-details");
    return properties.find(function (p) { return p.id === id; }) || null;
  }

  function decorateCards() {
    document.querySelectorAll("#propertyGrid .property-card").forEach(function (card) {
      if (card.getAttribute("data-enriched") === "1") return;
      var p = findLeadForCard(card);
      if (!p) return;

      var location = card.querySelector(".location");
      if (location) {
        var meta = document.createElement("div");
        meta.className = "lead-source-meta";
        meta.innerHTML = '<strong>' + esc(p.platform) + '</strong> · Posted by ' + esc(p.poster) + '<br><span>' + esc(p.lastSeen) + ' · ' + esc(p.linkType || "Direct listing") + '</span>';
        location.insertAdjacentElement("afterend", meta);
      }

      var actions = card.querySelector(".card-actions");
      if (actions) {
        if (p.mapUrl) {
          var mapA = document.createElement("a");
          mapA.className = "source-link map-link";
          mapA.href = p.mapUrl;
          mapA.target = "_blank";
          mapA.rel = "noopener";
          mapA.textContent = "Map ⌖";
          actions.appendChild(mapA);
        }
        if (p.publicPhone) {
          var callA = document.createElement("a");
          callA.className = "source-link phone-link";
          callA.href = "tel:+91" + String(p.publicPhone).replace(/\D/g, "").replace(/^91/, "");
          callA.textContent = "Call";
          actions.appendChild(callA);
        }
      }

      card.setAttribute("data-enriched", "1");
    });
  }

  function decorateDetails() {
    var dialog = document.getElementById("detailsDialog");
    if (!dialog || !dialog.open || dialog.getAttribute("data-enriched-open") === "1") return;
    var heading = dialog.querySelector("h2");
    if (!heading) return;
    var name = heading.textContent.trim();
    var p = properties.find(function (x) { return x.name === name; });
    if (!p) return;

    var grid = dialog.querySelector(".dialog-grid");
    if (grid) {
      var sourceBox = document.createElement("div");
      sourceBox.className = "source-detail-panel";
      sourceBox.innerHTML =
        '<h3>Source & availability</h3>' +
        '<div class="source-detail-grid">' +
          '<div><span>Platform</span><strong>' + esc(p.platform) + '</strong></div>' +
          '<div><span>Posted by</span><strong>' + esc(p.poster) + '</strong></div>' +
          '<div><span>Poster type</span><strong>' + esc(p.posterType) + '</strong></div>' +
          '<div><span>Last seen</span><strong>' + esc(p.lastSeen) + '</strong></div>' +
          '<div><span>Verification</span><strong>' + esc(p.verifiedOn) + '</strong></div>' +
          '<div><span>Link type</span><strong>' + esc(p.linkType || "Direct listing") + '</strong></div>' +
        '</div>' +
        (p.publicPhone ? '<div class="public-phone"><span>Public business contact</span><strong>' + esc(p.publicPhone) + '</strong><small>' + esc(p.phoneLabel || "") + '</small></div>' : '') +
        '<div class="source-detail-actions">' +
          '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">Open source ↗</a>' +
          (p.mapUrl ? '<a href="' + esc(p.mapUrl) + '" target="_blank" rel="noopener">Open map ⌖</a>' : '') +
          (p.publicPhone ? '<a href="tel:+91' + esc(String(p.publicPhone).replace(/\D/g, "").replace(/^91/, "")) + '">Call</a>' : '') +
          (p.publicPhone ? '<a href="' + esc(wa(p.publicPhone)) + '" target="_blank" rel="noopener">WhatsApp</a>' : '') +
        '</div>';
      grid.insertAdjacentElement("afterend", sourceBox);
    }
    dialog.setAttribute("data-enriched-open", "1");
  }

  var propertyGrid = document.getElementById("propertyGrid");
  if (propertyGrid) {
    new MutationObserver(function () {
      window.requestAnimationFrame(decorateCards);
    }).observe(propertyGrid, {childList:true, subtree:true});
  }

  var detailsDialog = document.getElementById("detailsDialog");
  if (detailsDialog) {
    new MutationObserver(function () {
      detailsDialog.removeAttribute("data-enriched-open");
      window.requestAnimationFrame(decorateDetails);
    }).observe(detailsDialog, {childList:true, subtree:true});
    detailsDialog.addEventListener("toggle", decorateDetails);
  }

  renderBestLeads();
  renderContacts();
  decorateCards();
})();