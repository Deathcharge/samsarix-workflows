"""Smoke coverage for the locked uv consumer fixture."""

from samsarix_uv_fixture import product_name


def test_uv_workflow_syncs_and_tests_locked_project() -> None:
    """Verify the reusable workflow installs and imports the fixture."""

    assert product_name() == "Samsarix Workflows"
