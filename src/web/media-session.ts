// Coordinate only shared players; unrelated media elsewhere in the page is untouched.
let activeMedia: HTMLMediaElement | null = null;
export function claimPlayback(media: HTMLMediaElement) {
  if (activeMedia && activeMedia !== media) activeMedia.pause();
  activeMedia = media;
}
export function releasePlayback(media: HTMLMediaElement) {
  if (activeMedia === media) activeMedia = null;
}
