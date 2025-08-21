# EpiSafe Static Site

This repository contains the static HTML files for the EpiSafe website.

## Repository Structure

- Static assets such as images and fonts are hosted externally and not tracked in this repo
- `tests/`  - pytest tests validating the HTML files

## Running Tests

Python tests are located in the `tests/` directory and require `pytest` and
`beautifulsoup4` to be installed. Install the dependencies and run `pytest`:

```bash
pip install pytest beautifulsoup4
pytest
```

