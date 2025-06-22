import pytest
from bs4 import BeautifulSoup
from pathlib import Path


def html_files():
    root = Path(__file__).resolve().parents[1]
    return list(root.glob('*.html'))


def pytest_generate_tests(metafunc):
    if 'html_file' in metafunc.fixturenames:
        metafunc.parametrize('html_file', html_files())


def test_title_and_favicon(html_file):
    content = Path(html_file).read_text(encoding='utf-8')
    soup = BeautifulSoup(content, 'html.parser')

    title = soup.find('title')
    assert title is not None, f'{html_file} missing <title>'

    icon_link = soup.find('link', rel='icon')
    assert icon_link is not None and icon_link.get('href'), f'{html_file} missing favicon link'
