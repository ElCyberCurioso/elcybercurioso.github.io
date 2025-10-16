---
layout: page
title: About
icon: fas fa-info-circle
order: 5
---

<div class="lang-container">
  <button id="toggle-lang" class="lang-button">English</button>
</div>

<div id="about-content"></div>

{% raw %}
<style>
  .lang-container {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1rem;
  }

  .lang-button {
    background-color: #2b2b2b;
    color: #ffffff;
    border: none;
    padding: 0.6rem 1.2rem;
    border-radius: 25px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  }

  .lang-button:hover {
    background-color: #0078d7; /* color al pasar el cursor */
    transform: scale(1.05);
  }

  .lang-button:active {
    transform: scale(0.95);
    background-color: #005a9e; /* color al hacer clic */
  }
</style>

<script>
  document.addEventListener("DOMContentLoaded", async () => {
    const button = document.getElementById("toggle-lang");
    const content = document.getElementById("about-content");
    let currentLang = localStorage.getItem("lang") || "es";

    async function loadContent(lang) {
      const file = lang === "es" ? "about_es.html" : "about_en.html";
      const response = await fetch(`/assets/lang/${file}`);
      const text = await response.text();
      content.innerHTML = text;
      button.textContent = lang === "es" ? "English" : "Español";
    }

    // cargar idioma al inicio
    await loadContent(currentLang);

    button.addEventListener("click", async () => {
      currentLang = currentLang === "es" ? "en" : "es";
      localStorage.setItem("lang", currentLang);
      await loadContent(currentLang);

      // animación al hacer clic
      button.style.transform = "scale(0.9)";
      setTimeout(() => (button.style.transform = "scale(1)"), 150);
    });
  });
</script>
{% endraw %}
