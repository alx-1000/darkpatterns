(() => {
  const screens = [...document.querySelectorAll('[data-screen]')];
  const sequence = ['title', 'about', 'chapters'];

  function show(name) {
    screens.forEach((screen) => screen.classList.toggle('is-active', screen.dataset.screen === name));
  }

  document.querySelectorAll('.home-screen-button').forEach((screen) => {
    screen.addEventListener('click', () => {
      const index = sequence.indexOf(screen.dataset.screen);
      show(sequence[Math.min(index + 1, sequence.length - 1)]);
    });
  });

  if (window.location.hash === '#chapters') {
    show('chapters');
  } else {
    show('title');
  }
})();
