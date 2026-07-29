import unittest


class WorkflowSmokeTest(unittest.TestCase):
    def test_python_workflow_executes_tests(self) -> None:
        self.assertEqual("samsarix".upper(), "SAMSARIX")


if __name__ == "__main__":
    unittest.main()
