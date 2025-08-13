// js/i18n.js
const dictionaries = {
  'pt-BR': {
    navbar: {
      advancedReports: 'Relatórios Avançados',
      logs: 'Logs',
      units: 'Unidades',
      goals: 'Metas',
      language: 'Idioma',
    },
    reports: {
      advanced: {
        title: 'Relatórios Avançados',
      },
      tabs: {
        revenue: 'Receita por serviço',
        customers: 'Clientes',
        conversion: 'Conversão',
        productivity: 'Produtividade',
        heatmap: 'Mapa de calor',
      },
    },
    goals: {
      title: 'Metas',
      revenueTarget: 'Meta de receita',
      ordersTarget: 'Meta de ordens',
      save: 'Salvar',
    },
    units: {
      title: 'Unidades',
      migration: 'Atribuir unidade padrão',
    },
    logs: {
      title: 'Logs de Erro',
      clear: 'Limpar antigos',
    },
    settings: {
      general: 'Geral',
    },
    common: {
      saved: 'Salvo',
    },
  },
  'en-US': {
    navbar: {
      advancedReports: 'Advanced Reports',
      logs: 'Logs',
      units: 'Units',
      goals: 'Goals',
      language: 'Language',
    },
    reports: {
      advanced: {
        title: 'Advanced Reports',
      },
      tabs: {
        revenue: 'Revenue by service',
        customers: 'Customers',
        conversion: 'Conversion',
        productivity: 'Productivity',
        heatmap: 'Heatmap',
      },
    },
    goals: {
      title: 'Goals',
      revenueTarget: 'Revenue target',
      ordersTarget: 'Orders target',
      save: 'Save',
    },
    units: {
      title: 'Units',
      migration: 'Assign default unit',
    },
    logs: {
      title: 'Error Logs',
      clear: 'Clean old',
    },
    settings: {
      general: 'General',
    },
    common: {
      saved: 'Saved',
    },
  },
};

export let currentLang = localStorage.getItem('lang') || navigator.language || 'pt-BR';
if (!dictionaries[currentLang]) currentLang = 'pt-BR';

export function t(key, vars) {
  const parts = key.split('.');
  let str = parts.reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : null), dictionaries[currentLang]);
  if (typeof str !== 'string') str = key;
  if (vars) {
    Object.keys(vars).forEach(k => {
      str = str.replace(`{${k}}`, vars[k]);
    });
  }
  return str;
}

export function setLang(lang) {
  if (!dictionaries[lang]) return;
  currentLang = lang;
  localStorage.setItem('lang', lang);
  document.dispatchEvent(new CustomEvent('lang:changed', { detail: lang }));
}

export function applyTranslations(root = document) {
  const elements = root.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
}

export function initLangToggle(btn) {
  if (!btn) return;
  btn.addEventListener('click', () => {
    const next = currentLang === 'pt-BR' ? 'en-US' : 'pt-BR';
    setLang(next);
  });
  btn.textContent = t('navbar.language');
}

document.addEventListener('lang:changed', () => applyTranslations());
