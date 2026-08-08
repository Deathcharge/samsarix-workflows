from samsarix_uv_fixture import product_name


def test_uv_workflow_syncs_and_tests_locked_project() -> None:
    assert product_name() == "Samsarix Workflows"
