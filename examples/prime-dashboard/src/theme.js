import { ref } from 'vue';

export const isDarkTheme = ref(false);
export function toggleDarkMode() {
  const apply = () => {
    isDarkTheme.value = !isDarkTheme.value;
    document.documentElement.classList.toggle('app-dark', isDarkTheme.value);
  };
  if (document.startViewTransition) document.startViewTransition(apply);
  else apply();
}
