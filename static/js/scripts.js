const contentDir = 'contents/';
const contentVersion = '20260701.6';
const sectionNames = ['home', 'research', 'publications', 'awards', 'projects', 'academic-exchange'];
const supportedLanguages = ['en', 'zh'];
let currentLanguage = 'en';
let languageRequestId = 0;

async function fetchText(path) {
    const separator = path.includes('?') ? '&' : '?';
    const response = await fetch(`${path}${separator}v=${contentVersion}`);
    if (!response.ok) {
        throw new Error(`Failed to load ${path}: ${response.status}`);
    }
    return response.text();
}

function contentPath(name, language) {
    const languageSuffix = language === 'zh' ? '.zh' : '';
    return `${contentDir}${name}${languageSuffix}.md`;
}

function configPath(language) {
    return `${contentDir}${language === 'zh' ? 'config.zh.yml' : 'config.yml'}`;
}

function applyConfig(config, language) {
    const specialKeys = new Set([
        'language-toggle-label',
        'language-toggle-aria',
        'profile-photo-alt',
        'site-description'
    ]);

    Object.entries(config).forEach(([key, value]) => {
        if (specialKeys.has(key)) return;
        const element = document.getElementById(key);
        if (element) element.innerHTML = value;
    });

    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.querySelector('meta[name="description"]').content = config['site-description'];
    document.getElementById('profile-photo').alt = config['profile-photo-alt'];

    const languageToggle = document.getElementById('language-toggle');
    languageToggle.textContent = config['language-toggle-label'];
    languageToggle.setAttribute('aria-label', config['language-toggle-aria']);
    languageToggle.setAttribute('aria-pressed', String(language === 'zh'));
}

async function typesetSections(sectionElements) {
    if (!window.MathJax) return;

    try {
        if (typeof MathJax.typesetClear === 'function') {
            MathJax.typesetClear(sectionElements);
        }
        if (typeof MathJax.typesetPromise === 'function') {
            await MathJax.typesetPromise(sectionElements);
        } else if (typeof MathJax.typeset === 'function') {
            MathJax.typeset(sectionElements);
        }
    } catch (error) {
        console.error('MathJax typesetting failed', error);
    }
}

async function loadLanguage(language) {
    if (!supportedLanguages.includes(language)) language = 'en';

    const requestId = ++languageRequestId;
    const languageToggle = document.getElementById('language-toggle');
    languageToggle.disabled = true;

    try {
        const [configText, ...markdownFiles] = await Promise.all([
            fetchText(configPath(language)),
            ...sectionNames.map(name => fetchText(contentPath(name, language)))
        ]);

        if (requestId !== languageRequestId) return;

        const config = jsyaml.load(configText);
        applyConfig(config, language);

        const sectionElements = sectionNames.map((name, index) => {
            const element = document.getElementById(`${name}-md`);
            element.innerHTML = marked.parse(markdownFiles[index]);
            return element;
        });

        currentLanguage = language;
        localStorage.setItem('preferred-language', language);
        await typesetSections(sectionElements);

        const scrollSpy = bootstrap.ScrollSpy.getInstance(document.body);
        if (scrollSpy) scrollSpy.refresh();
    } catch (error) {
        console.error('Failed to load website content', error);
    } finally {
        if (requestId === languageRequestId) languageToggle.disabled = false;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const mainNav = document.body.querySelector('#mainNav');
    if (mainNav) {
        new bootstrap.ScrollSpy(document.body, {
            target: '#mainNav',
            offset: 74,
        });
    }

    const navbarToggler = document.body.querySelector('.navbar-toggler');
    const responsiveNavItems = document.querySelectorAll('#navbarResponsive .nav-link');
    responsiveNavItems.forEach(navItem => {
        navItem.addEventListener('click', () => {
            if (window.getComputedStyle(navbarToggler).display !== 'none') {
                navbarToggler.click();
            }
        });
    });

    marked.use({ mangle: false, headerIds: false });

    const savedLanguage = localStorage.getItem('preferred-language');
    currentLanguage = supportedLanguages.includes(savedLanguage) ? savedLanguage : 'en';
    loadLanguage(currentLanguage);

    document.getElementById('language-toggle').addEventListener('click', async () => {
        await loadLanguage(currentLanguage === 'en' ? 'zh' : 'en');
        if (window.getComputedStyle(navbarToggler).display !== 'none') {
            navbarToggler.click();
        }
    });
});
