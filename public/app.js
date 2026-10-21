(function () {
  const state = {
    config: null,
    property: null,
    tier: null,
    freq: null,
    bed: 2,
    bath: 1,
    addons: []
  };

  const fmt = (n, currency) => '$' + Math.round(n).toLocaleString() + (currency ? '' : '');
  const genRef = () => 'TT-' + Math.floor(1000 + Math.random() * 9000);
  const displayRef = genRef();

  function propLabel(p) { return p ? p.label : ''; }

  function calcLocal() {
    const { tier, property, freq, addons, bed, bath } = state;
    if (!tier || !property || !freq) return null;
    const rooms = bed + bath;
    const subtotal = (tier.base + rooms * tier.ratePerRoom) * property.multiplier;
    const addonTotal = addons.reduce((s, a) => s + a.price, 0);
    const raw = subtotal + addonTotal;
    const discount = raw * freq.discount;
    const total = raw - discount;
    return { subtotal, addonTotal, discount, total };
  }

  function render() {
    const calc = calcLocal();
    if (!calc) return;
    const { subtotal, addonTotal, discount, total } = calc;
    const currency = state.config.pricing.currency;
    const title = `${propLabel(state.property)} · ${state.bed} bed / ${state.bath} bath · ${state.tier.label}`;

    document.getElementById('heroRef').textContent = '#' + displayRef;
    document.getElementById('builderRef').textContent = '#' + displayRef;
    document.getElementById('heroTitle').textContent = title;
    document.getElementById('builderTitle').textContent = title;
    document.getElementById('builderFreq').textContent = state.freq.label;

    document.getElementById('heroPrice').innerHTML = fmt(total) + '<span>' + currency + '</span>';
    document.getElementById('builderPrice').innerHTML = fmt(total) + '<span>' + currency + '</span>';

    const listHTML = `
      <li><span>Base + rooms</span><span>${fmt(subtotal)}</span></li>
      ${addonTotal > 0 ? `<li><span>Add-ons</span><span>${fmt(addonTotal)}</span></li>` : ''}
      ${discount > 0 ? `<li><span>Frequency discount</span><span>−${fmt(discount)}</span></li>` : ''}
    `;
    document.getElementById('heroList').innerHTML = listHTML;
    document.getElementById('builderList').innerHTML = listHTML;
  }

  function buildPropertyPills(properties) {
    const wrap = document.getElementById('propertyType');
    wrap.innerHTML = '';
    properties.forEach((p, i) => {
      const el = document.createElement('div');
      el.className = 'pill' + (i === 0 ? ' active' : '');
      el.textContent = p.label;
      el.addEventListener('click', () => {
        wrap.querySelectorAll('.pill').forEach(x => x.classList.remove('active'));
        el.classList.add('active');
        state.property = p;
        render();
      });
      wrap.appendChild(el);
      if (i === 0) state.property = p;
    });
  }

  function buildTierCards(tiers) {
    const wrap = document.getElementById('cleanTier');
    wrap.innerHTML = '';
    tiers.forEach((t, i) => {
      const el = document.createElement('div');
      el.className = 'tier-card' + (i === 0 ? ' active' : '');
      el.innerHTML = `<h4>${t.label}</h4><p>${t.description || ''}</p>`;
      el.addEventListener('click', () => {
        wrap.querySelectorAll('.tier-card').forEach(x => x.classList.remove('active'));
        el.classList.add('active');
        state.tier = t;
        render();
      });
      wrap.appendChild(el);
      if (i === 0) state.tier = t;
    });
  }

  function buildAddons(addons) {
    const wrap = document.getElementById('addons');
    wrap.innerHTML = '';
    addons.forEach(a => {
      const el = document.createElement('div');
      el.className = 'addon';
      el.innerHTML = `<span>${a.label}</span><span class="price">+$${a.price}</span>`;
      el.addEventListener('click', () => {
        el.classList.toggle('active');
        if (el.classList.contains('active')) {
          state.addons.push(a);
        } else {
          state.addons = state.addons.filter(x => x.id !== a.id);
        }
        render();
      });
      wrap.appendChild(el);
    });
  }

  function buildFreq(freqs) {
    const wrap = document.getElementById('freq');
    wrap.innerHTML = '';
    freqs.forEach((f, i) => {
      const el = document.createElement('div');
      el.className = 'pill' + (i === 0 ? ' active' : '');
      el.textContent = f.discount > 0 ? `${f.label} (${Math.round(f.discount * 100)}% off)` : f.label;
      el.addEventListener('click', () => {
        wrap.querySelectorAll('.pill').forEach(x => x.classList.remove('active'));
        el.classList.add('active');
        state.freq = f;
        render();
      });
      wrap.appendChild(el);
      if (i === 0) state.freq = f;
    });
  }

  function bindSteppers() {
    document.querySelectorAll('.stepper button').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        const dir = parseInt(btn.dataset.dir, 10);
        const min = target === 'bath' ? (state.config.pricing.minBathrooms || 1) : 0;
        const max = state.config.pricing.maxRooms || 8;
        let val = state[target] + dir;
        val = Math.max(min, Math.min(max, val));
        state[target] = val;
        document.getElementById(target + 'Val').textContent = val;
        render();
      });
    });
  }

  async function loadConfig() {
    const res = await fetch('/api/config');
    const config = await res.json();
    state.config = config;

    document.title = config.business.name + ' — Book a clean';
    document.getElementById('brandName').textContent = config.business.name;
    document.getElementById('footerName').textContent = `${config.business.name} — house & lease cleaning`;
    document.getElementById('heroLede').textContent = config.business.tagline || document.getElementById('heroLede').textContent;
    if (config.business.brandColor) document.documentElement.style.setProperty('--brass', config.business.brandColor);
    if (config.business.accentColor) {
      document.documentElement.style.setProperty('--sage', config.business.accentColor);
      document.documentElement.style.setProperty('--sage-deep', config.business.accentColor);
    }

    buildPropertyPills(config.pricing.properties);
    buildTierCards(config.pricing.tiers);
    buildAddons(config.pricing.addons);
    buildFreq(config.pricing.frequencies);
    bindSteppers();
    render();
  }

  async function loadReviews() {
    try {
      const res = await fetch('/api/reviews');
      const data = await res.json();
      document.getElementById('aggRating').textContent = data.rating;
      document.getElementById('aggStars').textContent = '★'.repeat(Math.round(data.rating)) + '☆'.repeat(5 - Math.round(data.rating));
      document.getElementById('aggTotal').textContent = `Based on ${data.total} Google reviews`;
      document.getElementById('statRating').textContent = `${data.rating} / 5`;

      const grid = document.getElementById('reviewGrid');
      grid.innerHTML = '';
      data.reviews.forEach(r => {
        const card = document.createElement('div');
        card.className = 'review-card';
        card.innerHTML = `
          <div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
          <p>"${r.text}"</p>
          <div class="review-who"><span>${r.author}</span><span>${r.relative_time || ''}</span></div>
        `;
        grid.appendChild(card);
      });
    } catch (e) {
      console.error('Failed to load reviews', e);
    }
  }

  function bindBookingForm() {
    const form = document.getElementById('bookingForm');
    const box = document.getElementById('confirmBox');
    const btn = document.getElementById('submitBtn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      btn.disabled = true;
      btn.textContent = 'Sending…';

      const payload = {
        name: document.getElementById('f_name').value,
        email: document.getElementById('f_email').value,
        phone: document.getElementById('f_phone').value,
        date: document.getElementById('f_date').value,
        address: document.getElementById('f_address').value,
        notes: document.getElementById('f_notes').value,
        propertyId: state.property.id,
        bed: state.bed,
        bath: state.bath,
        tierId: state.tier.id,
        addonIds: state.addons.map(a => a.id),
        freqId: state.freq.id
      };

      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Request failed');

        box.classList.remove('error');
        box.classList.add('show');
        box.innerHTML = data.emailSent
          ? `Request <span class="ref">#${data.bookingRef}</span> sent. The booking team has been emailed, and a confirmation copy is on its way to <strong>${payload.email}</strong>.`
          : `Request <span class="ref">#${data.bookingRef}</span> was saved, but the confirmation email couldn't be sent right now — the booking team can still see it and will follow up directly.`;
      } catch (err) {
        box.classList.add('show', 'error');
        box.innerHTML = `Something went wrong sending your request: ${err.message}. Please try again or contact us directly.`;
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send request';
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  loadConfig();
  loadReviews();
  bindBookingForm();
})();
