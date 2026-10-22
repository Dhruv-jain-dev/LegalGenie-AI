from agents.router import route_request


def test_routes_summary_requests():
    assert route_request("Please summarize this agreement") == "summary"


def test_routes_draft_requests():
    assert route_request("Draft a payment notice") == "draft"


def test_routes_questions_to_legal_qa():
    assert route_request("What does the termination clause mean?") == "legal_qa"
