"""Read-only tests for replacing an unexecuted hosting plan."""

import unittest

from host_fleet import STACK, check_replacement, revised_state


class PlanTests(unittest.TestCase):
    def setUp(self):
        self.state = {
            "account": "test-account",
            "stack": STACK,
            "change_set": "old-plan",
            "bucket": "private-bundle",
            "key": "hosting/bundle.zip",
            "sha256": "digest",
        }

    def test_only_unlaunched_matching_plan_is_replaceable(self):
        check_replacement(self.state, "test-account", "REVIEW_IN_PROGRESS")
        for status in ("CREATE_COMPLETE", "CREATE_IN_PROGRESS", "ROLLBACK_COMPLETE"):
            with self.assertRaises(SystemExit):
                check_replacement(self.state, "test-account", status)
        with self.assertRaises(SystemExit):
            check_replacement(self.state, "different-account", "REVIEW_IN_PROGRESS")
        with self.assertRaises(SystemExit):
            check_replacement(
                {**self.state, "stack": "other"}, "test-account", "REVIEW_IN_PROGRESS"
            )
        with self.assertRaises(SystemExit):
            check_replacement(
                {**self.state, "change_set": ""}, "test-account", "REVIEW_IN_PROGRESS"
            )

    def test_revision_preserves_bundle_and_original_state(self):
        result = revised_state(self.state, "test-account", "new-plan", "arm-image", "subnet")
        for key in ("bucket", "key", "sha256"):
            self.assertEqual(result[key], self.state[key])
        self.assertEqual(result["superseded_change_sets"], ["old-plan"])
        self.assertEqual(result["instance_type"], "t4g.small")
        self.assertEqual(result["architecture"], "arm64")
        self.assertEqual(self.state["change_set"], "old-plan")
        second = revised_state(result, "test-account", "third-plan", "arm-image", "subnet")
        self.assertEqual(second["superseded_change_sets"], ["old-plan", "new-plan"])


if __name__ == "__main__":
    unittest.main()
