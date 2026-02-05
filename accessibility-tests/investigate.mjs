import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://fisioflow-migration.web.app');

console.log('\n=== LANDMARKS ===');
const landmarks = await page.evaluate(() => {
  return {
    header: document.querySelectorAll('header, [role="banner"]').length,
    nav: document.querySelectorAll('nav, [role="navigation"]').length,
    main: document.querySelectorAll('main, [role="main"]').length,
    footer: document.querySelectorAll('footer, [role="contentinfo"]').length,
  };
});
console.log(JSON.stringify(landmarks, null, 2));

console.log('\n=== EMPTY LINKS ===');
const emptyLinks = await page.evaluate(() => {
  const links = Array.from(document.querySelectorAll('a'));
  return links.filter(l => !l.textContent.trim() && !l.getAttribute('aria-label')).slice(0, 10).map(l => ({
    href: l.getAttribute('href'),
    class: l.className,
    id: l.id
  }));
});
console.log(JSON.stringify(emptyLinks, null, 2));

console.log('\n=== SVG WITHOUT LABELS ===');
const svgIssues = await page.evaluate(() => {
  const svgs = Array.from(document.querySelectorAll('svg'));
  return svgs.slice(0, 10).filter(svg => {
    const hasTitle = svg.querySelector('title');
    const hasDesc = svg.querySelector('desc');
    const hasAria = svg.getAttribute('aria-label') || svg.getAttribute('aria-labelledby');
    return !hasTitle && !hasDesc && !hasAria;
  }).map(svg => ({
    class: svg.className,
    id: svg.id,
    visible: window.getComputedStyle(svg).display !== 'none'
  }));
});
console.log(JSON.stringify(svgIssues, null, 2));

console.log('\n=== SMALL TOUCH TARGETS ===');
const touchTargets = await page.evaluate(() => {
  const touchables = Array.from(document.querySelectorAll('a, button, input, [onclick]'));
  return touchables.filter(el => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.width < 44;
  }).slice(0, 10).map(el => ({
    tag: el.tagName,
    width: el.getBoundingClientRect().width.toFixed(0),
    height: el.getBoundingClientRect().height.toFixed(0),
    text: el.textContent?.slice(0, 30)
  }));
});
console.log(JSON.stringify(touchTargets, null, 2));

await browser.close();
