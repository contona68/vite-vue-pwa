<template>
  <nav class="nav" aria-label="منوی اصلی">
    <RouterLink class="brand" :to="{ name: 'home' }">هایپریک</RouterLink>
    <div class="links">
      <RouterLink :to="{ name: 'home' }">خانه</RouterLink>
      <RouterLink :to="{ name: 'about' }">درباره</RouterLink>
      <RouterLink :to="{ name: 'login' }">ورود</RouterLink>
    </div>
  </nav>
</template>

<script setup>
</script>

<style scoped>
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1.25rem;
  background: #0f172a;
  color: #e2e8f0;
}

.brand {
  font-weight: 700;
  color: #38bdf8;
  text-decoration: none;
}

.links {
  display: flex;
  gap: 0.85rem;
}

.links a {
  color: #cbd5e1;
  text-decoration: none;
  font-size: 0.95rem;
}

.links a.router-link-active {
  color: #f8fafc;
  font-weight: 600;
}
</style>
