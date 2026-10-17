"""Wire up the translated pages. Run from the site root after adding or re-translating a page:

    python tools/i18n.py

A translation lives at /<folder>/<same path>/index.html (e.g. /hi/ova/index.html) and is a copy
of the English page with only the words changed. This script sets everything else on every
language version, English included: <html lang/dir>, canonical, og:url, hreflang links, the
Hindi/Arabic font, the language menu in the nav, internal links (/ova/ -> /hi/ova/), and the
sitemap. Safe to re-run.
"""
import datetime, os, re

SITE = 'https://technook.in'
# folder, BCP 47 tag, native name, the word "Language" in that language
LANGS = [
    ('', 'en', 'English', 'Language'),
    ('hi', 'hi', 'हिन्दी', 'भाषा'),
    ('es', 'es', 'Español', 'Idioma'),
    ('pt', 'pt-BR', 'Português', 'Idioma'),
    ('ar', 'ar', 'العربية', 'اللغة'),
    ('fr', 'fr', 'Français', 'Langue'),
    ('de', 'de', 'Deutsch', 'Sprache'),
]
RTL = {'ar'}
PAGES = [
    '/', '/onelist/', '/ova/', '/dawnpath/', '/guides/',
    '/guides/best-shared-shopping-list-apps/',
    '/guides/period-tracker-apps-with-partner-sharing/',
    '/guides/best-debt-payoff-tracker-apps/',
]
FONTS = {'hi': 'Noto+Sans+Devanagari:wght@400;500;600;700', 'ar': 'Noto+Sans+Arabic:wght@400;500;600;700'}
MENU = re.compile(r'\s*<!--lang-->.*?<!--/lang-->', re.S)


def url(folder, page):
    return ('/' + folder if folder else '') + page


def path(folder, page):
    return os.path.join(folder, *page.strip('/').split('/'), 'index.html')


def menu(page, langs, current):
    on = ' aria-current="true"'
    items = ''.join(f'<li><a href="{url(f, page)}" hreflang="{t}" lang="{t}"{on if f == current[0] else ""}>{n}</a></li>'
                    for f, t, n, _ in langs)
    code = current[1].split('-')[0].upper()
    return (f'\n    <!--lang--><details class="lang"><summary aria-label="{current[3]}: {current[2]}">'
            f'<svg class="ic" aria-hidden="true"><use href="/assets/img/icons.svg#globe"/></svg>{code}</summary>'
            f'<ul>{items}</ul></details><!--/lang-->')


def wire(lang, page, langs):
    folder, tag = lang[0], lang[1]
    p = path(folder, page)
    s = open(p, encoding='utf-8').read()
    own = SITE + url(folder, page)

    rtl = ' dir="rtl"' if folder in RTL else ''
    s = re.sub(r'<html[^>]*>', f'<html lang="{tag}"{rtl}>', s, count=1)
    s = re.sub(r'<link rel="canonical" href="[^"]*"/>', f'<link rel="canonical" href="{own}"/>', s, count=1)
    s = re.sub(r'(<meta property="og:url" content=")[^"]*', r'\g<1>' + own, s, count=1)
    s = s.replace(f'"mainEntityOfPage": "{SITE}{page}"', f'"mainEntityOfPage": "{own}"')

    s = re.sub(r'\s*<link rel="alternate" hreflang="[^"]*" href="[^"]*"/>', '', s)
    alts = ''.join(f'\n  <link rel="alternate" hreflang="{t}" href="{SITE}{url(f, page)}"/>' for f, t, _, _ in langs)
    alts += f'\n  <link rel="alternate" hreflang="x-default" href="{SITE}{page}"/>'
    s = s.replace(f'<link rel="canonical" href="{own}"/>', f'<link rel="canonical" href="{own}"/>' + alts, 1)

    if folder in FONTS and FONTS[folder] not in s:
        s = s.replace('&amp;display=swap', f'&amp;family={FONTS[folder]}&amp;display=swap', 1)

    s = MENU.sub('', s)
    if folder:  # point links to other translated pages at this language's copy
        s = re.sub(r'href="(/[^"#]*)', lambda m: f'href="/{folder}{m[1]}"' if m[1] in PAGES else m[0], s)
    nav = s.index('<ul class="nav-links">')
    end = s.index('</ul>', nav) + len('</ul>')
    s = s[:end] + menu(page, langs, lang) + s[end:]

    open(p, 'w', encoding='utf-8', newline='').write(s)
    return s


def sitemap(groups):
    old = open('sitemap.xml', encoding='utf-8').read()
    translated = {url(f, page) for page, langs in groups for f, *_ in langs}
    others = [(loc, mod) for loc, mod in re.findall(r'<loc>([^<]*)</loc><lastmod>([^<]*)</lastmod>', old)
              if loc[len(SITE):] not in translated]
    today = datetime.date.today().isoformat()
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for page, langs in groups:
        alts = ''.join(f'<xhtml:link rel="alternate" hreflang="{t}" href="{SITE}{url(f, page)}"/>' for f, t, _, _ in langs)
        alts += f'<xhtml:link rel="alternate" hreflang="x-default" href="{SITE}{page}"/>'
        out += [f'  <url><loc>{SITE}{url(f, page)}</loc><lastmod>{today}</lastmod>{alts}</url>' for f, *_ in langs]
    out += [f'  <url><loc>{loc}</loc><lastmod>{mod}</lastmod></url>' for loc, mod in others]
    open('sitemap.xml', 'w', encoding='utf-8', newline='\n').write('\n'.join(out + ['</urlset>', '']))
    return len(out) - 2


groups = []
for page in PAGES:
    langs = [l for l in LANGS if os.path.exists(path(l[0], page))]
    groups.append((page, langs))
    for lang in langs:
        s = wire(lang, page, langs)
        # Check what we just wrote: one menu, a full hreflang set, no link back to an English page.
        assert s.count('<!--lang-->') == 1, (lang[1], page)
        assert s.count('hreflang="') == 2 * len(langs) + 1, (lang[1], page)
        if lang[0]:
            stray = [h for h in re.findall(r'href="(/[^"#]*)', MENU.sub('', s)) if h in PAGES]
            assert not stray, (lang[1], page, stray)
    print(f'{page:52} {" ".join(l[1] for l in langs)}')
print(sitemap(groups), 'URLs in sitemap.xml')
