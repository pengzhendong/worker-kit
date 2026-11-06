import { writeFile } from 'node:fs/promises';

// Circular arcs calibrate the squared ribbon; the silhouette is intentionally not round.
// Adjacent primary and cutting circles are concentric, creating a 2.5-unit seam.
// R1 tangent fillets remove needle points without visibly softening the corners.
export const geometry = { inset: 12, corner: 22, curveCenterY: 63.5, gap: 2.5, tip: 1 };
export const color = '#6574AD';
const { inset, corner, curveCenterY, gap, tip: r } = geometry;
const edge = inset + corner;
const c = [edge, curveCenterY], R = curveCenterY - inset;
const cut = [curveCenterY, 128 - edge], C = R + gap, h = cut[1] - C;
const topF = [c[0] + Math.sqrt((R - r) ** 2 - (h - r - c[1]) ** 2), h - r];
const topP = [c[0] + (topF[0] - c[0]) * R / (R - r), c[1] + (topF[1] - c[1]) * R / (R - r)];
const leftF = [inset + r, cut[1] - Math.sqrt((C + r) ** 2 - (cut[0] - inset - r) ** 2)];
const leftQ = [cut[0] + (leftF[0] - cut[0]) * C / (C + r), cut[1] + (leftF[1] - cut[1]) * C / (C + r)];
const n = value => Number(value.toFixed(6));
const pt = value => value.map(n).join(' ');
const path = `M${inset} ${n(leftF[1])}V${edge}A${corner} ${corner} 0 0 1 ${edge} ${inset}A${R} ${R} 0 0 1 ${pt(topP)}A${r} ${r} 0 0 1 ${n(topF[0])} ${h}H${cut[0]}A${C} ${C} 0 0 0 ${pt(leftQ)}A${r} ${r} 0 0 1 ${inset} ${n(leftF[1])}Z`;
export const mark = (fill = color) => [0, 90, 180, 270].map(angle => `<path d="${path}" transform="rotate(${angle} 64 64)" fill="${fill}"/>`).join('');
export const logo = (fill = color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">\n  ${mark(fill)}\n</svg>\n`;
export const construction = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-24 -24 184 184" fill="none">
  <g opacity=".13">${mark()}</g>
  <path d="${path}" fill="${color}" fill-opacity=".22"/>
  <g stroke-width=".55"><circle cx="34" cy="34" r="22" stroke="#6574AD"/><circle cx="34" cy="63.5" r="51.5" stroke="#6574AD"/><circle cx="63.5" cy="94" r="54" stroke="#A28369" stroke-dasharray="2 1.5"/><circle cx="${n(topF[0])}" cy="${n(topF[1])}" r="1" stroke="#A28369"/><circle cx="${n(leftF[0])}" cy="${n(leftF[1])}" r="1" stroke="#A28369"/></g>
  <g stroke="#A6AEBA" stroke-width=".4" stroke-dasharray="1 1.5"><path d="M34 34V12M34 63.5V12M63.5 94V40M12 12V116H116V12Z"/></g>
  <g fill="#6574AD"><circle cx="34" cy="34" r=".9"/><circle cx="34" cy="63.5" r=".9"/><circle cx="63.5" cy="94" r=".9"/></g>
  <g font-family="Arial,sans-serif" font-size="5.5" fill="#566275"><text x="3" y="26">R22</text><text x="71" y="15">R51.5</text><text x="79" y="143">R54</text><text x="82" y="38">R1</text></g>
</svg>\n`;
for (const relative of ['../../nuxt-dashboard/public/favicon.svg', '../../dashboard/public/favicon.svg', '../../docs/public/favicon.svg']) await writeFile(new URL(relative, import.meta.url), logo());
await writeFile(new URL('./construction.svg', import.meta.url), construction);
await writeFile(new URL('./logo.svg', import.meta.url), logo());
console.log('Generated squared circular-arc logo and three application favicons.');
