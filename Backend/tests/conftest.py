import os
import uuid

# Must run before `app.config` / `app.database` are imported anywhere, so each
# test session gets its own throwaway SQLite file instead of silently reusing
# (and being polluted by) whatever ./dealflow360.db happens to exist on disk.
_TEST_DB_PATH = f"./test_{uuid.uuid4().hex}.db"
os.environ.setdefault("DATABASE_URL", f"sqlite+aiosqlite:///{_TEST_DB_PATH}")
os.environ.setdefault("SECRET_KEY", "pytest-ephemeral-secret-key")

import pytest


@pytest.fixture(scope="session", autouse=True)
def _cleanup_test_db():
    yield
    path = _TEST_DB_PATH.lstrip("./")
    if os.path.exists(path):
        os.remove(path)
