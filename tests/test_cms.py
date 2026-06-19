"""Tests that the public pages are wired to the CMS hydration script."""
from pathlib import Path

import pytest
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]


def read(name):
    return (ROOT / name).read_text(encoding='utf-8')


def test_cms_script_exists():
    assert (ROOT / 'cms.js').exists(), 'cms.js missing'


@pytest.mark.parametrize('page,container_id', [
    ('team.html', 'cms-team'),
    ('team.html', 'cms-roles'),
    ('news.html', 'cms-news'),
])
def test_hydration_container_present(page, container_id):
    soup = BeautifulSoup(read(page), 'html.parser')
    assert soup.find(id=container_id) is not None, \
        f'{page} missing #{container_id} hydration container'


@pytest.mark.parametrize('page', ['team.html', 'news.html'])
def test_cms_script_included(page):
    soup = BeautifulSoup(read(page), 'html.parser')
    srcs = [s.get('src') for s in soup.find_all('script')]
    assert 'cms.js' in srcs, f'{page} does not include cms.js'
