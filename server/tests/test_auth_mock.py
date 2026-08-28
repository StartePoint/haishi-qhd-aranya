def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.get_json()["status"] == "ok"


def test_mock_wechat_login(client):
    res = client.post("/auth/wechat_login", json={"code": "test"})
    data = res.get_json()
    assert data["code"] == 0
    assert "token" in data["data"]


def test_admin_login(client):
    res = client.post(
        "/admin/auth/login",
        json={"username": "admin", "password": "admin12345"},
    )
    data = res.get_json()
    assert data["code"] == 0
    assert data["data"]["token"]
