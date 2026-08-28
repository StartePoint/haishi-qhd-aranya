import pytest

from app import create_app, db


@pytest.fixture()
def app():
    application = create_app("development")
    application.config["TESTING"] = True
    application.config["WECHAT_MOCK_OPENID"] = True
    with application.app_context():
        db.create_all()
        yield application


@pytest.fixture()
def client(app):
    return app.test_client()
