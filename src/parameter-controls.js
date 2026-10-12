export const parameterNames = {
  rimHeight: 'Độ cao viền nổi', rimWidth: 'Độ rộng viền nổi', width: 'Chiều rộng thân', base: 'Độ dày đế', relief: 'Độ dày chữ',
  baseRound: 'Bo cạnh đế', topRound: 'Bo cạnh chữ', border: 'Viền đế',
  hole: 'Đường kính lỗ', ring: 'Bề dày tai móc', threshold: 'Ngưỡng tách hình'
};

export function mountParameterControls(onUpdate) {
  const controls = [];
  for (const [id, name] of Object.entries(parameterNames)) {
    const input = document.getElementById(id);
    const wrapper = document.createElement('div');
    wrapper.className = 'parameter-control';
    input.before(wrapper);
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = `${id}-slider`;
    for (const attribute of ['min', 'max', 'step']) {
      if (input.hasAttribute(attribute)) slider.setAttribute(attribute, input.getAttribute(attribute));
    }
    slider.step = id === 'threshold' ? '1' : '0.1';
    slider.setAttribute('aria-label', `${name} · thanh trượt`);
    input.type = 'number';
    input.step = slider.step;
    input.title = `Từ ${input.min} đến ${input.max}; bước ${input.step}`;
    input.setAttribute('aria-label', `${name} · nhập số`);
    input.inputMode = 'decimal';
    wrapper.append(slider, input);
    const sync = () => {
      slider.value = input.value;
      const percent = (Number(slider.value) - Number(slider.min)) / (Number(slider.max) - Number(slider.min)) * 100;
      slider.style.setProperty('--progress', `${percent}%`);
    };
    const valid = () => input.value !== '' && input.validity.valid;
    slider.addEventListener('input', () => {
      input.value = slider.value;
      input.removeAttribute('aria-invalid');
      sync();
      onUpdate(true);
    });
    slider.addEventListener('change', () => onUpdate(false));
    input.addEventListener('input', () => {
      input.setAttribute('aria-invalid', String(!valid()));
      if (valid()) { sync(); onUpdate(false); }
    });
    input.addEventListener('change', () => {
      if (!valid()) {
        input.value = slider.value;
        input.removeAttribute('aria-invalid');
      }
      sync();
      onUpdate(false);
    });
    sync();
    controls.push(sync);
  }
  return () => controls.forEach(sync => sync());
}

// Coalesce pointer events into one update per animation frame, without waiting for a pause.
export function frameScheduler(update, requestFrame = requestAnimationFrame) {
  let pending = false;
  let fast = false;
  return (preview = false) => {
    fast = pending ? fast && preview : preview;
    if (pending) return;
    pending = true;
    requestFrame(() => {
      const quality = fast;
      pending = false;
      update(quality);
    });
  };
}
