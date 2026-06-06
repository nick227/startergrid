const SITE = 'Vehicle Marketplace';

export function setPageMeta(title: string, description?: string): void {
  document.title = title === SITE ? title : `${title} · ${SITE}`;

  let tag = document.querySelector('meta[name="description"]');
  if (!description) {
    tag?.remove();
    return;
  }

  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', 'description');
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', description);
}

export function resetPageMeta(): void {
  setPageMeta(SITE, 'Browse price, mileage, and condition from participating dealers.');
}
