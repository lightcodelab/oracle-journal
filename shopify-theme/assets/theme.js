/* Temple of Sustainment — Theme JS */
(function () {
  'use strict';

  // Mobile nav toggle
  document.addEventListener('click', function (e) {
    var toggle = e.target.closest('[data-mobile-toggle]');
    if (!toggle) return;
    var nav = document.querySelector('[data-mobile-nav]');
    if (nav) nav.classList.toggle('is-open');
  });

  // Quantity steppers
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-qty-step]');
    if (!btn) return;
    var input = btn.parentElement.querySelector('input[type="number"]');
    if (!input) return;
    var step = parseInt(btn.dataset.qtyStep, 10);
    var val = Math.max(1, (parseInt(input.value, 10) || 1) + step);
    input.value = val;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // Product variant picker: swap URL/price when option changes
  function ProductForm(root) {
    var form = root.querySelector('form[action*="/cart/add"]');
    if (!form) return;
    var productJsonEl = root.querySelector('[data-product-json]');
    if (!productJsonEl) return;
    var product;
    try { product = JSON.parse(productJsonEl.textContent); } catch (e) { return; }

    var idInput = form.querySelector('input[name="id"]');
    var priceEl = root.querySelector('[data-product-price]');
    var comparePriceEl = root.querySelector('[data-product-compare-price]');
    var addBtn = form.querySelector('[data-add-to-cart]');

    function selectedOptions() {
      return Array.from(root.querySelectorAll('.variant-picker__group')).map(function (g) {
        var checked = g.querySelector('input[type="radio"]:checked');
        return checked ? checked.value : null;
      });
    }

    function findVariant(opts) {
      return product.variants.find(function (v) {
        return v.options.every(function (val, i) { return val === opts[i]; });
      });
    }

    function formatMoney(cents) {
      // Shopify money format is applied server-side; fallback simple formatter
      return (window.Shopify && window.Shopify.formatMoney)
        ? window.Shopify.formatMoney(cents, window.themeMoneyFormat || '${{amount}}')
        : '$' + (cents / 100).toFixed(2);
    }

    function update() {
      var v = findVariant(selectedOptions());
      if (!v) {
        if (addBtn) { addBtn.disabled = true; addBtn.textContent = 'Unavailable'; }
        return;
      }
      if (idInput) idInput.value = v.id;
      if (priceEl) priceEl.textContent = formatMoney(v.price);
      if (comparePriceEl) {
        if (v.compare_at_price && v.compare_at_price > v.price) {
          comparePriceEl.textContent = formatMoney(v.compare_at_price);
          comparePriceEl.hidden = false;
        } else {
          comparePriceEl.hidden = true;
        }
      }
      if (addBtn) {
        if (v.available) { addBtn.disabled = false; addBtn.textContent = addBtn.dataset.labelAdd || 'Add to cart'; }
        else { addBtn.disabled = true; addBtn.textContent = 'Sold out'; }
      }
      // Update URL variant param without reload
      if (history.replaceState) {
        var url = new URL(window.location.href);
        url.searchParams.set('variant', v.id);
        history.replaceState({}, '', url.toString());
      }
      // Swap gallery to variant image
      if (v.featured_media && v.featured_media.id) {
        var target = root.querySelector('[data-media-id="' + v.featured_media.id + '"]');
        if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      }
    }

    root.addEventListener('change', function (e) {
      if (e.target.matches('.variant-picker__group input[type="radio"]')) update();
    });

    update();
  }

  document.querySelectorAll('[data-product-root]').forEach(ProductForm);

  // Simple gallery thumb switcher
  document.addEventListener('click', function (e) {
    var thumb = e.target.closest('[data-thumb]');
    if (!thumb) return;
    e.preventDefault();
    var id = thumb.dataset.thumb;
    var target = document.querySelector('[data-media-id="' + id + '"]');
    if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    thumb.parentElement.querySelectorAll('[data-thumb]').forEach(function (t) { t.classList.remove('is-active'); });
    thumb.classList.add('is-active');
  });
})();