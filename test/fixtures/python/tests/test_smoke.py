import unittest


class WorkflowSmokeTest(unittest.TestCase):
    def test_python_workflow_executes_tests(self) -> None:
        self.assertEqual("helix".upper(), "HELIX")


if __name__ == "__main__":
    unittest.main()
