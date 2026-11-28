// Sample images for the stories: inline SVGs, so the stories need no asset files. They are content,
// not styling, which is why they carry their own colours.
const svg = (body: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144">${body}</svg>`)}`;
export const SAMPLE_IMAGES = [
  svg('<rect width="144" height="144" fill="#D9D5CB"/><circle cx="72" cy="72" r="40" fill="#FF7A1A"/>'),
  svg('<rect width="144" height="144" fill="#1E4B5C"/><path d="M20 110 L72 30 L124 110 Z" fill="#EEEDE7"/>'),
  svg('<rect width="144" height="144" fill="#EEEDE7"/><rect x="28" y="28" width="88" height="88" fill="none" stroke="#191815" stroke-width="8"/>'),
];
export const SAMPLE_ROWS = [
  { href: "#evidence", title: "Building an evidence-based design foundation", summary: "Define the personas, map the journey, find the friction driving churn. An instrumented research foundation the team could keep asking questions of.", image: SAMPLE_IMAGES[0] },
  { href: "#tactical", title: "Solving tactical UI/UX problems", summary: "Solve a novel interaction at the top-ranked point of users abandoning the product mid-session. A tactical UX fix, shipped.", image: SAMPLE_IMAGES[1] },
  { href: "#flows", title: "Designing end-to-end user flows", summary: "Wireframe an entirely new product on a user journey built from everything gathered before. Now live in early access.", image: SAMPLE_IMAGES[2] },
];
