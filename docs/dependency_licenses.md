# Dependency and license review

The package manifest targets CPython 3.13 on Windows x86_64, the environment
verified through Stage 4A. This is a conservative tested target, not a claim
that other Python versions or platforms are unsupported by the upstream
projects.

| Package | Version | Role | Compatibility evidence | License evidence |
|---|---:|---|---|---|
| FastAPI | 0.123.10 | Local REST API and OpenAPI | Resolved with Starlette 0.50.0; its TestClient uses the requested httpx package | Review upstream notices before release |
| Uvicorn | 0.54.0 | Local ASGI server | Resolved and backend startup verified on CPython 3.13 Windows | Review upstream notices before release |
| Pydantic | 2.14.2 | API request validation and schemas | Resolved with FastAPI; API tests pass | Review upstream notices before release |
| pandas | 3.1.0 | API tabular feature, report, and prediction serialization | CPython 3.13 environment import and API serialization tests pass | Review upstream notices before release |
| python-multipart | 0.0.32 | FastAPI multipart CSV upload parsing | Upload API tests pass | Review upstream notices before release |
| httpx | 0.28.1 | API test client dependency | Used by FastAPI TestClient; API tests pass | Review upstream notices before release |
| RDKit | 2025.9.6 | Runtime; SMILES and molecular features | PyPI publishes `cp313-cp313-win_amd64`; pip's binary-only resolver check succeeded | PyPI metadata reports BSD-3-Clause; upstream license text still requires release review |
| NumPy | 2.5.4 | RDKit dependency | Binary-only resolver selected a CPython 3.13 Windows x86_64 wheel | PyPI license metadata was empty; verify upstream license before release |
| scikit-learn | 1.7.2 | Runtime; train/test splitting, baseline regressors, metrics, and pipelines | CPython 3.13 Windows x86_64 wheel installed; dependency compatibility check succeeded | BSD-3-Clause |
| SciPy | 1.16.2 | scikit-learn dependency | CPython 3.13 Windows x86_64 wheel installed; dependency compatibility check succeeded | BSD-3-Clause |
| joblib | 1.5.2 | scikit-learn dependency | Pure-Python wheel installed; dependency compatibility check succeeded | BSD-3-Clause |
| threadpoolctl | 3.6.0 | scikit-learn dependency | Pure-Python wheel installed; dependency compatibility check succeeded | BSD-3-Clause |
| Pillow | 13.0.0 | RDKit dependency | Binary-only resolver selected a compatible wheel | PyPI license metadata was empty; verify upstream license before release |
| pytest | 8.4.2 | Test extra | Pure-Python wheel resolves; metadata requires Python >=3.9 | PyPI metadata reports MIT |
| colorama | 0.4.6 | pytest Windows dependency | Binary-only resolver selected a compatible distribution | PyPI metadata reports BSD |
| iniconfig | 2.3.1 | pytest dependency | Binary-only resolver selected a compatible distribution | PyPI license metadata was empty; verify upstream license before release |
| packaging | 26.3 | pytest dependency | Binary-only resolver selected a compatible distribution | PyPI license metadata was empty; verify upstream license before release |
| pluggy | 1.7.0 | pytest dependency | Binary-only resolver selected a compatible distribution | PyPI metadata reports MIT |
| Pygments | 2.21.0 | pytest dependency | Binary-only resolver selected a compatible distribution | PyPI license metadata was empty; verify upstream license before release |

`uv.lock` is the authoritative dependency lock for the current project.
`requirements-win-py313.lock` is a legacy Stage 3 Windows resolver snapshot;
it does not include the Stage 4A API dependencies. Neither lock file is a
substitute for reviewing package notices and licenses. No project license is
declared. Before public release, review the authoritative license texts and
notices for all direct and transitive dependencies, and obtain approval for
the project's own license.
