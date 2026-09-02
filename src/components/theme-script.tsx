// Inline script anti-FOUC. Dipasang di <head> pada src/app/layout.tsx.

const script = `
(function () {
  try {
    var stored = localStorage.getItem('theme');           // 'light' | 'dark' | 'system' | null
    var dark = stored === 'dark'
      || ((stored === 'system' || !stored)
          && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
