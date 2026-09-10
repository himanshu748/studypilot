"""Keep automated tests offline even when the developer has enabled a real model."""
import os


def pytest_configure(config):
    del config
    os.environ["STUDYPILOT_FIXTURE_MODE"] = "true"
    os.environ["STUDYPILOT_AGENTCORE_RUNTIME_ARN"] = ""
    os.environ["LLM_PROVIDER"] = "bedrock"
    os.environ["BEDROCK_MODEL_ID"] = ""
    os.environ["AWS_EC2_METADATA_DISABLED"] = "true"
